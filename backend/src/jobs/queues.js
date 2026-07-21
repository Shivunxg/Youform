import { Queue, Worker } from 'bullmq';
import { supabaseAdmin } from '../lib/supabase.js';
import { emailService } from '../services/email.js';
import { logger } from '../lib/logger.js';

const connection = { url: process.env.REDIS_URL };

// ============================================================
// Queue definitions
// ============================================================
export const responseQueue = new Queue('response-processing', { connection });
export const integrationQueue = new Queue('integration-delivery', { connection });

// ============================================================
// Response processing worker
// Runs after each new form submission
// ============================================================
export function startWorkers() {
  const responseWorker = new Worker(
    'response-processing',
    async (job) => {
      const { responseId, formId, workspaceId } = job.data;
      logger.debug('Processing response', { responseId, formId });

      // Fetch response + form details
      const { data: response } = await supabaseAdmin.from('responses')
        .select('id, answers, respondent_email, submitted_at').eq('id', responseId).single();

      const { data: form } = await supabaseAdmin.from('forms')
        .select('title, responses_count, settings').eq('id', formId).single();

      if (!response || !form) {
        logger.warn('Response or form not found for processing', { responseId, formId });
        return;
      }

      // 1. Send notification emails to form owner(s)
      await processNotifications(responseId, formId, form, response);

      // 2. Trigger integrations
      await processIntegrations(responseId, formId, workspaceId, response, form);

      logger.debug('Response processed', { responseId });
    },
    { connection, concurrency: 10 }
  );

  const integrationWorker = new Worker(
    'integration-delivery',
    async (job) => {
      const { integrationId, payload } = job.data;
      logger.debug('Delivering integration', { integrationId });

      const { data: integration } = await supabaseAdmin.from('integrations')
        .select('*').eq('id', integrationId).single();
      if (!integration || !integration.enabled) return;

      try {
        await deliverIntegration(integration, payload);
        await supabaseAdmin.from('integrations').update({ last_triggered_at: new Date().toISOString(), last_error: null }).eq('id', integrationId);
      } catch (err) {
        logger.error('Integration delivery failed', { integrationId, err: err.message });
        await supabaseAdmin.from('integrations').update({ last_error: err.message }).eq('id', integrationId);
        throw err; // BullMQ will retry
      }
    },
    { connection, concurrency: 5 }
  );

  responseWorker.on('failed', (job, err) => logger.error('Response worker failed', { job: job?.id, err: err.message }));
  integrationWorker.on('failed', (job, err) => logger.error('Integration worker failed', { job: job?.id, err: err.message }));

  logger.info('BullMQ workers started');
  return { responseWorker, integrationWorker };
}

// ============================================================
// Notification processing
// ============================================================
async function processNotifications(responseId, formId, form, response) {
  const { data: notifications } = await supabaseAdmin.from('notification_settings')
    .select('*, profiles(email)')
    .eq('form_id', formId)
    .eq('event', 'new_response')
    .eq('enabled', true);

  if (!notifications?.length) return;

  const formUrl = `${process.env.APP_URL}/forms/${formId}/responses`;

  for (const notif of notifications) {
    await emailService.sendNewResponseNotification({
      to: notif.profiles.email,
      formTitle: form.title,
      formUrl,
      responseCount: form.responses_count,
    }).catch(err => logger.error('Notification email failed', { err: err.message }));

    // Respondent confirmation
    if (notif.send_confirmation && response.respondent_email) {
      await emailService.sendRespondentConfirmation({
        to: response.respondent_email,
        subject: notif.confirmation_subject,
        body: notif.confirmation_body,
        formTitle: form.title,
      }).catch(err => logger.error('Confirmation email failed', { err: err.message }));
    }
  }
}

// ============================================================
// Integration dispatch
// ============================================================
async function processIntegrations(responseId, formId, workspaceId, response, form) {
  const { data: integrations } = await supabaseAdmin.from('integrations')
    .select('*').eq('form_id', formId).eq('enabled', true);

  if (!integrations?.length) return;

  const payload = {
    response_id: responseId,
    form_id: formId,
    workspace_id: workspaceId,
    form_title: form.title,
    submitted_at: response.submitted_at,
    answers: response.answers,
  };

  for (const integration of integrations) {
    await integrationQueue.add(
      'deliver',
      { integrationId: integration.id, payload },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );
  }
}

// ============================================================
// Integration delivery handlers
// ============================================================
async function deliverIntegration(integration, payload) {
  switch (integration.type) {
    case 'webhook':
      await deliverWebhook(integration.config, payload);
      break;

    case 'slack':
      await deliverSlack(integration.config, payload);
      break;

    case 'email':
      await deliverEmail(integration.config, payload);
      break;

    case 'google_sheets':
      await deliverGoogleSheets(integration.config, payload);
      break;

    default:
      logger.warn(`Integration type ${integration.type} not yet implemented`);
  }
}

async function deliverWebhook(config, payload) {
  const headers = {
    'Content-Type': 'application/json',
    ...(config.headers ?? {}),
  };
  if (config.secret) {
    // HMAC-SHA256 signature header
    const crypto = await import('crypto');
    const sig = crypto.createHmac('sha256', config.secret).update(JSON.stringify(payload)).digest('hex');
    headers['X-FormFlow-Signature'] = `sha256=${sig}`;
  }
  const resp = await fetch(config.url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!resp.ok) throw new Error(`Webhook returned ${resp.status}: ${await resp.text()}`);
}

async function deliverSlack(config, payload) {
  const text = `*New response* to *${payload.form_title}*\n${Object.keys(payload.answers).length} question(s) answered\n<${process.env.APP_URL}/forms/${payload.form_id}/responses|View response>`;
  const resp = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) throw new Error(`Slack webhook failed: ${resp.status}`);
}

async function deliverEmail(config, payload) {
  const recipients = Array.isArray(config.to) ? config.to : [config.to];
  for (const to of recipients) {
    await emailService.sendNewResponseNotification({
      to,
      formTitle: payload.form_title,
      formUrl: `${process.env.APP_URL}/forms/${payload.form_id}/responses`,
      responseCount: '(check dashboard)',
    });
  }
}

async function deliverGoogleSheets(config, payload) {
  // Placeholder — full OAuth implementation would use the stored oauth_tokens
  // and the Google Sheets API to append a row.
  logger.info('Google Sheets delivery — OAuth implementation pending', { formId: payload.form_id });
}
