import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import slugify from 'slugify';
import { nanoid } from 'nanoid';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { emailService } from '../services/email.js';

const router = Router();
router.use(requireAuth);

// ============================================================
// GET /workspaces — list user's workspaces
// ============================================================
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role, joined_at, workspaces(id, name, slug, logo_url, plan, created_at)')
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ workspaces: data.map(m => ({ ...m.workspaces, role: m.role })) });
  } catch (err) { next(err); }
});

// ============================================================
// POST /workspaces — create a new workspace
// ============================================================
router.post(
  '/',
  [body('name').trim().isLength({ min: 1, max: 100 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw Object.assign(new Error(), { type: 'validation', errors: errors.array() });

      const { name } = req.body;
      const slug = `${slugify(name, { lower: true, strict: true })}-${nanoid(6)}`;

      const { data: workspace, error } = await supabaseAdmin.from('workspaces').insert({ name, slug }).select().single();
      if (error) throw error;

      await supabaseAdmin.from('workspace_members').insert({ workspace_id: workspace.id, user_id: req.user.id, role: 'owner' });

      res.status(201).json({ workspace: { ...workspace, role: 'owner' } });
    } catch (err) { next(err); }
  }
);

// ============================================================
// GET /workspaces/:workspaceId — get workspace details
// ============================================================
router.get('/:workspaceId', async (req, res, next) => {
  try {
    const { data: member, error } = await supabaseAdmin
      .from('workspace_members')
      .select('role, workspaces(*)')
      .eq('workspace_id', req.params.workspaceId)
      .eq('user_id', req.user.id)
      .single();
    if (error || !member) throw createError(403, 'Access denied');

    res.json({ workspace: { ...member.workspaces, role: member.role } });
  } catch (err) { next(err); }
});

// ============================================================
// PATCH /workspaces/:workspaceId — update workspace
// ============================================================
router.patch(
  '/:workspaceId',
  [body('name').optional().trim().isLength({ min: 1, max: 100 })],
  async (req, res, next) => {
    try {
      const { workspaceId } = req.params;

      const { data: member } = await supabaseAdmin.from('workspace_members')
        .select('role').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
      if (!member || !['owner', 'admin'].includes(member.role)) throw createError(403, 'Admin access required');

      const allowed = ['name', 'logo_url'];
      const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

      const { data: workspace, error } = await supabaseAdmin.from('workspaces')
        .update(updates).eq('id', workspaceId).select().single();
      if (error) throw error;

      res.json({ workspace });
    } catch (err) { next(err); }
  }
);

// ============================================================
// GET /workspaces/:workspaceId/members
// ============================================================
router.get('/:workspaceId/members', async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const { data: self } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
    if (!self) throw createError(403, 'Access denied');

    const { data, error } = await supabaseAdmin.from('workspace_members')
      .select('role, joined_at, profiles(id, email, full_name, avatar_url)')
      .eq('workspace_id', workspaceId);
    if (error) throw error;

    res.json({ members: data });
  } catch (err) { next(err); }
});

// ============================================================
// POST /workspaces/:workspaceId/invites
// Invite a user by email
// ============================================================
router.post(
  '/:workspaceId/invites',
  [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['admin', 'editor', 'viewer']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw Object.assign(new Error(), { type: 'validation', errors: errors.array() });

      const { workspaceId } = req.params;
      const { email, role } = req.body;

      const { data: member } = await supabaseAdmin.from('workspace_members')
        .select('role, workspaces(name)').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
      if (!member || !['owner', 'admin'].includes(member.role)) throw createError(403, 'Admin access required');

      // Check not already a member
      const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
      if (existingProfile) {
        const { data: existing } = await supabaseAdmin.from('workspace_members')
          .select('role').eq('workspace_id', workspaceId).eq('user_id', existingProfile.id).single();
        if (existing) throw createError(409, 'User is already a member of this workspace');
      }

      const { data: invite, error } = await supabaseAdmin.from('workspace_invites')
        .insert({ workspace_id: workspaceId, email, role, invited_by: req.user.id })
        .select().single();
      if (error) throw error;

      const inviteUrl = `${process.env.APP_URL}/invite/${invite.token}`;
      await emailService.sendWorkspaceInvite({ email, inviterName: req.user.email, workspaceName: member.workspaces.name, inviteUrl, role });

      res.status(201).json({ invite: { id: invite.id, email, role, expires_at: invite.expires_at } });
    } catch (err) { next(err); }
  }
);

