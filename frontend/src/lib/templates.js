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
      q('welcome_screen', 'Are you ready to share your testimonial?', { config: { buttonLabel: 'Share', description: '' } }),
      q('short_text', "What's your full name?", { required: true, config: { placeholder: 'Your name…' } }),
      q('short_text', 'What is your job title and company?', { config: { placeholder: 'e.g. CEO at Acme Inc.' } }),
      q('rating', 'How would you rate your overall experience?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('long_text', 'Tell us about your experience — what problem did we solve for you?', { required: true, config: { placeholder: 'Share your story…', minRows: 4 } }),
      q('yes_no', 'Can we feature this testimonial publicly on our website?', { required: true }),
      q('thank_you_screen', 'Thank you for your review! 🙏', { config: { message: 'We really appreciate you taking the time.' } }),
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
      q('short_text', 'Your full name', { required: true, config: { placeholder: 'Jane Smith' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'jane@company.com' } }),
      q('short_text', 'Phone number', { config: { placeholder: '+1 (555) 000-0000' } }),
      q('short_text', 'Company or organization name', { config: { placeholder: 'Acme Inc.' } }),
      q('multiple_choice', 'What type of project is this?', {
        required: true,
        config: { choices: choices('Website design', 'Mobile app', 'Branding', 'Marketing campaign', 'Other'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'What is your estimated budget?', {
        required: true,
        config: { choices: choices('Under $1,000', '$1,000 – $5,000', '$5,000 – $20,000', '$20,000+'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'What is your desired timeline?', { config: { placeholder: 'e.g. 6 weeks' } }),
      q('long_text', 'Describe your goals — what does success look like?', { required: true, config: { placeholder: 'Tell us about your project…', minRows: 4 } }),
      q('short_text', 'How did you hear about us?', { config: { placeholder: 'Referral, Google, social media…' } }),
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
      q('short_text', 'Your first name', { required: true, config: { placeholder: 'First name' } }),
      q('short_text', 'Work email address', { required: true, config: { placeholder: 'you@company.com' } }),
      q('short_text', 'Company name', { config: { placeholder: 'Company' } }),
      q('multiple_choice', 'Company size', {
        config: { choices: choices('1–10', '11–50', '51–200', '201–500', '500+'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', "What's your biggest challenge right now?", {
        config: { choices: choices('Lead generation', 'Customer retention', 'Team productivity', 'Product development', 'Other'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', "Anything specific you'd like us to know?", { config: { placeholder: 'Optional…', minRows: 3 } }),
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
      q('short_text', 'Your name', { required: true, config: { placeholder: 'Full name' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'your@email.com' } }),
      q('short_text', 'Subject', { required: true, config: { placeholder: 'How can we help?' } }),
      q('multiple_choice', 'How can we help you?', {
        config: { choices: choices('General inquiry', 'Technical support', 'Billing', 'Partnership', 'Other'), allowMultiple: false, allowOther: false },
      }),
      q('long_text', 'Your message', { required: true, config: { placeholder: 'Tell us more…', minRows: 4 } }),
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
      q('short_text', 'Full name', { required: true, config: { placeholder: 'Your full name' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'you@email.com' } }),
      q('short_text', 'Phone number', { config: { placeholder: '+1 (555) 000-0000' } }),
      q('short_text', 'Position you are applying for', { required: true, config: { placeholder: 'e.g. Senior Designer' } }),
      q('short_text', 'LinkedIn profile URL', { config: { placeholder: 'https://linkedin.com/in/…' } }),
      q('number', 'Years of relevant experience', { config: { placeholder: '0', min: 0, max: 50 } }),
      q('multiple_choice', 'Preferred work arrangement', {
        config: { choices: choices('Remote', 'On-site', 'Hybrid'), allowMultiple: false, allowOther: false },
      }),
      q('long_text', 'Why do you want to work with us? Tell us about yourself.', { required: true, config: { placeholder: 'Your answer…', minRows: 5 } }),
      q('file_upload', 'Upload your resume / CV', { required: true, config: { allowedTypes: ['pdf', 'doc', 'docx'], maxSizeMb: 10, maxFiles: 1 } }),
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
      q('short_text', 'Your full name', { required: true, config: { placeholder: 'Full name' } }),
      q('short_text', 'Email address for order confirmation', { required: true, config: { placeholder: 'your@email.com' } }),
      q('multiple_choice', 'Select a product', {
        required: true,
        config: { choices: choices('Starter Pack – $29', 'Professional Pack – $79', 'Enterprise Pack – $199'), allowMultiple: false, allowOther: false },
      }),
      q('number', 'Quantity', { required: true, config: { placeholder: '1', min: 1, max: 100 } }),
      q('long_text', 'Shipping address', { required: true, config: { placeholder: 'Street, city, state, ZIP, country', minRows: 3 } }),
      q('short_text', 'Promo code (optional)', { config: { placeholder: 'DISCOUNT20' } }),
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
      q('multiple_choice', 'Which industry are you in?', {
        required: true,
        config: { choices: choices('Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Other'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'What is your role?', {
        config: { choices: choices('Founder / CEO', 'Product', 'Engineering', 'Marketing', 'Sales', 'Other'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'What are your biggest pain points?', {
        config: { choices: choices('Finding customers', 'Retaining customers', 'Team management', 'Building product', 'Competition'), allowMultiple: true, allowOther: false },
      }),
      q('rating', 'How satisfied are you with current solutions available?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'How much would you pay for a solution that fully solves this?', {
        config: { choices: choices('$0 — I wouldn\'t pay', '$1–$50/mo', '$51–$200/mo', '$200+/mo'), allowMultiple: false, allowOther: false },
      }),
      q('long_text', 'What would the ideal solution look like for you?', { config: { placeholder: 'Describe your ideal solution…', minRows: 4 } }),
      q('multiple_choice', 'How do you prefer to evaluate new tools?', {
        config: { choices: choices('Free trial', 'Demo / call', 'Reviews / case studies', 'Referral from peers'), allowMultiple: false, allowOther: false },
      }),
      q('short_text', 'Email for research summary (optional)', { config: { placeholder: 'your@email.com' } }),
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
      q('multiple_choice', 'What is your primary goal with our product?', {
        required: true,
        config: { choices: choices('Grow revenue', 'Save time', 'Reduce costs', 'Improve team collaboration', 'Better analytics'), allowMultiple: false, allowOther: true },
      }),
      q('multiple_choice', 'Team size', {
        config: { choices: choices('Just me', '2–10', '11–50', '50+'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'How would you describe your use case?', {
        config: { choices: choices('Internal tool', 'Client-facing', 'Personal project', 'Agency / freelance'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which feature are you most excited about?', {
        config: { choices: choices('Form builder', 'Analytics', 'Integrations', 'AI generation', 'Templates'), allowMultiple: false, allowOther: false },
      }),
      q('rating', 'How easy was our signup process?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('long_text', 'What should we build next? Any feedback for the team?', { config: { placeholder: 'Your thoughts…', minRows: 3 } }),
      q('short_text', 'How did you hear about us?', { config: { placeholder: 'Referral, Google, Twitter…' } }),
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
      q('multiple_choice', 'Why are you canceling?', {
        required: true,
        config: { choices: choices('Too expensive', 'Missing a feature I need', 'Found a better alternative', 'No longer need it', 'Technical issues', 'Just testing'), allowMultiple: false, allowOther: true },
      }),
      q('nps', 'How likely are you to recommend us to someone else?', { required: true, config: { lowLabel: 'Not likely', highLabel: 'Extremely likely' } }),
      q('long_text', 'What would have made you stay?', { config: { placeholder: 'Your honest feedback helps us improve…', minRows: 3 } }),
      q('rating', 'Overall, how satisfied were you with the product?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('yes_no', 'Would you consider coming back if we added what you needed?', {}),
      q('short_text', "Email us if you'd like a personal response", { config: { placeholder: 'your@email.com' } }),
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
      q('nps', 'How likely are you to recommend us to a friend or colleague?', { required: true, config: { lowLabel: 'Not likely at all', highLabel: 'Extremely likely' } }),
      q('multiple_choice', 'What is the primary reason for your score?', {
        config: { choices: choices('Product quality', 'Customer support', 'Value for money', 'Ease of use', 'Missing features'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'What could we do to improve your score?', { config: { placeholder: 'Any feedback is welcome…', minRows: 3 } }),
      q('short_text', 'Your name (optional)', { config: { placeholder: 'First name' } }),
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
      q('rating', 'How satisfied are you with your role overall?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('rating', 'How would you rate your work-life balance?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'How well do you feel your efforts are recognized?', {
        config: { choices: choices('Very well', 'Somewhat', 'Not very well', 'Not at all'), allowMultiple: false, allowOther: false },
      }),
      q('rating', "How confident are you in leadership's direction?", { config: { steps: 5, shape: 'star' } }),
      q('yes_no', 'Do you feel you have the tools and resources to do your job well?', {}),
      q('long_text', 'What would make your work experience better?', { config: { placeholder: 'Share your thoughts…', minRows: 4 } }),
      q('nps', 'How likely are you to recommend us as a great place to work?', { required: true, config: { lowLabel: 'Not likely', highLabel: 'Extremely likely' } }),
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
      q('rating', 'How would you rate the event overall?', { required: true, config: { steps: 5, shape: 'star' } }),
      q('rating', 'How relevant was the content to you?', { config: { steps: 5, shape: 'star' } }),
      q('rating', 'How would you rate the speakers / presenters?', { config: { steps: 5, shape: 'star' } }),
      q('multiple_choice', 'How did you attend?', {
        config: { choices: choices('In-person', 'Online / virtual'), allowMultiple: false, allowOther: false },
      }),
      q('multiple_choice', 'Which session was your favourite?', {
        config: { choices: choices('Opening keynote', 'Workshop', 'Panel discussion', 'Networking session', 'Closing keynote'), allowMultiple: false, allowOther: true },
      }),
      q('long_text', 'What could we improve for next time?', { config: { placeholder: 'Your honest feedback…', minRows: 3 } }),
      q('yes_no', 'Would you attend this event again?', { required: true }),
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
      q('short_text', 'Full name', { required: true, config: { placeholder: 'Your full name' } }),
      q('short_text', 'Email address', { required: true, config: { placeholder: 'your@email.com' } }),
      q('multiple_choice', 'Rate your proficiency in JavaScript', {
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
      q('long_text', 'Describe a project where you applied these skills', { required: true, config: { placeholder: 'Tell us about your work…', minRows: 4 } }),
      q('file_upload', 'Upload your portfolio or CV (optional)', { config: { allowedTypes: ['pdf', 'png', 'jpg', 'doc', 'docx'], maxSizeMb: 10, maxFiles: 1 } }),
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
