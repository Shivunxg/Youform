-- FormFlowX: Linked Emails feature
-- Run this in your Supabase SQL editor (after migration_form_endpoints.sql)

CREATE TABLE IF NOT EXISTS linked_emails (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  verified   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_linked_emails_user ON linked_emails(user_id);

ALTER TABLE linked_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own linked emails"
  ON linked_emails FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
