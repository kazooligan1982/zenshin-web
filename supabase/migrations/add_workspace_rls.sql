-- ヘルパー関数
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS SETOF UUID AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_chart_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM charts WHERE workspace_id IN (SELECT user_workspace_ids())
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 古いポリシー削除
DROP POLICY IF EXISTS "Allow all operations on charts" ON charts;
DROP POLICY IF EXISTS "Allow all operations on visions" ON visions;
DROP POLICY IF EXISTS "Allow all operations on realities" ON realities;
DROP POLICY IF EXISTS "Allow all operations on tensions" ON tensions;
DROP POLICY IF EXISTS "Allow all operations on actions" ON actions;
DROP POLICY IF EXISTS "Allow all operations on tension_visions" ON tension_visions;
DROP POLICY IF EXISTS "Allow all operations on tension_realities" ON tension_realities;
DROP POLICY IF EXISTS "Allces" ON workspaces;
DROP POLICY IF EXISTS "Allow all operations on workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Allow all operations on areas" ON areas;

-- Workspaceベースのポリシー
CREATE POLICY "workspace_charts" ON charts FOR ALL
  USING (workspace_id IN (SELECT user_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));

CREATE POLICY "workspace_visions" ON visions FOR ALL
  USING (chart_id IN (SELECT user_chart_ids()))
  WITH CHECK (chart_id IN (SELECT user_chart_ids()));

CREATE POLealities" ON realities FOR ALL
  USING (chart_id IN (SELECT user_chart_ids()))
  WITH CHECK (chart_id IN (SELECT user_chart_ids()));

CREATE POLICY "workspace_tensions" ON tensions FOR ALL
  USING (chart_id IN (SELECT user_chart_ids()))
  WITH CHECK (chart_id IN (SELECT user_chart_ids()));

CREATE POLICY "workspace_actions" ON actions FOR ALL
  USING (chart_id IN (SELECT user_chart_ids()))
  WITH CHECK (chart_id IN (SELECT user_chart_ids()));

CREATE POLICY "workspace_areas" ON areas FOR ALL
  USING (chart_id IN (SELECT user_chart_ids()))
  WITH CHECK (chart_id IN (SELECT user_chart_ids()));

CREATE POLICY "workspace_tension_visions" ON tension_visions FOR ALL
  USING (tension_id IN (SELECT id FROM tensions WHERE chart_id IN (SELECT user_chart_ids())))
  WITH CHECK (tension_id IN (SELECT id FROM tensions WHERE chart_id IN (SELECT user_chart_ids())));

CREATE POLICY "workspace_tension_realities" ON tension_realities FOR ALL
  USING (tension_id IN (SELECT id FROM tensions WHERE chart_id IN (SELECT user_chart_ids())))
  WITH CHECK (tension_id IN (SELECT id FROM tensions WHERE chart_id IN (SELECT user_chart_ids())));

CREATE POLICY "workspace_workspaces" ON workspaces FOR ALL
  USING (id IN (SELECT user_workspace_ids()))
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_workspace_members" ON workspace_members FOR ALL
  USING (workspace_id IN (SELECT user_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT user_workspace_ids()));
