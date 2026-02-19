# 統一モーダル設計書: ZENSHIN CHART（確定版）

## 決定事項サマリー

| 項目 | 決定 |
|---|---|
| レイアウト | 左右2ペイン（左60% コンテンツ / 右40% Activity）ClickUp風 |
| 対象 | Vision / Reality / Action の3種類 |
| Tension | Editor上で完結（モーダル不要） |
| 左ペイン変更履歴 | あり（コンパクトサマリー表示、直近5件+展開） |
| Deep Links | `/go/{type}/{id}` 方式（短URL、サーバー側でリダイレクト） |

---

## レイアウト

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◀ ▶  Vision · SaaS                              🔗  ⋯  ✕          │
│──────────────────────────────────────────────────────────────────────│
│                                    │                                 │
│  タイトル（大きく編集可能）           │   Activity              🔍 🔔  │
│                                    │                                 │
│  ┌ プロパティ ──────────────────┐   │   ┌ フィルター ─────────────┐   │
│  │ 📂 カテゴリ   SaaS       ▼  │   │   │ ☑ Comments ☑ Changes   │   │
│  │ 👤 担当者     @kazuto    ▼  │   │   │ ☐ Status               │   │
│  │ 📅 期限       2026/03/15 📅 │   │   └─────────────────────────┘   │
│  │ ⚡ ステータス  進行中     ▼  │   │                                 │
│  │ 🔗 Tension   5名程度を...   │   │   kazuto · 2分前                │
│  └──────────────────────────────┘   │   内容を更新しました              │
│                                    │                                 │
│  ── 内容 ──────────────────────    │   tanaka · 1日前                │
│                                    │   この件、来週までにいける？       │
│  （本文エリア、編集可能）             │                                 │
│                                    │   システム · 3日前               │
│                                    │   担当者を @kazuto に変更         │
│  ── 変更履歴 ──────────────────    │                                 │
│  2/19 内容変更                      │   システム · 5日前               │
│  2/18 担当者 → @kazuto             │   作成                           │
│  2/18 作成                          │                                 │
│  ▼ すべて表示（12件）               │   ┌─────────────────────────┐   │
│                                    │   │ コメントを入力...          │   │
│                                    │   │              Cmd+Enter ▶ │   │
│                                    │   └─────────────────────────┘   │
└────────────────────────────────────┴─────────────────────────────────┘
         左ペイン（60%）                      右ペイン（40%）
```

---

## モーダルサイズ

- **幅**: 画面の80%（max-width: 1200px, min-width: 800px）
- **高さ**: 画面の85%（max-height: 90vh）
- **モバイル**: 1カラム（右ペインが下に折り返す）

---

## ヘッダー

```
◀ ▶  Vision · SaaS                              🔗  ⋯  ✕
```

| 要素 | 説明 |
|---|---|
| ◀ ▶ | 前後のアイテムに移動（同カテゴリ内） |
| Vision / Reality / Action | アイテムタイプバッジ |
| SaaS | カテゴリタグ |
| 🔗 | Deep Link をクリップボードにコピー |
| ⋯ | メニュー（削除等） |
| ✕ | 閉じる（ESCキーでも閉じる） |

---

## 左ペイン: コンテンツ（60%）

### アイテムタイプ別の表示項目

| セクション | Vision | Reality | Action |
|---|---|---|---|
| **タイトル** | ○ 編集可 | ○ 編集可 | ○ 編集可 |
| **プロパティ** | | | |
| └ カテゴリ | ○ | ○ | ○（親Tensionのカテゴリ） |
| └ 担当者 | ○ | ○ | ○ |
| └ 期限 | ○ | ○ | ○ |
| └ ステータス | — | — | ○（Todo/進行中/完了/保留/中止） |
| └ 親Tension | — | — | ○（所属Tension名を表示） |
| **内容** | 現在の内容 | 現在の内容 | Description |
| **子チャート** | — | — | ○（リンク） |
| **変更履歴** | ○ | ○ | ○ |

### プロパティのインライン編集

```
┌──────────────────────────────────┐
│ 📂 カテゴリ    SaaS          ▼   │  ← クリックでドロップダウン
│ 👤 担当者      kazuto yasuda ▼   │  ← クリックでメンバー選択
│ 📅 期限        2026/03/15    📅  │  ← クリックでカレンダー
│ ⚡ ステータス   進行中        ▼   │  ← Actionのみ
│ 🔗 Tension     5名程度を...       │  ← Actionのみ。クリックで親Tensionへ
└──────────────────────────────────┘
```

### 変更履歴（左ペイン下部）

**目的**: 「前回からどこが変わった？」を素早く確認するためのコンパクトサマリー。

```
── 変更履歴 ──────────────────────
  2/19 13:00  内容変更
  2/18 10:00  担当者を @kazuto に変更
  2/18 09:00  作成
  ▼ すべて表示（12件）
