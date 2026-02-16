-- =============================================================
-- Migration: Add consultant role + workspace_invitation_requests
-- Date: 2026-02-16
-- =============================================================

-- 1. workspace_members: role CHECK制約を更新（consultant追加）
-- ---------------------------------------------------------
-- 既存の制約名を確認して削除 → 新しい制約を追加
-- ※ 制約名が異なる場合は、事前に以下で確認:
--   SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_name = 'workspace_members' AND constraint_type = 'CHECK';

ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'consultant', 'editor', 'viewer'));

-- 2. workspace_invitation_requests テーブル作成
-- ---------------------------------------------------------
-- 既存の workspace_invitations とは別テーブル（衝突回避）

CREATE TABLE IF NOT EXISTS workspace_invitation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,

  CONSTRAINT wir_role_check
    CHECK (role IN ('consultant', 'editor', 'viewer')),
  CONSTRAINT wir_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_wir_token
  ON workspace_invitation_requests(token);
CREATE INDEX IF NOT EXISTS idx_wir_email
  ON workspace_invitation_requests(email);
CREATE INDEX IF NOT EXISTS idx_wir_workspace_id
  ON workspace_invitation_requests(workspace_id);

-- 3. RLS有効化 + ポリシー
-- ---------------------------------------------------------
ALTER TABLE workspace_invitation_requests ENABLE ROW LEVEL SECURITY;

-- ownerのみ招待の作成・管理が可能
CREATE POLICY "Owner can manage invitation requests"
  ON workspace_invitation_requests
  FOR ALL
  USING (
    workspace_id IN (
      SELECT wm.workspace_id
      FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
  );

-- 招待されたユーザー本人は自分の招待を閲覧可能
CREATE POLICY "Invited user can view own invitation request"
  ON workspace_invitation_requests
  FOR SELECT
  USING (
    email = (
      SELECT u.email
      FROM auth.users u
      WHERE u.id = auth.uid()
    )
  );

-- tokenベースで招待を受諾するための読み取り（未認証でもtokenで検索できるようにする場合）
-- ※ 受諾はServer Actionでservice_role keyを使う想定なので、
--   ここではauthenticatedユーザー向けのポリシーのみ設定

-- =============================================================
-- 実行方法:
--   1. このファイルを supabase/migrations/ に配置
--   2. npx supabase db push
--      または npx supabase migration up
--
-- ロールバック（必要な場合）:
--   DROP TABLE IF EXISTS workspace_invitation_requests;
--   ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_role_check;
--   ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check
--     CHECK (role IN ('owner', 'editor', 'viewer'));
-- =============================================================
