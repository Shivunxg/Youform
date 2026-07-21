/**
 * Plan definitions — single source of truth for limits and features.
 * These must stay in sync with the Stripe product/price catalog.
 */
export const PLANS = {
  free: {
    tier: 'free',
    name: 'Free',
    price_monthly: 0,
    responses_limit: 100,       // per month
    forms_limit: null,           // unlimited
    storage_limit_mb: 100,
    custom_domain: false,
    remove_branding: false,
    integrations: ['google_sheets', 'email'],
    api_access: false,
    version_history: false,
    logic_jumps: true,           // available in free
    file_uploads: true,
    payment_forms: false,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price_monthly: 25,
    responses_limit: 5000,
    forms_limit: null,
    storage_limit_mb: 2048,
    custom_domain: true,
    remove_branding: true,
    integrations: ['google_sheets', 'slack', 'notion', 'mailchimp', 'hubspot', 'airtable', 'zapier', 'webhook', 'email'],
    api_access: false,
    version_history: true,
    logic_jumps: true,
    file_uploads: true,
    payment_forms: true,
  },
  business: {
    tier: 'business',
    name: 'Business',
    price_monthly: 59,
    responses_limit: 25000,
    forms_limit: null,
    storage_limit_mb: 10240,
    custom_domain: true,
    remove_branding: true,
    integrations: ['google_sheets', 'slack', 'notion', 'mailchimp', 'hubspot', 'airtable', 'zapier', 'webhook', 'email'],
    api_access: true,
    version_history: true,
    logic_jumps: true,
    file_uploads: true,
    payment_forms: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    price_monthly: null,         // custom
    responses_limit: null,       // unlimited
    forms_limit: null,
    storage_limit_mb: null,
    custom_domain: true,
    remove_branding: true,
    integrations: ['google_sheets', 'slack', 'notion', 'mailchimp', 'hubspot', 'airtable', 'zapier', 'webhook', 'email'],
    api_access: true,
    version_history: true,
    logic_jumps: true,
    file_uploads: true,
    payment_forms: true,
  },
};

export function getPlan(tier) {
  return PLANS[tier] ?? PLANS.free;
}

/**
 * Check if a workspace can accept another response this month.
 */
export async function canAcceptResponse(supabaseAdmin, workspaceId, plan) {
  const limits = getPlan(plan);
  if (limits.responses_limit === null) return { allowed: true };

  const month = new Date();
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  const { data } = await supabaseAdmin
    .from('workspace_usage')
    .select('responses_used')
    .eq('workspace_id', workspaceId)
    .eq('month', month.toISOString().split('T')[0])
    .single();

  const used = data?.responses_used ?? 0;
  return {
    allowed: used < limits.responses_limit,
    used,
    limit: limits.responses_limit,
  };
}

/**
 * Check if a feature is available on a given plan.
 */
export function hasFeature(plan, feature) {
  return !!getPlan(plan)[feature];
}
