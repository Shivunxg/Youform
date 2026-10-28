import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../lib/logger.js';

const errorReportLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many error reports from this IP.' },
});

const router = Router();

// Rolling in-memory buffer of the last 100 client errors
const clientErrors = [];
const MAX_ERRORS = 100;

router.post('/errors/client', errorReportLimit, (req, res) => {
  const { message, stack, componentStack, url, userAgent, timestamp } = req.body ?? {};

  if (!message) return res.status(400).json({ error: 'message required' });

  const entry = {
    id: Date.now(),
    message: String(message).slice(0, 500),
    stack: String(stack ?? '').slice(0, 2000),
    componentStack: String(componentStack ?? '').slice(0, 2000),
    url: String(url ?? '').slice(0, 500),
    userAgent: String(userAgent ?? '').slice(0, 300),
    timestamp: timestamp ?? new Date().toISOString(),
    ip: req.ip,
  };

  if (clientErrors.length >= MAX_ERRORS) clientErrors.shift();
  clientErrors.push(entry);

  logger.error('Client error', { message: entry.message, url: entry.url, stack: entry.stack.split('\n')[0] });
  res.status(202).json({ ok: true });
});

// Simple admin review endpoint — secured by service role key header
router.get('/errors/client', (req, res) => {
  const key = req.headers['x-service-key'];
  if (key !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }
  res.json({ count: clientErrors.length, errors: [...clientErrors].reverse() });
});

export default router;
