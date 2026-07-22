import express from 'express';
import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { nanoid } from 'nanoid';

const router = express.Router();

// Typeform field type → FormFlow question type
function mapType(field) {
  switch (field.type) {
    case 'short_text':     return 'short_text';
    case 'long_text':      return 'long_text';
    case 'multiple_choice':
      return field.properties?.allow_multiple_selection ? 'multiple_choice' : 'multiple_choice';
    case 'dropdown':       return 'dropdown';
    case 'rating':         return 'rating';
    case 'opinion_scale':  return 'nps';
    case 'yes_no':         return 'yes_no';
    case 'email':          return 'email';
    case 'phone_number':   return 'phone';
    case 'number':         return 'number';
    case 'date':           return 'date';
    case 'file_upload':    return 'file_upload';
    case 'statement':      return 'short_text';
    default:               return 'short_text';
  }
}

function mapField(field) {
  const type = mapType(field);
  const q = {
    id: nanoid(),
    type,
    title: field.title || 'Untitled question',
    required: field.validations?.required ?? false,
    config: {},
  };

  if (field.properties?.description) {
    q.description = field.properties.description;
  }

  // choices
  if (['multiple_choice', 'dropdown'].includes(type) && field.properties?.choices) {
    q.config.choices = field.properties.choices.map(c => ({
      id: nanoid(),
      label: c.label,
    }));
    if (field.properties.allow_multiple_selection) {
      q.config.allowMultiple = true;
    }
  }

  // rating
  if (type === 'rating' && field.properties) {
    q.config.steps = field.properties.steps ?? 5;
    q.config.shape = field.properties.shape === 'star' ? 'star' : 'star';
  }

  // nps / opinion_scale
  if (type === 'nps' && field.properties) {
    q.config.steps = field.properties.steps ?? 10;
  }

  return q;
}

function extractFormId(url) {
  // https://username.typeform.com/to/FORMID
  // https://form.typeform.com/to/FORMID
  const m = url.match(/typeform\.com\/to\/([A-Za-z0-9]+)/);
  if (m) return m[1];
  // bare form ID
  if (/^[A-Za-z0-9]+$/.test(url.trim())) return url.trim();
  return null;
}

// POST /api/typeform/import
router.post('/typeform/import', requireAuth, async (req, res, next) => {
  try {
    const { url, token, workspaceId } = req.body;
    if (!url || !token || !workspaceId) {
      return res.status(400).json({ error: 'url, token, and workspaceId are required.' });
    }

    const formId = extractFormId(url);
    if (!formId) {
      return res.status(400).json({ error: 'Could not parse a Typeform form ID from that URL.' });
    }

    // Fetch from Typeform API
    const tfRes = await fetch(`https://api.typeform.com/forms/${formId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!tfRes.ok) {
      const err = await tfRes.json().catch(() => ({}));
      const msg = err.description || err.code || `Typeform API error ${tfRes.status}`;
      return res.status(400).json({ error: `Typeform: ${msg}` });
    }
    const tf = await tfRes.json();

    // Build FormFlow questions
    const questions = [];

    // welcome screen
    if (tf.welcome_screens?.length) {
      const ws = tf.welcome_screens[0];
      questions.push({
        id: nanoid(),
        type: 'welcome_screen',
        title: ws.title || 'Welcome',
        config: { buttonText: ws.properties?.button_text || 'Start' },
        required: false,
      });
    }

    // fields
    for (const field of tf.fields ?? []) {
      // skip logic group containers — recurse into their fields
      if (field.type === 'group' && field.properties?.fields) {
        for (const inner of field.properties.fields) {
          questions.push(mapField(inner));
        }
      } else {
        questions.push(mapField(field));
      }
    }

    // thank you screen
    if (tf.thankyou_screens?.length) {
      const ty = tf.thankyou_screens[0];
      questions.push({
        id: nanoid(),
        type: 'thank_you_screen',
        title: ty.title || 'Thank you!',
        config: {},
        required: false,
      });
    }

    // Create the form
    const { data: form, error: formErr } = await supabaseAdmin
      .from('forms')
      .insert({
        workspace_id: workspaceId,
        title: tf.title || 'Imported from Typeform',
        slug: nanoid(10),
        created_by: req.user.id,
        settings: {},
      })
      .select()
      .single();

    if (formErr) throw formErr;

    // Save questions
    if (questions.length) {
      const rows = questions.map((q, i) => ({
        form_id: form.id,
        position: i,
        type: q.type,
        title: q.title,
        required: q.required,
        config: q.config,
        description: q.description || null,
      }));
      const { error: qErr } = await supabaseAdmin.from('questions').insert(rows);
      if (qErr) throw qErr;
    }

    res.json({
      formId: form.id,
      title: form.title,
      questionCount: questions.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
