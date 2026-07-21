const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/responses', require('./routes/responses'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/integrations', require('./middleware/auth').requireAuth, (req, res) => {
  const db = require('./db');
  const rows = db.prepare('SELECT * FROM integrations WHERE workspace_id=?').all(req.user.workspaceId);
  res.json(rows.map(r=>({...r,config:JSON.parse(r.config)})));
});

app.get('/api/workspace/stats', require('./middleware/auth').requireAuth, (req, res) => {
  const db = require('./db');
  const wsId = req.user.workspaceId;
  const forms = db.prepare('SELECT COUNT(*) AS n FROM forms WHERE workspace_id=?').get(wsId).n;
  const responses = db.prepare(`SELECT COUNT(*) AS n FROM responses r JOIN forms f ON r.form_id=f.id WHERE f.workspace_id=?`).get(wsId).n;
  const plan = db.prepare('SELECT plan FROM workspaces WHERE id=?').get(wsId)?.plan;
  res.json({ forms, responses, plan, response_limit: plan==='free'?100:plan==='pro'?5000:25000 });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'YouForm', version: '1.0.0' }));

app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 YouForm running at http://localhost:${PORT}`);
  console.log(`🔑 Login: jordan@acme.com / demo1234\n`);
});

module.exports = app;
