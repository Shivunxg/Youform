import { Router } from 'express';
import Stripe from 'stripe';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { PLANS } from '../lib/plans.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs mapped to plan tiers (from env)
const PRICE_MAP = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
};

// ============================================================
// GET /billing/:workspaceId — get current subscription
// ============================================================
router.get('/:workspaceId', requireAuth, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role, workspaces(plan, stripe_customer_id, stripe_subscription_id, subscription_status, plan_expires_at)')
      .eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    const ws = member.workspaces;
    let subscription = null;

    if (ws.stripe_subscription_id) {
      subscription = await stripe.subscriptions.retrieve(ws.stripe_subscription_id, {
        expand: ['default_payment_method', 'items.data.price'],
      });
    }

    res.json({
      plan: ws.plan,
      subscription_status: ws.subscription_status,
      plan_expires_at: ws.plan_expires_at,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        items: subscription.items?.data?.map(i => ({
          price_id: i.price.id,
          interval: i.price.recurring?.interval,
          amount: i.price.unit_amount,
          currency: i.price.currency,
        })),
        payment_method: subscription.default_payment_method ? {
          brand: subscription.default_payment_method.card?.brand,
          last4: subscription.default_payment_method.card?.last4,
        } : null,
      } : null,
    });
  } catch (err) { next(err); }
});

// ============================================================
// POST /billing/:workspaceId/checkout
// Create a Stripe Checkout session
// ============================================================
router.post('/:workspaceId/checkout', requireAuth, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { plan, interval = 'monthly' } = req.body;

    if (!['pro', 'business'].includes(plan)) throw createError(400, 'Invalid plan');
    if (!['monthly', 'yearly'].includes(interval)) throw createError(400, 'Invalid interval');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role, workspaces(stripe_customer_id, name)')
      .eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin'].includes(member.role)) throw createError(403, 'Admin access required');

    const priceKey = `${plan}_${interval}`;
    const priceId = PRICE_MAP[priceKey];
    if (!priceId) throw createError(400, 'Price not configured for this plan/interval combination');

    // Get or create Stripe customer
    let customerId = member.workspaces.stripe_customer_id;
    if (!customerId) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', req.user.id).single();
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name ?? undefined,
        metadata: { workspace_id: workspaceId, user_id: req.user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('workspaces').update({ stripe_customer_id: customerId }).eq('id', workspaceId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/settings/billing?canceled=1`,
      subscription_data: {
        metadata: { workspace_id: workspaceId },
      },
      allow_promotion_codes: true,
      customer_update: { address: 'auto', name: 'auto' },
      automatic_tax: { enabled: false },
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// ============================================================
// POST /billing/:workspaceId/portal
// Open Stripe billing portal for self-service
// ============================================================
router.post('/:workspaceId/portal', requireAuth, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role, workspaces(stripe_customer_id)')
      .eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin'].includes(member.role)) throw createError(403, 'Admin access required');
    if (!member.workspaces.stripe_customer_id) throw createError(400, 'No billing account found');

    const session = await stripe.billingPortal.sessions.create({
      customer: member.workspaces.stripe_customer_id,
      return_url: `${process.env.APP_URL}/settings/billing`,
    });

    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// ============================================================
// POST /billing/webhooks
// Stripe webhook handler (no auth — uses signature verification)
// ============================================================
router.post('/webhooks', async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          await handleSubscriptionChange(session.subscription, session.customer);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        await handleSubscriptionChange(sub.id, sub.customer);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: ws } = await supabaseAdmin.from('workspaces')
          .select('id').eq('stripe_customer_id', sub.customer).single();
        if (ws) {
          await supabaseAdmin.from('workspaces').update({
            plan: 'free',
            stripe_subscription_id: null,
            subscription_status: 'canceled',
            responses_limit: PLANS.free.responses_limit,
            storage_limit_mb: PLANS.free.storage_limit_mb,
            remove_branding: false,
          }).eq('id', ws.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const { data: ws } = await supabaseAdmin.from('workspaces')
          .select('id').eq('stripe_customer_id', invoice.customer).single();
        if (ws) {
          await supabaseAdmin.from('workspaces').update({ subscription_status: 'past_due' }).eq('id', ws.id);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) { next(err); }
});

async function handleSubscriptionChange(subscriptionId, customerId) {
  const sub = typeof subscriptionId === 'string'
    ? await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] })
    : subscriptionId;

  // Determine plan tier from price ID
  const priceId = sub.items?.data?.[0]?.price?.id;
  let tier = 'free';
  for (const [key, pid] of Object.entries(PRICE_MAP)) {
    if (pid === priceId) {
      tier = key.split('_')[0]; // 'pro' or 'business'
      break;
    }
  }

  const plan = PLANS[tier] ?? PLANS.free;

  const { data: ws } = await supabaseAdmin.from('workspaces')
    .select('id').eq('stripe_customer_id', customerId).single();
  if (!ws) return;

  await supabaseAdmin.from('workspaces').update({
    plan: tier,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    plan_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
    responses_limit: plan.responses_limit ?? 999999999,
    storage_limit_mb: plan.storage_limit_mb ?? 999999,
    remove_branding: plan.remove_branding,
    custom_domain: plan.custom_domain,
  }).eq('id', ws.id);
}

export default router;
