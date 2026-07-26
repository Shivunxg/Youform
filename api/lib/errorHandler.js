import { logger } from './logger.js';
export function errorHandler(err, req, res, next) {
  logger.error({ message: err.message, path: req.path });
  if (err.type === 'validation') return res.status(422).json({ error: 'Validation failed', details: err.errors });
  if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
}
export function createError(statusCode, message) {
  const err = new Error(message); err.statusCode = statusCode; return err;
}
