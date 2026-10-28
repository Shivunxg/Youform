/**
 * Plan definitions — single source of truth for limits and features.
 * These must stay in sync with the Stripe product/price catalog.
 */
export const PLANS = {
  free: {
    tier: 'free',
    name: 'Free',
    price_monthly: 0,
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
    api_access: false,
    version_history: false,
    logic_jumps: true,
    file_uploads: true,
    payment_forms: false,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price_monthly: 25,
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
    api_access: true,
    version_history: true,
    logic_jumps: true,
    file_uploads: true,
    payment_forms: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    price_monthly: null,
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
