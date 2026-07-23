import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toUUID = (id) => (id && UUID_RE.test(id) ? id : randomUUID());
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth, requireWorkspaceMember, requireEditor, requireAdmin } from '../lib/auth.js';
import { createError } from '../lib/errorHandler.js';
import { hasFeature } from '../lib/plans.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

// All form routes require auth
router.use(requireAuth);

// ============================================================
// GET /workspaces/:workspaceId/forms
// List all forms in a workspace
// ============================================================
router.get(
  '/workspaces/:workspaceId/forms',
  requireWorkspaceMember,
  async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      const { status, search, page = 1, limit = 20 } = req.query;

      let q = supabaseAdmin
        .from('forms')
        .select('id, title, slug, status, layout, views_count, starts_count, responses_count, published_at, created_at, updated_at, created_by, profiles(full_name, avatar_url)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status) q = q.eq('status', status);
      if (search) q = q.ilike('title', `%${search}%`);

      const { data, error, count } = await q;
      if (error) throw error;

      res.json({ forms: data, total: count, page: +page, limit: +limit });
    } catch (err) { next(err); }
  }
);

// ============================================================
// POST /workspaces/:workspaceId/forms
// Create a new form
// ============================================================
router.post(
  '/workspaces/:workspaceId/forms',
  requireWorkspaceMember,
  requireEditor,
  [
    body('title').optional().trim().isLength({ max: 200 }),
    body('layout').optional().isIn(['conversational', 'classic', 'single_scroll']),
    body('templateId').optional().isUUID(),
    body('theme').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw Object.assign(new Error('Validation failed'), { type: 'validation', errors: errors.array() });

      const { workspaceId } = req.params;
      const { title = 'Untitled form', layout = 'conversational', templateId, theme } = req.body;

      // Generate unique slug
      const baseSlug = slugify(title, { lower: true, strict: true }) || 'form';
      const slug = `${baseSlug}-${nanoid(6)}`;

      let formData = { workspace_id: workspaceId, created_by: req.user.id, title, layout, slug };
      if (theme) formData.theme = theme;
      let questionsData = [];

      // If cloning from template, copy questions
      if (templateId) {
        const { data: tpl, error: tplErr } = await supabaseAdmin
          .from('templates')
          .select('snapshot')
          .eq('id', templateId)
          .single();
        if (tplErr) throw createError(404, 'Template not found');

        const snap = tpl.snapshot;
        formData.title = snap.title ?? title;
        formData.theme = snap.theme;
        questionsData = (snap.questions ?? []).map(q => ({ ...q, id: undefined }));

        // Increment template use count
        await supabaseAdmin.rpc('increment', { table: 'templates', id: templateId, column: 'use_count' }).catch(() => {});
      }

      const { data: form, error } = await supabaseAdmin
        .from('forms')
        .insert(formData)
        .select()
        .single();
      if (error) throw error;

      // Insert questions from template
      if (questionsData.length > 0) {
        const questions = questionsData.map(q => ({ ...q, form_id: form.id }));
        await supabaseAdmin.from('questions').insert(questions);
      }

      logActivity(supabaseAdmin, { workspace_id: workspaceId, user_id: req.user.id, action: 'form_created', resource_type: 'form', resource_id: form.id, description: `Created form "${form.title}"` });

      res.status(201).json({ form });
    } catch (err) { next(err); }
  }
);

// ============================================================
// GET /forms/:formId
// Get a form with questions
// ============================================================
router.get('/forms/:formId', async (req, res, next) => {
  try {
    const { formId } = req.params;

    const { data: form, error } = await supabaseAdmin
      .from('forms')
      .select('*, questions(*), workspaces(id, name, plan, remove_branding)')
      .eq('id', formId)
      .order('position', { referencedTable: 'questions' })
      .single();

    if (error) throw error;
    if (!form) throw createError(404, 'Form not found');

    // Check user is a workspace member
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', form.workspace_id)
      .eq('user_id', req.user.id)
      .single();

    if (!member) throw createError(403, 'Access denied');

    res.json({ form });
  } catch (err) { next(err); }
});

