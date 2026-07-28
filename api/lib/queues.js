import { supabaseAdmin } from './supabase.js';
import { hasFeature } from './plans.js';
import { emailService } from './email.js';
import { logger } from './logger.js';
import { getValidToken, ensureHeaders, appendRow } from './googleSheets.js';

// Fire-and-forget: processResponse runs after the HTTP response is sent.
// This prevents Vercel's 30s function timeout from blocking form submissions.
export const responseQueue = {
  add: (name, data) => {
    setImmediate(() => {
      processResponse(data).catch(err => logger.error('processResponse failed', { name, err: err.message }));
    });
  },
};

async function processResponse({ responseId, formId, workspaceId }) {
  const { data: response } = await supabaseAdmin
    .from('responses')
    .select('answers, respondent_email, submitted_at')
    .eq('id', responseId).single();

  const { data: form } = await supabaseAdmin
    .from('forms')
    .select('title, responses_count, settings, created_by, questions(id, title, type)')
    .eq('id', formId).single();

  if (!response || !form) return;

  // ── Email notifications (notification_settings table) ────
  const { data: notifications } = await supabaseAdmin
    .from('notification_settings')
    .select('*, profiles(email)')
    .eq('form_id', formId)
    .eq('event', 'new_response')
    .eq('enabled', true);

  const notifiedUserIds = new Set();

  for (const notif of notifications ?? []) {
    notifiedUserIds.add(notif.user_id);
    await emailService.sendNewResponseNotification({
      to:            notif.profiles.email,
      formTitle:     form.title,
      formUrl:       `${process.env.APP_URL}/forms/${formId}/responses`,
      responseCount: form.responses_count,
    }).catch(() => {});
  }

  // ── Owner notification (from form settings, default on) ──
  if (form.settings?.notifyOwner !== false && form.created_by && !notifiedUserIds.has(form.created_by)) {
    const { data: creator } = await supabaseAdmin
      .from('profiles').select('email').eq('id', form.created_by).single();
    if (creator?.email) {
      await emailService.sendNewResponseNotification({
        to:            creator.email,
        formTitle:     form.title,
        formUrl:       `${process.env.APP_URL}/forms/${formId}/responses`,
        responseCount: form.responses_count,
      }).catch(() => {});
    }
  }

  // ── Respondent confirmation email (Pro+) ─────────────────
  const { data: ws } = await supabaseAdmin.from('workspaces').select('plan').eq('id', workspaceId).single();
  if (form.settings?.notifyRespondent && hasFeature(ws?.plan, 'respondent_notifications')) {
    const respondentEmail = response.respondent_email
      ?? (form.questions ?? [])
          .filter(q => q.type === 'email')
          .map(q => response.answers?.[q.id])
          .find(v => v && String(v).includes('@'));
    if (respondentEmail) {
      await emailService.sendRespondentConfirmation({
        to:        String(respondentEmail),
        formTitle: form.title,
        subject:   form.settings.confirmationEmailSubject || `Thanks for completing "${form.title}"`,
        body:      form.settings.confirmationEmailBody || `Your response to "${form.title}" has been received. Thank you!`,
      }).catch(() => {});
    }
  }

  // ── Integration triggers ─────────────────────────────────
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('*')
    .eq('form_id', formId)
    .eq('enabled', true);

  for (const integration of integrations ?? []) {
    try {
      switch (integration.type) {
        case 'google_sheets':
          await triggerGoogleSheets(integration, response, form);
          break;
        case 'webhook':
          await triggerWebhook(integration, response, formId, responseId);
          break;
        case 'zapier':
          await triggerZapier(integration, response, formId, responseId);
          break;
        case 'slack':
          await triggerSlack(integration, response, form, formId);
          break;
        case 'notion':
          await triggerNotion(integration, response, form, responseId);
          break;
        default:
          break;
      }

      await supabaseAdmin.from('integrations')
        .update({ last_triggered_at: new Date().toISOString(), last_error: null })
        .eq('id', integration.id);
    } catch (err) {
      logger.error('Integration trigger failed', { type: integration.type, integrationId: integration.id, err: err.message });
      await supabaseAdmin.from('integrations')
        .update({ last_error: err.message })
        .eq('id', integration.id);
    }
  }
}

