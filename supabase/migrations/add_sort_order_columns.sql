-- ドラッグ＆ドロップによる並べ替え機能のためのカラム追加
-- Supabase SQL Editorで実行してください

-- 1. visions テーブルに sort_order カラムを追加
ALTER TABLE visions
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 2. realities テーブルに sort_order カラムを追加
ALTER TABLE realities
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 3. actions テーブルに sort_order カラムを追加
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- 4. インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_visions_sort_order ON visions(chart_id, sort_order NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_realities_sort_order ON realities(chart_id, sort_order NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_actions_sort_order ON actions(tension_id, sort_order NULLS LAST);

-- 確認用: カラムが正しく追加されたか確認
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('visions', 'realities', 'actions') AND column_name = 'sort_order';



