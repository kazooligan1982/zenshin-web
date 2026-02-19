# I18N-HANDOFF: ZENSHIN CHART 多言語化実装ガイド

## Date: 2026-02-18
## Branch: feature/i18n (feature/multi-workspace-routing から分岐)
## Deadline: 3/5（ロバート × オーストラリア生徒向けリリース）

---

## 背景・なぜやるか

- **3/5-15**: Robert Fritz本人がオーストラリアの生徒たちにZENSHIN CHARTを紹介する機会がある
- 英語UIがないとこの機会を活かせない → **ブロッカー**
- 課金実装より優先度が高い

---

## 設計決定（確定済み）

| 項目 | 決定 | 理由 |
|---|---|---|
| ライブラリ | **next-intl** | Next.js 15 App Router対応、実績豊富 |
| URL構造 | **変更なし** | ログイン必須SaaSにURL分離は不要。URLが既に長い |
| 初期言語判定 | **ブラウザ言語（Accept-Language）** | ユーザーの手間ゼロ |
| 言語永続化 | **user_preferences.locale カラム** | ログイン後は常にユーザー設定を優先 |
| 言語切替UI | **サイドバー or Settings** | いつでも切替可能 |
| 対応言語 | **ja（日本語）、en（英語）** | 初期は2言語のみ |
| デフォルト | **ja** | 既存クライアントは全員日本語 |
| フォールバック | **ja → en** | 翻訳キーが見つからない場合は日本語 |

---

## 技術アーキテクチャ

### ファイル構成（新規・変更）

```
messages/
├── ja.json                          # 日本語翻訳ファイル（現UIの文言を抽出）
└── en.json                          # 英語翻訳ファイル

i18n/
├── request.ts                       # next-intl のリクエスト設定
└── config.ts                        # locales定義、defaultLocale

middleware.ts                        # 言語判定ロジック（既存に追加）

components/
└── locale-switcher.tsx              # 言語切替UIコンポーネント（NEW）

lib/
└── locale.ts                       # getUserLocale()（user_preferences 参照）

app/api/user/locale/
└── route.ts                        # PATCH: user_preferences に upsert
```

### next-intl セットアップ

#### 1. インストール

```bash
npm install next-intl
```

#### 2. i18n/config.ts

```typescript
export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';
```

#### 3. i18n/request.ts

```typescript
import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from '@/lib/locale';

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
```

#### 4. lib/locale.ts（言語判定ロジック）

```typescript
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { defaultLocale, locales, Locale } from '@/i18n/config';

export async function getUserLocale(): Promise<Locale> {
  // 1. Cookie（即時切替用）
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. user_preferences.locale（ログインユーザー）
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('locale')
      .eq('user_id', user.id)
      .single();
    if (prefs?.locale && locales.includes(prefs.locale as Locale)) {
      return prefs.locale as Locale;
    }
  }

  // 3. ブラウザ言語（Accept-Language）
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') || '';
  const browserLocale = acceptLang.split(',')[0]?.split('-')[0];
  if (browserLocale && locales.includes(browserLocale as Locale)) {
    return browserLocale as Locale;
  }

  // 4. デフォルト
  return defaultLocale;
}
```

#### 5. next.config.ts に追加

```typescript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// 既存のnextConfigをwithNextIntlでラップ
export default withNextIntl(nextConfig);
```

#### 6. app/layout.tsx に Provider追加

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### DB変更

```sql
-- user_preferences テーブル作成（locale 保存用）
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS ポリシー: ユーザーは自分のレコードのみアクセス可能
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
-- （SELECT/INSERT/UPDATE ポリシーを適宜追加）
```

---

## 翻訳ファイル構造

### messages/ja.json（構造例）

