-- ============================================================
-- KTPCL SIMMS — Migration: Equipment Components
-- Run in Supabase Dashboard → SQL Editor → New Query
-- Project: smpqfxpxwbnajcqtqexy
-- ============================================================

-- 1. Equipment components (Components under each Equipment Type)
CREATE TABLE IF NOT EXISTS public.equipment_components (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type_id uuid NOT NULL REFERENCES public.equipment_types(id) ON DELETE CASCADE,
  name              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authed_read_components" ON public.equipment_components
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_components" ON public.equipment_components
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'
  ));

-- 2. RLS on voltage_classes and equipment_types (if not already set)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voltage_classes' AND policyname = 'authed_read_vc'
  ) THEN
    ALTER TABLE public.voltage_classes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "authed_read_vc" ON public.voltage_classes
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "admin_manage_vc" ON public.voltage_classes
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'equipment_types' AND policyname = 'authed_read_et'
  ) THEN
    ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "authed_read_et" ON public.equipment_types
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "admin_manage_et" ON public.equipment_types
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin'));
  END IF;
END $$;

-- 3. Add component_id FK to job_cards
ALTER TABLE public.job_cards
  ADD COLUMN IF NOT EXISTS component_id uuid REFERENCES public.equipment_components(id) ON DELETE SET NULL;

-- 4. RLS on job_card_engineers and mom_logs (if not set)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_card_engineers' AND policyname = 'authed_read_jce'
  ) THEN
    ALTER TABLE public.job_card_engineers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "authed_read_jce" ON public.job_card_engineers
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "admin_ae_manage_jce" ON public.job_card_engineers
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('spectrum_admin','account_executive')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('spectrum_admin','account_executive')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mom_logs' AND policyname = 'authed_read_mom'
  ) THEN
    ALTER TABLE public.mom_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "authed_read_mom" ON public.mom_logs
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "admin_ae_manage_mom" ON public.mom_logs
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('spectrum_admin','account_executive')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('spectrum_admin','account_executive')));
  END IF;
END $$;
