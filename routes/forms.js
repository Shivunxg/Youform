const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  const forms = db.prepare(`SELECT f.*, (SELECT COUNT(*) FROM responses r WHERE r.form_id=f.id AND r.status='complete') AS complete_count, (SELECT COUNT(*) FROM responses r WHERE r.form_id=f.id) AS total_responses FROM forms f WHERE f.workspace_id=? ORDER BY f.updated_at DESC`).all(req.user.workspaceId);
  res.json(forms.map(f => ({ ...f, questions: JSON.parse(f.questions), settings: JSON.parse(f.settings), theme: JSON.parse(f.theme), completion_rate: f.total_responses > 0 ? Math.round(f.complete_count / f.total_responses * 100) : 0 })));
});

router.get('/public/:slug', (req, res) => {
  const form = db.prepare(`SELECT id,title,description,slug,status,questions,settings,theme FROM forms WHERE slug=?`).get(req.params.slug);
  if (!form || form.status === 'draft') return res.status(404).json({ error: 'Form not found' });
  db.prepare('UPDATE forms SET view_count=view_count+1 WHERE id=?').run(form.id);
  res.json({ ...form, questions: JSON.parse(form.questions), settings: JSON.parse(form.settings), theme: JSON.parse(form.theme) });
});

router.get('/:id', requireAuth, (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id=? AND workspace_id=?').get(req.params.id, req.user.workspaceId);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  res.json({ ...form, questions: JSON.parse(form.questions), settings: JSON.parse(form.settings), theme: JSON.parse(form.theme) });
});

router.post('/', requireAuth, (req, res) => {
  const { title, description, questions = [], settings = {}, theme = {}, template_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + id.slice(0, 6);
  let finalQs = questions;
  if (template_id) {
    const tmpl = db.prepare('SELECT questions FROM templates WHERE id=?').get(template_id);
    if (tmpl) { finalQs = JSON.parse(tmpl.questions).map(q => ({ ...q, id: uuidv4() })); db.prepare('UPDATE templates SET use_count=use_count+1 WHERE id=?').run(template_id); }
  }
  db.prepare(`INSERT INTO forms (id,workspace_id,created_by,title,description,slug,status,questions,settings,theme) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id, req.user.workspaceId, req.user.userId, title, description || null, slug, 'draft', JSON.stringify(finalQs), JSON.stringify(settings), JSON.stringify(theme));
  const form = db.prepare('SELECT * FROM forms WHERE id=?').get(id);
  res.status(201).json({ ...form, questions: JSON.parse(form.questions), settings: JSON.parse(form.settings), theme: JSON.parse(form.theme) });
});

router.patch('/:id', requireAuth, (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id=? AND workspace_id=?').get(req.params.id, req.user.workspaceId);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const { title, description, status, questions, settings, theme } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;
  if (questions !== undefined) updates.questions = JSON.stringify(questions);
  if (settings !== undefined) updates.settings = JSON.stringify(settings);
  if (theme !== undefined) updates.theme = JSON.stringify(theme);
  const setClauses = Object.keys(updates).map(k => `${k}=?`).join(',');
  db.prepare(`UPDATE forms SET ${setClauses} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = db.prepare('SELECT * FROM forms WHERE id=?').get(req.params.id);
  res.json({ ...updated, questions: JSON.parse(updated.questions), settings: JSON.parse(updated.settings), theme: JSON.parse(updated.theme) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const form = db.prepare('SELECT id FROM forms WHERE id=? AND workspace_id=?').get(req.params.id, req.user.workspaceId);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  db.prepare('DELETE FROM responses WHERE form_id=?').run(req.params.id);
  db.prepare('DELETE FROM analytics_events WHERE form_id=?').run(req.params.id);
  db.prepare('DELETE FROM forms WHERE id=?').run(req.params.id);
  res.json({ message: 'Form deleted' });
});

router.post('/:id/duplicate', requireAuth, (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id=? AND workspace_id=?').get(req.params.id, req.user.workspaceId);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const newId = uuidv4();
  db.prepare(`INSERT INTO forms (id,workspace_id,created_by,title,description,slug,status,questions,settings,theme) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(newId, req.user.workspaceId, req.user.userId, form.title + ' (copy)', form.description, form.slug + '-copy-' + newId.slice(0,4), 'draft', form.questions, form.settings, form.theme);
  const newForm = db.prepare('SELECT * FROM forms WHERE id=?').get(newId);
  res.status(201).json({ ...newForm, questions: JSON.parse(newForm.questions), settings: JSON.parse(newForm.settings), theme: JSON.parse(newForm.theme) });
});

module.exports = router;
