import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../lib/auth.js';
import { createError } from '../lib/errorHandler.js';

const router = Router();
router.use(requireAuth);

// GET /api/account/export — download the caller's own data as JSON (GDPR Art. 20)
router.get('/account/export', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [profileRes, membershipsRes, formsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, email, full_name, avatar_url, created_at').eq('id', userId).single(),
      supabaseAdmin.from('workspace_members')
        .select('role, joined_at, workspaces(id, name, plan)')
        .eq('user_id', userId),
      supabaseAdmin.from('forms')
        .select('id, title, status, created_at, responses_count')
        .eq('created_by', userId),
    ]);

    const payload = {
      exported_at:  new Date().toISOString(),
      profile:      profileRes.data,
      workspaces:   membershipsRes.data ?? [],
      forms_created: formsRes.data ?? [],
    };

    res.setHeader('Content-Disposition', 'attachment; filename="formflowx-data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(payload);
  } catch (err) { next(err); }
});

// DELETE /api/account — permanently erase the caller's account (GDPR Art. 17)
router.delete('/account', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Workspaces where this user is the sole owner — delete them + their data
    const { data: ownedWorkspaces } = await supabaseAdmin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('role', 'owner');

    for (const { workspace_id } of ownedWorkspaces ?? []) {
      // Only delete workspace if no other owner exists
      const { data: otherOwners } = await supabaseAdmin
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspace_id)
        .eq('role', 'owner')
        .neq('user_id', userId);

      if (!otherOwners || otherOwners.length === 0) {
        // Delete forms → questions, responses cascade via FK
        const { data: wsForms } = await supabaseAdmin
          .from('forms').select('id').eq('workspace_id', workspace_id);
        for (const f of wsForms ?? []) {
          await supabaseAdmin.from('responses').delete().eq('form_id', f.id);
          await supabaseAdmin.from('questions').delete().eq('form_id', f.id);
          await supabaseAdmin.from('integrations').delete().eq('form_id', f.id);
        }
        await supabaseAdmin.from('forms').delete().eq('workspace_id', workspace_id);
        await supabaseAdmin.from('workspace_members').delete().eq('workspace_id', workspace_id);
        await supabaseAdmin.from('workspaces').delete().eq('id', workspace_id);
      }
    }

    // Remove from all other workspaces
    await supabaseAdmin.from('workspace_members').delete().eq('user_id', userId);

    // Delete profile row
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete from Supabase Auth (hard delete)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw createError(500, 'Failed to delete auth account: ' + authError.message);

    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
