-- ============================================================
-- KTPCL SIMMS — Migration: Station Contact Details
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.hierarchy_nodes
  ADD COLUMN IF NOT EXISTS contact_name  text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;
