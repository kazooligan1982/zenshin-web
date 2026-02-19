# Cursor指示書: 統一モーダル Phase 2 — 左ペイン（コンテンツ）

## 概要

Phase 1 で作成した `UnifiedDetailModal` の左ペイン（60%）に実際のコンテンツを実装する。
既存の `item-detail-panel.tsx` と `action-edit-modal.tsx` の機能を移植・統合する。

**設計書**: `UNIFIED-MODAL-DESIGN.md` を必ず読んでから作業を開始してください。

**i18n ルール**: このプロジェクトは next-intl で i18n 対応済みです。
- 新しいUI文字列はすべて翻訳キーで管理
- messages/ja.json と messages/en.json の両方にキーを追加
- Client Component では `useTranslations`、Server Component では `getTranslations`
- toast() にはハードコード文字列ではなく `tt('keyName')` を使用
- 実装後、英語モードでも正しく表示されることを確認

**Git ルール**: main への直接 push は禁止。必ず PR + squash merge で対応。

---

## 成果物

### LeftPane の完成形

```
┌─────────────────────────────────────┐
│                                     │
│  構造コンサルタントと支援先が         │
│  ZENSHIN CHARTを使って...           │
│  （タイトル - 大きく、インライン編集） │
│                                     │
│  ┌ プロパティ ───────────────────┐  │
│  │ 📂 カテゴリ   SaaS        ▼  │  │
│  │ 👤 担当者     @kazuto     ▼  │  │
│  │ 📅 期限       2026/03/15  📅 │  │
│  │ ⚡ ステータス  進行中      ▼  │  │  ← Actionのみ
│  │ 🔗 Tension   5名程度を...     │  │  ← Actionのみ
│  └───────────────────────────────┘  │
│                                     │
│  ── 内容 ──────────────────────    │
│  （本文エリア、編集可能）            │
│                                     │
│  ── 子チャート ────────────────    │  ← Actionのみ
│  📊 サブチャート: チャート名          │
│                                     │
│  ── 変更履歴 ──────────────────    │
│  2/19 内容変更                      │
│  2/18 担当者 → @kazuto             │
│  2/18 作成                          │
│  ▼ すべて表示（12件）               │
│                                     │
└─────────────────────────────────────┘
```

---

## 実装詳細

### 1. データ取得

モーダルが開いた時（isOpen が true になった時）に、itemType と itemId に応じてデータを取得する。

```typescript
// 既存の Server Action or Supabase クエリを使って取得
// Vision の場合
const vision = await supabase
  .from('visions')
  .select('*, areas(*)')
  .eq('id', itemId)
  .single();

// Reality の場合
const reality = await supabase
  .from('realities')
  .select('*, areas(*)')
  .eq('id', itemId)
  .single();

// Action の場合
const action = await supabase
  .from('actions')
  .select('*, areas(*), tensions(*)')
  .eq('id', itemId)
  .single();
```

**注意**: データ取得は Client Component 内で `useEffect` + Supabase Client を使う。
既存の project-editor.tsx でのデータ取得パターンを参考にすること。

もしくは、UnifiedDetailModal を開く時点で既に project-editor が持っているデータ（visions, realities, actions の配列）から該当アイテムを探す方が効率的。**Props でデータを渡す方式を推奨**：

```typescript
interface UnifiedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: ItemType;
  itemId: string;
  chartId: string;
  workspaceId?: string;
  // Phase 2 追加: 既存データを渡す
  item?: Vision | Reality | Action;  // project-editor が持っているデータ
  areas?: Area[];                     // カテゴリ選択用
  members?: Member[];                 // 担当者選択用
  onUpdate?: (field: string, value: any) => void;  // 更新コールバック
}
```

### 2. タイトル編集

**要件**:
- 大きめフォント（text-xl font-semibold）で表示
- クリックで編集モードに入る（input に切り替え）
- Enter or blur で保存
- ESC でキャンセル

**参考**: 既存の `SortableVisionItem.tsx` や `SortableRealityItem.tsx` でのインライン編集パターンを参考にする。

```tsx
function TitleEditor({ title, onSave }: { title: string; onSave: (newTitle: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);

  if (isEditing) {
    return (
      <input
        className="text-xl font-semibold w-full bg-transparent border-b-2 border-blue-400 outline-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onSave(value); setIsEditing(false); }
          if (e.key === 'Escape') { setValue(title); setIsEditing(false); }
        }}
        onBlur={() => { onSave(value); setIsEditing(false); }}
        autoFocus
      />
    );
  }

  return (
    <h2
      className="text-xl font-semibold cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
      onClick={() => setIsEditing(true)}
    >
      {title || t('untitled')}
    </h2>
  );
}
```

