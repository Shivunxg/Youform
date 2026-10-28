const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabase');
const { sendSubmissionEmail } = require('../lib/email');

router.options('/', (_req, res) => res.sendStatus(204));

router.post('/', async (req, res) => {
  const body = { ...req.body };

  // Honeypot: bots fill hidden fields, humans don't. Return 200 to not reveal detection.
  if (body._gotcha || body.bot_field) {
    return res.json({ success: true });
  }

  const accessKey = body.access_key;

  if (!accessKey) {
    return res.status(400).json({
      error: 'Missing access_key. Add <input type="hidden" name="access_key" value="YOUR_KEY"> to your form.',
    });
  }

  // Look up endpoint by access key
  const { data: endpoint, error: endpointErr } = await supabaseAdmin
    .from('form_endpoints')
    .select('id, user_id, name, email_to, active')
    .eq('access_key', accessKey)
    .single();

  if (endpointErr || !endpoint) {
    return res.status(401).json({ error: 'Invalid access_key.' });
  }

  if (!endpoint.active) {
    return res.status(403).json({ error: 'This endpoint is disabled.' });
  }

  // Strip internal fields before storing
  const stored = { ...body };
  delete stored.access_key;
  delete stored._redirect;
  delete stored._subject;

  // Store submission
  const { data: submission, error: insertErr } = await supabaseAdmin
    .from('endpoint_submissions')
    .insert({
      endpoint_id: endpoint.id,
      user_id: endpoint.user_id,
      data: stored,
      ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip,
      origin: req.headers.origin || req.headers.referer || null,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[submit] insert error:', insertErr);
    return res.status(500).json({ error: 'Failed to save submission.' });
  }

  // Send email (non-blocking — don't let email failure break the response)
  if (endpoint.email_to) {
    sendSubmissionEmail({
      to: endpoint.email_to,
      formName: endpoint.name,
      submissionData: stored,
      submissionId: submission.id,
    }).catch(err => console.error('[submit] email error:', err));
  }

  // Support _redirect like web3forms
  const redirectTo = body._redirect;
  if (redirectTo && redirectTo.startsWith('http')) {
    return res.redirect(302, redirectTo);
  }

  return res.json({ success: true, id: submission.id, message: 'Submission received.' });
});

module.exports = router;
