-- ============================================================
-- KTPCL SIMMS — Migration: Station Lat/Long
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE public.hierarchy_nodes
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;
