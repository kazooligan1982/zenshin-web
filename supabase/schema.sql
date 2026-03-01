-- ZENSHIN Database Schema
-- This file contains the complete database schema for the ZENSHIN application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Charts table: Main project/chart container
CREATE TABLE IF NOT EXISTS charts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  parent_chart_id UUID REFERENCES charts(id) ON DELETE CASCADE,
  parent_action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID, -- For future multi-user support
  CONSTRAINT charts_title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- Visions table: Vision items linked to charts
CREATE TABLE IF NOT EXISTS visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  assignee TEXT,
  due_date DATE,
  target_date TIMESTAMPTZ, -- 時間軸に基づいた動的な順序用
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visions_content_not_empty CHECK (char_length(trim(content)) >= 0)
);

-- Realities table: Reality items linked to charts
CREATE TABLE IF NOT EXISTS realities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  related_vision_id UUID REFERENCES visions(id) ON DELETE SET NULL, -- 将来的な紐付け用
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT DEFAULT '',
  CONSTRAINT realities_content_not_empty CHECK (char_length(trim(content)) >= 0)
);

-- Tensions table: Tension cards that connect Visions and Realities
CREATE TABLE IF NOT EXISTS tensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'review_needed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tensions_title_not_empty CHECK (char_length(trim(title)) >= 0)
);

-- Vision-Tension relationships (many-to-many)
CREATE TABLE IF NOT EXISTS tension_visions (
  tension_id UUID NOT NULL REFERENCES tensions(id) ON DELETE CASCADE,
  vision_id TEXT NOT NULL REFERENCES visions(id) ON DELETE CASCADE,
  PRIMARY KEY (tension_id, vision_id)
);

-- Reality-Tension relationships (many-to-many)
CREATE TABLE IF NOT EXISTS tension_realities (
  tension_id UUID NOT NULL REFERENCES tensions(id) ON DELETE CASCADE,
  reality_id TEXT NOT NULL REFERENCES realities(id) ON DELETE CASCADE,
  PRIMARY KEY (tension_id, reality_id)
);

-- Actions table: Action plans linked to tensions
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chart_id UUID REFERENCES charts(id) ON DELETE CASCADE,
  tension_id UUID REFERENCES tensions(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  assignee TEXT,
  due_date DATE,
  has_sub_chart BOOLEAN NOT NULL DEFAULT FALSE,
  sub_chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  child_chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT actions_title_not_empty CHECK (char_length(trim(title)) >= 0)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_charts_parent_chart_id ON charts(parent_chart_id);
CREATE INDEX IF NOT EXISTS idx_visions_chart_id ON visions(chart_id);
CREATE INDEX IF NOT EXISTS idx_realities_chart_id ON realities(chart_id);
CREATE INDEX IF NOT EXISTS idx_tensions_chart_id ON tensions(chart_id);
CREATE INDEX IF NOT EXISTS idx_tensions_area_id ON tensions(area_id);
CREATE INDEX IF NOT EXISTS idx_tension_visions_tension_id ON tension_visions(tension_id);
CREATE INDEX IF NOT EXISTS idx_tension_visions_vision_id ON tension_visions(vision_id);
CREATE INDEX IF NOT EXISTS idx_tension_realities_tension_id ON tension_realities(tension_id);
CREATE INDEX IF NOT EXISTS idx_tension_realities_reality_id ON tension_realities(reality_id);
CREATE INDEX IF NOT EXISTS idx_actions_tension_id ON actions(tension_id);
CREATE INDEX IF NOT EXISTS idx_actions_chart_id ON actions(chart_id);
CREATE INDEX IF NOT EXISTS idx_actions_sub_chart_id ON actions(sub_chart_id);
CREATE INDEX IF NOT EXISTS idx_actions_child_chart_id ON actions(child_chart_id);
CREATE INDEX IF NOT EXISTS idx_charts_parent_action_id ON charts(parent_action_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_charts_updated_at BEFORE UPDATE ON charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visions_updated_at BEFORE UPDATE ON visions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_realities_updated_at BEFORE UPDATE ON realities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tensions_updated_at BEFORE UPDATE ON tensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_updated_at BEFORE UPDATE ON actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realities ENABLE ROW LEVEL SECURITY;
ALTER TABLE tensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tension_visions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tension_realities ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (can be restricted later based on user_id)
-- In production, you should implement proper RLS policies based on authentication
CREATE POLICY "Allow all operations on charts" ON charts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on visions" ON visions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on realities" ON realities
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tensions" ON tensions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tension_visions" ON tension_visions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tension_realities" ON tension_realities
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on actions" ON actions
  FOR ALL USING (true) WITH CHECK (true);

-- Function to get breadcrumbs using WITH RECURSIVE
-- Returns an array of {id, title, type} objects representing the path from root to the given chart
CREATE OR REPLACE FUNCTION get_breadcrumbs(p_chart_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type TEXT,
  depth INTEGER
) AS $$
WITH RECURSIVE chart_path AS (
  -- Base case: Start with the given chart
  SELECT 
    c.id,
    c.title,
    'chart'::TEXT as type,
    0 as depth,
    c.parent_action_id,
    c.parent_chart_id,
    ARRAY[c.id] as visited_ids
  FROM charts c
  WHERE c.id = p_chart_id
  
  UNION ALL
  
  -- Recursive case: Follow parent_action_id -> action -> tension -> parent chart
  SELECT 
    parent_chart.id,
    parent_chart.title,
    'chart'::TEXT as type,
    cp.depth + 1,
    parent_chart.parent_action_id,
    parent_chart.parent_chart_id,
    cp.visited_ids || parent_chart.id
  FROM chart_path cp
  JOIN charts current_chart ON current_chart.id = cp.id
  LEFT JOIN actions parent_action ON parent_action.id = current_chart.parent_action_id
  LEFT JOIN tensions parent_tension ON parent_tension.id = parent_action.tension_id
  LEFT JOIN charts parent_chart ON parent_chart.id = parent_tension.chart_id
  WHERE parent_chart.id IS NOT NULL
    AND cp.depth < 20  -- Prevent infinite loops
    AND NOT (parent_chart.id = ANY(cp.visited_ids))  -- Prevent cycles
)
SELECT 
  cp.id,
  cp.title,
  cp.type,
  cp.depth
FROM chart_path cp
ORDER BY cp.depth DESC;  -- Order from root to current
$$ LANGUAGE sql STABLE;

