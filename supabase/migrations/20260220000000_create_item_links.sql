-- Migration: Create item_links table for Linked Resources
CREATE TABLE item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID REFERENCES charts(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('action', 'vision', 'reality', 'tension')),
  item_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  service TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_item_links_item ON item_links(item_type, item_id);
CREATE INDEX idx_item_links_chart ON item_links(chart_id);

-- RLS
ALTER TABLE item_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view links in their charts"
  ON item_links FOR SELECT
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

CREATE POLICY "Authenticated users can insert links"
  ON item_links FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Link creator can delete"
  ON item_links FOR DELETE
  USING (auth.uid() = created_by);
