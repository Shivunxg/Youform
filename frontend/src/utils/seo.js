const CATEGORY_META = {
  contact: {
    title: 'Contact Form Templates',
    description: 'Free contact form templates. Collect name, email, and messages with a conversational flow. Works on any website.',
  },
  'lead-capture': {
    title: 'Lead Capture Form Templates',
    description: 'Turn visitors into qualified leads. Free lead capture form templates with conditional logic and CRM integrations.',
  },
  'client-intake': {
    title: 'Client Intake Form Templates',
    description: 'Onboard clients faster with smart intake forms. Capture project details, budget, and timelines upfront.',
  },
  feedback: {
    title: 'Feedback Survey Templates',
    description: 'Collect star ratings, testimonials, and product feedback. Free feedback form templates for any product or service.',
  },
  nps: {
    title: 'NPS Survey Templates',
    description: 'Measure customer loyalty with Net Promoter Score surveys. Free NPS templates with conditional follow-up questions.',
  },
  hiring: {
    title: 'Job Application Form Templates',
    description: 'Streamline hiring with polished job application forms. File uploads, screening questions, and ATS integrations.',
  },
  research: {
    title: 'Market Research Survey Templates',
    description: 'Run structured market research with Likert scales, ranking questions, and Google Sheets export.',
  },
};

const TEMPLATE_META = {
  'contact-form': {
    title: 'Free Contact Form Template',
    description: 'A friendly contact form with name, email, and message fields. Conversational flow that gets more responses. Free on FormFlowX.',
    imageAlt: 'Contact form template preview — conversational name, email, and message fields',
  },
  'lead-capture': {
    title: 'Free Lead Capture Form Template',
    description: 'Qualify leads with company size, buying intent, and contact info in a single conversational flow. Free on FormFlowX.',
    imageAlt: 'Lead capture form template preview — company size, intent, and contact fields',
  },
  'client-intake': {
    title: 'Free Client Intake Form Template',
    description: 'Onboard clients in minutes. Captures project details, budget, timeline, and goals. Free on FormFlowX.',
    imageAlt: 'Client intake form template preview — project scope, budget, and timeline fields',
  },
  'nps-survey': {
    title: 'Free NPS Survey Template',
    description: 'Measure customer loyalty with a 0–10 rating scale and conditional follow-ups for promoters and detractors. Free on FormFlowX.',
    imageAlt: 'NPS survey template preview — 0 to 10 rating scale with follow-up questions',
  },
  feedback: {
    title: 'Free Feedback Survey Template',
    description: 'Collect star ratings, open feedback, and testimonials. Routes happy customers to share publicly. Free on FormFlowX.',
    imageAlt: 'Feedback survey template preview — star rating and open comment fields',
  },
  'job-application': {
    title: 'Free Job Application Form Template',
    description: 'A polished job application with CV upload, role screening, and conditional questions. Free on FormFlowX.',
    imageAlt: 'Job application form template preview — CV upload and screening question fields',
  },
  'market-research': {
    title: 'Free Market Research Survey Template',
    description: 'Likert scales, ranking questions, demographic filters, and Google Sheets export. Free on FormFlowX.',
    imageAlt: 'Market research survey template preview — Likert scale and ranking question fields',
  },
};

export function getTemplateSEO(slug) {
  return TEMPLATE_META[slug] ?? {
    title: 'Free Form Template',
    description: 'Free, ready-to-use form template on FormFlowX. Customise in minutes, no code needed.',
    imageAlt: 'Form template preview',
  };
}

export function getCategorySEO(slug) {
  return CATEGORY_META[slug] ?? {
    title: 'Form Templates',
    description: 'Free form templates for every use case. No code needed.',
  };
}

export function templateImageAlt(templateName) {
  return `${templateName} form template preview — ready to use on FormFlowX`;
}

export function categoryImageAlt(categoryName) {
  return `${categoryName} form templates — free and ready to customise on FormFlowX`;
}