### 3. プロパティパネル

各プロパティ行は統一レイアウトで ClickUp 風に表示する。

```tsx
function PropertyRow({ icon, label, children }: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 hover:bg-muted/30 rounded px-2 -mx-2">
      <span className="text-muted-foreground w-5">{icon}</span>
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
```

#### カテゴリ（Area Tag）
- 既存の area タグ選択UIを再利用
- ドロップダウンで選択
- 全アイテムタイプ共通

#### 担当者（Assignee）
- 既存の `AssigneePopover` コンポーネントを再利用
- メンバー一覧から選択
- 全アイテムタイプ共通

#### 期限（Due Date）
- 既存の `date-picker.tsx` コンポーネントを再利用
- カレンダーピッカー
- 全アイテムタイプ共通

#### ステータス（Status）— Action のみ
- ドロップダウン: 未着手 / 進行中 / 完了 / 保留 / 中止
- 既存のステータス変更ロジックを再利用
- Vision / Reality では非表示

#### 親 Tension — Action のみ
- 所属する Tension のテキストを表示（読み取り専用）
- クリックで Tension にフォーカス or スクロール（optional）

### 4. 内容エリア（Content Editor）

**Vision / Reality**:
- 現在の main content（テキスト or リッチテキスト）を表示・編集
- 既存の project-editor 内の編集UIから移植

**Action**:
- description フィールドを表示・編集
- 既存の action-edit-modal 内の description エリアから移植

テキストエリアの仕様:
- 最小高さ: 120px
- 自動伸縮（内容に応じて高さが変わる）
- プレースホルダー: t('contentPlaceholder')
- blur 時に自動保存

### 5. 子チャートリンク — Action のみ

Action に `child_chart_id` がある場合、子チャートへのリンクを表示。

```tsx
{action.childChartId && (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-muted-foreground mb-2">
      {t('childChart')}
    </h3>
    <Link
      href={workspaceId
        ? `/workspaces/${workspaceId}/charts/${action.childChartId}`
        : `/charts/${action.childChartId}`}
      className="flex items-center gap-2 text-blue-500 hover:underline"
    >
      📊 {childChartTitle || t('subChart')}
    </Link>
  </div>
)}
```

### 6. 変更履歴サマリー

`chart_history` テーブルからデータを取得し、コンパクトに表示。

```typescript
// chart_history からデータ取得
const history = await supabase
  .from('chart_history')
  .select('*')
  .eq('item_type', itemType)   // 'vision', 'reality', 'action'
  .eq('item_id', itemId)
  .order('created_at', { ascending: false })
  .limit(5);
```

表示形式:
```
── 変更履歴 ──────────────────────
  2/19 13:00  内容変更
  2/18 10:00  担当者を @kazuto に変更
  2/18 09:00  作成
  ▼ すべて表示（12件）
```

- デフォルト5件表示
- 「すべて表示」クリックで全件取得・展開
- 各行: 日時 + 変更サマリー（field + oldValue → newValue）
- 日時は相対表示（date-fns, locale対応）

---

## ファイル構成

```
components/unified-detail-modal/
├── UnifiedDetailModal.tsx    ← Props追加（item, areas, members, onUpdate）
├── ModalHeader.tsx           ← 変更なし
├── LeftPane.tsx              ← 【大幅変更】実際のコンテンツを実装
├── RightPane.tsx             ← 変更なし（Phase 3）
├── TitleEditor.tsx           ← 【新規】タイトルインライン編集
├── PropertiesPanel.tsx       ← 【新規】プロパティ一覧
├── PropertyRow.tsx           ← 【新規】プロパティ行の共通レイアウト
├── ContentEditor.tsx         ← 【新規】本文編集エリア
├── ChildChartLink.tsx        ← 【新規】子チャートリンク（Actionのみ）
└── ChangeHistorySummary.tsx  ← 【新規】変更履歴サマリー
```

---

## project-editor.tsx からの接続変更

Phase 1 では `itemType` と `itemId` のみ渡していた。Phase 2 ではデータも渡す。

