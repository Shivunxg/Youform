const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'youform-dev-secret-2026';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid token' });
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}
module.exports = { requireAuth, JWT_SECRET };
