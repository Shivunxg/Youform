import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../lib/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { hasFeature } from '../lib/plans.js';
import { nanoid } from 'nanoid';

// AI endpoints are expensive — cap at 15 calls per user per minute
const aiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
  keyGenerator: (req) => req.user?.id ?? req.ip,
});

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
router.post('/ai/generate-form', requireAuth, aiRateLimit, [
  body('prompt').trim().isLength({ min: 5, max: 500 }).withMessage('Describe your form in 5–500 characters.'),
  body('workspaceId').isUUID().withMessage('Invalid workspace.'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg });

    const { prompt, workspaceId } = req.body;

    // Verify workspace membership + plan
    const { data: member } = await supabaseAdmin
      .from('workspace_members')
      .select('role, workspaces(plan)')
      .eq('workspace_id', workspaceId)
      .eq('user_id', req.user.id)
      .single();
    if (!member) return res.status(403).json({ error: 'No access to this workspace.' });

    const plan = member.workspaces?.plan ?? 'free';
    if (!hasFeature(plan, 'ai_features')) {
      return res.status(403).json({ error: 'AI form generation requires a Pro plan or higher.', upgrade: true });
    }

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

const REWRITE_SYSTEM = `You are a form block copywriter. Given a block type, optional existing content, and a user instruction, output ONLY a JSON object — no prose, no markdown fences — with exactly this shape:
{"title":"<block title or question, max 120 chars>","description":"<supporting copy, 1-2 sentences max, or empty string>"}

Rules:
- For question types (short_text, multiple_choice, rating, etc.): write a clear, specific, conversational question.
- For statement / welcome_screen: write an engaging, friendly announcement or instruction.
- description should provide context, instructions, or motivation; keep under 80 words; leave empty string if not needed.
- Never truncate mid-sentence.
- Return raw JSON only — no markdown, no explanation.`;

async function rewriteBlock(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('AI is not configured on this server. Add ANTHROPIC_API_KEY to enable it.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: REWRITE_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(15_000),
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

// POST /api/ai/rewrite-block
router.post('/ai/rewrite-block', requireAuth, aiRateLimit, [
  body('blockType').notEmpty().withMessage('blockType is required'),
  body('hint').optional({ nullable: true }).trim().isLength({ max: 500 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ error: errors.array()[0].msg });

    const { blockType, currentTitle, currentDescription, formTitle, hint } = req.body;

    const prompt = `Form: "${formTitle || 'Untitled form'}"
Block type: ${blockType}
Current title: ${currentTitle || '(empty)'}
Current description: ${currentDescription || '(empty)'}
Instruction: ${hint?.trim() || 'Improve clarity and engagement, keep it concise and conversational'}`;

    const result = await rewriteBlock(prompt);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
