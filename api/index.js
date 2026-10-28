require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const submitRoute = require('./routes/submit');
const endpointsRoute = require('./routes/endpoints');
const linkedEmailsRoute = require('./routes/linkedEmails');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Wide-open CORS for /submit so any website can POST forms
app.use('/submit', cors({ origin: '*', methods: ['POST', 'OPTIONS'] }));

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

app.use('/submit', submitRoute);
app.use('/api/endpoints', endpointsRoute);
app.use('/api/linked-emails', linkedEmailsRoute);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'formflowx-api' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`FormFlowX API listening on port ${PORT}`));

module.exports = app;
