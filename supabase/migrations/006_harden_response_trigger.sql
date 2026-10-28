-- Harden form submission pipeline:
--
-- 1. Re-create workspace_usage with the correct composite PK (guards against
--    005 not running cleanly or Supabase having partially applied the original
--    schema with only the inline single-column PK).
--
-- 2. Replace increment_response_counts() with an exception-safe version so
--    that any future workspace_usage failure is logged as a WARNING instead
--    of rolling back the responses INSERT that the user is waiting on.

-- ── Step 1: recreate workspace_usage ──────────────────────────────────────

DROP TABLE IF EXISTS public.workspace_usage CASCADE;

CREATE TABLE public.workspace_usage (
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  month           DATE NOT NULL,
  responses_used  INTEGER NOT NULL DEFAULT 0,
  storage_used_mb NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, month)
);

CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace
  ON public.workspace_usage(workspace_id);

ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_member" ON public.workspace_usage
  FOR SELECT USING (public.is_workspace_member(workspace_id));

GRANT ALL ON public.workspace_usage TO service_role, authenticated, anon;

-- ── Step 2: exception-safe trigger function ────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_response_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_partial = FALSE AND NEW.submitted_at IS NOT NULL THEN

    -- Always update the form counter (critical path).
    UPDATE public.forms
    SET responses_count = responses_count + 1
    WHERE id = NEW.form_id;

    -- Update usage tracking inside its own sub-block so any failure here
    -- never rolls back the parent responses INSERT.
    BEGIN
      INSERT INTO public.workspace_usage (workspace_id, month, responses_used)
      VALUES (NEW.workspace_id, date_trunc('month', NOW())::date, 1)
      ON CONFLICT (workspace_id, month)
      DO UPDATE SET
        responses_used = workspace_usage.responses_used + 1,
        updated_at     = NOW();
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'workspace_usage update failed for workspace %: %',
        NEW.workspace_id, SQLERRM;
    END;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