// ── Google Sheets ────────────────────────────────────────────────
async function triggerGoogleSheets(integration, response, form) {
  const config = integration.config;
  if (!config?.spreadsheetId) throw new Error('No spreadsheet configured — select a sheet in the integration settings');

  const { accessToken, updatedConfig } = await getValidToken(config);

  // If we got a refreshed token, persist it
  if (updatedConfig) {
    await supabaseAdmin.from('integrations')
      .update({ config: updatedConfig }).eq('id', integration.id);
  }

  const sheetName = config.sheetName || 'Sheet1';
  const answers   = response.answers ?? {};

  // Build ordered columns from the form's question list
  const questions = form.questions ?? [];
  const orderedKeys = questions
    .filter(q => !['welcome_screen', 'thank_you_screen'].includes(q.type))
    .map(q => q.id);

  const headers = ['Submitted At', 'Response ID', ...orderedKeys.map(id => {
    const q = questions.find(q => q.id === id);
    return q?.title || id;
  })];

  const values = [
    response.submitted_at ? new Date(response.submitted_at).toLocaleString() : new Date().toLocaleString(),
    integration.id,
    ...orderedKeys.map(id => {
      const v = answers[id];
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) return v.join(', ');
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    }),
  ];

  await ensureHeaders(accessToken, config.spreadsheetId, sheetName, headers);
  await appendRow(accessToken, config.spreadsheetId, sheetName, values);
}

// ── Webhook ──────────────────────────────────────────────────────
async function triggerWebhook(integration, response, formId, responseId) {
  const { url, headers: extraHeaders = {} } = integration.config;
  if (!url) throw new Error('No webhook URL configured');

  const payload = {
    form_id:      formId,
    response_id:  responseId,
    submitted_at: response.submitted_at,
    answers:      response.answers,
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook returned ${res.status}`);
}

// ── Slack ────────────────────────────────────────────────────────
async function triggerSlack(integration, response, form, formId) {
  const { webhookUrl } = integration.config;
  if (!webhookUrl) throw new Error('No Slack webhook URL configured');

  const questions = form.questions ?? [];
  const answers   = response.answers ?? {};

  const fields = questions
    .filter(q => !['welcome_screen', 'thank_you_screen', 'statement', 'signature'].includes(q.type))
    .slice(0, 8)
    .flatMap(q => {
      const val = answers[q.id];
      if (val === null || val === undefined || val === '') return [];
      const text = Array.isArray(val) ? val.join(', ') : String(val).slice(0, 300);
      return [{ type: 'mrkdwn', text: `*${q.title || 'Question'}:*\n${text}` }];
    });

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `📋 *New response for "${form.title}"*` },
    },
    ...(fields.length ? [{ type: 'section', fields: fields.slice(0, 10) }] : []),
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Submitted at ${new Date(response.submitted_at || Date.now()).toLocaleString()}` }],
    },
    {
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View responses ↗', emoji: true },
        url: `${process.env.APP_URL}/forms/${formId}/responses`,
        style: 'primary',
      }],
    },
  ];

  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ blocks, text: `New response for "${form.title}"` }),
  });
  if (!res.ok) throw new Error(`Slack returned ${res.status}`);
}

// ── Zapier ───────────────────────────────────────────────────────
async function triggerZapier(integration, response, formId, responseId) {
  const { webhookUrl } = integration.config;
  if (!webhookUrl) throw new Error('No Zapier webhook URL configured');

  const payload = {
    form_id:      formId,
    response_id:  responseId,
    submitted_at: response.submitted_at,
    answers:      response.answers,
    source:       'youform',
  };

  const res = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Zapier returned ${res.status}`);
}

// ── Notion ───────────────────────────────────────────────────────
async function triggerNotion(integration, response, form, responseId) {
  const { token, database_id } = integration.config;
  if (!token || !database_id) throw new Error('Notion token and database ID are required');

  // Find the title property name (varies per database)
  const dbRes = await fetch(`https://api.notion.com/v1/databases/${database_id}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28' },
  });
  if (!dbRes.ok) throw new Error(`Cannot access Notion database (${dbRes.status}) — check token and ensure the integration is shared with the database`);
  const db = await dbRes.json();
  const titleKey = Object.entries(db.properties).find(([, v]) => v.type === 'title')?.[0] ?? 'Name';

  const questions = form.questions ?? [];
  const answers   = response.answers ?? {};

  // Build bold-label paragraph blocks for each answered question
  const blocks = questions
    .filter(q => !['welcome_screen', 'thank_you_screen', 'statement'].includes(q.type))
    .flatMap(q => {
      const val = answers[q.id];
      if (val === null || val === undefined || val === '') return [];
      const text = Array.isArray(val) ? val.join(', ') : String(val);
      return [{
        object: 'block',
        type:   'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: `${q.title || q.id}: ` }, annotations: { bold: true } },
            { type: 'text', text: { content: text } },
          ],
        },
      }];
    });

  const pageTitle = new Date(response.submitted_at || Date.now()).toLocaleString();

  const pageRes = await fetch('https://api.notion.com/v1/pages', {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${token}`,
      'Content-Type':   'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent:     { database_id },
      properties: { [titleKey]: { title: [{ type: 'text', text: { content: pageTitle } }] } },
      children:   blocks,
    }),
  });

  if (!pageRes.ok) {
    const err = await pageRes.json().catch(() => ({}));
    throw new Error(err.message || `Notion API returned ${pageRes.status}`);
  }
}
