-- Migration: Create item_relations table for @mention relations
CREATE TABLE item_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID REFERENCES charts(id) ON DELETE CASCADE NOT NULL,
  source_item_type TEXT NOT NULL CHECK (source_item_type IN ('action', 'vision', 'reality', 'tension')),
  source_item_id UUID NOT NULL,
  target_item_type TEXT NOT NULL CHECK (target_item_type IN ('action', 'vision', 'reality', 'tension')),
  target_item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_item_type, source_item_id, target_item_type, target_item_id)
);

CREATE INDEX idx_item_relations_source ON item_relations(source_item_type, source_item_id);
CREATE INDEX idx_item_relations_target ON item_relations(target_item_type, target_item_id);
CREATE INDEX idx_item_relations_chart ON item_relations(chart_id);

ALTER TABLE item_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relations in their charts"
  ON item_relations FOR SELECT
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

CREATE POLICY "Authenticated users can insert relations"
  ON item_relations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
