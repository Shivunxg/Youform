export const PLANS = {
  free:       { tier: 'free',       responses_limit: 100,   storage_limit_mb: 100,   custom_domain: false, remove_branding: false },
  pro:        { tier: 'pro',        responses_limit: 5000,  storage_limit_mb: 2048,  custom_domain: true,  remove_branding: true  },
  business:   { tier: 'business',   responses_limit: 25000, storage_limit_mb: 10240, custom_domain: true,  remove_branding: true  },
  enterprise: { tier: 'enterprise', responses_limit: null,  storage_limit_mb: null,  custom_domain: true,  remove_branding: true  },
};
export function getPlan(tier) { return PLANS[tier] ?? PLANS.free; }
export async function canAcceptResponse(supabaseAdmin, workspaceId, plan) {
  const limits = getPlan(plan);
  if (!limits.responses_limit) return { allowed: true };
  const month = new Date(); month.setDate(1); month.setHours(0,0,0,0);
  const { data } = await supabaseAdmin.from('workspace_usage').select('responses_used').eq('workspace_id', workspaceId).eq('month', month.toISOString().split('T')[0]).single();
  const used = data?.responses_used ?? 0;
  return { allowed: used < limits.responses_limit, used, limit: limits.responses_limit };
}
export function hasFeature(plan, feature) { return !!getPlan(plan)[feature]; }