```json
{
  "common": {
    "save": "保存",
    "cancel": "キャンセル",
    "delete": "削除",
    "edit": "編集",
    "create": "作成",
    "close": "閉じる",
    "confirm": "確認",
    "loading": "読み込み中...",
    "noDate": "期限なし",
    "unassigned": "未割り当て"
  },
  "sidebar": {
    "currentWorkspace": "現在のワークスペース",
    "otherWorkspaces": "その他のワークスペース",
    "createWorkspace": "新しいWorkspaceを作成",
    "workspacePlaceholder": "ワークスペース名を入力",
    "charts": "チャート",
    "settings": "設定",
    "members": "メンバー",
    "archive": "アーカイブ"
  },
  "editor": {
    "vision": "ビジョン",
    "reality": "リアリティ",
    "tension": "テンション",
    "action": "アクション",
    "addVision": "ビジョンを追加",
    "addReality": "リアリティを追加",
    "addTension": "テンションを追加",
    "addAction": "アクションを追加",
    "visionPlaceholder": "ビジョンを入力...",
    "realityPlaceholder": "リアリティを入力...",
    "tensionTitle": "テンションのタイトル",
    "tensionDescription": "テンションの詳細",
    "noTensions": "テンションがありません",
    "noActions": "アクションがありません",
    "markComplete": "完了にする",
    "markIncomplete": "未完了に戻す",
    "deleteConfirm": "本当に削除しますか？"
  },
  "kanban": {
    "todo": "Todo",
    "inProgress": "進行中",
    "done": "完了",
    "pending": "保留",
    "canceled": "キャンセル"
  },
  "action": {
    "title": "タイトル",
    "status": "ステータス",
    "assignee": "担当者",
    "dueDate": "期限",
    "description": "詳細",
    "comments": "コメント",
    "addComment": "コメントを追加...",
    "childChart": "子チャート",
    "createChildChart": "子チャートを作成"
  },
  "members": {
    "title": "メンバー管理",
    "invite": "メンバーを招待",
    "inviteByEmail": "メールアドレスで招待",
    "inviteLink": "招待リンクを生成",
    "copyLink": "リンクをコピー",
    "linkCopied": "コピーしました",
    "removeMember": "メンバーを削除",
    "removeConfirm": "を削除しますか？",
    "role": {
      "owner": "オーナー",
      "consultant": "コンサルタント",
      "editor": "エディター",
      "viewer": "ビューアー"
    }
  },
  "settings": {
    "title": "設定",
    "language": "言語",
    "japanese": "日本語",
    "english": "English"
  },
  "tags": {
    "manage": "エリアタグを管理",
    "create": "タグを作成",
    "namePlaceholder": "タグ名",
    "deleteConfirm": "削除しますか？",
    "untagged": "未分類"
  },
  "toast": {
    "saved": "保存しました",
    "deleted": "削除しました",
    "created": "作成しました",
    "updated": "更新しました",
    "error": "エラーが発生しました",
    "copied": "コピーしました",
    "tagCreated": "タグを作成しました",
    "tagDeleted": "タグを削除しました",
    "tagUpdated": "タグを更新しました",
    "memberRemoved": "メンバーを削除しました",
    "inviteSent": "招待を送信しました"
  },
  "history": {
    "created": "が作成されました",
    "updated": "が更新されました",
    "deleted": "が削除されました",
    "completed": "が完了しました",
    "reopened": "が再開されました",
    "moved": "が移動されました"
  },
  "invite": {
    "title": "ワークスペースに参加",
    "accept": "参加する",
    "decline": "辞退する",
    "expired": "この招待リンクは期限切れです",
    "invalid": "無効な招待リンクです"
  }
}
```

