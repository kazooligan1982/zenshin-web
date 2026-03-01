-- =============================================================
-- Migration: Allow invite page to read workspace name
-- Date: 2026-02-19
-- =============================================================
-- 招待ページでワークスペース名を表示するため、
-- 保留中の招待があるワークスペースの名前を誰でも読めるようにする

CREATE POLICY "Allow read workspace name for pending invitations"
  ON workspaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_invitation_requests wir
      WHERE wir.workspace_id = workspaces.id
        AND wir.status = 'pending'
    )
  );
