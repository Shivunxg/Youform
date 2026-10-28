import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

import formsRouter from './routes/forms.js';
import responsesRouter from './routes/responses.js';
import workspacesRouter from './routes/workspaces.js';
import integrationsRouter from './routes/integrations.js';
import billingRouter from './routes/billing.js';
import templatesRouter from './routes/templates.js';

import { startWorkers } from './jobs/queues.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.set('trust proxy', 1);

// ============================================================
// Security & Middleware
// ============================================================
app.use(helmet());

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Stripe webhooks need raw body — must come BEFORE express.json()
app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ============================================================
// Rate limiting
// ============================================================

// Global: 300 req/min per IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}));

// Stricter limit on public form submission endpoint
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many submissions from this IP' },
});
app.use('/api/public/forms/:formId/responses', submissionLimiter);

// ============================================================
// Routes
// ============================================================
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api', formsRouter);
app.use('/api', responsesRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api', integrationsRouter);
app.use('/api/billing', billingRouter);
app.use('/api/templates', templatesRouter);

// ============================================================
// 404 catch-all
// ============================================================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ============================================================
// Error handler
// ============================================================
app.use(errorHandler);

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  logger.info(`FormFlow API running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`);
});

// Start BullMQ workers
if (process.env.NODE_ENV !== 'test') {
  startWorkers();
}

export default app;
