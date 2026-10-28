const express = require('express');
const router = express.Router();
const { supabaseAdmin, supabaseAnon } = require('../lib/supabase');

async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Not authenticated.' });
  const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token.' });
  req.user = user;
  next();
}

// List linked emails for user
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('linked_emails')
    .select('id, email, verified, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Add linked email
router.post('/', requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email?.trim() || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });

  const { data, error } = await supabaseAdmin
    .from('linked_emails')
    .insert({ user_id: req.user.id, email: email.trim().toLowerCase() })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This email is already linked.' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

// Remove linked email
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('linked_emails')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
