import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth, optionalAuth } from '../lib/auth.js';
import { createError } from '../lib/errorHandler.js';
import { canAcceptResponse } from '../lib/plans.js';
import { responseQueue } from '../lib/queues.js';

const router = Router();

// ============================================================
// PUBLIC: GET /public/forms/:slug
// Fetch published form for public rendering (no auth)
// ============================================================
router.get('/public/forms/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { workspace } = req.query; // optional workspace slug for disambiguation

    let q = supabaseAdmin
      .from('forms')
      .select('id, title, description, layout, theme, settings, workspace_id, closes_at, opens_at, response_limit, responses_count, questions(id, type, title, description, required, config, logic ORDER BY position ASC), workspaces(name, logo_url, plan, remove_branding, custom_domain)')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    const { data: form, error } = await q;
    if (error || !form) throw createError(404, 'Form not found');

    // Check if form is open
    const now = new Date();
    if (form.opens_at && new Date(form.opens_at) > now) throw createError(403, 'Form not open yet');
    if (form.closes_at && new Date(form.closes_at) < now) throw createError(410, 'Form is closed');
    if (form.response_limit && form.responses_count >= form.response_limit) throw createError(410, 'Form has reached its response limit');

    // Increment view count (fire-and-forget)
    supabaseAdmin.from('forms').update({ views_count: form.views_count + 1 }).eq('id', form.id).then(() => {});

    // Strip sensitive settings (password_hash etc.)
    const { password_hash, ...safeForm } = form;
    res.json({ form: safeForm, requiresPassword: !!password_hash });
  } catch (err) { next(err); }
});

// ============================================================
// PUBLIC: POST /public/forms/:formId/start
// Record a form start (for analytics)
// ============================================================
router.post('/public/forms/:formId/start', async (req, res, next) => {
  try {
    const { data: form } = await supabaseAdmin.from('forms').select('starts_count').eq('id', req.params.formId).single();
    if (!form) throw createError(404, 'Form not found');

    await supabaseAdmin.from('forms').update({ starts_count: form.starts_count + 1 }).eq('id', req.params.formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// PUBLIC: POST /public/forms/:formId/responses
// Submit a response (core ingestion endpoint)
// ============================================================
router.post(
  '/public/forms/:formId/responses',
  optionalAuth,
  [
    body('answers').isObject(),
    body('respondent_email').optional().isEmail(),
    body('utm_source').optional().isString(),
    body('utm_medium').optional().isString(),
    body('utm_campaign').optional().isString(),
    body('referrer').optional().isURL({ require_tld: false }),
    body('started_at').optional().isISO8601(),
    body('is_test').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw Object.assign(new Error('Validation failed'), { type: 'validation', errors: errors.array() });

      const { formId } = req.params;

      // Fetch form + workspace
      const { data: form, error: fErr } = await supabaseAdmin
        .from('forms')
        .select('id, workspace_id, status, closes_at, opens_at, response_limit, responses_count, settings, questions(id, required, type), workspaces(plan)')
        .eq('id', formId).single();

      if (fErr || !form) throw createError(404, 'Form not found');
      if (form.status !== 'published') throw createError(403, 'Form is not accepting responses');

      const now = new Date();
      if (form.closes_at && new Date(form.closes_at) < now) throw createError(410, 'Form is closed');
      if (form.response_limit && form.responses_count >= form.response_limit) throw createError(410, 'Response limit reached');

      // Check plan response quota (skip for test submissions)
      if (!req.body.is_test) {
        const { allowed, used, limit } = await canAcceptResponse(supabaseAdmin, form.workspace_id, form.workspaces.plan);
        if (!allowed) {
          return res.status(429).json({
            error: 'Monthly response limit reached',
            used, limit,
            upgrade_url: `${process.env.APP_URL}/settings/billing`,
          });
        }
      }

      // Validate required questions
      const { answers = {} } = req.body;
      const required = form.questions.filter(q => q.required);
      const missing = required.filter(q => {
        const a = answers[q.id];
        return a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0);
      });
      if (missing.length > 0) {
        return res.status(422).json({ error: 'Required questions not answered', missing_question_ids: missing.map(q => q.id) });
      }

      // Build response record
      const { data: response, error } = await supabaseAdmin.from('responses').insert({
        form_id: formId,
        workspace_id: form.workspace_id,
        respondent_id: req.body.respondent_id ?? null,
        respondent_email: req.body.respondent_email ?? req.user?.email ?? null,
        answers,
        is_partial: false,
        is_test: req.body.is_test ?? false,
        started_at: req.body.started_at ?? now.toISOString(),
        submitted_at: now.toISOString(),
        completion_time_ms: req.body.completion_time_ms ?? null,
        utm_source: req.body.utm_source ?? null,
        utm_medium: req.body.utm_medium ?? null,
        utm_campaign: req.body.utm_campaign ?? null,
        referrer: req.body.referrer ?? null,
        user_agent: req.headers['user-agent']?.substring(0, 512) ?? null,
        ip_hash: null, // TODO: hash req.ip for GDPR compliance
      }).select().single();

      if (error) throw error;

      // Enqueue async jobs (notifications, integrations)
      await responseQueue.add('process-response', {
        responseId: response.id,
        formId,
        workspaceId: form.workspace_id,
      });

      res.status(201).json({
        success: true,
        responseId: response.id,
        redirect_url: form.settings?.redirectUrl ?? null,
      });
    } catch (err) { next(err); }
  }
);

// ============================================================
// PUBLIC: POST /public/forms/:formId/responses/partial
// Save partial response (for drop-off analytics)
// ============================================================
router.post('/public/forms/:formId/responses/partial', async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { answers = {}, respondent_id, started_at } = req.body;

    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data, error } = await supabaseAdmin.from('responses').insert({
      form_id: formId,
      workspace_id: form.workspace_id,
      respondent_id: respondent_id ?? null,
      answers,
      is_partial: true,
      started_at: started_at ?? new Date().toISOString(),
    }).select('id').single();

    if (error) throw error;
    res.json({ partialId: data.id });
  } catch (err) { next(err); }
});

