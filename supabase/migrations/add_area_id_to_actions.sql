-- actionsテーブルにarea_idカラムを追加
-- Supabase SQL Editorで実行してください

-- 1. actions テーブルに area_id カラムを追加
ALTER TABLE actions
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;

-- 2. インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_actions_area_id ON actions(area_id);

-- 確認用: カラムが正しく追加されたか確認
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'actions' AND column_name = 'area_id';

