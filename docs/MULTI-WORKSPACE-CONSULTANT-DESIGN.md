# マルチワークスペース＋コンサルタントロール設計書

> ZENSHIN CHART β拡張 — 2026/02/16作成
> 目的: 構造コンサルタントが支援先企業のWSに参加し、チャート作成・編集を支援できるようにする

---

## 1. 設計概要

### ユースケース

```
┌─ Kazのワークスペース（ZENSHIN） ─────────────────┐
│  role: owner                                      │
│  チャート: 自社の戦略チャート等                     │
└──────────────────────────────────────────────────┘

┌─ 支援先A社のワークスペース ───────────────────────┐
│  A社社長: owner                                   │
│  A社メンバー: editor / viewer                      │
│  Kaz: consultant ← 外部専門家として参加             │
│  他の構造コンサルタント: consultant                  │
└──────────────────────────────────────────────────┘

┌─ 支援先B社のワークスペース ───────────────────────┐
│  B社社長: owner                                   │
│  Kaz + 別コンサルタント: consultant                 │
└──────────────────────────────────────────────────┘
```

### ロール定義（4種）

| ロール | 日本語 | アイコン | チャートCRUD | V/R/T/A編集 | コメント | メンバー管理 | WS設定/課金 |
|--------|--------|----------|-------------|-------------|---------|-------------|------------|
| **owner** | オーナー | Crown | ✅ | ✅ | ✅ | ✅ | ✅ |
| **consultant** | コンサルタント | Stethoscope | ✅ | ✅ | ✅ | ❌ | ❌ |
| **editor** | 編集者 | Shield | ❌※ | ✅ | ✅ | ❌ | ❌ |
| **viewer** | 閲覧者 | Eye | ❌ | ❌ | ✅ | ❌ | ❌ |

> ※ editor のチャート作成権限は今後のβフィードバックで検討。当面は owner + consultant のみ。
> ※ consultant の権限は当面 editor と同等＋チャート作成可。βフィードバックを見て絞る可能性あり。

### consultant と editor の違い

| 観点 | consultant | editor |
|------|-----------|--------|
| 立場 | 外部専門家（組織に属さない） | 組織の内部メンバー |
| チャート新規作成 | ✅ 可能 | ❌ 不可（当面） |
| 複数WSに同ロールで参加 | ✅ 典型的な使い方 | △ 可能だが想定外 |
| メンバー一覧の閲覧 | ✅（担当者アサイン助言のため） | ✅ |
| UI上の表示 | バッジ等で「外部」と分かるように | 通常表示 |

---

## 2. DB変更

### 2.1 workspace_members.role のCHECK制約を更新

```sql
-- 現行
CHECK (role IN ('owner', 'editor', 'viewer'))

-- 変更後
ALTER TABLE workspace_members
  DROP CONSTRAINT workspace_members_role_check;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'consultant', 'editor', 'viewer'));
```

### 2.2 新規テーブル: workspace_invitation_requests（招待フロー用）

> 既存の workspace_invitations（invite_code ベース）とは別テーブル。
> メール招待フロー用に workspace_invitation_requests を作成。

```sql
CREATE TABLE workspace_invitation_requests (
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
  CONSTRAINT workspace_invitation_requests_role_check
    CHECK (role IN ('consultant', 'editor', 'viewer')),
  CONSTRAINT workspace_invitation_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- インデックス
CREATE INDEX idx_invitation_requests_token ON workspace_invitation_requests(token);
CREATE INDEX idx_invitation_requests_email ON workspace_invitation_requests(email);
```

### 2.3 RLS更新

```sql
-- workspace_invitation_requests: ownerのみ作成・管理可能
CREATE POLICY "Owner can manage invitation requests"
  ON workspace_invitation_requests
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 招待されたユーザー本人は自分の招待を閲覧可能
CREATE POLICY "Invited user can view own invitation request"
  ON workspace_invitation_requests
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
```

---

## 3. 権限ヘルパー関数の設計

### lib/permissions.ts

```typescript
export type WorkspaceRole = 'owner' | 'consultant' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'オーナー',
  consultant: 'コンサルタント',
  editor: '編集者',
  viewer: '閲覧者',
};

// lucide-react アイコン名
export const ROLE_ICONS: Record<WorkspaceRole, string> = {
  owner: 'Crown',
  consultant: 'Stethoscope',
  editor: 'Shield',
  viewer: 'Eye',
};

// 権限チェック関数
export function canCreateChart(role: WorkspaceRole): boolean {
  return ['owner', 'consultant'].includes(role);
}

export function canEditContent(role: WorkspaceRole): boolean {
  return ['owner', 'consultant', 'editor'].includes(role);
}

export function canComment(role: WorkspaceRole): boolean {
  return true; // 全ロール可
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === 'owner';
}

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return role === 'owner';
}

export function canInviteMembers(role: WorkspaceRole): boolean {
  return role === 'owner';
}
```

