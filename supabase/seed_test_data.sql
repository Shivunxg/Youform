-- ============================================================
-- KTPCL SIMMS — Test Seed Data
-- Run in Supabase Dashboard → SQL Editor → New Query
-- Project: smpqfxpxwbnajcqtqexy
-- ============================================================

-- 1. Hierarchy nodes (Zone → Circle → Division → Station)
INSERT INTO public.hierarchy_nodes (id, name, code, level, parent_id) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Bangalore Zone',     'BLR-Z',   1, NULL),
  ('22222222-0000-0000-0000-000000000001', 'Bangalore Circle',   'BLR-C1',  2, '11111111-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000001', 'Whitefield Division','BLR-D1',  3, '22222222-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000001', 'Whitefield Station', 'BLR-S1',  4, '33333333-0000-0000-0000-000000000001'),
  ('44444444-0000-0000-0000-000000000002', 'ITPL Station',       'BLR-S2',  4, '33333333-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 2. Voltage classes
INSERT INTO public.voltage_classes (id, station_id, name) VALUES
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '110kV'),
  ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', '33kV'),
  ('55555555-0000-0000-0000-000000000003', '44444444-0000-0000-0000-000000000002', '66kV')
ON CONFLICT (id) DO NOTHING;

-- 3. Equipment types
INSERT INTO public.equipment_types (id, voltage_class_id, name) VALUES
  ('66666666-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'Power Transformer'),
  ('66666666-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000001', 'Circuit Breaker'),
  ('66666666-0000-0000-0000-000000000003', '55555555-0000-0000-0000-000000000002', 'Relay Panel'),
  ('66666666-0000-0000-0000-000000000004', '55555555-0000-0000-0000-000000000003', 'Isolator')
ON CONFLICT (id) DO NOTHING;

-- 4. Components
INSERT INTO public.equipment_components (id, equipment_type_id, name) VALUES
  ('77777777-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'HV Bushing'),
  ('77777777-0000-0000-0000-000000000002', '66666666-0000-0000-0000-000000000001', 'LV Bushing'),
  ('77777777-0000-0000-0000-000000000003', '66666666-0000-0000-0000-000000000001', 'Tap Changer'),
  ('77777777-0000-0000-0000-000000000004', '66666666-0000-0000-0000-000000000001', 'Cooling Fan'),
  ('77777777-0000-0000-0000-000000000005', '66666666-0000-0000-0000-000000000002', 'Operating Mechanism'),
  ('77777777-0000-0000-0000-000000000006', '66666666-0000-0000-0000-000000000002', 'Arc Chute')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- NOTE: Job cards require real auth.users UUIDs.
-- After creating user accounts via Supabase Auth → Invite,
-- update profiles and then create job cards from the AE login.
--
-- To quickly set a user's station (for AE testing), run:
--   UPDATE public.profiles
--   SET station_id = '44444444-0000-0000-0000-000000000001'
--   WHERE email = 'ae@example.com';
-- ============================================================
