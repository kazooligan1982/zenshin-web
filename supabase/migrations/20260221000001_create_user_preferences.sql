-- =============================================================
-- Migration: Create user_preferences table for i18n locale
-- Date: 2026-02-21
-- =============================================================
-- profiles.locale の代わりに user_preferences を使用

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: ユーザーは自分のレコードのみアクセス可能
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
