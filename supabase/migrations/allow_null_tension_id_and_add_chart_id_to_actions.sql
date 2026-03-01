-- actionsテーブル: chart_id追加、tension_idをnullableに変更

-- chart_id を追加（既存アクションは tension から埋める）
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS chart_id UUID REFERENCES charts(id) ON DELETE CASCADE;

-- 既存アクションの chart_id を補完
UPDATE actions
SET chart_id = tensions.chart_id
FROM tensions
WHERE actions.tension_id = tensions.id
  AND actions.chart_id IS NULL;

-- tension_id を nullable に変更
ALTER TABLE actions
ALTER COLUMN tension_id DROP NOT NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_actions_chart_id ON actions(chart_id);
