-- =============================================================
-- Migration: Add sort_order to tensions table
-- Date: 2026-02-22
-- Purpose: Tension D&D 並び替えの順序保存用
-- =============================================================

ALTER TABLE tensions ADD COLUMN IF NOT EXISTS sort_order INTEGER;
CREATE INDEX IF NOT EXISTS idx_tensions_sort_order ON tensions(chart_id, area_id, sort_order NULLS LAST);
