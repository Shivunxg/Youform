const PLAN_FEATURES = {
  free: {
    responses_limit: 500,
    storage_limit_mb: 100,
    seat_limit: 1,
    file_upload_limit_mb: 10,
    remove_branding: false,
    custom_domain: false,
    custom_thank_you: false,
    respondent_notifications: false,
    partial_submissions: false,
    integrations: false,
    ai_features: false,
    imports: false,
    phone_otp: false,
    email_otp: false,
    activity_log: false,
  },
  pro: {
    responses_limit: 5000,
    storage_limit_mb: 2048,
    seat_limit: 3,
    file_upload_limit_mb: null,
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
    responses_limit: 25000,
    storage_limit_mb: 10240,
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

// Minimum plan required per feature — business inherits pro, pro inherits free
const FEATURE_MIN_PLAN = {
  remove_branding:          'pro',
  custom_domain:            'pro',
  custom_thank_you:         'pro',
  respondent_notifications: 'pro',
  partial_submissions:      'pro',
  integrations:             'pro',
  ai_features:              'pro',
  imports:                  'pro',
  phone_otp:                'business',
  email_otp:                'business',
  activity_log:             'business',
};

export function hasFeature(plan, feature) {
  const minPlan = FEATURE_MIN_PLAN[feature];
  if (!minPlan) return true; // free-tier feature, always on
  return isPlanAtLeast(plan, minPlan);
}

export function getSeatLimit(plan) {
  return (PLAN_FEATURES[plan] ?? PLAN_FEATURES.free).seat_limit;
}

export function isPlanAtLeast(plan, minPlan) {
  const order = ['free', 'pro', 'business'];
  return order.indexOf(plan ?? 'free') >= order.indexOf(minPlan);
}

export function getPlanConfig(plan) {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}
