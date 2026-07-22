import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requirePlatformAdmin } from '../lib/auth.js';
import { createError } from '../lib/errorHandler.js';
import { PLANS } from '../lib/plans.js';

const PLAN_PRICES = { free: 0, pro: 29, business: 79, enterprise: 199 };

const router = Router();
router.use(requirePlatformAdmin);

// GET /admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const thisMonth = new Date();
    thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);

    const [
      { count: totalUsers },
      { count: totalWorkspaces },
      { count: totalForms },
      { count: totalResponses },
      { data: planRows },
      { count: activeWorkspaces },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('workspaces').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('forms').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('responses').select('*', { count: 'exact', head: true }).eq('is_test', false),
      supabaseAdmin.from('workspaces').select('plan'),
      supabaseAdmin.from('workspace_usage')
        .select('*', { count: 'exact', head: true })
        .eq('month', thisMonth.toISOString().split('T')[0])
        .gt('responses_used', 0),
    ]);

    const plans = { free: 0, pro: 0, business: 0, enterprise: 0 };
    for (const w of planRows ?? []) {
      const tier = w.plan ?? 'free';
      plans[tier] = (plans[tier] ?? 0) + 1;
    }

    const mrr = Object.entries(plans).reduce(
      (sum, [plan, count]) => sum + count * (PLAN_PRICES[plan] ?? 0), 0
    );

    res.json({
      totalUsers, totalWorkspaces, totalForms, totalResponses,
      plans,
      mrr,
      arr: mrr * 12,
      paidWorkspaces: (plans.pro ?? 0) + (plans.business ?? 0) + (plans.enterprise ?? 0),
      freeWorkspaces: plans.free ?? 0,
      activeWorkspaces: activeWorkspaces ?? 0,
    });
  } catch (err) { next(err); }
});

// GET /admin/users?search=&page=&limit=
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search } = req.query;
    let q = supabaseAdmin
      .from('profiles')
      .select(
        'id, email, full_name, avatar_url, created_at, is_platform_admin, workspace_members(role, workspaces(id, name, plan))',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);
    if (search) q = q.ilike('email', `%${search}%`);
    const { data, count, error } = await q;
    if (error) throw error;
    res.json({ users: data ?? [], total: count ?? 0, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// PATCH /admin/users/:userId/admin
router.patch('/users/:userId/admin', async (req, res, next) => {
  try {
    const { is_platform_admin } = req.body;
    if (typeof is_platform_admin !== 'boolean') throw createError(400, 'is_platform_admin must be boolean');
    if (req.user.id === req.params.userId && !is_platform_admin) {
      throw createError(400, 'Cannot remove your own admin access');
    }
    const { error } = await supabaseAdmin.from('profiles')
      .update({ is_platform_admin }).eq('id', req.params.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /admin/workspaces?search=&plan=&page=&limit=
router.get('/workspaces', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, plan } = req.query;
    let q = supabaseAdmin
      .from('workspaces')
      .select('id, name, slug, plan, responses_count, created_at, subscription_status', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);
    if (search) q = q.ilike('name', `%${search}%`);
    if (plan) q = q.eq('plan', plan);
    const { data, count, error } = await q;
    if (error) throw error;
    res.json({ workspaces: data ?? [], total: count ?? 0, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /admin/workspaces/:workspaceId
router.get('/workspaces/:workspaceId', async (req, res, next) => {
  try {
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select('*, workspace_members(role, profiles(id, email, full_name))')
      .eq('id', req.params.workspaceId)
      .single();
    if (error || !workspace) throw createError(404, 'Workspace not found');

    const [{ count: formCount }, { count: responseCount }] = await Promise.all([
      supabaseAdmin.from('forms').select('*', { count: 'exact', head: true }).eq('workspace_id', req.params.workspaceId),
      supabaseAdmin.from('responses').select('*', { count: 'exact', head: true }).eq('workspace_id', req.params.workspaceId).eq('is_test', false),
    ]);

    res.json({ workspace: { ...workspace, form_count: formCount ?? 0, response_count: responseCount ?? 0 } });
  } catch (err) { next(err); }
});

// PATCH /admin/workspaces/:workspaceId/plan
router.patch('/workspaces/:workspaceId/plan', async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!['free', 'pro', 'business', 'enterprise'].includes(plan)) throw createError(400, 'Invalid plan');
    const config = PLANS[plan];
    const { error } = await supabaseAdmin.from('workspaces').update({
      plan,
      responses_limit: config.responses_limit ?? 999999999,
      storage_limit_mb: config.storage_limit_mb ?? 999999,
      remove_branding: config.remove_branding,
    }).eq('id', req.params.workspaceId);
    if (error) throw error;
    res.json({ success: true, plan });
  } catch (err) { next(err); }
});

export default router;