```

- デフォルト直近5件表示
- 「すべて表示」クリックで全件展開
- 変更の種類: 内容変更 / 担当者変更 / ステータス変更 / 期限変更 / 作成 / カテゴリ変更
- データソース: chart_history テーブル

---

## 右ペイン: Activity（40%）

### 目的

チーム内のやり取り全体を把握する場。コメント・変更・ステータス変更が時系列で統合表示される。

### 構造

```
Activity                                    🔍  🔔
┌ フィルター ─────────────────────────────┐
│ ☑ Comments  ☑ Changes  ☐ Status only  │
└─────────────────────────────────────────┘

── タイムライン（新しい順） ──

  kazuto yasuda · 2分前
  ここの表現を変更しました

  システム · 30分前
  ステータス: 未着手 → 進行中

  tanaka · 1日前
  この件、来週までに完了できそう？

  システム · 5日前
  作成

── コメント入力 ──
┌─────────────────────────────────────────┐
│ コメントを入力...        (Cmd+Enter ▶)   │
└─────────────────────────────────────────┘
```

### フィルター

| フィルター | 表示内容 |
|---|---|
| All（デフォルト） | コメント + 変更 + ステータス変更 すべて |
| Comments | コメントのみ |
| Changes | chart_historyの変更のみ |
| Status | ステータス変更のみ（Action関連） |

### 🔍 検索

Activity内のコメント・変更を文字列検索。

### タイムラインのデータ型

```typescript
type ActivityItem =
  | { type: 'comment'; author: User; content: string; createdAt: Date }
  | { type: 'change'; field: string; oldValue: string; newValue: string;
      changedAt: Date; changedBy: User }
  | { type: 'status'; oldStatus: string; newStatus: string;
      changedAt: Date; changedBy: User }
  | { type: 'created'; createdAt: Date; createdBy: User };
```

### 左ペイン変更履歴 vs 右ペインActivity の違い

| | 左ペイン「変更履歴」 | 右ペイン「Activity」 |
|---|---|---|
| **目的** | 変更だけを素早く追う | チームの全やり取り |
| **内容** | 変更ログのみ | コメント + 変更 + ステータス |
| **表示** | コンパクト5件 + 展開 | フルタイムライン |
| **フィルター** | なし | あり |
| **検索** | なし | あり |

---

## Deep Links

### URL形式

```
/go/{type}/{id}

例:
/go/vision/abc123
/go/reality/def456
/go/action/ghi789
/go/chart/jkl012        ← チャート自体のURLも対応
```

### 処理フロー

```
ユーザーがURL開く
  → /go/action/abc123
  → サーバー: actions テーブルから action_id=abc123 を検索
  → chart_id, workspace_id を取得
  → リダイレクト: /workspaces/{wsId}/charts/{chartId}?open=action_abc123
  → Editor画面がロード
  → クエリパラメータ ?open=action_abc123 を検知
  → UnifiedDetailModal を自動オープン
```

### 実装

```
app/go/[type]/[id]/page.tsx  (Server Component)
```

```typescript
// app/go/[type]/[id]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DeepLinkPage({
  params,
}: {
  params: { type: string; id: string };
}) {
  const { type, id } = params;
  const supabase = await createClient();

  // type に応じたテーブルから chart_id を取得
  let chartId: string | null = null;
  let wsId: string | null = null;

  if (type === 'action') {
    const { data } = await supabase
      .from('actions')
      .select('chart_id, charts(workspace_id)')
      .eq('id', id)
      .single();
    chartId = data?.chart_id;
    wsId = data?.charts?.workspace_id;
  }
  // vision, reality, chart も同様に処理...

  if (!chartId || !wsId) redirect('/');

  redirect(`/workspaces/${wsId}/charts/${chartId}?open=${type}_${id}`);
}
```

### 🔗 ボタンの動作

モーダルヘッダーの 🔗 ボタンクリック時:
1. `/go/{type}/{id}` 形式のURLを生成
2. クリップボードにコピー
3. トースト「Link copied」を表示

---

## コンポーネント構成

```
UnifiedDetailModal (新規)
├── ModalHeader
│   ├── NavigationArrows (◀ ▶)
│   ├── ItemTypeBadge (Vision / Reality / Action)
│   ├── CategoryTag
│   └── ActionButtons (🔗 Deep Link / ⋯ メニュー / ✕ 閉じる)
├── LeftPane (60%)
│   ├── TitleEditor (インライン編集)
│   ├── PropertiesPanel
│   │   ├── CategorySelector
│   │   ├── AssigneeSelector (既存再利用)
│   │   ├── DatePicker (既存再利用)
│   │   ├── StatusSelector (Actionのみ、既存再利用)
│   │   └── ParentTensionLink (Actionのみ)
│   ├── ContentEditor (本文エリア)
│   ├── ChildChartLink (Actionのみ)
│   └── ChangeHistorySummary (chart_history、直近5件+展開)
└── RightPane (40%)
    ├── ActivityHeader (タイトル + 🔍検索 + 🔔)
    ├── ActivityFilter (☑ Comments ☑ Changes ☐ Status)
    ├── ActivityTimeline (コメント+変更の統合タイムライン)
    │   ├── CommentItem (既存再利用)
    │   ├── ChangeItem (新規: 変更履歴表示)
    │   └── StatusChangeItem (新規: ステータス変更表示)
    └── CommentInput (既存再利用)