// ============================================================
// POST /workspaces/accept-invite/:token
// Accept an invite
// ============================================================
router.post('/accept-invite/:token', async (req, res, next) => {
  try {
    const { data: invite, error } = await supabaseAdmin.from('workspace_invites')
      .select('*').eq('token', req.params.token).is('accepted_at', null).single();

    if (error || !invite) throw createError(404, 'Invite not found or already used');
    if (new Date(invite.expires_at) < new Date()) throw createError(410, 'Invite has expired');

    // Verify email matches
    const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', req.user.id).single();
    if (profile?.email !== invite.email) throw createError(403, 'This invite was sent to a different email address');

    await supabaseAdmin.from('workspace_members').insert({
      workspace_id: invite.workspace_id,
      user_id: req.user.id,
      role: invite.role,
      invited_by: invite.invited_by,
    });

    await supabaseAdmin.from('workspace_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);

    res.json({ success: true, workspace_id: invite.workspace_id, role: invite.role });
  } catch (err) { next(err); }
});

// ============================================================
// PATCH /workspaces/:workspaceId/members/:userId
// Update a member's role
// ============================================================
router.patch('/:workspaceId/members/:userId', async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'editor', 'viewer'].includes(role)) throw createError(400, 'Invalid role');
    if (userId === req.user.id) throw createError(400, 'You cannot change your own role');

    const { data: self } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
    if (!self || !['owner', 'admin'].includes(self.role)) throw createError(403, 'Admin access required');

    const { error } = await supabaseAdmin.from('workspace_members')
      .update({ role }).eq('workspace_id', workspaceId).eq('user_id', userId);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// DELETE /workspaces/:workspaceId/members/:userId
// Remove a member
// ============================================================
router.delete('/:workspaceId/members/:userId', async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;

    const { data: self } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();

    // Can remove self (leave), or admin/owner can remove others
    const isSelf = userId === req.user.id;
    if (!isSelf && !['owner', 'admin'].includes(self?.role)) throw createError(403, 'Admin access required');

    // Can't remove the last owner
    if (!isSelf) {
      const { data: target } = await supabaseAdmin.from('workspace_members')
        .select('role').eq('workspace_id', workspaceId).eq('user_id', userId).single();
      if (target?.role === 'owner') throw createError(400, 'Cannot remove workspace owner');
    }

    await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspaceId).eq('user_id', userId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ============================================================
// GET /workspaces/:workspaceId/usage
// ============================================================
router.get('/:workspaceId/usage', async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const { data: self } = await supabaseAdmin.from('workspace_members')
      .select('role').eq('workspace_id', workspaceId).eq('user_id', req.user.id).single();
    if (!self) throw createError(403, 'Access denied');

    const month = new Date();
    month.setDate(1);
    month.setHours(0, 0, 0, 0);

    const { data: usage } = await supabaseAdmin.from('workspace_usage')
      .select('*').eq('workspace_id', workspaceId).eq('month', month.toISOString().split('T')[0]).single();

    const { data: workspace } = await supabaseAdmin.from('workspaces')
      .select('plan, responses_limit, storage_limit_mb').eq('id', workspaceId).single();

    res.json({
      plan: workspace?.plan,
      responses_used: usage?.responses_used ?? 0,
      responses_limit: workspace?.responses_limit,
      storage_used_mb: usage?.storage_used_mb ?? 0,
      storage_limit_mb: workspace?.storage_limit_mb,
    });
  } catch (err) { next(err); }
});

export default router;
