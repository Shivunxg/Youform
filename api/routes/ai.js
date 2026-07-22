import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { nanoid } from 'nanoid';

const router = express.Router();

const SYSTEM_PROMPT = `You are a form builder assistant. Given a description, output ONLY a JSON object — no prose, no markdown fences — with exactly this structure:
{
  "title": "Form title (concise, max 60 chars)",
  "questions": [
    {
      "type": "question_type",
      "title": "Question text",
      "required": true,
      "config": {}
    }
  ]
}

Supported types and their config shapes:
- "welcome_screen"   config: { "buttonLabel": "Start" }
- "short_text"       config: { "placeholder": "" }
- "long_text"        config: { "placeholder": "", "minRows": 3 }
- "email"            config: {}
- "phone"            config: {}
- "number"           config: { "placeholder": "" }
- "date"             config: {}
- "yes_no"           config: {}
- "multiple_choice"  config: { "choices": [{"id":"c1","label":"Option A"},{"id":"c2","label":"Option B"}], "allowMultiple": false }
- "dropdown"         config: { "choices": [{"id":"c1","label":"Option A"}] }
- "rating"           config: { "steps": 5, "shape": "star" }
- "nps"              config: { "lowLabel": "Not likely", "highLabel": "Extremely likely" }
- "statement"        config: {}
- "thank_you_screen" config: { "message": "Thank you for your response!" }

Rules:
- Always start with a welcome_screen and end with a thank_you_screen.
- Include 3–8 substantive questions between them.
- Choose types that best fit each question's purpose.
- Use unique short strings for choice IDs (not sequential numbers).
- Return raw JSON only — no markdown, no explanation.`;

async function generateWithClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI form generation is not configured on this server. Add ANTHROPIC_API_KEY to enable it.');
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Build a form for: ${prompt}` }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `AI API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned an unexpected response — please try again.');

  try {
    return JSON.parse(match[0]);
  } catch {
    throw new Error('AI returned malformed JSON — please try again.');
  }
}

// POST /api/ai/generate-form
router.post('/ai/generate-form', requireAuth, [
  body('prompt').trim().isLength({ min: 5, max: 500 }).withMessage('Describe your form in 5–500 characters.'),
  body('workspaceId').isUUID().withMessage('Invalid workspace.'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg });

    const { prompt, workspaceId } = req.body;

    // Verify workspace membership
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', req.user.id)
      .single();
    if (!member) return res.status(403).json({ error: 'No access to this workspace.' });

    const generated = await generateWithClaude(prompt);

    const { data: form, error: formErr } = await supabaseAdmin
      .from('forms')
      .insert({
        workspace_id: workspaceId,
        title: generated.title ?? 'AI Generated Form',
        slug: nanoid(10),
        created_by: req.user.id,
        settings: {},
      })
      .select()
      .single();
    if (formErr) throw formErr;

    if (generated.questions?.length) {
      const rows = generated.questions.map((q, i) => ({
        form_id: form.id,
        position: i,
        type: q.type,
        title: q.title,
        required: q.required ?? false,
        config: q.config ?? {},
        description: q.description ?? null,
      }));
      const { error: qErr } = await supabaseAdmin.from('questions').insert(rows);
      if (qErr) throw qErr;
    }

    res.json({ formId: form.id, title: form.title, questionCount: generated.questions?.length ?? 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