// ============================================================
// PATCH /forms/:formId
// Update form metadata and settings
// ============================================================
router.patch(
  '/forms/:formId',
  [
    body('title').optional({ nullable: true }).trim().isLength({ max: 200 }),
    body('description').optional({ nullable: true }).trim(),
    body('status').optional({ nullable: true }).isIn(['draft', 'published', 'closed', 'archived']),
    body('layout').optional({ nullable: true }).isIn(['conversational', 'classic', 'single_scroll']),
    body('theme').optional({ nullable: true }).isObject(),
    body('settings').optional({ nullable: true }).isObject(),
    body('response_limit').optional({ nullable: true }).isInt({ min: 1 }),
    body('opens_at').optional({ nullable: true }).isISO8601(),
    body('closes_at').optional({ nullable: true }).isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw Object.assign(new Error('Validation failed'), { type: 'validation', errors: errors.array() });

      const { formId } = req.params;

      // Fetch form to get workspace_id for member check
      const { data: existing } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
      if (!existing) throw createError(404, 'Form not found');

      const { data: member } = await supabaseAdmin.from('workspace_members')
        .select('role, workspaces(plan)')
        .eq('workspace_id', existing.workspace_id)
        .eq('user_id', req.user.id)
        .single();

      if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

      const allowed = ['title', 'description', 'status', 'layout', 'theme', 'settings', 'response_limit', 'opens_at', 'closes_at'];
      const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

      // Set published_at when publishing
      const isPublishing = updates.status === 'published';
      if (isPublishing) {
        updates.published_at = new Date().toISOString();

        // Check custom domain feature gate
        if (updates.settings?.customDomain && !hasFeature(member.workspaces.plan, 'custom_domain')) {
          throw createError(403, 'Custom domains require a Pro plan or higher');
        }
      }

      const { data: form, error } = await supabaseAdmin
        .from('forms')
        .update(updates)
        .eq('id', formId)
        .select()
        .single();

      if (error) throw error;
      if (isPublishing) {
        logActivity(supabaseAdmin, { workspace_id: existing.workspace_id, user_id: req.user.id, action: 'form_published', resource_type: 'form', resource_id: formId, description: `Published form "${form.title}"` });
      }
      res.json({ form });
    } catch (err) { next(err); }
  }
);

