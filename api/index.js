import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

// ── Routes ────────────────────────────────────────────────────────────────────
import submitRoute      from './routes/submit.js';
import endpointsRoute   from './routes/endpoints.js';
import linkedEmailsRoute from './routes/linkedEmails.js';
import workspacesRoute  from './routes/workspaces.js';
import formsRoute       from './routes/forms.js';
import responsesRoute   from './routes/responses.js';
import accountRoute     from './routes/account.js';
import adminRoute       from './routes/admin.js';
import aiRoute          from './routes/ai.js';
import billingRoute     from './routes/billing.js';
import templatesRoute   from './routes/templates.js';
import integrationsRoute from './routes/integrations.js';
import oauthRoute       from './routes/oauth.js';
import errorsRoute      from './routes/errors.js';
import googleFormsRoute from './routes/google-forms.js';
import healthRoute      from './routes/health.js';
import imagesRoute      from './routes/images.js';
import typeformRoute    from './routes/typeform.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Wide-open CORS for /submit so any website can POST forms
app.use('/submit', cors({ origin: '*', methods: ['POST', 'OPTIONS'] }));

// Stripe webhooks need raw body — must be before express.json on that path
app.use('/api/billing/webhooks', express.raw({ type: 'application/json' }));

// Restricted CORS for dashboard API
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use('/api', cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: true,
}));

// Rate limiting
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this IP, try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/submit', submitLimiter);
app.use('/api', apiLimiter);

// ── Mount routes ──────────────────────────────────────────────────────────────
app.use('/submit',             submitRoute);
app.use('/api/endpoints',      endpointsRoute);
app.use('/api/linked-emails',  linkedEmailsRoute);
app.use('/api/workspaces',     workspacesRoute);
app.use('/api/billing',        billingRoute);
app.use('/api/templates',      templatesRoute);
app.use('/api/oauth',          oauthRoute);
app.use('/api/admin',          adminRoute);

// Routers that embed their own full path (e.g. router.get('/forms/:id', ...))
app.use('/api', formsRoute);
app.use('/api', responsesRoute);
app.use('/api', integrationsRoute);
app.use('/api', accountRoute);
app.use('/api', aiRoute);
app.use('/api', errorsRoute);
app.use('/api', googleFormsRoute);
app.use('/api', healthRoute);
app.use('/api', imagesRoute);
app.use('/api', typeformRoute);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`FormFlowX API listening on port ${PORT}`));

export default app;
