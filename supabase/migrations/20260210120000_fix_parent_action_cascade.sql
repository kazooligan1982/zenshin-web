-- charts.parent_action_id の FK を ON DELETE SET NULL → ON DELETE CASCADE に変更
-- Action 削除時に、その Action を parent_action_id に持つ子チャートも自動削除される

-- 1. 既存の FK 制約を DROP
ALTER TABLE charts DROP CONSTRAINT IF EXISTS charts_parent_action_id_fkey;

-- 2. 新しい FK 制約を ON DELETE CASCADE で ADD
ALTER TABLE charts
  ADD CONSTRAINT charts_parent_action_id_fkey
  FOREIGN KEY (parent_action_id) REFERENCES actions(id) ON DELETE CASCADE;

-- 既存の孤児チャートについて:
-- 制約変更のみ実施し、既存データの自動削除は行いません。
-- 孤児チャートは「親 Action 削除後に残った子チャート」ですが、
-- トップレベルのマスターチャートとスキーマ上は区別できないため、
-- 自動削除は危険です。必要に応じて Supabase のダッシュボード等で
-- 手動確認・削除してください。
