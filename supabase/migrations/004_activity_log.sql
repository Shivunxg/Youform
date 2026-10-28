-- Activity log table for audit trail (Business plan feature)
CREATE TABLE IF NOT EXISTS workspace_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_activity_workspace ON workspace_activity(workspace_id, created_at DESC);

ALTER TABLE workspace_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view activity"
  ON workspace_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_activity.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- service_role bypass (used by our API)
GRANT ALL ON workspace_activity TO service_role;
GRANT SELECT ON workspace_activity TO authenticated;
