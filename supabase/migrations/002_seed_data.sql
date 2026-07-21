-- ============================================================
-- FormFlow — Seed Data
-- Migration: 002_seed_data.sql
-- ============================================================

-- ============================================================
-- TEMPLATES
-- ============================================================

INSERT INTO public.templates (title, description, category, is_featured, snapshot) VALUES

('Contact Us', 'Simple contact form with name, email, and message', 'contact', true, '{
  "title": "Contact Us",
  "description": "We'\''d love to hear from you",
  "layout": "conversational",
  "theme": { "primaryColor": "#6366f1", "backgroundColor": "#ffffff", "fontFamily": "Inter", "buttonStyle": "rounded" },
  "questions": [
    { "type": "short_text", "title": "What'\''s your name?", "required": true, "position": 0, "config": { "placeholder": "Your full name" } },
    { "type": "email", "title": "What'\''s your email address?", "required": true, "position": 1, "config": { "placeholder": "you@example.com" } },
    { "type": "long_text", "title": "How can we help you?", "required": true, "position": 2, "config": { "placeholder": "Tell us what'\''s on your mind...", "minRows": 3 } },
    { "type": "thank_you_screen", "title": "Thank you for reaching out!", "position": 3, "config": { "message": "We'\''ll get back to you within 24 hours." } }
  ]
}'),

('Product Feedback', 'Collect structured feedback on your product', 'feedback', true, '{
  "title": "Share Your Feedback",
  "description": "Help us make our product better",
  "layout": "conversational",
  "theme": { "primaryColor": "#8b5cf6", "backgroundColor": "#fafafa", "fontFamily": "Inter", "buttonStyle": "rounded" },
  "questions": [
    { "type": "nps", "title": "How likely are you to recommend us to a friend or colleague?", "required": true, "position": 0, "config": { "lowLabel": "Not likely", "highLabel": "Extremely likely" } },
    { "type": "multiple_choice", "title": "What do you like most about our product?", "required": false, "position": 1, "config": { "choices": [{"id":"c1","label":"Ease of use"},{"id":"c2","label":"Features"},{"id":"c3","label":"Speed"},{"id":"c4","label":"Price"},{"id":"c5","label":"Support"}], "allowMultiple": true } },
    { "type": "long_text", "title": "What could we improve?", "required": false, "position": 2, "config": { "placeholder": "Your honest feedback helps us improve..." } },
    { "type": "rating", "title": "Overall, how would you rate your experience?", "required": true, "position": 3, "config": { "steps": 5, "shape": "star" } },
    { "type": "thank_you_screen", "title": "Thank you for your feedback!", "position": 4, "config": { "message": "Your input shapes our product roadmap." } }
  ]
}'),

('Waitlist Signup', 'Collect early access signups for your product launch', 'lead_gen', true, '{
  "title": "Join the Waitlist",
  "description": "Be first to know when we launch",
  "layout": "conversational",
  "theme": { "primaryColor": "#f59e0b", "backgroundColor": "#ffffff", "fontFamily": "Inter", "buttonStyle": "rounded" },
  "questions": [
    { "type": "welcome_screen", "title": "Get early access 🚀", "position": 0, "config": { "buttonLabel": "Join the waitlist", "description": "Join thousands waiting for launch day." } },
    { "type": "short_text", "title": "What'\''s your first name?", "required": true, "position": 1, "config": { "placeholder": "First name" } },
    { "type": "email", "title": "What'\''s your email?", "required": true, "position": 2, "config": { "placeholder": "you@example.com" } },
    { "type": "multiple_choice", "title": "What best describes you?", "required": false, "position": 3, "config": { "choices": [{"id":"c1","label":"Founder / Entrepreneur"},{"id":"c2","label":"Developer"},{"id":"c3","label":"Marketer"},{"id":"c4","label":"Student"},{"id":"c5","label":"Other"}] } },
    { "type": "thank_you_screen", "title": "You'\''re on the list! 🎉", "position": 4, "config": { "message": "We'\''ll email you as soon as we launch." } }
  ]
}'),

