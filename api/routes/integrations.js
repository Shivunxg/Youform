import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../lib/auth.js';
import { createError } from '../lib/errorHandler.js';
import { hasFeature } from '../lib/plans.js';
import { getValidToken, listUserSheets, getSpreadsheetMeta, createSpreadsheet } from '../lib/googleSheets.js';
import { isPrivateUrl } from '../lib/ssrf.js';

const router = Router();
router.use(requireAuth);

async function getFormAndCheckAccess(formId, userId, requiredRoles = ['owner', 'admin', 'editor']) {
  const { data: form } = await supabaseAdmin.from('forms')
    .select('workspace_id, workspaces(plan)').eq('id', formId).single();
  if (!form) throw createError(404, 'Form not found');

  const { data: member } = await supabaseAdmin.from('workspace_members')
    .select('role').eq('workspace_id', form.workspace_id).eq('user_id', userId).single();
  if (!member || !requiredRoles.includes(member.role)) throw createError(403, 'Access denied');

  return { form, plan: form.workspaces.plan };
}

// ============================================================
// GET /forms/:formId/integrations
// ============================================================
router.get('/forms/:formId/integrations', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);

    const { data, error } = await supabaseAdmin.from('integrations')
      .select('id, type, enabled, config, last_triggered_at, last_error, created_at')
      .eq('form_id', req.params.formId);
    if (error) throw error;

    // Redact secrets from config
    const safe = data.map(i => ({
      ...i,
      config: redactConfig(i.type, i.config),
    }));

    res.json({ integrations: safe });
  } catch (err) { next(err); }
});

// ============================================================
// POST /forms/:formId/integrations
// Add an integration
// ============================================================
router.post(
  '/forms/:formId/integrations',
  [
    body('type').isIn(['google_sheets', 'slack', 'notion', 'mailchimp', 'hubspot', 'airtable', 'zapier', 'webhook', 'email']),
    body('config').isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw Object.assign(new Error(), { type: 'validation', errors: errors.array() });

      const { formId } = req.params;
      const { type, config } = req.body;
      const { form, plan } = await getFormAndCheckAccess(formId, req.user.id);

      // Feature gate: only basic integrations on free
      const freeIntegrations = ['email', 'google_sheets'];
      if (!freeIntegrations.includes(type) && !hasFeature(plan, 'integrations')) {
        throw createError(403, `The ${type} integration requires a Pro plan or higher`);
      }

      // Validate config per integration type
      validateIntegrationConfig(type, config);

      const { data: integration, error } = await supabaseAdmin.from('integrations')
        .insert({ form_id: formId, workspace_id: form.workspace_id, type, config, enabled: true })
        .select().single();
      if (error) throw error;

      res.status(201).json({ integration: { ...integration, config: redactConfig(type, integration.config) } });
    } catch (err) { next(err); }
  }
);

// ============================================================
// PATCH /forms/:formId/integrations/:integrationId
// ============================================================
router.patch('/forms/:formId/integrations/:integrationId', async (req, res, next) => {
  try {
    const { formId, integrationId } = req.params;
    await getFormAndCheckAccess(formId, req.user.id);

    const allowed = ['enabled', 'config'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    // Re-validate config if being updated (same rules that POST enforces).
    // Merge incoming config onto the stored config so that redacted secrets
    // (webhookUrl, token) are re-populated from the DB before validation.
    if (updates.config) {
      const { data: existing } = await supabaseAdmin.from('integrations')
        .select('type, config').eq('id', integrationId).eq('form_id', formId).single();
      if (!existing) throw createError(404, 'Integration not found');
      const mergedConfig = { ...existing.config, ...updates.config };
      validateIntegrationConfig(existing.type, mergedConfig);
      updates.config = mergedConfig;
    }

    const { data, error } = await supabaseAdmin.from('integrations')
      .update(updates).eq('id', integrationId).eq('form_id', formId).select().single();
    if (error) throw error;

    res.json({ integration: { ...data, config: redactConfig(data.type, data.config) } });
  } catch (err) { next(err); }
});

// ============================================================
// DELETE /forms/:formId/integrations/:integrationId
// ============================================================
router.delete('/forms/:formId/integrations/:integrationId', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);
    await supabaseAdmin.from('integrations').delete().eq('id', req.params.integrationId).eq('form_id', req.params.formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// POST /forms/:formId/integrations/:integrationId/test
// Send a test event
// ============================================================
router.post('/forms/:formId/integrations/:integrationId/test', async (req, res, next) => {
  try {
    const { formId, integrationId } = req.params;
    await getFormAndCheckAccess(formId, req.user.id);

    const { data: integration } = await supabaseAdmin.from('integrations')
      .select('*').eq('id', integrationId).single();
    if (!integration) throw createError(404, 'Integration not found');

    const testPayload = {
      form_id: formId,
      response_id: 'test-' + Date.now(),
      submitted_at: new Date().toISOString(),
      answers: { 'example_question': 'Test answer' },
      is_test: true,
    };

    const result = await triggerIntegration(integration, testPayload);
    res.json({ success: true, result });
  } catch (err) { next(err); }
});

// ============================================================
// GET /forms/:formId/integrations/google-sheets/sheets
// List user's Google Sheets (after OAuth)
// ============================================================
router.get('/forms/:formId/integrations/google-sheets/sheets', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id, config')
      .eq('form_id', req.params.formId)
      .eq('type', 'google_sheets')
      .maybeSingle();

    if (!integration?.config?.access_token) {
      throw createError(400, 'Google account not connected. Please connect first.');
    }

    const { accessToken, updatedConfig } = await getValidToken(integration.config);

    // Persist refreshed token if needed
    if (updatedConfig) {
      await supabaseAdmin.from('integrations')
        .update({ config: updatedConfig }).eq('id', integration.id);
    }

    const sheets = await listUserSheets(accessToken);
    res.json({ sheets });
  } catch (err) { next(err); }
});

