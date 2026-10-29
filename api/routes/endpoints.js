import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin, supabaseAnon } from '../lib/supabase.js';

const router = express.Router();

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });

  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });

  req.user = user;
  next();
}

// List user's endpoints
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('form_endpoints')
    .select('id, name, access_key, email_to, active, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create new endpoint
router.post('/', requireAuth, async (req, res) => {
  const { name, email_to } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });

  const access_key = crypto.randomBytes(20).toString('hex');

  const { data, error } = await supabaseAdmin
    .from('form_endpoints')
    .insert({
      user_id: req.user.id,
      name: name.trim(),
      email_to: email_to?.trim() || req.user.email,
      access_key,
      active: true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update endpoint (name, email_to, active)
router.patch('/:id', requireAuth, async (req, res) => {
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.email_to !== undefined) updates.email_to = req.body.email_to;
  if (req.body.active !== undefined) updates.active = req.body.active;

  const { data, error } = await supabaseAdmin
    .from('form_endpoints')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete endpoint
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('form_endpoints')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Get submissions for an endpoint
router.get('/:id/submissions', requireAuth, async (req, res) => {
  // Verify ownership
  const { data: endpoint } = await supabaseAdmin
    .from('form_endpoints')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (!endpoint) return res.status(404).json({ error: 'Endpoint not found.' });

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const page = parseInt(req.query.page) || 0;

  const { data, error, count } = await supabaseAdmin
    .from('endpoint_submissions')
    .select('id, data, ip, origin, created_at', { count: 'exact' })
    .eq('endpoint_id', req.params.id)
    .order('created_at', { ascending: false })
    .range(page * limit, page * limit + limit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ submissions: data, total: count, page, limit });
});

export default router;
