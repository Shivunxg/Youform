-- Equipment Maintenance Logs
-- Tracks every maintenance event (part replacement, labour repair, etc.)
-- on individual equipment assets, with cost breakdown.

CREATE TABLE IF NOT EXISTS equipment_maintenance_logs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_instance_id  UUID NOT NULL REFERENCES equipment_instances(id) ON DELETE CASCADE,
  job_card_id            UUID REFERENCES job_cards(id) ON DELETE SET NULL,
  maintenance_date       DATE NOT NULL,
  maintenance_type       TEXT NOT NULL CHECK (maintenance_type IN (
                           'part_replacement', 'labour_repair', 'inspection', 'overhaul', 'other'
                         )),
  part_name              TEXT,
  part_cost              NUMERIC(12,2) NOT NULL DEFAULT 0,
  labour_cost            NUMERIC(12,2) NOT NULL DEFAULT 0,
  performed_by           TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE equipment_maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_maintenance_logs" ON equipment_maintenance_logs;
CREATE POLICY "admin_full_maintenance_logs" ON equipment_maintenance_logs
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maint_logs_instance
  ON equipment_maintenance_logs(equipment_instance_id, maintenance_date DESC);

CREATE INDEX IF NOT EXISTS idx_maint_logs_job_card
  ON equipment_maintenance_logs(job_card_id);