### messages/en.json（対応する英訳）

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "close": "Close",
    "confirm": "Confirm",
    "loading": "Loading...",
    "noDate": "No due date",
    "unassigned": "Unassigned"
  },
  "sidebar": {
    "currentWorkspace": "Current Workspace",
    "otherWorkspaces": "Other Workspaces",
    "createWorkspace": "Create New Workspace",
    "workspacePlaceholder": "Enter workspace name",
    "charts": "Charts",
    "settings": "Settings",
    "members": "Members",
    "archive": "Archive"
  },
  "editor": {
    "vision": "Vision",
    "reality": "Reality",
    "tension": "Tension",
    "action": "Action",
    "addVision": "Add Vision",
    "addReality": "Add Reality",
    "addTension": "Add Tension",
    "addAction": "Add Action",
    "visionPlaceholder": "Enter your vision...",
    "realityPlaceholder": "Enter current reality...",
    "tensionTitle": "Tension title",
    "tensionDescription": "Tension details",
    "noTensions": "No tensions yet",
    "noActions": "No actions yet",
    "markComplete": "Mark as complete",
    "markIncomplete": "Mark as incomplete",
    "deleteConfirm": "Are you sure you want to delete this?"
  },
  "kanban": {
    "todo": "To Do",
    "inProgress": "In Progress",
    "done": "Done",
    "pending": "Pending",
    "canceled": "Canceled"
  },
  "action": {
    "title": "Title",
    "status": "Status",
    "assignee": "Assignee",
    "dueDate": "Due Date",
    "description": "Description",
    "comments": "Comments",
    "addComment": "Add a comment...",
    "childChart": "Child Chart",
    "createChildChart": "Create Child Chart"
  },
  "members": {
    "title": "Member Management",
    "invite": "Invite Member",
    "inviteByEmail": "Invite by email",
    "inviteLink": "Generate invite link",
    "copyLink": "Copy link",
    "linkCopied": "Copied!",
    "removeMember": "Remove member",
    "removeConfirm": "Remove this member?",
    "role": {
      "owner": "Owner",
      "consultant": "Consultant",
      "editor": "Editor",
      "viewer": "Viewer"
    }
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "japanese": "日本語",
    "english": "English"
  },
  "tags": {
    "manage": "Manage Area Tags",
    "create": "Create Tag",
    "namePlaceholder": "Tag name",
    "deleteConfirm": "Delete this tag?",
    "untagged": "Untagged"
  },
  "toast": {
    "saved": "Saved",
    "deleted": "Deleted",
    "created": "Created",
    "updated": "Updated",
    "error": "An error occurred",
    "copied": "Copied!",
    "tagCreated": "Tag created",
    "tagDeleted": "Tag deleted",
    "tagUpdated": "Tag updated",
    "memberRemoved": "Member removed",
    "inviteSent": "Invitation sent"
  },
  "history": {
    "created": "was created",
    "updated": "was updated",
    "deleted": "was deleted",
    "completed": "was completed",
    "reopened": "was reopened",
    "moved": "was moved"
  },
  "invite": {
    "title": "Join Workspace",
    "accept": "Join",
    "decline": "Decline",
    "expired": "This invite link has expired",
    "invalid": "Invalid invite link"
  }
}
```

---

## 実装手順（Step by Step）

### Step 1: 基盤セットアップ（1日目）

#### 1-1. パッケージインストール
```bash
npm install next-intl
```

#### 1-2. ファイル作成
- `i18n/config.ts` — locales定義
- `i18n/request.ts` — next-intl設定
- `lib/locale.ts` — 言語判定ロジック（Cookie → user_preferences → Accept-Language → default）
- `messages/ja.json` — 上記の構造で作成
- `messages/en.json` — 上記の構造で作成

#### 1-3. next.config.ts 更新
- `createNextIntlPlugin` でラップ

#### 1-4. app/layout.tsx 更新
- `NextIntlClientProvider` を追加
- `<html lang={locale}>` を設定

#### 1-5. DB変更
```sql
-- user_preferences テーブル作成（マイグレーション参照）
```

#### 1-6. 動作確認
- ブラウザ言語を英語に変更 → 英語表示になるか確認
- ブラウザ言語を日本語 → 日本語表示になるか確認

---

### Step 2: コア画面の翻訳キー置換（2-3日目）

**作業の進め方**: 各ファイルでハードコードされた日本語文字列を `useTranslations()` に置換していく。

#### Server Components での使い方
```tsx
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('editor');
  return <h1>{t('vision')}</h1>;
}
```

#### Client Components での使い方
```tsx
'use client';
import { useTranslations } from 'next-intl';

