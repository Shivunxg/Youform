-- ============================================================
-- KTPCL SIMMS — Migration: Equipment Instances + Custom Fields
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Custom field definitions per equipment type (e.g. Capacity, Manufacturer)
ALTER TABLE public.equipment_types
  ADD COLUMN IF NOT EXISTS custom_field_definitions JSONB DEFAULT '[]'::jsonb;

-- Actual physical equipment at a station
CREATE TABLE IF NOT EXISTS public.equipment_instances (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type_id     UUID        NOT NULL REFERENCES public.equipment_types(id) ON DELETE CASCADE,
  station_id            UUID        NOT NULL REFERENCES public.hierarchy_nodes(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  serial_number         TEXT,
  status                TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive', 'under_maintenance')),
  custom_data           JSONB       NOT NULL DEFAULT '{}'::jsonb,
  last_maintenance_date DATE,
  next_due_date         DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_equipment_instances()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_touch_equipment_instances ON public.equipment_instances;
CREATE TRIGGER trg_touch_equipment_instances
  BEFORE UPDATE ON public.equipment_instances
  FOR EACH ROW EXECUTE FUNCTION public.touch_equipment_instances();

-- RLS
ALTER TABLE public.equipment_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admin_full_equipment_instances"
  ON public.equipment_instances FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'spectrum_admin')
  );

CREATE POLICY IF NOT EXISTS "ae_se_read_own_station_instances"
  ON public.equipment_instances FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('account_executive', 'service_engineer')
        AND station_id = equipment_instances.station_id
    )
  );

CREATE POLICY IF NOT EXISTS "kptcl_read_own_station_instances"
  ON public.equipment_instances FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'kptcl_engineer'
        AND station_id = equipment_instances.station_id
    )
  );

-- Index for maintenance due queries (used by cron job)
CREATE INDEX IF NOT EXISTS idx_equipment_instances_next_due
  ON public.equipment_instances(next_due_date)
  WHERE next_due_date IS NOT NULL AND status = 'active';
