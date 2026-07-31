-- Add SMTP settings storage to workspaces
-- Stored as JSONB so no schema migration needed when fields change
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS smtp_settings JSONB;
