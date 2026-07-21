import { supabaseAdmin } from './supabase.js';
import { emailService } from './email.js';
import { logger } from './logger.js';
export const responseQueue = {
  add: async (name, data) => { try { await processResponse(data); } catch (err) { logger.error('Job failed', { err: err.message }); } }
};
async function processResponse({ responseId, formId, workspaceId }) {
  const { data: response } = await supabaseAdmin.from('responses').select('answers, respondent_email').eq('id', responseId).single();
  const { data: form } = await supabaseAdmin.from('forms').select('title, responses_count').eq('id', formId).single();
  if (!response || !form) return;
  const { data: notifications } = await supabaseAdmin.from('notification_settings').select('*, profiles(email)').eq('form_id', formId).eq('event', 'new_response').eq('enabled', true);
  for (const notif of notifications ?? []) {
    await emailService.sendNewResponseNotification({ to: notif.profiles.email, formTitle: form.title, formUrl: `${process.env.APP_URL}/forms/${formId}/responses`, responseCount: form.responses_count }).catch(() => {});
  }
}
