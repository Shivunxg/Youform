-- ============================================================
-- KTPCL SIMMS — Migration: KPTCL Engineer Role + Acknowledgements
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add kptcl_engineer to profiles role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('spectrum_admin','account_executive','service_engineer','kptcl_engineer'));

-- 2. Work acknowledgements table (KPTCL engineer signs off on completed work)
CREATE TABLE IF NOT EXISTS public.work_acknowledgements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id      uuid NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
  acknowledged_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_card_id)  -- one acknowledgement per job card
);

ALTER TABLE public.work_acknowledgements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "authed_read_ack" ON public.work_acknowledgements
  FOR SELECT TO authenticated USING (true);

-- KPTCL engineers can insert (only for their own acknowledgements)
CREATE POLICY "kptcl_insert_ack" ON public.work_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (
    acknowledged_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'kptcl_engineer'
    )
  );

-- Admins can also insert (for manual acknowledgement entry)
CREATE POLICY "admin_manage_ack" ON public.work_acknowledgements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'));

-- 3. RLS policy for kptcl_engineer on job_cards (read-only, own station)
CREATE POLICY "kptcl_read_own_station_jobs" ON public.job_cards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'kptcl_engineer'
        AND station_id = job_cards.station_id
    )
  );

-- 4. RLS for kptcl_engineer on status_history (read-only)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'status_history' AND policyname = 'kptcl_read_sh'
  ) THEN
    ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "kptcl_read_sh" ON public.status_history
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
