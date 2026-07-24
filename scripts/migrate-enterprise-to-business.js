#!/usr/bin/env node
/**
 * One-time migration: moves all workspaces on the legacy "enterprise" plan
 * to "business" and resets their limits to the Business plan values.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/migrate-enterprise-to-business.js
 *
 * Run once against production, then you can delete this file.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Business plan limits (must match api/lib/plans.js)
const BUSINESS = {
  plan: 'business',
  responses_limit: 25000,
  storage_limit_mb: 10240,
  remove_branding: true,
};

async function run() {
  // 1. Find all enterprise workspaces
  const { data: workspaces, error: fetchErr } = await supabase
    .from('workspaces')
    .select('id, name, plan')
    .eq('plan', 'enterprise');

  if (fetchErr) {
    console.error('Failed to fetch enterprise workspaces:', fetchErr.message);
    process.exit(1);
  }

  if (!workspaces?.length) {
    console.log('No enterprise workspaces found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${workspaces.length} enterprise workspace(s):`);
  workspaces.forEach(ws => console.log(`  · [${ws.id}] ${ws.name}`));
  console.log('');

  // 2. Migrate each one to business
  let ok = 0;
  let fail = 0;

  for (const ws of workspaces) {
    const { error: updateErr } = await supabase
      .from('workspaces')
      .update(BUSINESS)
      .eq('id', ws.id);

    if (updateErr) {
      console.error(`  FAILED [${ws.id}] ${ws.name}: ${updateErr.message}`);
      fail++;
    } else {
      console.log(`  OK [${ws.id}] ${ws.name} → business`);
      ok++;
    }
  }

  console.log('');
  console.log(`Migration complete: ${ok} succeeded, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

run();
