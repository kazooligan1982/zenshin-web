-- tensionsテーブルにarea_idカラムを追加

ALTER TABLE tensions
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tensions_area_id ON tensions(area_id);
