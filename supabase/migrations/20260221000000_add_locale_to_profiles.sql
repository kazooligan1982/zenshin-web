-- =============================================================
-- Migration: Add locale column to profiles for i18n
-- Date: 2026-02-21
-- =============================================================
-- NULLの場合はブラウザ言語にフォールバック（アプリ側で処理）

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT NULL;