export function VisionItem() {
  const t = useTranslations('editor');
  return <span>{t('addVision')}</span>;
}
```

#### 置換対象ファイル（優先順）

**P0 — メイン画面（最大のボリューム）**

| # | ファイル | 推定文字列数 | 注意点 |
|---|---|---|---|
| 1 | `project-editor.tsx` | 30-50 | **最大。セクション分けして進める** |
| 2 | `kanban-board.tsx` | 5-10 | ステータスラベル |
| 3 | `kanban-card.tsx` | 5-10 | 「期限なし」等 |
| 4 | `action-edit-modal.tsx` | 15-20 | フォームラベル、ボタン |
| 5 | `tree-view.tsx` | 5-10 | |
| 6 | `sidebar.tsx` | 10-15 | WS切替、作成 |
| 7 | `SortableVisionItem.tsx` | 5-10 | InlineTagCreator含む |
| 8 | `SortableRealityItem.tsx` | 3-5 | |
| 9 | `SortableTensionItem.tsx` | 3-5 | |
| 10 | `SortableActionItem.tsx` | 3-5 | |
| 11 | `ActionSection.tsx` | 3-5 | |
| 12 | `TensionGroup.tsx` | 3-5 | |

**P1 — サブ画面**

| # | ファイル | 推定文字列数 |
|---|---|---|
| 13 | `TagManager.tsx` | 5-10 |
| 14 | `area-tag-editor.tsx` | 3-5 |
| 15 | `settings/page.tsx` | 3-5 |
| 16 | `settings/members/page.tsx` | 10-15 |
| 17 | `invite/[token]/page.tsx` | 5-10 |
| 18 | `date-picker.tsx` | 2-3 |

**P2 — トースト・エラーメッセージ**

| # | 対象 | 注意 |
|---|---|---|
| 19 | 全ファイルの `toast()` 呼び出し | grepで一括検索→置換 |
| 20 | `lib/workspace.ts` のエラーメッセージ | |
| 21 | `lib/supabase/queries.ts` のエラーメッセージ | |

#### 効率的な検索コマンド

```bash
# 日本語ハードコード文字列の検索（app/配下）
grep -rn '[ぁ-ん]' app/ --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v '.next'

# toast() 呼び出しの検索
grep -rn 'toast(' app/ components/ --include='*.tsx' --include='*.ts'

# プレースホルダーの検索
grep -rn 'placeholder' app/ components/ --include='*.tsx' --include='*.ts'
```

---

### Step 3: 言語切替UI（4日目）

#### components/locale-switcher.tsx

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LocaleSwitcher() {
  const t = useTranslations('settings');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleChange(locale: string) {
    // 1. Cookie にセット（即時反映用）
    document.cookie = `locale=${locale};path=/;max-age=31536000`;

    // 2. user_preferences.locale に保存（永続化）
    await fetch('/api/user/locale', {
      method: 'PATCH',
      body: JSON.stringify({ locale }),
    });

    // 3. ページリフレッシュ
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => handleChange('ja')} disabled={isPending}>
        {t('japanese')}
      </button>
      <span>/</span>
      <button onClick={() => handleChange('en')} disabled={isPending}>
        {t('english')}
      </button>
    </div>
  );
}
```

#### API: app/api/user/locale/route.ts

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  const { locale } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 初回はレコードがないので upsert を使用
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, locale, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

---

### Step 4: テスト・調整（5日目）

#### チェックリスト

- [ ] ブラウザ言語=英語 → 初回アクセスで英語表示
- [ ] ブラウザ言語=日本語 → 初回アクセスで日本語表示
- [ ] 言語切替 → 即座に切り替わる（Cookie + router.refresh）
- [ ] 再ログイン後も選択言語が維持される（user_preferences.locale）
- [ ] Editor画面: 全セクション翻訳されている
- [ ] Kanban: ステータスラベル、カード内テキスト
- [ ] Action Modal: 全フォームラベル、ボタン
- [ ] Settings/Members: メンバー管理画面
- [ ] Toast: 全メッセージ翻訳済み
- [ ] レイアウト崩れなし（英語は日本語より長い傾向に注意）
- [ ] 招待フロー: 招待ページ
- [ ] ステータスバッジの幅（英語"In Progress"は"進行中"より長い）

#### レイアウト崩れ対処のヒント

- ボタン: `min-w` を設定して短い日本語でも潰れないように
- テーブルヘッダー: `whitespace-nowrap` で折り返し防止
- ステータスバッジ: `px-2 py-0.5` の余白を確保
- プレースホルダー: 英語が長い場合は短縮表現を使う

