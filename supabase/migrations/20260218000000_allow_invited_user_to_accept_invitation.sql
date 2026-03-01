-- =============================================================
-- Migration: Allow invited user to update invitation status to accepted
-- Date: 2026-02-18
-- =============================================================
-- 招待されたユーザーが自分の招待を accepted に更新できるようにする
-- （acceptInvitation Server Action で status 更新が RLS で拒否されていた問題を修正）

CREATE POLICY "Invited user can accept own invitation"
  ON workspace_invitation_requests
  FOR UPDATE
  USING (
    email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (status IN ('accepted', 'expired'));
