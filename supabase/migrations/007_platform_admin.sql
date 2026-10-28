-- Add is_platform_admin flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- Grant the admin service role full access to this column
-- (supabaseAdmin bypasses RLS so no policy needed, but the column must exist)

-- Seed: mark the owner account as platform admin.
-- Replace the email below if your owner account differs.
UPDATE public.profiles
  SET is_platform_admin = true
  WHERE email = 'shivunxg@gmail.com';
