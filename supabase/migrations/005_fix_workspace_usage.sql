-- Fix workspace_usage table: 001_initial_schema.sql declared TWO primary keys
-- (inline `workspace_id UUID PRIMARY KEY` + table-level `PRIMARY KEY (workspace_id, month)`)
-- which PostgreSQL rejects, so the table was never created. The trigger
-- increment_response_counts then fails on every response INSERT → 500 on submit.
--
-- This migration drops and recreates the table with the correct composite PK.
-- Existing usage data is lost (it's just counters — responses_count on forms
-- is the source of truth and is unaffected).

DROP TABLE IF EXISTS public.workspace_usage CASCADE;

CREATE TABLE public.workspace_usage (
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  responses_used  INTEGER NOT NULL DEFAULT 0,
  storage_used_mb NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, month)
);

CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace ON public.workspace_usage(workspace_id);

ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_member" ON public.workspace_usage
  FOR SELECT USING (public.is_workspace_member(workspace_id));

GRANT ALL ON public.workspace_usage TO service_role, authenticated, anon;