```

---

## 既存コンポーネントとの関係

| 既存 | 統一後 |
|---|---|
| item-detail-panel.tsx | → **廃止** → UnifiedDetailModal に統合 |
| action-edit-modal.tsx | → **廃止** → UnifiedDetailModal に統合 |
| Timeline.tsx | → RightPane内で再利用 or リファクタ |
| TimelineItem.tsx | → RightPane内で再利用 or リファクタ |
| CommentInput.tsx | → **再利用** |
| AssigneePopover | → **再利用** |
| date-picker.tsx | → **再利用** |

---

## 実装フェーズ

### Phase 1: 骨格（UnifiedDetailModal の枠組み）
- モーダル枠組み（左右2ペイン、ヘッダー、リサイズ対応）
- アイテムタイプに応じた左ペインの出し分けロジック
- 既存の「詳細を開く」操作を新モーダルに接続
- ESCで閉じる、背景クリックで閉じる
- WS版・非WS版の両方

### Phase 2: 左ペイン完成
- タイトルのインライン編集（既存ロジック移植）
- プロパティパネル（カテゴリ、担当者、期限、ステータス）
- 本文エディタ（既存ロジック移植）
- 子チャートリンク（Actionのみ、既存ロジック移植）
- 変更履歴サマリー（chart_history取得・コンパクト表示）

### Phase 3: 右ペイン（Activity）
- コメント表示・投稿（既存Timeline/CommentInput再利用）
- chart_historyの取得・表示
- コメントとhistoryの時系列統合表示
- フィルター機能（Comments / Changes / Status）
- 検索機能

### Phase 4: 仕上げ
- ◀ ▶ アイテムナビゲーション
- Deep Links（/go/{type}/{id}）
- 🔗 リンクコピーボタン
- アニメーション・トランジション
- レスポンシブ（モバイル1カラム）
- i18n 全キー追加
- 旧コンポーネント（item-detail-panel, action-edit-modal）の削除

---

## i18n

`modal` namespace を新規作成:

```json
{
  "modal": {
    "activity": "Activity",
    "filterComments": "Comments",
    "filterChanges": "Changes",
    "filterStatus": "Status",
    "changeHistory": "変更履歴",
    "showAll": "すべて表示（{count}件）",
    "collapseHistory": "折りたたむ",
    "searchActivity": "検索...",
    "linkCopied": "リンクをコピーしました",
    "previousItem": "前のアイテム",
    "nextItem": "次のアイテム",
    "contentChanged": "内容変更",
    "assigneeChanged": "担当者を {name} に変更",
    "statusChanged": "ステータス: {old} → {new}",
    "dueDateChanged": "期限を {date} に変更",
    "categoryChanged": "カテゴリを {name} に変更",
    "itemCreated": "作成",
    "system": "システム"
  }
}
```

---

## 注意事項

- **i18n**: すべての新規文字列は翻訳キーで管理（ja.json / en.json 同時追加）
- **WS版・非WS版**: 両方に同一のUnifiedDetailModalを使用
- **パフォーマンス**: chart_historyとコメントは遅延読み込み（モーダル開いてから取得）
- **アクセシビリティ**: ESCで閉じる、フォーカストラップ、キーボードナビゲーション
- **既存データ**: 旧モーダルで動いていた機能（コメント、ステータス変更等）はすべて移植
