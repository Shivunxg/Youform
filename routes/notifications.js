const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => { res.json([]); });
router.patch('/:id/read', requireAuth, (req, res) => { res.json({ message: 'ok' }); });
router.patch('/read-all', requireAuth, (req, res) => { res.json({ message: 'ok' }); });

router.get('/integrations', requireAuth, (req, res) => {
  const { form_id } = req.query;
  let query = 'SELECT * FROM integrations WHERE workspace_id=?';
  const params = [req.user.workspaceId];
  if (form_id) { query += ' AND (form_id=? OR form_id IS NULL)'; params.push(form_id); }
  res.json(db.prepare(query).all(...params).map(i=>({...i,config:JSON.parse(i.config)})));
});

router.post('/integrations', requireAuth, (req, res) => {
  const { form_id, type, config } = req.body;
  if (!type) return res.status(400).json({ error: 'Type required' });
  const id = uuidv4();
  db.prepare('INSERT INTO integrations (id,workspace_id,form_id,type,config) VALUES (?,?,?,?,?)').run(id, req.user.workspaceId, form_id||null, type, JSON.stringify(config||{}));
  const integ = db.prepare('SELECT * FROM integrations WHERE id=?').get(id);
  res.status(201).json({...integ,config:JSON.parse(integ.config)});
});

router.delete('/integrations/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM integrations WHERE id=? AND workspace_id=?').run(req.params.id, req.user.workspaceId);
  res.json({ message: 'Integration removed' });
});

module.exports = router;
