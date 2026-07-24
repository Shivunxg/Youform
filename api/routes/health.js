import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';

const router = Router();
const BOOT_TIME = Date.now();

async function pingDb() {
  const t = Date.now();
  const { error } = await supabaseAdmin.from('forms').select('id').limit(1);
  return { status: error ? 'down' : 'ok', latencyMs: Date.now() - t, ...(error && { error: error.message }) };
}

async function countTable(table) {
  const t = Date.now();
  const { count, error } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  return { status: error ? 'down' : 'ok', count: count ?? 0, latencyMs: Date.now() - t, ...(error && { error: error.message }) };
}

async function integrityChecks() {
  const results = {};

  // Forms missing workspace_id (FK constraint should prevent this, but soft catch it)
  const { count: orphanForms } = await supabaseAdmin
    .from('forms').select('*', { count: 'exact', head: true }).is('workspace_id', null);
  results.formsWithoutWorkspace = { status: orphanForms > 0 ? 'warn' : 'ok', count: orphanForms ?? 0 };

  // Questions missing form_id
  const { count: orphanQuestions } = await supabaseAdmin
    .from('questions').select('*', { count: 'exact', head: true }).is('form_id', null);
  results.questionsWithoutForm = { status: orphanQuestions > 0 ? 'warn' : 'ok', count: orphanQuestions ?? 0 };

  // Stale archived forms (archived > 30 days ago — potential cleanup backlog)
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: staleArchived } = await supabaseAdmin
    .from('forms').select('*', { count: 'exact', head: true })
    .eq('status', 'archived').lt('updated_at', cutoff);
  results.staleArchivedForms = { status: staleArchived > 50 ? 'warn' : 'ok', count: staleArchived ?? 0 };

  // Most recent response (data flow signal)
  const { data: latestResp } = await supabaseAdmin
    .from('responses').select('created_at').order('created_at', { ascending: false }).limit(1);
  results.lastResponseAt = latestResp?.[0]?.created_at ?? null;

  return results;
}

router.get('/health', async (req, res) => {
  const reqStart = Date.now();

  // Unauthenticated callers (uptime monitors, load balancers) get a minimal liveness signal only.
  // Pass ?key=<HEALTH_SECRET> or X-Health-Key header for full diagnostic output.
  const incomingKey = req.query.key ?? req.headers['x-health-key'];
  const isAuthenticated = incomingKey && incomingKey === process.env.HEALTH_SECRET;

  if (!isAuthenticated) {
    const { error } = await supabaseAdmin.from('forms').select('id').limit(1);
    const status = error ? 'down' : 'ok';
    if (error) logger.warn('Health liveness check failed', { error: error.message });
    return res.status(error ? 503 : 200).json({ status, timestamp: new Date().toISOString() });
  }

  const [dbResult, formsResult, questionsResult, responsesResult, workspacesResult] =
    await Promise.allSettled([pingDb(), countTable('forms'), countTable('questions'), countTable('responses'), countTable('workspaces')]);

  const integrity = await integrityChecks().catch(e => ({ error: e.message }));

  const settle = (r) => r.status === 'fulfilled' ? r.value : { status: 'down', error: r.reason?.message };

  const checks = {
    database:    settle(dbResult),
    tables: {
      forms:       settle(formsResult),
      questions:   settle(questionsResult),
      responses:   settle(responsesResult),
      workspaces:  settle(workspacesResult),
    },
    integrity,
    env: {
      supabaseUrl:      !!process.env.SUPABASE_URL,
      serviceRoleKey:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      jwtSecret:        !!(process.env.JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET),
      resend:           !!process.env.RESEND_API_KEY,
      stripe:           !!process.env.STRIPE_SECRET_KEY,
    },
  };

  const isDown = checks.database.status === 'down' ||
    Object.values(checks.tables).some(t => t.status === 'down');
  const hasWarn = Object.values(checks.integrity ?? {}).some(v => v?.status === 'warn');
  const overallStatus = isDown ? 'down' : hasWarn ? 'degraded' : 'ok';

  if (overallStatus !== 'ok') {
    logger.warn('Health check non-ok', { status: overallStatus, checks });
  }

  res.status(isDown ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptimeMs: Date.now() - BOOT_TIME,
    responseTimeMs: Date.now() - reqStart,
    checks,
  });
});

export default router;
