-- ============================================================
-- KTPCL SIMMS — Migration: Equipment Images
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add image_url column to equipment_types
ALTER TABLE public.equipment_types
  ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for equipment images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "auth_upload_equipment_images" ON storage.objects;
CREATE POLICY "auth_upload_equipment_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'equipment-images');

-- Allow public read of equipment images
DROP POLICY IF EXISTS "public_read_equipment_images" ON storage.objects;
CREATE POLICY "public_read_equipment_images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'equipment-images');

-- Allow authenticated users to update/replace images
DROP POLICY IF EXISTS "auth_update_equipment_images" ON storage.objects;
CREATE POLICY "auth_update_equipment_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'equipment-images');
