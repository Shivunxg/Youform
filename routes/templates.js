const router = require('express').Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { category } = req.query;
  let query = 'SELECT * FROM templates WHERE is_public=1';
  const params = [];
  if (category && category !== 'all') { query += ' AND category=?'; params.push(category); }
  query += ' ORDER BY use_count DESC';
  res.json(db.prepare(query).all(...params).map(t=>({...t,questions:JSON.parse(t.questions),settings:JSON.parse(t.settings)})));
});

router.get('/:id', (req, res) => {
  const tmpl = db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
  if (!tmpl) return res.status(404).json({ error: 'Template not found' });
  res.json({...tmpl,questions:JSON.parse(tmpl.questions),settings:JSON.parse(tmpl.settings)});
});

module.exports = router;
