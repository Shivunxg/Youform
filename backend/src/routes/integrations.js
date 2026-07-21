import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { hasFeature } from '../lib/plans.js';

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
// GET /workspaces/:workspaceId/notification-settings
// ============================================================
router.get('/forms/:formId/notifications', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);

    const { data, error } = await supabaseAdmin.from('notification_settings')
      .select('*').eq('form_id', req.params.formId).eq('user_id', req.user.id);
    if (error) throw error;

    res.json({ notifications: data });
  } catch (err) { next(err); }
});

router.put('/forms/:formId/notifications', async (req, res, next) => {
  try {
    await getFormAndCheckAccess(req.params.formId, req.user.id);
    const { enabled, send_confirmation, confirmation_subject, confirmation_body } = req.body;

    const { data, error } = await supabaseAdmin.from('notification_settings')
      .upsert({
        form_id: req.params.formId,
        user_id: req.user.id,
        event: 'new_response',
        enabled: enabled ?? true,
        send_confirmation: send_confirmation ?? false,
        confirmation_subject,
        confirmation_body,
      }, { onConflict: 'form_id,user_id,event' })
      .select().single();
    if (error) throw error;

    res.json({ notification: data });
  } catch (err) { next(err); }
});

// ============================================================
// Helpers
// ============================================================

function validateIntegrationConfig(type, config) {
  switch (type) {
    case 'webhook':
      if (!config.url || !/^https?:\/\//.test(config.url)) throw createError(400, 'Webhook URL must be a valid HTTP/HTTPS URL');
      break;
    case 'slack':
      if (!config.webhookUrl || !config.webhookUrl.includes('hooks.slack.com')) throw createError(400, 'Invalid Slack webhook URL');
      break;
    case 'email':
      if (!config.to || !Array.isArray(config.to) || config.to.length === 0) throw createError(400, 'Email integration requires at least one recipient');
      break;
  }
}

function redactConfig(type, config) {
  const redacted = { ...config };
  // Redact secrets
  if (redacted.secret) redacted.secret = '***';
  if (redacted.apiKey) redacted.apiKey = '***';
  if (redacted.accessToken) redacted.accessToken = '***';
  return redacted;
}

async function triggerIntegration(integration, payload) {
  switch (integration.type) {
    case 'webhook': {
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
