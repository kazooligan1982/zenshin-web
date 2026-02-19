-- =============================================================
-- Migration: Add last_workspace_id to user_preferences
-- Date: 2026-02-22
-- Purpose: ログイン後のリダイレクト先を「最後にアクセスしたWS」に統一するため
-- =============================================================

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS last_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