('Job Application', 'Standard job application form for candidates', 'hr', false, '{
  "title": "Apply for [Position]",
  "description": "We'\''re excited you'\''re interested in joining our team",
  "layout": "classic",
  "theme": { "primaryColor": "#0ea5e9", "backgroundColor": "#ffffff", "fontFamily": "Inter", "buttonStyle": "rounded" },
  "questions": [
    { "type": "short_text", "title": "Full name", "required": true, "position": 0 },
    { "type": "email", "title": "Email address", "required": true, "position": 1 },
    { "type": "phone", "title": "Phone number", "required": false, "position": 2 },
    { "type": "short_text", "title": "LinkedIn profile URL", "required": false, "position": 3 },
    { "type": "file_upload", "title": "Upload your resume (PDF)", "required": true, "position": 4, "config": { "allowedTypes": ["pdf"], "maxSizeMb": 5, "maxFiles": 1 } },
    { "type": "long_text", "title": "Why do you want to join us?", "required": true, "position": 5 },
    { "type": "multiple_choice", "title": "When can you start?", "required": true, "position": 6, "config": { "choices": [{"id":"c1","label":"Immediately"},{"id":"c2","label":"2 weeks"},{"id":"c3","label":"1 month"},{"id":"c4","label":"More than 1 month"}] } },
    { "type": "thank_you_screen", "title": "Application received!", "position": 7, "config": { "message": "We review all applications within 5 business days." } }
  ]
}'),

('Event Registration', 'Collect RSVPs and registrations for your event', 'event', false, '{
  "title": "Register for [Event Name]",
  "description": "Secure your spot today",
  "layout": "conversational",
  "theme": { "primaryColor": "#10b981", "backgroundColor": "#ffffff", "fontFamily": "Inter", "buttonStyle": "rounded" },
  "questions": [
    { "type": "short_text", "title": "Your full name", "required": true, "position": 0 },
    { "type": "email", "title": "Your email address", "required": true, "position": 1 },
    { "type": "multiple_choice", "title": "How many seats do you need?", "required": true, "position": 2, "config": { "choices": [{"id":"c1","label":"1"},{"id":"c2","label":"2"},{"id":"c3","label":"3"},{"id":"c4","label":"4+"}] } },
    { "type": "multiple_choice", "title": "How did you hear about this event?", "required": false, "position": 3, "config": { "choices": [{"id":"c1","label":"Social media"},{"id":"c2","label":"Friend/colleague"},{"id":"c3","label":"Email newsletter"},{"id":"c4","label":"Search engine"}] } },
    { "type": "yes_no", "title": "Do you have any dietary restrictions?", "required": false, "position": 4 },
    { "type": "thank_you_screen", "title": "You'\''re registered! 🎟️", "position": 5, "config": { "message": "Check your email for confirmation details." } }
  ]
}'),

('Customer Satisfaction (CSAT)', 'Quick CSAT survey for support interactions', 'feedback', true, '{
  "title": "How did we do?",
  "description": "Your feedback helps us improve our service",
  "layout": "conversational",
  "theme": { "primaryColor": "#6366f1", "backgroundColor": "#ffffff", "fontFamily": "Inter", "buttonStyle": "rounded" },
  "questions": [
    { "type": "rating", "title": "How satisfied are you with the support you received?", "required": true, "position": 0, "config": { "steps": 5, "shape": "star", "labels": {"low":"Very unsatisfied","high":"Very satisfied"} } },
    { "type": "multiple_choice", "title": "What best describes your experience?", "required": false, "position": 1, "config": { "choices": [{"id":"c1","label":"Issue resolved quickly"},{"id":"c2","label":"Friendly and helpful"},{"id":"c3","label":"Had to follow up multiple times"},{"id":"c4","label":"Issue not fully resolved"}] } },
    { "type": "long_text", "title": "Any additional comments?", "required": false, "position": 2, "config": { "placeholder": "Anything you'\''d like to add..." } },
    { "type": "thank_you_screen", "title": "Thanks for the feedback!", "position": 3, "config": { "message": "We read every response and use it to improve." } }
  ]
}');

-- ============================================================
-- PLAN LIMIT REFERENCE (used by API, not stored in DB per-row)
-- Stored here as a comment for documentation; enforced in code
-- ============================================================
-- free:       { responses_limit: 100,    storage_limit_mb: 100,   custom_domain: false, remove_branding: false }
-- pro:        { responses_limit: 5000,   storage_limit_mb: 2048,  custom_domain: true,  remove_branding: true  }
-- business:   { responses_limit: 25000,  storage_limit_mb: 10240, custom_domain: true,  remove_branding: true  }
-- enterprise: { responses_limit: null,   storage_limit_mb: null,  custom_domain: true,  remove_branding: true  }