// ============================================================
// AUTHENTICATED: GET /forms/:formId/responses
// List responses for dashboard
// ============================================================
router.get('/forms/:formId/responses', requireAuth, async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 50, partial, search } = req.query;

    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    let q = supabaseAdmin
      .from('responses')
      .select('*', { count: 'exact' })
      .eq('form_id', formId)
      .eq('is_test', false)
      .order('submitted_at', { ascending: false })
      .range((+page - 1) * +limit, +page * +limit - 1);

    if (partial !== undefined) q = q.eq('is_partial', partial === 'true');
    else q = q.eq('is_partial', false);

    const { data: responses, error, count } = await q;
    if (error) throw error;

    res.json({ responses, total: count, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// ============================================================
// AUTHENTICATED: GET /forms/:formId/responses/:responseId
// Get a single response
// ============================================================
router.get('/forms/:formId/responses/:responseId', requireAuth, async (req, res, next) => {
  try {
    const { formId, responseId } = req.params;

    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    const { data: response, error } = await supabaseAdmin.from('responses')
      .select('*, response_files(*)')
      .eq('id', responseId).eq('form_id', formId).single();
    if (error || !response) throw createError(404, 'Response not found');

    res.json({ response });
  } catch (err) { next(err); }
});

// ============================================================
// AUTHENTICATED: DELETE /forms/:formId/responses/:responseId
// Delete a response
// ============================================================
router.delete('/forms/:formId/responses/:responseId', requireAuth, async (req, res, next) => {
  try {
    const { formId, responseId } = req.params;

    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin'].includes(member.role)) throw createError(403, 'Admin access required');

    await supabaseAdmin.from('responses').delete().eq('id', responseId).eq('form_id', formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// AUTHENTICATED: GET /forms/:formId/responses/export/csv
// Export all responses as CSV
// ============================================================
router.get('/forms/:formId/responses/export/csv', requireAuth, async (req, res, next) => {
  try {
    const { formId } = req.params;

    const { data: form } = await supabaseAdmin.from('forms')
      .select('workspace_id, title, questions(id, title, type ORDER BY position ASC)')
      .eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    const { data: responses } = await supabaseAdmin.from('responses')
      .select('*').eq('form_id', formId).eq('is_partial', false).eq('is_test', false)
      .order('submitted_at', { ascending: false });

    // Build CSV
    const questions = form.questions;
    const headers = ['Response ID', 'Submitted At', 'Respondent Email', 'Completion Time (s)', ...questions.map(q => q.title)];

    const rows = (responses ?? []).map(r => [
      r.id,
      r.submitted_at ?? '',
      r.respondent_email ?? '',
      r.completion_time_ms ? Math.round(r.completion_time_ms / 1000) : '',
      ...questions.map(q => {
        const a = r.answers?.[q.id];
        if (a === undefined || a === null) return '';
        if (Array.isArray(a)) return a.join('; ');
        return String(a);
      }),
    ]);

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');

    const filename = `${form.title.replace(/[^a-z0-9]/gi, '_')}_responses_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
});

// ============================================================
// AUTHENTICATED: GET /forms/:formId/analytics
// Aggregated analytics (views, completions, drop-off)
// ============================================================
router.get('/forms/:formId/analytics', requireAuth, async (req, res, next) => {
  try {
    const { formId } = req.params;

    const { data: form } = await supabaseAdmin.from('forms')
      .select('workspace_id, views_count, starts_count, responses_count, questions(id, title, type ORDER BY position ASC)')
      .eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    // Fetch responses for drop-off analysis
    const { data: responses } = await supabaseAdmin.from('responses')
      .select('answers, completion_time_ms, is_partial')
      .eq('form_id', formId).eq('is_test', false);

    const total = responses?.length ?? 0;
    const completed = responses?.filter(r => !r.is_partial).length ?? 0;

    // Per-question response count (how many people answered each question)
    const questionStats = form.questions.map(q => {
      const answered = (responses ?? []).filter(r => {
        const a = r.answers?.[q.id];
        return a !== undefined && a !== null && a !== '';
      }).length;
      return { question_id: q.id, title: q.title, answered, drop_off: total - answered };
    });

    const avgCompletionMs = completed > 0
      ? Math.round((responses ?? []).filter(r => !r.is_partial && r.completion_time_ms).reduce((acc, r) => acc + r.completion_time_ms, 0) / completed)
      : null;

    res.json({
      views: form.views_count,
      starts: form.starts_count,
      completions: completed,
      partial: total - completed,
      completion_rate: form.starts_count > 0 ? Math.round((completed / form.starts_count) * 100) : 0,
      avg_completion_seconds: avgCompletionMs ? Math.round(avgCompletionMs / 1000) : null,
      question_stats: questionStats,
    });
  } catch (err) { next(err); }
});

export default router;
