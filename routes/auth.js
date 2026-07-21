const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = db.prepare(`SELECT u.*, w.name AS workspace_name, w.slug AS workspace_slug, w.plan AS workspace_plan FROM users u JOIN workspaces w ON u.workspace_id = w.id WHERE u.email = ?`).get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id, workspaceId: user.workspace_id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, workspace: { id: user.workspace_id, name: user.workspace_name, slug: user.workspace_slug, plan: user.workspace_plan } } });
});

router.post('/register', (req, res) => {
  const { name, email, password, workspaceName } = req.body;
  if (!name || !email || !password || !workspaceName) return res.status(400).json({ error: 'All fields required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const wsId = uuidv4(), userId = uuidv4();
  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '-' + wsId.slice(0, 6);
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare('INSERT INTO workspaces (id,name,slug,plan) VALUES (?,?,?,?)').run(wsId, workspaceName, slug, 'free');
    db.prepare('INSERT INTO users (id,workspace_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?)').run(userId, wsId, name, email.toLowerCase().trim(), hash, 'owner');
    const token = jwt.sign({ userId, workspaceId: wsId, role: 'owner', email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, name, email, role: 'owner', workspace: { id: wsId, name: workspaceName, slug, plan: 'free' } } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
  const user = db.prepare(`SELECT u.*, w.name AS workspace_name, w.slug AS workspace_slug, w.plan AS workspace_plan FROM users u JOIN workspaces w ON u.workspace_id = w.id WHERE u.id = ?`).get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, workspace: { id: user.workspace_id, name: user.workspace_name, slug: user.workspace_slug, plan: user.workspace_plan } });
});

module.exports = router;
