-- Migration: Create action_dependencies table for blocking/blocked relationships
CREATE TABLE action_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID REFERENCES charts(id) ON DELETE CASCADE NOT NULL,
  blocked_action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  blocking_action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocked_action_id, blocking_action_id),
  CHECK (blocked_action_id != blocking_action_id)
);

CREATE INDEX idx_action_dependencies_blocked ON action_dependencies(blocked_action_id);
CREATE INDEX idx_action_dependencies_blocker ON action_dependencies(blocking_action_id);
CREATE INDEX idx_action_dependencies_chart ON action_dependencies(chart_id);

ALTER TABLE action_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies in their charts"
  ON action_dependencies FOR SELECT
  USING (
    chart_id IN (
      SELECT c.id FROM charts c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE wm.user_id = auth.uid()
    )
    OR chart_id IN (
      SELECT id FROM charts WHERE workspace_id IS NULL
    )
  );

CREATE POLICY "Authenticated users can insert dependencies"
  ON action_dependencies FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete dependencies"
  ON action_dependencies FOR DELETE
  USING (auth.uid() IS NOT NULL);