// ============================================================
// POST /forms/:formId/integrations/google-sheets/create-sheet
// Create a new spreadsheet and save it to the integration
// ============================================================
router.post('/forms/:formId/integrations/google-sheets/create-sheet', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);
    const { title } = req.body;

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id, config')
      .eq('form_id', req.params.formId)
      .eq('type', 'google_sheets')
      .maybeSingle();

    if (!integration?.config?.access_token) {
      throw createError(400, 'Google account not connected.');
    }

    const { accessToken, updatedConfig } = await getValidToken(integration.config);

    const spreadsheet = await createSpreadsheet(accessToken, title || 'FormFlow Responses');
    const spreadsheetId   = spreadsheet.spreadsheetId;
    const spreadsheetName = spreadsheet.properties.title;
    const sheetName       = spreadsheet.sheets?.[0]?.properties?.title || 'Sheet1';

    const newConfig = {
      ...(updatedConfig ?? integration.config),
      spreadsheetId,
      spreadsheetName,
      sheetName,
    };

    await supabaseAdmin.from('integrations')
      .update({ config: newConfig, enabled: true }).eq('id', integration.id);

    res.json({ spreadsheetId, spreadsheetName, sheetName });
  } catch (err) { next(err); }
});

// ============================================================
// POST /forms/:formId/integrations/google-sheets/connect-by-url
// Connect an existing spreadsheet by pasting its URL or ID
// Uses only the spreadsheets scope — no Drive listing needed
// ============================================================
router.post('/forms/:formId/integrations/google-sheets/connect-by-url', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);
    const { url } = req.body;
    if (!url) throw createError(400, 'url is required');

    // Extract spreadsheet ID from URL or treat input as raw ID
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : url.trim();
    if (!spreadsheetId || !/^[a-zA-Z0-9-_]+$/.test(spreadsheetId)) {
      throw createError(400, 'Could not extract a valid spreadsheet ID from the provided URL');
    }

    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id, config')
      .eq('form_id', req.params.formId)
      .eq('type', 'google_sheets')
      .maybeSingle();

    if (!integration?.config?.access_token) {
      throw createError(400, 'Google account not connected. Please connect first.');
    }

    const { accessToken, updatedConfig } = await getValidToken(integration.config);

    // Persist refreshed token before proceeding so it isn't lost if the next call fails
    if (updatedConfig) {
      await supabaseAdmin.from('integrations')
        .update({ config: updatedConfig }).eq('id', integration.id);
    }

    // Validate access and get sheet metadata using only the spreadsheets scope
    const meta = await getSpreadsheetMeta(accessToken, spreadsheetId);
    const spreadsheetName = meta.properties?.title || spreadsheetId;
    const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

    const newConfig = {
      ...(updatedConfig ?? integration.config),
      spreadsheetId,
      spreadsheetName,
      sheetName,
    };

    await supabaseAdmin.from('integrations')
      .update({ config: newConfig, enabled: true }).eq('id', integration.id);

    res.json({ spreadsheetId, spreadsheetName, sheetName });
  } catch (err) { next(err); }
});

// ============================================================
// Helpers
// ============================================================

function validateIntegrationConfig(type, config) {
  switch (type) {
    case 'webhook':
      if (!config.url || !/^https?:\/\//.test(config.url)) throw createError(400, 'Webhook URL must be a valid HTTP/HTTPS URL');
      if (isPrivateUrl(config.url)) throw createError(400, 'Webhook URL cannot target private or local network addresses');
      break;
    case 'slack':
      if (!config.webhookUrl || !config.webhookUrl.startsWith('https://hooks.slack.com/')) throw createError(400, 'Invalid Slack webhook URL');
      break;
    case 'zapier':
      if (!config.webhookUrl || !config.webhookUrl.startsWith('https://hooks.zapier.com/')) throw createError(400, 'Invalid Zapier URL — must start with https://hooks.zapier.com/');
      break;
    case 'notion':
      if (!config.token) throw createError(400, 'Notion integration token is required');
      if (!config.database_id) throw createError(400, 'Notion database ID is required');
      break;
    case 'email':
      if (!config.to || !Array.isArray(config.to) || config.to.length === 0) throw createError(400, 'Email integration requires at least one recipient');
      break;
  }
}

function redactConfig(type, config) {
  const redacted = { ...config };
  // Redact secrets and OAuth tokens
  if (redacted.secret)        delete redacted.secret;
  if (redacted.apiKey)        delete redacted.apiKey;
  if (redacted.accessToken)   delete redacted.accessToken;
  if (redacted.access_token)  delete redacted.access_token;
  if (redacted.refresh_token) delete redacted.refresh_token;
  if (redacted.token_expiry)  delete redacted.token_expiry;
  // Notion uses 'token'; Slack/Zapier use 'webhookUrl' — neither is in the generic list above
  if (redacted.token)         delete redacted.token;
  if (redacted.webhookUrl)    delete redacted.webhookUrl;
  return redacted;
}

async function triggerIntegration(integration, payload) {
  switch (integration.type) {
    case 'webhook': {
      if (isPrivateUrl(integration.config.url)) throw new Error('Webhook URL targets a private or local network address');
      const resp = await fetch(integration.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(integration.config.headers ?? {}) },
        body: JSON.stringify(payload),
      });
      return { status: resp.status, ok: resp.ok };
    }
    default:
      return { skipped: true, reason: 'Test not implemented for this integration type' };
  }
}

export default router;
