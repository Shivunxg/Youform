const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/export/csv', requireAuth, (req, res) => {
  const { form_id } = req.query;
  if (!form_id) return res.status(400).json({ error: 'form_id required' });
  const form = db.prepare('SELECT * FROM forms WHERE id=? AND workspace_id=?').get(form_id, req.user.workspaceId);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const questions = JSON.parse(form.questions);
  const responses = db.prepare('SELECT * FROM responses WHERE form_id=? ORDER BY submitted_at DESC').all(form_id);
  const headers = ['#','Submitted at','Name','Email','Status','Time (sec)',...questions.map(q=>q.label)];
  const rows = responses.map((r,i) => {
    const answers = JSON.parse(r.answers);
    return [responses.length-i, r.submitted_at, r.respondent_name||'', r.respondent_email||'', r.status, r.time_spent, ...questions.map((_,qi) => { const a=answers[qi]; return Array.isArray(a)?a.join('; '):(a??''); })].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
  });
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition',`attachment; filename="${form.title}-responses.csv"`);
  res.send([headers.map(h=>`"${h}"`).join(','),...rows].join('\n'));
});

router.get('/', requireAuth, (req, res) => {
  const { form_id, status, search, page=1, limit=20 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where = `r.form_id IN (SELECT id FROM forms WHERE workspace_id=?)`;
  const params = [req.user.workspaceId];
  if (form_id) { where+=' AND r.form_id=?'; params.push(form_id); }
  if (status) { where+=' AND r.status=?'; params.push(status); }
  if (search) { where+=' AND (r.respondent_name LIKE ? OR r.respondent_email LIKE ?)'; params.push(`%${search}%`,`%${search}%`); }
  const total = db.prepare(`SELECT COUNT(*) AS n FROM responses r WHERE ${where}`).get(...params).n;
  const rows = db.prepare(`SELECT r.*, f.title AS form_title FROM responses r JOIN forms f ON r.form_id=f.id WHERE ${where} ORDER BY r.submitted_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ responses: rows.map(r=>({...r,answers:JSON.parse(r.answers)})), total, page:parseInt(page), pages:Math.ceil(total/parseInt(limit)) });
});

router.post('/', (req, res) => {
  const { form_id, answers, respondent_name, respondent_email, time_spent, utm_source, utm_medium, utm_campaign, session_id } = req.body;
  if (!form_id) return res.status(400).json({ error: 'form_id required' });
  const form = db.prepare('SELECT id,status FROM forms WHERE id=?').get(form_id);
  if (!form || form.status==='draft') return res.status(404).json({ error: 'Form not found' });
  const id = uuidv4();
  const status = answers && Object.keys(answers).length > 0 ? 'complete' : 'partial';
  db.prepare(`INSERT INTO responses (id,form_id,respondent_name,respondent_email,answers,status,time_spent,ip_address,utm_source,utm_medium,utm_campaign) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, form_id, respondent_name||null, respondent_email||null, JSON.stringify(answers||{}), status, time_spent||0, req.ip, utm_source||null, utm_medium||null, utm_campaign||null);
  db.prepare('UPDATE forms SET response_count=response_count+1, updated_at=? WHERE id=?').run(new Date().toISOString(), form_id);
  if (session_id) db.prepare('INSERT INTO analytics_events (id,form_id,event_type,session_id) VALUES (?,?,?,?)').run(uuidv4(), form_id, 'complete', session_id);
  res.status(201).json({ id, status, message: 'Response submitted' });
});

router.delete('/:id', requireAuth, (req, res) => {
  const resp = db.prepare(`SELECT r.id FROM responses r JOIN forms f ON r.form_id=f.id WHERE r.id=? AND f.workspace_id=?`).get(req.params.id, req.user.workspaceId);
  if (!resp) return res.status(404).json({ error: 'Response not found' });
  db.prepare('DELETE FROM responses WHERE id=?').run(req.params.id);
  res.json({ message: 'Response deleted' });
});

module.exports = router;
