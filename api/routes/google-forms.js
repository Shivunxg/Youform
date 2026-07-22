import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { nanoid } from 'nanoid';

const router = express.Router();

const GF_TYPE_MAP = {
  0: 'short_text',      // SHORT_ANSWER
  1: 'long_text',       // PARAGRAPH
  2: 'multiple_choice', // RADIO
  3: 'dropdown',        // DROPDOWN
  4: 'multiple_choice', // CHECKBOXES (allowMultiple: true)
  5: 'rating',          // LINEAR_SCALE → rating or nps
  7: 'short_text',      // GRID (flattened)
  9: 'date',            // DATE
  10: 'short_text',     // TIME
};

function extractFormId(url) {
  // Accepts both /forms/d/e/ID/viewform and /forms/d/ID/viewform
  const m = url.match(/\/forms\/d\/(?:e\/)?([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseGoogleFormHtml(html) {
  // Google embeds form data in a JS variable in the page HTML
  const match = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
  if (!match) {
    throw new Error("Could not parse form structure. Make sure the form is set to 'Anyone with the link' sharing.");
  }

  let raw;
  try {
    raw = JSON.parse(match[1]);
  } catch {
    throw new Error('Unexpected Google Forms data format.');
  }

  // Top-level structure: [null, formPayload, ...]
  const formPayload = raw?.[1];
  if (!Array.isArray(formPayload)) throw new Error('Unexpected Google Forms structure.');

  // Title lives at different depths depending on form version
  let title = 'Imported Google Form';
  try {
    title = formPayload[8]?.[1]?.[0]
      ?? formPayload[3]?.[0]
      ?? formPayload[1]?.[0]
      ?? title;
  } catch {}

  // Questions array — typically at formPayload[1][1]
  let rawQuestions = [];
  try {
    rawQuestions = formPayload[1]?.[1] ?? [];
  } catch {}

  const questions = [];
  let skipped = 0;

  // Always add welcome screen with form title
  questions.push({
    id: nanoid(),
    type: 'welcome_screen',
    title,
    required: false,
    config: { buttonLabel: 'Start' },
  });

  for (const q of rawQuestions) {
    if (!Array.isArray(q)) continue;

    const qTitle = q[1] ?? 'Untitled question';
    const qTypeCode = q[3];
    const qRequired = q[4]?.[0]?.[2] === 1;

    const ffType = GF_TYPE_MAP[qTypeCode];
    if (ffType === undefined) {
      skipped++;
      continue;
    }

    const question = {
      id: nanoid(),
      type: ffType,
      title: qTitle,
      required: qRequired,
      config: {},
    };

    // Choices for radio/checkbox/dropdown
    if ([2, 3, 4].includes(qTypeCode)) {
      const rawChoices = q[4]?.[0]?.[1] ?? [];
      question.config.choices = rawChoices.map(opt => ({
        id: nanoid(),
        label: Array.isArray(opt) ? (opt[0] ?? 'Option') : String(opt),
      }));
      if (qTypeCode === 4) question.config.allowMultiple = true;
    }

    // Linear scale → rating or nps
    if (qTypeCode === 5) {
      const scale = q[4]?.[0];
      const high = scale?.[3]?.[1] ?? 5;
      if (high >= 8) {
        question.type = 'nps';
        question.config = {
          lowLabel: scale?.[4]?.[0] ?? 'Not likely',
          highLabel: scale?.[4]?.[1] ?? 'Extremely likely',
        };
      } else {
        question.type = 'rating';
        question.config = { steps: high, shape: 'star' };
      }
    }

    questions.push(question);
  }

  questions.push({
    id: nanoid(),
    type: 'thank_you_screen',
    title: 'Thank you!',
    required: false,
    config: { message: 'Your response has been recorded.' },
  });

  return { title, questions, skipped };
}

// POST /api/google-forms/import
router.post('/google-forms/import', requireAuth, [
  body('url').trim().notEmpty().withMessage('URL is required.'),
  body('workspaceId').isUUID().withMessage('Invalid workspace.'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg });

    const { url, workspaceId } = req.body;

    if (!url.includes('docs.google.com/forms')) {
      return res.status(400).json({ error: 'Please enter a valid Google Forms URL (docs.google.com/forms/…).' });
    }

    const formId = extractFormId(url);
    if (!formId) {
      return res.status(400).json({ error: 'Could not extract a form ID from that URL.' });
    }

    // Fetch the public viewform page
    const viewUrl = `https://docs.google.com/forms/d/e/${formId}/viewform`;
    let html;
    try {
      const fetchRes = await fetch(viewUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(12_000),
        redirect: 'follow',
      });

      if (fetchRes.status === 403 || fetchRes.status === 404) {
        return res.status(400).json({
          error: "This form isn't publicly accessible. Set sharing to 'Anyone with the link' in Google Forms.",
        });
      }
      if (!fetchRes.ok) {
        return res.status(400).json({ error: `Google returned status ${fetchRes.status}. Check the URL and try again.` });
      }
      html = await fetchRes.text();
    } catch (err) {
      if (err.name === 'TimeoutError') {
        return res.status(400).json({ error: 'Google Forms took too long to respond. Try again.' });
      }
      return res.status(400).json({ error: 'Could not reach Google Forms. Check the URL and try again.' });
    }

    // Parse form structure
    let parsed;
    try {
      parsed = parseGoogleFormHtml(html);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // Verify workspace access
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', req.user.id)
      .single();
    if (!member) return res.status(403).json({ error: 'No access to this workspace.' });

    // Create form
    const { data: form, error: formErr } = await supabaseAdmin
      .from('forms')
      .insert({
        workspace_id: workspaceId,
        title: parsed.title,
        slug: nanoid(10),
        created_by: req.user.id,
        settings: {},
      })
      .select()
      .single();
    if (formErr) throw formErr;

    // Save questions
    if (parsed.questions.length) {
      const rows = parsed.questions.map((q, i) => ({
        form_id: form.id,
        position: i,
        type: q.type,
        title: q.title,
        required: q.required,
        config: q.config,
        description: q.description ?? null,
      }));
      const { error: qErr } = await supabaseAdmin.from('questions').insert(rows);
      if (qErr) throw qErr;
    }

    const contentCount = parsed.questions.length - 2; // exclude welcome + thank_you
    res.json({
      formId: form.id,
      title: form.title,
      questionCount: Math.max(0, contentCount),
      skipped: parsed.skipped,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
