export const PLANS = {
  free: {
    tier: 'free',
    // Usage
    responses_limit: 500,
    storage_limit_mb: 100,
    seat_limit: 1,
    file_upload_limit_mb: 10,
    // Branding & customisation
    remove_branding: false,
    custom_domain: false,
    custom_thank_you: false,
    // Response collection
    respondent_notifications: false,
    partial_submissions: false,
    // Integrations & automation
    integrations: false,
    ai_features: false,
    imports: false,
    // Identity verification
    phone_otp: false,
    email_otp: false,
    // Admin & compliance
    activity_log: false,
  },
  pro: {
    tier: 'pro',
    responses_limit: 5000,
    storage_limit_mb: 2048,    // 2 GB
    seat_limit: 3,
    file_upload_limit_mb: null, // unlimited
    remove_branding: true,
    custom_domain: true,
    custom_thank_you: true,
    respondent_notifications: true,
    partial_submissions: true,
    integrations: true,
    ai_features: true,
    imports: true,
    phone_otp: false,
    email_otp: false,
    activity_log: false,
  },
  business: {
    tier: 'business',
    responses_limit: 25000,
    storage_limit_mb: 10240,   // 10 GB
    seat_limit: 10,
    file_upload_limit_mb: null,
    remove_branding: true,
    custom_domain: true,
    custom_thank_you: true,
    respondent_notifications: true,
    partial_submissions: true,
    integrations: true,
    ai_features: true,
    imports: true,
    phone_otp: true,
    email_otp: true,
    activity_log: true,
  },
};

export function getPlan(tier) { return PLANS[tier] ?? PLANS.free; }

export async function canAcceptResponse(supabaseAdmin, workspaceId, plan) {
  const limits = getPlan(plan);
  if (!limits.responses_limit) return { allowed: true };
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const { data } = await supabaseAdmin.from('workspace_usage').select('responses_used').eq('workspace_id', workspaceId).eq('month', month.toISOString().split('T')[0]).single();
  const used = data?.responses_used ?? 0;
  return { allowed: used < limits.responses_limit, used, limit: limits.responses_limit };
}

export function hasFeature(plan, feature) { return !!getPlan(plan)[feature]; }
