export const PLANS = {
  free: {
    tier: 'free',
    responses_limit: 100,
    storage_limit_mb: 100,
    seat_limit: 1,
    file_upload_limit_mb: 10,
    custom_domain: false,
    remove_branding: false,
    partial_submissions: false,
    respondent_notifications: false,
    custom_thank_you: false,
    phone_otp: false,
    email_otp: false,
    activity_log: false,
  },
  pro: {
    tier: 'pro',
    responses_limit: 5000,
    storage_limit_mb: 2048,
    seat_limit: 3,
    file_upload_limit_mb: null, // unlimited
    custom_domain: true,
    remove_branding: true,
    partial_submissions: true,
    respondent_notifications: true,
    custom_thank_you: true,
    phone_otp: false,
    email_otp: false,
    activity_log: false,
  },
  business: {
    tier: 'business',
    responses_limit: 25000,
    storage_limit_mb: 10240,
    seat_limit: 5,
    file_upload_limit_mb: null,
    custom_domain: true,
    remove_branding: true,
    partial_submissions: true,
    respondent_notifications: true,
    custom_thank_you: true,
    phone_otp: true,
    email_otp: true,
    activity_log: true,
  },
  enterprise: {
    tier: 'enterprise',
    responses_limit: null,
    storage_limit_mb: null,
    seat_limit: null, // unlimited
    file_upload_limit_mb: null,
    custom_domain: true,
    remove_branding: true,
    partial_submissions: true,
    respondent_notifications: true,
    custom_thank_you: true,
    phone_otp: true,
    email_otp: true,
    activity_log: true,
  },
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