// ============================================================
// DELETE /forms/:formId
// Archive (soft delete) a form
// ============================================================
router.delete('/forms/:formId', async (req, res, next) => {
  try {
    const { data: existing } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', req.params.formId).single();
    if (!existing) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', existing.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin'].includes(member.role)) throw createError(403, 'Admin access required');

    await supabaseAdmin.from('forms').update({ status: 'archived' }).eq('id', req.params.formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// QUESTIONS
// ============================================================

// GET /forms/:formId/questions
router.get('/forms/:formId/questions', async (req, res, next) => {
  try {
    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', req.params.formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    const { data: questions, error } = await supabaseAdmin
      .from('questions').select('*').eq('form_id', req.params.formId).order('position');
    if (error) throw error;

    res.json({ questions });
  } catch (err) { next(err); }
});

// PUT /forms/:formId/questions
// Replace all questions (full save from builder)
router.put(
  '/forms/:formId/questions',
  [body('questions').isArray()],
  async (req, res, next) => {
    try {
      const { formId } = req.params;
      const { questions } = req.body;

      const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
      if (!form) throw createError(404, 'Form not found');

      const { data: member } = await supabaseAdmin.from('workspace_members')
        .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
      if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

      const payload = questions.map((q, i) => ({
        id: toUUID(q.id),
        form_id: formId,
        type: q.type,
        position: q.position ?? i,
        title: q.title ?? '',
        description: q.description ?? null,
        required: q.required ?? false,
        config: q.config ?? {},
        logic: q.logic ?? [],
      }));

      // Delete existing questions then insert the new set
      const { error: delErr } = await supabaseAdmin
        .from('questions')
        .delete()
        .eq('form_id', formId);
      if (delErr) throw delErr;

      if (payload.length > 0) {
        const { error: insErr } = await supabaseAdmin
          .from('questions')
          .insert(payload);
        if (insErr) throw insErr;
      }

      const { data: saved } = await supabaseAdmin.from('questions').select('*').eq('form_id', formId).order('position');
      res.json({ questions: saved ?? [] });
    } catch (err) { next(err); }
  }
);

// POST /forms/:formId/questions
// Add a single question
router.post(
  '/forms/:formId/questions',
  [body('type').isIn(['short_text','long_text','multiple_choice','dropdown','rating','nps','yes_no','date','time','file_upload','phone','email','number','address','signature','ranking','matrix','payment','statement','welcome_screen','thank_you_screen'])],
  async (req, res, next) => {
    try {
      const { formId } = req.params;

      const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
      if (!form) throw createError(404, 'Form not found');

      const { data: member } = await supabaseAdmin.from('workspace_members')
        .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
      if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

      // Get max position
      const { data: last } = await supabaseAdmin.from('questions')
        .select('position').eq('form_id', formId).order('position', { ascending: false }).limit(1).single();
      const position = (last?.position ?? -1) + 1;

      const { data: question, error } = await supabaseAdmin.from('questions')
        .insert({ form_id: formId, type: req.body.type, position, title: req.body.title ?? '', config: req.body.config ?? {}, required: req.body.required ?? false })
        .select().single();
      if (error) throw error;

      res.status(201).json({ question });
    } catch (err) { next(err); }
  }
);

// PATCH /forms/:formId/questions/:questionId
router.patch('/forms/:formId/questions/:questionId', async (req, res, next) => {
  try {
    const { formId, questionId } = req.params;

    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

    const allowed = ['title', 'description', 'required', 'config', 'validation', 'logic', 'position'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    const { data: question, error } = await supabaseAdmin.from('questions')
      .update(updates).eq('id', questionId).eq('form_id', formId).select().single();
    if (error) throw error;

    res.json({ question });
  } catch (err) { next(err); }
});

// DELETE /forms/:formId/questions/:questionId
router.delete('/forms/:formId/questions/:questionId', async (req, res, next) => {
  try {
    const { formId, questionId } = req.params;

    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!form) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

    await supabaseAdmin.from('questions').delete().eq('id', questionId).eq('form_id', formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// NOTIFICATIONS
// GET  /forms/:formId/notifications
// PUT  /forms/:formId/notifications
// ============================================================

router.get('/forms/:formId/notifications', async (req, res, next) => {
  try {
    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', req.params.formId).single();
    if (!form) throw createError(404, 'Form not found');
    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member) throw createError(403, 'Access denied');

    const { data } = await supabaseAdmin
      .from('notification_settings')
      .select('*')
      .eq('form_id', req.params.formId);
    res.json({ notifications: data ?? [] });
  } catch (err) { next(err); }
});

router.put('/forms/:formId/notifications', async (req, res, next) => {
  try {
    const { data: form } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', req.params.formId).single();
    if (!form) throw createError(404, 'Form not found');
    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', form.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

    const { event = 'new_response', enabled = true } = req.body;
    const { data, error } = await supabaseAdmin
      .from('notification_settings')
      .upsert({ form_id: req.params.formId, user_id: req.user.id, event, enabled },
               { onConflict: 'form_id,user_id,event' })
      .select().single();
    if (error) throw error;
    res.json({ notification: data });
  } catch (err) { next(err); }
});

// ============================================================
// DUPLICATE form
// POST /forms/:formId/duplicate
// ============================================================
router.post('/forms/:formId/duplicate', async (req, res, next) => {
  try {
    const { formId } = req.params;

    const { data: original, error: fErr } = await supabaseAdmin
      .from('forms').select('*, questions(*)').eq('id', formId).single();
    if (fErr || !original) throw createError(404, 'Form not found');

    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', original.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

    const slug = `${original.slug}-copy-${nanoid(4)}`;
    const { data: newForm, error } = await supabaseAdmin.from('forms').insert({
      workspace_id: original.workspace_id,
      created_by: req.user.id,
      title: `${original.title} (copy)`,
      description: original.description,
      slug,
      layout: original.layout,
      theme: original.theme,
      settings: original.settings,
      status: 'draft',
    }).select().single();
    if (error) throw error;

    if (original.questions?.length > 0) {
      await supabaseAdmin.from('questions').insert(
        original.questions.map(q => ({ ...q, id: undefined, form_id: newForm.id }))
      );
    }

    res.status(201).json({ form: newForm });
  } catch (err) { next(err); }
});

// ============================================================
// POST /forms/:formId/password  — set password (bcrypt-hashed)
// DELETE /forms/:formId/password — remove password
// ============================================================
router.post('/forms/:formId/password', async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { data: existing } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!existing) throw createError(404, 'Form not found');
    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', existing.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

    const { password } = req.body;
    if (!password || String(password).length < 1) throw createError(400, 'Password required');
    const hash = await bcrypt.hash(String(password), 10);
    await supabaseAdmin.from('forms').update({ password_hash: hash }).eq('id', formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/forms/:formId/password', async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { data: existing } = await supabaseAdmin.from('forms').select('workspace_id').eq('id', formId).single();
    if (!existing) throw createError(404, 'Form not found');
    const { data: member } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', existing.workspace_id).eq('user_id', req.user.id).single();
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) throw createError(403, 'Access denied');

    await supabaseAdmin.from('forms').update({ password_hash: null }).eq('id', formId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