---

## 4. マルチワークスペースUI

### 4.1 サイドバー変更（Slack型WS切り替え）

```
┌──┐ ┌─────────────────────────────────┐
│Z │ │  ZENSHIN（自社）                 │
│──│ │  ┌─ チャート一覧 ─────────────┐  │
│A │ │  │  戦略チャート2026          │  │
│──│ │  │  採用計画                  │  │
│B │ │  └────────────────────────────┘  │
│──│ │                                  │
│+ │ │  Dashboard / Settings / ...      │
└──┘ └─────────────────────────────────┘
 ↑
 WS切り替え列（アイコン or イニシャル）
```

- 左端にWS切り替え用のアイコン列（Slack/Discord風）
- 現在のサイドバーはそのまま、左にWSセレクタを追加
- `+` ボタンで「WSを作成」or「招待を受ける」

### 4.2 WS切り替え時の動作

1. サイドバーのWSアイコンクリック
2. URLが `/workspaces/[ws-id]/charts/...` に遷移（or クエリパラメータ）
3. サイドバーのチャート一覧・メンバー一覧がそのWSの内容に切り替わる
4. 自分のロールに応じてUIが変化（例: viewerならチャート作成ボタン非表示）

### 4.3 コンサルタントの視覚的区別

- メンバー一覧で「コンサルタント」バッジ（紫系の色）
- WSセレクタで、自分がconsultantとして入っているWSには小さなバッジ表示
- チャート内の担当者表示でも、コンサルタントは分かるように

---

## 5. 招待フロー

### ownerが招待する場合

```
Settings > Members > 「メンバーを招待」ボタン
  ↓
メールアドレス入力 + ロール選択（consultant / editor / viewer）
  ↓
招待メール送信（Resend経由 — カスタムSMTP対応と同時に実装）
  ↓
受信者がリンクをクリック → サインアップ or ログイン → WSに参加
```

### 招待受諾フロー

```
/invite/[token] ページ
  ↓
ログイン済み → そのまま参加
未ログイン → ログイン/サインアップ → 参加
  ↓
workspace_membersにレコード追加
workspace_invitations.status = 'accepted'
  ↓
サイドバーに新WSが表示される
```

---

## 6. 実装順序（推奨）

### Phase 1: DB基盤（1セッション目）
1. [ ] workspace_members の role CHECK制約を更新（consultant追加）
2. [ ] workspace_invitations テーブル作成
3. [ ] RLSポリシー追加
4. [ ] lib/permissions.ts 作成（権限ヘルパー）
5. [ ] 既存UIのロール表示更新（sidebar、settings/members — 4種対応）

### Phase 2: マルチWSセレクタUI（1-2セッション）
6. [ ] サイドバー左にWSセレクタ列を追加
7. [ ] WS切り替え時のルーティング（/workspaces/[ws-id]/...）
8. [ ] WSごとのチャート一覧表示切り替え
9. [ ] 現在のWSとロールに応じたUI制御（チャート作成ボタンの表示/非表示等）

### Phase 3: 招待フロー（1セッション）
10. [ ] カスタムSMTP設定（Resend） ← β中対応必須と統合
11. [ ] Settings > Members に招待UIを追加
12. [ ] /invite/[token] ページ作成
13. [ ] 招待メールテンプレート

### Phase 4: コンサルタント体験の磨き込み（β中に並行）
14. [ ] コンサルタントバッジ・視覚的区別
15. [ ] WSセレクタでのロール表示
16. [ ] βフィードバックに基づく権限調整

---

## 7. 既存コードへの影響箇所

| ファイル | 変更内容 |
|---------|---------|
| `components/sidebar.tsx` | WSセレクタ列追加、ロール4種対応 |
| `app/settings/members/page.tsx` | consultant表示、招待UI追加 |
| `app/charts/[id]/page.tsx` | canCreateChart チェック追加 |
| `app/charts/chart-card.tsx` | コンサルタントバッジ表示 |
| `lib/workspace.ts` | inviteToWorkspace, acceptInvitation 関数追加 |
| `middleware.ts` | /invite/[token] を認証除外に追加 |
| `app/(auth)/` | 招待経由のサインアップフロー対応 |

---

## 8. 将来の考慮事項

- **課金**: WSごとのプラン設定。コンサルタントはWS料金に含まれるか別課金か
- **コンサルタント専用ダッシュボード**: 全支援先のチャート状況を横断的に俯瞰するビュー
- **テンプレート機能**: コンサルタントがチャートのテンプレートを持ち込める
- **通知**: 支援先のチャート更新がコンサルタントに通知される
- **監査ログ**: コンサルタントの操作履歴（action_historyと連携）
