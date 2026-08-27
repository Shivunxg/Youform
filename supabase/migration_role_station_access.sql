-- ============================================================
-- Migration: Role-based station access
-- - KPTCL Engineer: station-specific, multiple stations via junction table
-- - Account Executive: NOT station-specific (sees all stations)
-- - Service Engineer: NOT station-specific (sees all stations)
-- ============================================================

-- 1. KPTCL station assignments (many-to-many)
CREATE TABLE IF NOT EXISTS public.kptcl_station_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kptcl_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id    UUID NOT NULL REFERENCES public.hierarchy_nodes(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kptcl_user_id, station_id)
);

ALTER TABLE public.kptcl_station_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_kptcl_assignments" ON public.kptcl_station_assignments;
CREATE POLICY "admin_manage_kptcl_assignments" ON public.kptcl_station_assignments
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "kptcl_read_own_assignments" ON public.kptcl_station_assignments;
CREATE POLICY "kptcl_read_own_assignments" ON public.kptcl_station_assignments
  FOR SELECT TO authenticated
  USING (kptcl_user_id = auth.uid());

-- 2. Migrate existing single-station KPTCL users into junction table
INSERT INTO public.kptcl_station_assignments (kptcl_user_id, station_id)
SELECT id, station_id
FROM public.profiles
WHERE role = 'kptcl_engineer' AND station_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. job_cards read policy
-- Admin: all | AE: all | SE: all | KPTCL: only their assigned stations
DROP POLICY IF EXISTS "jc_read" ON public.job_cards;
DROP POLICY IF EXISTS "kptcl_read_own_station_jobs" ON public.job_cards;

CREATE POLICY "jc_read" ON public.job_cards
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('account_executive', 'service_engineer')
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kptcl_engineer'
      AND station_id IN (
        SELECT station_id FROM public.kptcl_station_assignments WHERE kptcl_user_id = auth.uid()
      )
    )
  );

-- 4. job_cards insert policy
-- AE can create a job card for ANY station (no station restriction)
DROP POLICY IF EXISTS "jc_ae_insert" ON public.job_cards;
CREATE POLICY "jc_ae_insert" ON public.job_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'account_executive'
  );

-- 5. job_card_engineers read policy
-- AE/SE see all; KPTCL sees engineers on their stations' job cards
DROP POLICY IF EXISTS "jce_read" ON public.job_card_engineers;
CREATE POLICY "jce_read" ON public.job_card_engineers
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'account_executive'
    OR engineer_id = auth.uid()
    OR (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'kptcl_engineer'
      AND EXISTS (
        SELECT 1 FROM public.job_cards jc
        WHERE jc.id = job_card_engineers.job_card_id
          AND jc.station_id IN (
            SELECT station_id FROM public.kptcl_station_assignments WHERE kptcl_user_id = auth.uid()
          )
      )
    )
  );

-- 6. status_history read policy
-- AE/SE see all; KPTCL sees only their stations'
DROP POLICY IF EXISTS "sh_read" ON public.status_history;
CREATE POLICY "sh_read" ON public.status_history
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('account_executive', 'service_engineer')
    OR EXISTS (
      SELECT 1 FROM public.job_cards jc
      WHERE jc.id = status_history.job_card_id
        AND jc.station_id IN (
          SELECT station_id FROM public.kptcl_station_assignments WHERE kptcl_user_id = auth.uid()
        )
    )
  );

-- 7. mom_logs read policy
DROP POLICY IF EXISTS "mom_read" ON public.mom_logs;
CREATE POLICY "mom_read" ON public.mom_logs
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('account_executive', 'service_engineer')
    OR EXISTS (
      SELECT 1 FROM public.job_cards jc
      WHERE jc.id = mom_logs.job_card_id
        AND jc.station_id IN (
          SELECT station_id FROM public.kptcl_station_assignments WHERE kptcl_user_id = auth.uid()
        )
    )
  );

-- 8. mom_logs insert policy
DROP POLICY IF EXISTS "mom_insert" ON public.mom_logs;
CREATE POLICY "mom_insert" ON public.mom_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('account_executive', 'service_engineer')
    OR EXISTS (
      SELECT 1 FROM public.job_cards jc
      WHERE jc.id = mom_logs.job_card_id
        AND jc.station_id IN (
          SELECT station_id FROM public.kptcl_station_assignments WHERE kptcl_user_id = auth.uid()
        )
    )
  );
