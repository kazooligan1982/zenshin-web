-- アイテム履歴テーブルの作成
-- Supabase SQL Editorで実行してください

-- item_history テーブル: Vision/Reality/Actionの履歴を保存
CREATE TABLE IF NOT EXISTS item_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('vision', 'reality', 'action')),
  item_id UUID NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'comment' CHECK (type IN ('update', 'comment')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT, -- 将来的なユーザー識別用
  CONSTRAINT item_history_content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_item_history_item ON item_history(item_type, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_history_created_at ON item_history(created_at DESC);

-- Row Level Security (RLS) を有効化
ALTER TABLE item_history ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: すべてのユーザーが読み書き可能（将来的に制限可能）
CREATE POLICY "Allow all operations on item_history" ON item_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 確認用: テーブルが正しく作成されたか確認
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'item_history'
-- ORDER BY ordinal_position;

