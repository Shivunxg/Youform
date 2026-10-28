import { nanoid } from 'nanoid';

// ── Helpers ──────────────────────────────────────────────────
function choices(...labels) {
  return labels.map(label => ({ id: nanoid(), label }));
}

function q(type, title, opts = {}) {
  return { type, title, description: opts.description ?? '', required: opts.required ?? false, config: opts.config ?? {}, };
}

// ── Template definitions ─────────────────────────────────────
const RAW = [
  // ── FORMS ─────────────────────────────────────────────────
  {
    id: 'testimonial',
    title: 'Testimonial Collection',
    description: 'Collect reviews and social proof from happy customers',
    category: 'forms',
    color: '#FDE68A',
    textColor: '#92400E',
    icon: '⭐',
    questions: [
      q('welcome_screen', 'Would you like to share your experience with us?', {
        description: 'Your feedback helps other people discover us — and it means the world to our team.',
        config: { buttonLabel: 'Share my story', description: 'Takes less than 3 minutes.' },
      }),
      q('short_text', "What's your full name?", { required: true, config: { placeholder: 'Jane Smith' } }),
      q('short_text', 'What is your job title and company?', { config: { placeholder: 'e.g. Head of Marketing at Acme Inc.' } }),
      q('rating', 'How would you rate your overall experience with us?', {
        required: true,
        description: 'Be honest — your feedback helps us get better.',
        config: { steps: 5, shape: 'star' },
      }),
      q('multiple_choice', 'Which of these best describes what we helped you with?', {
        config: { choices: choices('Saving time', 'Growing revenue', 'Reducing costs', 'Better team collaboration', 'Something else'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'Tell us about your experience — what problem did we solve for you?', {
        required: true,
        description: 'The more specific, the more helpful. What changed for you after using our product?',
        config: { placeholder: 'Before using [product], we struggled with… Now we can…', minRows: 4 },
      }),
      q('short_text', 'If you had to summarise your experience in one sentence, what would you say?', {
        config: { placeholder: '"It helped us double our response rate in a week."' },
      }),
      q('yes_no', 'Would you recommend us to a colleague or friend?', { required: true }),
      q('yes_no', 'Can we feature this testimonial publicly on our website?', { required: true }),
      q('short_text', 'Your website or LinkedIn URL (optional)', { config: { placeholder: 'https://' } }),
      q('thank_you_screen', 'Thank you — this means everything! 🙏', {
        config: { message: 'We\'ve received your testimonial and truly appreciate you taking the time to share your story.' },
      }),
    ],
  },
  {
    id: 'client-intake',
    title: 'Client Intake Form',
    description: 'Onboard new clients with all the right information upfront',
    category: 'forms',
    color: '#DDD6FE',
    textColor: '#5B21B6',
    icon: '📋',
    questions: [
      q('welcome_screen', 'Welcome — let\'s get started on your project', {
        config: { buttonLabel: 'Begin →', description: 'This form takes about 5 minutes. Your answers help us hit the ground running.' },
      }),
      q('short_text', 'Your full name', { required: true, config: { placeholder: 'Jane Smith' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'jane@company.com' } }),
      q('short_text', 'Phone number', { config: { placeholder: '+1 (555) 000-0000' } }),
      q('short_text', 'Company or organization name', { config: { placeholder: 'Acme Inc.' } }),
      q('multiple_choice', 'What type of project is this?', {
        required: true,
        config: { choices: choices('Website design', 'Mobile app', 'Branding & identity', 'Marketing campaign', 'Consulting', 'Other'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which stage is your project at right now?', {
        config: { choices: choices('Just an idea', 'Defined requirements', 'In progress / needs help', 'Rebuilding something existing'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'What is your estimated budget for this project?', {
        required: true,
        config: { choices: choices('Under $1,000', '$1,000 – $5,000', '$5,000 – $20,000', '$20,000 – $50,000', '$50,000+'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'What is your desired timeline or launch date?', {
        description: 'Even a rough estimate helps us plan resources.',
        config: { placeholder: 'e.g. 6 weeks, or "by end of Q3"' },
      }),
      q('long_text', 'Describe your goals — what does success look like for this project?', {
        required: true,
        description: 'Be as specific as you can. The clearer the target, the better we can help you hit it.',
        config: { placeholder: 'We want to…', minRows: 4 },
      }),
      q('multiple_choice', 'Who are the primary users or audience for this project?', {
        config: { choices: choices('Consumers / general public', 'Small businesses', 'Enterprise / B2B', 'Internal team', 'Specific niche'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'Are there competitors or examples you admire? Share links or names.', {
        config: { placeholder: 'e.g. We love how Stripe\'s docs work, or we want something like Notion…', minRows: 3 },
      }),
      q('short_text', 'How did you hear about us?', { config: { placeholder: 'Referral, Google, social media, event…' } }),
      q('thank_you_screen', 'Thanks — we\'ll be in touch within 24 hours', {
        config: { message: 'We\'ve received your intake form and will review it before our first call. Check your inbox for a calendar invite!' },
      }),
    ],
  },
  {
    id: 'lead-capture',
    title: 'Lead Capture Form',
    description: 'Turn website visitors into qualified sales leads',
    category: 'forms',
    color: '#BBF7D0',
    textColor: '#15803D',
    icon: '🎯',
    questions: [
      q('welcome_screen', 'Get a free personalised demo', {
        config: { buttonLabel: 'Claim my demo', description: 'Takes 2 minutes. No credit card required.' },
      }),
      q('short_text', 'Your first name', { required: true, config: { placeholder: 'First name' } }),
      q('short_text', 'Work email address', { required: true, config: { placeholder: 'you@company.com' } }),
      q('short_text', 'Company name', { config: { placeholder: 'Acme Inc.' } }),
      q('multiple_choice', 'Company size', {
        required: true,
        config: { choices: choices('1–10', '11–50', '51–200', '201–500', '500+'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Your role', {
        config: { choices: choices('Founder / CEO', 'Product Manager', 'Marketing', 'Sales', 'Engineering', 'Other'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', "What's your biggest challenge right now?", {
        required: true,
        config: { choices: choices('Generating more leads', 'Converting leads to customers', 'Retaining existing customers', 'Scaling the team', 'Reducing operational costs'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'How soon are you looking to solve this?', {
        config: { choices: choices('Immediately', 'Within 1 month', '1–3 months', 'Just exploring'), allowMultiple: false, allowOther: false },
      }),
      q('long_text', "Anything specific you'd like us to cover in the demo?", {
        config: { placeholder: 'Optional — the more context, the more tailored your demo will be…', minRows: 3 },
      }),
      q('thank_you_screen', 'You\'re on the list! 🎉', {
        config: { message: 'One of our team members will reach out within 1 business day to schedule your personalised demo.' },
      }),
    ],
  },
  {
    id: 'contact',
    title: 'Contact Form',
    description: 'A friendly way to hear from visitors and customers',
    category: 'forms',
    color: '#FECACA',
    textColor: '#B91C1C',
    icon: '📞',
    questions: [
      q('welcome_screen', 'We\'d love to hear from you', {
        config: { buttonLabel: 'Send a message', description: 'We typically reply within one business day.' },
      }),
      q('short_text', 'Your full name', { required: true, config: { placeholder: 'Jane Smith' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'your@email.com' } }),
      q('short_text', 'Company name (optional)', { config: { placeholder: 'Acme Inc.' } }),
      q('multiple_choice', 'What can we help you with?', {
        required: true,
        config: { choices: choices('General inquiry', 'Technical support', 'Billing question', 'Partnership opportunity', 'Press / media', 'Other'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How urgent is this?', {
        config: { choices: choices('Just curious / no rush', 'Would like a reply this week', 'Urgent — need help ASAP'), allowMultiple: false, allowOther: false },
      }),
      q('long_text', 'Your message', {
        required: true,
        description: 'The more detail you share, the faster we can help.',
        config: { placeholder: 'Hi, I\'m reaching out because…', minRows: 4 },
      }),
      q('thank_you_screen', 'Message received! 📬', {
        config: { message: 'Thanks for getting in touch. We\'ll review your message and get back to you within one business day.' },
      }),
    ],
  },
  {
    id: 'job-application',
    title: 'Job Application',
    description: 'Streamline your hiring with a polished application form',
    category: 'forms',
    color: '#BAE6FD',
    textColor: '#0369A1',
    icon: '📝',
    questions: [
      q('welcome_screen', 'Apply to join our team', {
        config: { buttonLabel: 'Start application', description: 'This application takes about 10 minutes. We review every submission.' },
      }),
      q('short_text', 'Full name', { required: true, config: { placeholder: 'Your full name' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'you@email.com' } }),
      q('short_text', 'Phone number', { config: { placeholder: '+1 (555) 000-0000' } }),
      q('short_text', 'Position you are applying for', { required: true, config: { placeholder: 'e.g. Senior Product Designer' } }),
      q('short_text', 'LinkedIn or portfolio URL', { config: { placeholder: 'https://linkedin.com/in/…' } }),
      q('number', 'Years of relevant experience', {
        description: 'Count only experience directly relevant to this role.',
        config: { placeholder: '3', min: 0, max: 50 },
      }),
      q('multiple_choice', 'Preferred work arrangement', {
        required: true,
        config: { choices: choices('Remote', 'On-site', 'Hybrid — mostly remote', 'Hybrid — mostly on-site'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'What is your expected salary range?', {
        config: { choices: choices('Under $60k', '$60k – $90k', '$90k – $120k', '$120k – $160k', '$160k+', 'Open to discussion'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'When can you start?', {
        config: { choices: choices('Immediately', 'In 2 weeks', 'In 1 month', 'In 2–3 months'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'Why do you want this role, and why are you a great fit?', {
        required: true,
        description: 'Tell us about a relevant accomplishment and why you\'re excited about this opportunity.',
        config: { placeholder: 'I\'m applying because…', minRows: 5 },
      }),
      q('file_upload', 'Upload your resume / CV', { required: true, config: { allowedTypes: ['pdf', 'doc', 'docx'], maxSizeMb: 10, maxFiles: 1 } }),
      q('thank_you_screen', 'Application submitted! 🎉', {
        config: { message: 'Thank you for applying. We review every application and will be in touch if you\'re shortlisted.' },
      }),
    ],
  },
  {
    id: 'order-form',
    title: 'Product Order Form',
    description: 'Sell products and collect payment via Stripe',
    category: 'forms',
    color: '#FFEDD5',
    textColor: '#C2410C',
    icon: '🛒',
    questions: [
      q('welcome_screen', 'Place your order', {
        config: { buttonLabel: 'Order now', description: 'Secure checkout. Orders are processed within 1–2 business days.' },
      }),
      q('short_text', 'Your full name', { required: true, config: { placeholder: 'Full name' } }),
      q('short_text', 'Email address for order confirmation', { required: true, config: { placeholder: 'your@email.com' } }),
      q('short_text', 'Phone number (for delivery updates)', { config: { placeholder: '+1 (555) 000-0000' } }),
      q('multiple_choice', 'Select a product', {
        required: true,
        config: { choices: choices('Starter Pack – $29', 'Professional Pack – $79', 'Enterprise Pack – $199'), allowMultiple: false, allowOther: false },
      }),
      q('number', 'Quantity', { required: true, config: { placeholder: '1', min: 1, max: 100 } }),
      q('long_text', 'Shipping address', { required: true, config: { placeholder: 'Street address, city, state, ZIP, country', minRows: 3 } }),
      q('multiple_choice', 'Preferred shipping method', {
        config: { choices: choices('Standard (5–7 days, free)', 'Express (2–3 days, +$9)', 'Overnight (next day, +$19)'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Promo code (optional)', { config: { placeholder: 'DISCOUNT20' } }),
      q('long_text', 'Any special instructions?', { config: { placeholder: 'Gift message, delivery notes, etc.', minRows: 2 } }),
      q('thank_you_screen', 'Order received! 🛒', {
        config: { message: 'Thank you for your order. You\'ll receive a confirmation email shortly with your order details and tracking information.' },
      }),
    ],
  },

  // ── SURVEYS ───────────────────────────────────────────────
  {
    id: 'market-research',
    title: 'Market Research Survey',
    description: 'Validate product-market fit with real customer data',
    category: 'surveys',
    color: '#DCFCE7',
    textColor: '#15803D',
    icon: '🔍',
    questions: [
      q('welcome_screen', 'Help us build the right product for you', {
        config: { buttonLabel: 'Share my input', description: '8 quick questions · ~4 minutes · completely anonymous' },
      }),
      q('multiple_choice', 'Which industry are you in?', {
        required: true,
        config: { choices: choices('Technology / SaaS', 'Healthcare', 'Finance / Fintech', 'Education', 'Retail / E-commerce', 'Agency / Consulting', 'Other'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'What is your role?', {
        config: { choices: choices('Founder / CEO', 'Product Manager', 'Engineering', 'Marketing', 'Sales', 'Operations', 'Other'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'What are your biggest pain points right now? (pick all that apply)', {
        config: { choices: choices('Finding and qualifying customers', 'Retaining existing customers', 'Team coordination and workflows', 'Data and reporting', 'Scaling operations', 'Competition'), allowMultiple: true, allowOther: false },
      }),
      q('rating', 'How satisfied are you with the solutions currently available in the market?', {
        required: true,
        description: '1 = Very dissatisfied, 5 = Very satisfied.',
        config: { steps: 5, shape: 'star' },
      }),
      q('nps', 'How likely are you to switch to a new solution if it solved your key pain point?', {
        config: { lowLabel: 'Not at all likely', highLabel: 'Extremely likely' },
      }),
      q('multiple_choice', 'How much would you pay monthly for a solution that fully addresses your needs?', {
        config: { choices: choices('$0 — I wouldn\'t pay', '$1 – $50/mo', '$51 – $200/mo', '$201 – $500/mo', '$500+/mo'), allowMultiple: false, allowOther: false },
      }),
      q('long_text', 'In your own words, what would the ideal solution look like?', {
        description: 'This is the most valuable question — be as specific as you can.',
        config: { placeholder: 'The ideal tool would…', minRows: 4 },
      }),
      q('multiple_choice', 'How do you typically evaluate new tools before buying?', {
        config: { choices: choices('Free trial', 'Demo / sales call', 'Online reviews & case studies', 'Recommendation from a peer', 'LinkedIn / social media'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Email address to receive the research summary (optional)', { config: { placeholder: 'your@email.com' } }),
      q('thank_you_screen', 'Your input is invaluable — thank you! 🔍', {
        config: { message: 'We\'ll share a summary of our findings with everyone who provided an email. This helps ensure we build something you\'ll actually love.' },
      }),
    ],
  },
  {
    id: 'saas-onboarding',
    title: 'SaaS Onboarding Survey',
    description: 'Understand new user goals and personalize their experience',
    category: 'surveys',
    color: '#DBEAFE',
    textColor: '#1D4ED8',
    icon: '🚀',
    questions: [
      q('welcome_screen', 'Help us personalise your experience', {
        config: { buttonLabel: 'Get started →', description: '7 quick questions — we\'ll use your answers to tailor what you see next.' },
      }),
      q('multiple_choice', 'What is your primary goal with our product?', {
        required: true,
        config: { choices: choices('Grow revenue', 'Save time on manual work', 'Reduce operational costs', 'Improve team collaboration', 'Better data & analytics'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'Team size', {
        config: { choices: choices('Just me', '2–10', '11–50', '51–200', '200+'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How would you describe your primary use case?', {
        config: { choices: choices('Internal team tool', 'Client-facing product', 'Personal project', 'Agency / freelance work'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which feature are you most excited about?', {
        config: { choices: choices('Form builder', 'Analytics & insights', 'Integrations', 'AI form generation', 'Template library'), allowMultiple: false, allowOther: false },
      }),
      q('rating', 'How easy was our signup process?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('long_text', 'What should we build next? Any early feedback for our team?', { config: { placeholder: 'Your thoughts…', minRows: 3 } }),
      q('short_text', 'How did you hear about us?', { config: { placeholder: 'Referral, Google, Twitter / X, podcast…' } }),
      q('thank_you_screen', 'You\'re all set! 🚀', {
        config: { message: 'Thanks for telling us about yourself. We\'ve noted your preferences and will use them to personalise your experience.' },
      }),
    ],
  },
  {
    id: 'cancellation',
    title: 'Cancellation Survey',
    description: 'Learn why customers churn and win them back',
    category: 'surveys',
    color: '#FFE4E6',
    textColor: '#BE123C',
    icon: '👋',
    questions: [
      q('welcome_screen', 'Before you go — one minute of your time?', {
        config: { buttonLabel: 'Sure, why not', description: 'Your feedback shapes what we build next. It takes less than 60 seconds.' },
      }),
      q('multiple_choice', 'What is the main reason you\'re canceling?', {
        required: true,
        config: { choices: choices('Too expensive for what I get', 'Missing a key feature I need', 'Found a better alternative', 'No longer need it', 'Technical issues I couldn\'t resolve', 'Was just testing it out'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'What feature were you hoping we had?', {
        config: { choices: choices('Better integrations', 'More customisation', 'Offline / export support', 'Team collaboration tools', 'Advanced analytics'), allowMultiple: false, allowOther: true },
      }),
      q('rating', 'Overall, how satisfied were you with the product?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('long_text', 'What would have made you stay?', { config: { placeholder: 'Your honest feedback helps us improve…', minRows: 3 } }),
      q('nps', 'Despite canceling, how likely are you to recommend us to someone else?', { required: true, config: { lowLabel: 'Not likely', highLabel: 'Extremely likely' } }),
      q('yes_no', 'Would you consider coming back if we added what you needed?', {}),
      q('short_text', 'Leave your email if you\'d like a personal follow-up', { config: { placeholder: 'your@email.com' } }),
      q('thank_you_screen', 'Thank you for being a customer', {
        config: { message: 'Your feedback is genuinely appreciated and will influence our roadmap. We hope to see you again.' },
      }),
    ],
  },
  {
    id: 'nps',
    title: 'Net Promoter Score Survey',
    description: 'Measure customer loyalty with the industry standard metric',
    category: 'surveys',
    color: '#FEF9C3',
    textColor: '#854D0E',
    icon: '📊',
    questions: [
      q('welcome_screen', 'We\'d love your feedback', {
        config: { buttonLabel: 'Share feedback', description: 'Takes 2 minutes. Completely anonymous unless you choose to share your name.' },
      }),
      q('nps', 'How likely are you to recommend us to a friend or colleague?', { required: true, config: { lowLabel: 'Not likely at all', highLabel: 'Extremely likely' } }),
      q('multiple_choice', 'What is the primary reason for your score?', {
        required: true,
        config: { choices: choices('Product quality', 'Customer support', 'Value for money', 'Ease of use', 'Speed & reliability', 'Missing features'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'What could we do to earn a higher score?', { config: { placeholder: 'Be as specific or as broad as you like…', minRows: 3 } }),
      q('rating', 'How easy is our product to use day-to-day?', { config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'How long have you been a customer?', {
        config: { choices: choices('Less than 1 month', '1–3 months', '3–12 months', 'More than a year'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Your name (optional)', { config: { placeholder: 'First name' } }),
      q('thank_you_screen', 'Thank you for your feedback!', {
        config: { message: 'Your response has been recorded. We read every piece of feedback and use it to make the product better.' },
      }),
    ],
  },
  {
    id: 'employee-satisfaction',
    title: 'Employee Satisfaction Survey',
    description: 'Keep your team happy with regular pulse surveys',
    category: 'surveys',
    color: '#E7E5E4',
    textColor: '#44403C',
    icon: '💼',
    questions: [
      q('welcome_screen', 'Your voice matters', {
        config: { buttonLabel: 'Start survey', description: 'This is an anonymous pulse survey — your answers are confidential and help shape how we work together.' },
      }),
      q('rating', 'How satisfied are you with your role overall?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('rating', 'How would you rate your work-life balance right now?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'How well do you feel your contributions are recognised?', {
        required: true,
        config: { choices: choices('Very well', 'Somewhat', 'Not very well', 'Not at all'), allowMultiple: false, allowOther: false },
      }),
      q('rating', "How confident are you in leadership's direction for the company?", { config: { steps: 5, shape: 'star' } }),
      q('yes_no', 'Do you feel you have the tools and resources you need to do your job well?', {}),
      q('multiple_choice', 'Which area most needs improvement?', {
        config: { choices: choices('Communication from leadership', 'Career development opportunities', 'Team collaboration', 'Compensation & benefits', 'Work environment'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'What would make your work experience meaningfully better?', { config: { placeholder: 'Share your thoughts — we read every response…', minRows: 4 } }),
      q('nps', 'How likely are you to recommend us as a great place to work?', { required: true, config: { lowLabel: 'Not likely', highLabel: 'Extremely likely' } }),
      q('thank_you_screen', 'Thank you for sharing!', {
        config: { message: 'Your responses are anonymous and will be reviewed by the People team. We\'re committed to acting on your feedback.' },
      }),
    ],
  },
  {
    id: 'post-event',
    title: 'Post-Event Feedback',
    description: 'Capture valuable insights while the experience is still fresh',
    category: 'surveys',
    color: '#EDE9FE',
    textColor: '#6D28D9',
    icon: '🎓',
    questions: [
      q('welcome_screen', 'How did we do? 🎓', {
        config: { buttonLabel: 'Leave feedback', description: 'Share your thoughts on today\'s event — takes 2 minutes and helps us make the next one even better.' },
      }),
      q('rating', 'How would you rate the event overall?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'How did you attend?', {
        config: { choices: choices('In-person', 'Online / virtual'), allowMultiple: false, allowOther: false },
      }),
      q('rating', 'How relevant was the content to your work or interests?', { config: { steps: 5, shape: 'star' } }),
      q('rating', 'How would you rate the speakers and presenters?', { config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'Which session was your favourite?', {
        config: { choices: choices('Opening keynote', 'Workshop', 'Panel discussion', 'Networking session', 'Closing keynote'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'What type of content would you like more of next time?', {
        config: { choices: choices('Deep-dive technical sessions', 'Case studies & real examples', 'Live Q&A with speakers', 'Hands-on workshops', 'More networking time'), allowMultiple: true, allowOther: false },
      }),
      q('long_text', 'What could we improve for the next event?', { config: { placeholder: 'Your honest feedback…', minRows: 3 } }),
      q('yes_no', 'Would you attend this event again?', { required: true }),
      q('short_text', 'Any sessions or speakers you\'d love to see next time?', { config: { placeholder: 'Names, topics, formats…' } }),
      q('thank_you_screen', 'Thanks for attending and sharing your thoughts!', {
        config: { message: 'Your feedback directly shapes what we programme next time. Watch this space — we\'ll announce the next event soon.' },
      }),
    ],
  },

  // ── QUIZZES ───────────────────────────────────────────────
  {
    id: 'digital-marketing-quiz',
    title: 'Digital Marketing Quiz',
    description: 'Test and grow your audience\'s marketing knowledge',
    category: 'quizzes',
    color: '#FFEDD5',
    textColor: '#C2410C',
    icon: '📱',
    questions: [
      q('welcome_screen', 'Test your Digital Marketing knowledge! 🎯', { config: { buttonLabel: 'Start quiz', description: '5 questions · ~2 minutes' } }),
      q('multiple_choice', 'What does CTR stand for?', {
        required: true,
        config: { choices: choices('Click-Through Rate', 'Cost To Reach', 'Customer Track Record', 'Content Traffic Ratio'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which metric measures the cost of acquiring one customer?', {
        required: true,
        config: { choices: choices('CPA', 'CPM', 'CTR', 'ROAS'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'What is a "lookalike audience" in paid social advertising?', {
        required: true,
        config: { choices: choices('People similar to your existing customers', 'People who visited your site', 'Your email subscribers', 'A retargeting list'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'What does SEO stand for?', {
        required: true,
        config: { choices: choices('Search Engine Optimization', 'Social Engagement Output', 'Sponsored External Offers', 'Site Experience Overhaul'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which is NOT a Google Ads bidding strategy?', {
        required: true,
        config: { choices: choices('Engagement Maximizer', 'Target CPA', 'Maximize Conversions', 'Target ROAS'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Get your results emailed to you', { config: { placeholder: 'your@email.com' } }),
    ],
  },
  {
    id: 'personality-quiz',
    title: 'Personality Quiz',
    description: 'Engage your audience with fun, shareable personality insights',
    category: 'quizzes',
    color: '#E0F2FE',
    textColor: '#0369A1',
    icon: '🧠',
    questions: [
      q('welcome_screen', 'Discover your creator personality type! 🎨', { config: { buttonLabel: 'Find out', description: 'Answer 5 quick questions' } }),
      q('multiple_choice', 'When starting a new project, you tend to…', {
        required: true,
        config: { choices: choices('Plan everything out in detail first', 'Dive straight in and figure it out', 'Research what others have done', 'Collaborate with someone immediately'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Your ideal work environment is…', {
        required: true,
        config: { choices: choices('Quiet and solo focus time', 'A buzzing coworking space', 'Flexible, switching between both', 'Fully remote from anywhere'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'When you hit a creative block, you…', {
        required: true,
        config: { choices: choices('Take a walk to clear your head', 'Look for inspiration online', 'Chat with a friend or colleague', 'Push through and keep working'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'You measure success by…', {
        required: true,
        config: { choices: choices('Revenue and metrics', 'Personal satisfaction', 'Audience growth', 'Peer recognition'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Your favourite tool is…', {
        required: true,
        config: { choices: choices('A notebook and pen', 'A spreadsheet', 'A design tool', 'A messaging app'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Where should we send your personality result?', { required: true, config: { placeholder: 'your@email.com' } }),
    ],
  },
  {
    id: 'lead-gen-quiz',
    title: 'Lead Generation Quiz',
    description: 'Qualify leads while delivering personalised value',
    category: 'quizzes',
    color: '#DCFCE7',
    textColor: '#15803D',
    icon: '💡',
    questions: [
      q('welcome_screen', 'Find the right plan for your team in 2 minutes', { config: { buttonLabel: "Let's go →", description: '6 quick questions' } }),
      q('multiple_choice', 'What type of forms do you need most?', {
        required: true,
        config: { choices: choices('Lead capture / contact forms', 'Surveys & feedback', 'Quizzes & assessments', 'Order / payment forms'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How many responses do you expect per month?', {
        required: true,
        config: { choices: choices('Under 100', '100 – 1,000', '1,000 – 10,000', '10,000+'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How many team members need access?', {
        required: true,
        config: { choices: choices('Just me', '2–3 people', '4–10 people', 'More than 10'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which integration is most important to you?', {
        config: { choices: choices('Google Sheets', 'Slack notifications', 'Stripe payments', 'Zapier / webhooks', 'Email notifications'), allowMultiple: false, allowOther: false },
      }),
      q('yes_no', 'Do you need to remove the FormFlow branding?', {}),
      q('short_text', 'Your name', { required: true, config: { placeholder: 'First name' } }),
      q('short_text', 'Email address for your personalised recommendation', { required: true, config: { placeholder: 'your@email.com' } }),
    ],
  },
  {
    id: 'product-recommender',
    title: 'Product Recommender',
    description: 'Help customers find the perfect product for their needs',
    category: 'quizzes',
    color: '#FAE8FF',
    textColor: '#86198F',
    icon: '🎯',
    questions: [
      q('welcome_screen', 'Find your perfect product in under a minute', { config: { buttonLabel: 'Start', description: '' } }),
      q('multiple_choice', 'What is your primary goal?', {
        required: true,
        config: { choices: choices('Build muscle', 'Lose weight', 'Improve endurance', 'Boost energy', 'Reduce stress'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How would you describe your current fitness level?', {
        config: { choices: choices('Beginner', 'Intermediate', 'Advanced', 'Athletic / competitive'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How much time can you commit per day?', {
        config: { choices: choices('Under 15 minutes', '15–30 minutes', '30–60 minutes', '60+ minutes'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Do you prefer to work out at home or at the gym?', {
        config: { choices: choices('Home', 'Gym', 'Both', 'Outdoors'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Where should we send your personalised recommendation?', { required: true, config: { placeholder: 'your@email.com' } }),
    ],
  },
  {
    id: 'trivia',
    title: 'Trivia Challenge',
    description: 'Gamify your content with a scored knowledge quiz',
    category: 'quizzes',
    color: '#FEF9C3',
    textColor: '#854D0E',
    icon: '🏆',
    questions: [
      q('welcome_screen', "Ready for today's trivia? 🏆", { config: { buttonLabel: 'Start', description: '5 questions — no time limit!' } }),
      q('multiple_choice', 'What year was the World Wide Web invented?', {
        required: true,
        config: { choices: choices('1985', '1989', '1993', '1997'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which planet is closest to the Sun?', {
        required: true,
        config: { choices: choices('Venus', 'Earth', 'Mercury', 'Mars'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How many bones are in the adult human body?', {
        required: true,
        config: { choices: choices('196', '206', '216', '226'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Who painted the Mona Lisa?', {
        required: true,
        config: { choices: choices('Michelangelo', 'Raphael', 'Leonardo da Vinci', 'Caravaggio'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Enter your email to see your score', { required: true, config: { placeholder: 'your@email.com' } }),
    ],
  },
  {
    id: 'skills-assessment',
    title: 'Skills Assessment',
    description: 'Evaluate competencies and skills with structured scoring',
    category: 'quizzes',
    color: '#FEE2E2',
    textColor: '#B91C1C',
    icon: '🔥',
    questions: [
      q('welcome_screen', 'Skills Assessment 🔥', {
        config: { buttonLabel: 'Begin assessment', description: 'Rate your proficiency honestly — there are no wrong answers. This helps us match you with the right opportunities.' },
      }),
      q('short_text', 'Full name', { required: true, config: { placeholder: 'Your full name' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'your@email.com' } }),
      q('multiple_choice', 'Rate your proficiency in JavaScript', {
        required: true,
        config: { choices: choices('No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Rate your proficiency in UI / UX Design', {
        config: { choices: choices('No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Rate your proficiency in Data Analysis', {
        config: { choices: choices('No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Rate your proficiency in Project Management', {
        config: { choices: choices('No experience', 'Beginner', 'Intermediate', 'Advanced', 'Expert'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which area do you want to grow most in the next 12 months?', {
        config: { choices: choices('Frontend development', 'Backend / infrastructure', 'Product design', 'Data & analytics', 'Leadership & strategy'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'Describe a recent project where you applied these skills', { required: true, config: { placeholder: 'What was the project, your role, and the outcome?', minRows: 4 } }),
      q('file_upload', 'Upload your portfolio or CV (optional)', { config: { allowedTypes: ['pdf', 'png', 'jpg', 'doc', 'docx'], maxSizeMb: 10, maxFiles: 1 } }),
      q('thank_you_screen', 'Assessment complete!', {
        config: { message: 'Thank you for taking the time to complete this assessment. Our team will review your responses and be in touch shortly.' },
      }),
    ],
  },
];

// Build question objects matching the builderStore format
function buildQuestions(rawQuestions) {
  return rawQuestions.map((rq, position) => ({
    id: crypto.randomUUID(),
    type: rq.type,
    title: rq.title,
    description: rq.description ?? '',
    required: rq.required ?? false,
    config: rq.config ?? {},
    validation: {},
    logic: [],
    position,
    _isNew: true,
  }));
}

// Curated background photos (picsum.photos — same seed = same photo)
const PICSUM = (seed) => `https://picsum.photos/seed/${seed}/1600/900`;

const TEMPLATE_IMAGES = {
  'testimonial':          PICSUM('testimonial'),
  'client-intake':        PICSUM('client-intake'),
  'lead-capture':         PICSUM('lead-capture'),
  'contact':              PICSUM('contact-form'),
  'job-application':      PICSUM('job-application'),
  'order-form':           PICSUM('order-form'),
  'market-research':      PICSUM('market-research'),
  'saas-onboarding':      PICSUM('saas-onboarding'),
  'cancellation':         PICSUM('cancellation'),
  'nps':                  PICSUM('nps-survey'),
  'employee-satisfaction':PICSUM('employee-satisfaction'),
  'post-event':           PICSUM('post-event'),
  'digital-marketing-quiz':PICSUM('digital-marketing'),
  'personality-quiz':     PICSUM('personality-quiz'),
  'lead-gen-quiz':        PICSUM('lead-gen-quiz'),
  'product-recommender':  PICSUM('product-recommender'),
  'trivia':               PICSUM('trivia-challenge'),
  'skills-assessment':    PICSUM('skills-assessment'),
};

export const TEMPLATES = RAW.map(t => ({
  ...t,
  backgroundImage: TEMPLATE_IMAGES[t.id] ?? null,
  questions: buildQuestions(t.questions),
}));

export const CATEGORIES = [
  { id: 'all',     label: 'All templates' },
  { id: 'forms',   label: 'Forms' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'quizzes', label: 'Quizzes' },
];

export function getTemplatesByCategory(cat) {
  if (cat === 'all') return TEMPLATES;
  return TEMPLATES.filter(t => t.category === cat);
}
