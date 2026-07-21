const PLAN_FEATURES = {
  free:       { custom_domain: false, remove_branding: false, partial_submissions: false, respondent_notifications: false, custom_thank_you: false, phone_otp: false, email_otp: false, activity_log: false, seat_limit: 1 },
  pro:        { custom_domain: true,  remove_branding: true,  partial_submissions: true,  respondent_notifications: true,  custom_thank_you: true,  phone_otp: false, email_otp: false, activity_log: false, seat_limit: 3 },
  business:   { custom_domain: true,  remove_branding: true,  partial_submissions: true,  respondent_notifications: true,  custom_thank_you: true,  phone_otp: true,  email_otp: true,  activity_log: true,  seat_limit: 5 },
  enterprise: { custom_domain: true,  remove_branding: true,  partial_submissions: true,  respondent_notifications: true,  custom_thank_you: true,  phone_otp: true,  email_otp: true,  activity_log: true,  seat_limit: null },
};

export function hasFeature(plan, feature) {
  return !!(PLAN_FEATURES[plan] ?? PLAN_FEATURES.free)[feature];
}

export function getSeatLimit(plan) {
  return (PLAN_FEATURES[plan] ?? PLAN_FEATURES.free).seat_limit;
}

export function isPlanAtLeast(plan, minPlan) {
  const order = ['free', 'pro', 'business', 'enterprise'];
  return order.indexOf(plan ?? 'free') >= order.indexOf(minPlan);
}
