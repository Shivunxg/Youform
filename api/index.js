import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './lib/errorHandler.js';
import formsRouter from './routes/forms.js';
import responsesRouter from './routes/responses.js';
import workspacesRouter from './routes/workspaces.js';
import integrationsRouter from './routes/integrations.js';
import oauthRouter from './routes/oauth.js';
import billingRouter from './routes/billing.js';
import templatesRouter from './routes/templates.js';
import typeformRouter from './routes/typeform.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 60000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api', formsRouter);
app.use('/api', responsesRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api', integrationsRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/billing', billingRouter);
app.use('/api/templates', templatesRouter);
app.use('/api', typeformRouter);
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));
app.use(errorHandler);

export default app;
