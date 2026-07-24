#!/usr/bin/env node
// Usage: BASE_URL=https://your-app.vercel.app AUTH_TOKEN=<jwt> node scripts/smoke-test.js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? '';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

const results = [];

async function check(label, fn) {
  const t = Date.now();
  try {
    const { pass, detail } = await fn();
    const ms = Date.now() - t;
    const symbol = pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const detailStr = detail ? ` ${DIM}${detail}${RESET}` : '';
    console.log(`  ${symbol} ${label}${detailStr} ${DIM}(${ms}ms)${RESET}`);
    results.push({ label, pass, ms });
  } catch (err) {
    const ms = Date.now() - t;
    console.log(`  ${RED}✗${RESET} ${label} ${DIM}${err.message}${RESET} ${DIM}(${ms}ms)${RESET}`);
    results.push({ label, pass: false, ms, error: err.message });
  }
}

async function get(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (AUTH_TOKEN && opts.auth !== false) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  const r = await fetch(`${BASE_URL}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: r.status, body };
}

// ── API health ────────────────────────────────────────────────────────────────
console.log(`\n${YELLOW}▶ API Health${RESET}`);
await check('GET /api/health → status ok', async () => {
  const { status, body } = await get('/api/health', { auth: false });
  const pass = status === 200 && (body.status === 'ok' || body.status === 'degraded');
  return { pass, detail: `status=${body.status}` };
});

await check('Health response time < 3s', async () => {
  const t = Date.now();
  await get('/api/health', { auth: false });
  const ms = Date.now() - t;
  return { pass: ms < 3000, detail: `${ms}ms` };
});

// ── Public routes (no auth) ───────────────────────────────────────────────────
console.log(`\n${YELLOW}▶ Public routes${RESET}`);
await check('GET /api/templates → 200 array', async () => {
  const { status, body } = await get('/api/templates', { auth: false });
  const pass = status === 200 && Array.isArray(body);
  return { pass, detail: `${body?.length ?? '?'} templates` };
});

// ── Auth guard (expect 401, not 500) ─────────────────────────────────────────
console.log(`\n${YELLOW}▶ Auth guards (no token → 401)${RESET}`);
const guardRoutes = [
  ['GET /api/workspaces',       '/api/workspaces'],
  ['GET /api/forms',            '/api/forms'],
  ['GET /api/admin/users',      '/api/admin/users'],
];
for (const [label, path] of guardRoutes) {
  await check(`${label} → 401`, async () => {
    const { status } = await get(path, { auth: false });
    return { pass: status === 401 || status === 403, detail: `HTTP ${status}` };
  });
}

// ── Authenticated routes (only if AUTH_TOKEN provided) ────────────────────────
if (AUTH_TOKEN) {
  console.log(`\n${YELLOW}▶ Authenticated routes${RESET}`);

  await check('GET /api/workspaces → 200', async () => {
    const { status, body } = await get('/api/workspaces');
    const pass = status === 200;
    return { pass, detail: `${Array.isArray(body) ? body.length : '?'} workspaces` };
  });

  await check('GET /api/forms → 200', async () => {
    const { status, body } = await get('/api/forms');
    const pass = status === 200 && body?.forms !== undefined;
    return { pass, detail: `${body?.forms?.length ?? '?'} forms` };
  });
}

// ── 404 handler ───────────────────────────────────────────────────────────────
console.log(`\n${YELLOW}▶ Error handling${RESET}`);
await check('Unknown route → 404 not 500', async () => {
  const { status } = await get('/api/nonexistent-route-xyz', { auth: false });
  return { pass: status === 404, detail: `HTTP ${status}` };
});

await check('POST /api/errors/client → 202', async () => {
  const r = await fetch(`${BASE_URL}/api/errors/client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'smoke-test ping', url: 'smoke-test', timestamp: new Date().toISOString() }),
    signal: AbortSignal.timeout(5_000),
  });
  return { pass: r.status === 202, detail: `HTTP ${r.status}` };
});

// ── Summary ───────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
const totalMs = results.reduce((s, r) => s + r.ms, 0);

console.log(`\n${'─'.repeat(50)}`);
if (failed === 0) {
  console.log(`${GREEN}All ${passed} checks passed${RESET} ${DIM}(${totalMs}ms total)${RESET}`);
} else {
  console.log(`${RED}${failed} check(s) failed${RESET}, ${passed} passed ${DIM}(${totalMs}ms total)${RESET}`);
  console.log(`\nFailed checks:`);
  results.filter(r => !r.pass).forEach(r => console.log(`  ${RED}✗${RESET} ${r.label}`));
}
console.log('');

process.exit(failed > 0 ? 1 : 0);