---

## 重要な注意点

### Robert Fritz の用語について

ZENSHIN CHARTの核心概念はRobert Fritzの理論に基づいている。英訳時、以下の用語は**原著の英語をそのまま使う**（翻訳しない）：

| 日本語UI | 英語UI | 備考 |
|---|---|---|
| ビジョン | Vision | Fritz原著の用語 |
| リアリティ | Reality | Fritz原著の用語（Current Realityとも） |
| テンション | Tension | Fritz原著の用語（Structural Tension） |
| アクション | Action | 一般的な英語 |

### project-editor.tsx の分割戦略

2400行あるこのファイルは一度に全置換しようとすると事故が起きやすい。セクション分けして進める：

1. **Vision セクション** — addVision, visionPlaceholder, vision関連ボタン
2. **Reality セクション** — 同上
3. **Tension セクション** — tension関連
4. **Action セクション** — action関連
5. **共通UI** — 保存、キャンセル、削除、確認ダイアログ
6. **トースト** — toast() 呼び出し

各セクション完了ごとに動作確認→コミット。

### Server Actions内のエラーメッセージ

`actions.ts` 内のエラーメッセージはServer Action（サーバーサイド）で実行される。next-intlのServer Component用APIを使う：

```typescript
import { getTranslations } from 'next-intl/server';

export async function addVision(...) {
  const t = await getTranslations('toast');
  // ...
  return { error: t('error') };
}
```

---

## ファイル変更サマリー

### 新規作成
- `i18n/config.ts`
- `i18n/request.ts`
- `lib/locale.ts`
- `messages/ja.json`
- `messages/en.json`
- `components/locale-switcher.tsx`
- `app/api/user/locale/route.ts`

### 変更
- `next.config.ts` — withNextIntl ラッパー追加
- `app/layout.tsx` — NextIntlClientProvider追加
- `components/sidebar.tsx` — 翻訳キー + LocaleSwitcher配置
- `app/workspaces/[wsId]/charts/[id]/project-editor.tsx` — 全ハードコード文字列置換
- `app/workspaces/[wsId]/charts/[id]/kanban/*.tsx` — 同上
- `app/workspaces/[wsId]/charts/[id]/components/*.tsx` — 同上
- `app/workspaces/[wsId]/charts/[id]/actions.ts` — エラーメッセージ翻訳
- `app/workspaces/[wsId]/settings/**` — 同上
- `components/tag/TagManager.tsx` — 同上
- `components/area-tag-editor.tsx` — 同上
- `app/invite/[token]/page.tsx` — 同上
- `lib/workspace.ts` — エラーメッセージ翻訳
- `lib/permissions.ts` — ROLE_LABELS翻訳

### DB変更
```sql
-- user_preferences テーブル作成（マイグレーション参照）
```

---

---

## Phase I: i18n最終修正（Cursor用指示）

### 8. Google OAuth画面の言語制御

**対象**: Google OAuth ログインの呼び出し箇所（ログイン画面・サインアップ画面内の signInWithOAuth）

`supabase.auth.signInWithOAuth` の `options.queryParams` に `hl` パラメータを追加して、現在のlocaleをGoogleに渡す：

**Client Component の場合**（`components/auth/oauth-buttons.tsx`）:
```typescript
import { useLocale } from 'next-intl';

const locale = useLocale();

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    queryParams: {
      prompt: 'select_account',
      hl: locale,  // 'en' or 'ja'
    },
    redirectTo: '...',
  },
});
```

**Server Component の場合**:
```typescript
import { getLocale } from 'next-intl/server';
const locale = await getLocale();
```

---

## 完了の定義

- [ ] 全画面の日本語ハードコード文字列が翻訳キーに置換されている
- [ ] messages/en.json に全キーの英訳がある
- [ ] ブラウザ言語による自動判定が動作する
- [ ] 手動切替UIがある（設定画面 or サイドバー）
- [ ] user_preferences.locale に保存される
- [ ] 英語UIでレイアウト崩れがない
- [ ] Robert Fritzの用語が正しく表示される
