-- FormFlowX: HTML form endpoint feature
-- Run this in your Supabase SQL editor

-- Table: form_endpoints (one per API key a user creates)
CREATE TABLE IF NOT EXISTS form_endpoints (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  access_key  text UNIQUE NOT NULL,
  email_to    text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Table: endpoint_submissions (every form POST received)
CREATE TABLE IF NOT EXISTS endpoint_submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES form_endpoints(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  ip          text,
  origin      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_form_endpoints_user    ON form_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_form_endpoints_key     ON form_endpoints(access_key);
CREATE INDEX IF NOT EXISTS idx_submissions_endpoint   ON endpoint_submissions(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user       ON endpoint_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created    ON endpoint_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE form_endpoints       ENABLE ROW LEVEL SECURITY;
ALTER TABLE endpoint_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see/manage their own data
CREATE POLICY "Users manage own endpoints"
  ON form_endpoints FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own submissions"
  ON endpoint_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- The API uses the service role key so it bypasses RLS (no policy needed for insert from server)
