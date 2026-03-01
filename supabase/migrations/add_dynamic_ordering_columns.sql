-- 時間軸に基づいた動的な順序機能のためのカラム追加
-- Supabase SQL Editorで実行してください

-- 1. visions テーブルに target_date カラムを追加
ALTER TABLE visions
ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;

-- 2. realities テーブルに related_vision_id カラムを追加
ALTER TABLE realities
ADD COLUMN IF NOT EXISTS related_vision_id UUID;

-- 3. related_vision_id に外部キー制約を追加（既存のvisions.idを参照）
ALTER TABLE realities
ADD CONSTRAINT fk_realities_related_vision
FOREIGN KEY (related_vision_id)
REFERENCES visions(id)
ON DELETE SET NULL;

-- 4. インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_visions_target_date ON visions(target_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_realities_related_vision_id ON realities(related_vision_id);

-- 確認用: カラムが正しく追加されたか確認
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'visions' AND column_name IN ('target_date')
-- UNION ALL
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'realities' AND column_name IN ('related_vision_id');