**既存のデータを Props で渡す方式**を使う（追加のDB取得を避ける）:

```tsx
// project-editor.tsx 内
{unifiedModal && (
  <UnifiedDetailModal
    isOpen={true}
    onClose={closeUnifiedModal}
    itemType={unifiedModal.itemType}
    itemId={unifiedModal.itemId}
    chartId={chartId}
    workspaceId={wsId}
    // Phase 2 追加
    item={getItemData(unifiedModal.itemType, unifiedModal.itemId)}
    areas={areas}
    members={members}
    onUpdate={(field, value) => handleItemUpdate(unifiedModal.itemType, unifiedModal.itemId, field, value)}
  />
)}

// getItemData ヘルパー
function getItemData(itemType: ItemType, itemId: string) {
  switch (itemType) {
    case 'vision': return visions.find(v => v.id === itemId);
    case 'reality': return realities.find(r => r.id === itemId);
    case 'action': return actions.find(a => a.id === itemId);
  }
}
```

**onUpdate コールバック**:
- 既存の handleUpdateVision / handleUpdateReality / handleUpdateActionPlan を呼び出す
- 新しいAPIは作らず、既存のハンドラーを再利用

---

## i18n キーの追加

`messages/ja.json` と `messages/en.json` の `modal` namespace に追加:

```json
// ja.json の modal に追加
"untitled": "無題",
"category": "カテゴリ",
"assignee": "担当者",
"dueDate": "期限",
"status": "ステータス",
"parentTension": "Tension",
"content": "内容",
"contentPlaceholder": "内容を入力...",
"descriptionPlaceholder": "説明を入力...",
"childChart": "子チャート",
"subChart": "サブチャート",
"changeHistory": "変更履歴",
"showAll": "すべて表示（{count}件）",
"collapseHistory": "折りたたむ",
"contentChanged": "内容変更",
"assigneeChanged": "担当者を {name} に変更",
"statusChanged": "ステータス: {old} → {new}",
"dueDateChanged": "期限を {date} に変更",
"categoryChanged": "カテゴリを {name} に変更",
"itemCreated": "作成",
"noCategory": "未分類",
"noAssignee": "未割り当て",
"noDueDate": "期限なし"

// en.json の modal に追加
"untitled": "Untitled",
"category": "Category",
"assignee": "Assignee",
"dueDate": "Due date",
"status": "Status",
"parentTension": "Tension",
"content": "Content",
"contentPlaceholder": "Enter content...",
"descriptionPlaceholder": "Enter description...",
"childChart": "Child chart",
"subChart": "Sub chart",
"changeHistory": "Change history",
"showAll": "Show all ({count})",
"collapseHistory": "Collapse",
"contentChanged": "Content changed",
"assigneeChanged": "Assignee changed to {name}",
"statusChanged": "Status: {old} → {new}",
"dueDateChanged": "Due date changed to {date}",
"categoryChanged": "Category changed to {name}",
"itemCreated": "Created",
"noCategory": "Uncategorized",
"noAssignee": "Unassigned",
"noDueDate": "No due date"
```

---

## 確認項目

### 動作確認

- [ ] Vision をクリック → タイトルが大きく表示、インライン編集可能
- [ ] Reality をクリック → 同上
- [ ] Action をクリック → タイトル + ステータス + 親Tension が表示される
- [ ] プロパティ: カテゴリ変更が機能する
- [ ] プロパティ: 担当者変更が機能する
- [ ] プロパティ: 期限変更が機能する
- [ ] プロパティ: ステータス変更が機能する（Actionのみ）
- [ ] 内容エリア: 編集・保存が機能する
- [ ] 子チャートリンク: Actionで子チャートがある場合に表示される
- [ ] 変更履歴: chart_history からデータ取得・表示
- [ ] 変更履歴: 「すべて表示」で展開
- [ ] モーダル内の変更がEditor画面にリアルタイム反映される
- [ ] 英語モードで全プロパティラベルが英語
- [ ] `tsc --noEmit` でエラーなし

### WS版・非WS版
- [ ] 非WS版（app/charts/[id]/）から正しく動作
- [ ] WS版（app/workspaces/[wsId]/charts/[id]/）から正しく動作

### 未実装（Phase 3 以降に持ち越し）
- 右ペインの中身（Activity タイムライン）→ Phase 3
- ◀ ▶ ナビゲーション → Phase 4
- Deep Links → Phase 4
