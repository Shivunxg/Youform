import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { requireAuth } from '../lib/auth.js';
import {
  createOAuthState, verifyOAuthState,
  getGoogleAuthUrl, exchangeCode,
} from '../lib/googleSheets.js';

const router = Router();

const FRONTEND = () => process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';

// ── GET /api/oauth/google/start?formId=xxx  (authenticated) ──────
router.get('/google/start', requireAuth, (req, res) => {
  const { formId, integrationId } = req.query;
  if (!formId) return res.status(400).json({ error: 'formId required' });

  const state = createOAuthState({ formId, integrationId: integrationId || null, userId: req.user.id });
  res.redirect(getGoogleAuthUrl(state));
});

// ── GET /api/oauth/google/callback  (Google redirects here) ──────
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const appUrl = FRONTEND();

  if (error || !code || !state) {
    return res.redirect(`${appUrl}/oauth/error?reason=${error || 'missing_code'}`);
  }

  const ctx = verifyOAuthState(state);
  if (!ctx) return res.redirect(`${appUrl}/oauth/error?reason=invalid_state`);

  const { formId, integrationId, userId } = ctx;

  try {
    const tokens = await exchangeCode(code);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    if (integrationId) {
      // Update existing integration — merge tokens into existing config
      const { data: existing } = await supabaseAdmin
        .from('integrations').select('config').eq('id', integrationId).single();

      await supabaseAdmin.from('integrations').update({
        config: {
          ...(existing?.config ?? {}),
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token ?? existing?.config?.refresh_token,
          token_expiry:  tokenExpiry,
        },
        enabled: true,
      }).eq('id', integrationId);

      return res.redirect(`${appUrl}/forms/${formId}/integrate?oauth=google_success&iid=${integrationId}`);
    }

    // No existing integrationId — upsert a pending integration (no sheet yet)
    const { data: form } = await supabaseAdmin
      .from('forms').select('workspace_id, title').eq('id', formId).single();
    if (!form) return res.redirect(`${appUrl}/oauth/error?reason=form_not_found`);

    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('id').eq('form_id', formId).eq('type', 'google_sheets').maybeSingle();

    const config = {
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry:  tokenExpiry,
    };

    let newId;
    if (existing) {
      await supabaseAdmin.from('integrations')
        .update({ config, enabled: false }).eq('id', existing.id);
      newId = existing.id;
    } else {
      const { data: created } = await supabaseAdmin.from('integrations').insert({
        form_id:      formId,
        workspace_id: form.workspace_id,
        type:         'google_sheets',
        config,
        enabled:      false, // user still needs to pick a sheet
      }).select('id').single();
      newId = created.id;
    }

    res.redirect(`${appUrl}/forms/${formId}/integrate?oauth=google_success&iid=${newId}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${appUrl}/forms/${formId}/integrate?oauth=google_error`);
  }
});

export default router;
