# Cursor指示書: 統一モーダル Phase 1 — 骨格

## 概要

Vision / Reality / Action の詳細表示を、ClickUp風の左右2ペインモーダルに統一する新コンポーネント `UnifiedDetailModal` を作成する。Phase 1 では骨格（枠組み・開閉・ルーティング）のみを実装し、中身は Phase 2 以降で埋める。

**設計書**: `UNIFIED-MODAL-DESIGN.md` を必ず読んでから作業を開始してください。

**i18n ルール**: このプロジェクトは next-intl で i18n 対応済みです。
- 新しいUI文字列はすべて翻訳キーで管理
- messages/ja.json と messages/en.json の両方にキーを追加
- Client Component では `useTranslations`、Server Component では `getTranslations`
- toast() にはハードコード文字列ではなく `tt('keyName')` を使用
- 実装後、英語モードでも正しく表示されることを確認

---

## 成果物

### 1. UnifiedDetailModal コンポーネント（新規）

**ファイル**: `components/unified-detail-modal/UnifiedDetailModal.tsx`

```
components/unified-detail-modal/
├── UnifiedDetailModal.tsx    ← メインコンポーネント
├── ModalHeader.tsx           ← ヘッダー（ナビ、タイプバッジ、アクションボタン）
├── LeftPane.tsx              ← 左ペイン（Phase 1 ではプレースホルダー）
└── RightPane.tsx             ← 右ペイン（Phase 1 ではプレースホルダー）
```

### Props

```typescript
type ItemType = 'vision' | 'reality' | 'action';

interface UnifiedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: ItemType;
  itemId: string;
  chartId: string;
  workspaceId?: string;  // WS版のみ
  // Phase 2 以降で追加: onNavigate, items list etc.
}
```

### レイアウト仕様

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◀ ▶  Vision · SaaS                              🔗  ⋯  ✕          │
│──────────────────────────────────────────────────────────────────────│
│                                    │                                 │
│                                    │                                 │
│          左ペイン（60%）            │        右ペイン（40%）           │
│                                    │                                 │
│     （Phase 2 で実装）              │     （Phase 3 で実装）           │
│                                    │                                 │
│                                    │                                 │
└────────────────────────────────────┴─────────────────────────────────┘
```

**サイズ**:
- 幅: `w-[80vw] max-w-[1200px] min-w-[800px]`
- 高さ: `h-[85vh] max-h-[90vh]`
- 中央配置、背景オーバーレイ付き
- 角丸: `rounded-xl`
- 影: `shadow-2xl`

**レスポンシブ**:
- 画面幅 < 800px の場合は1カラム（右ペインが下に移動）
- `md:flex-row flex-col` で切り替え

**開閉**:
- ESCキーで閉じる
- 背景クリックで閉じる
- ✕ ボタンで閉じる
- アニメーション: フェードイン + スケールアップ（duration-200）

### ModalHeader 仕様

```
◀ ▶  Vision · SaaS                              🔗  ⋯  ✕
```

**左側**:
- ◀ ▶ ナビゲーションボタン（Phase 1 では disabled、Phase 4 で有効化）
- アイテムタイプバッジ: Vision（緑）/ Reality（青）/ Action（オレンジ）
  - 色は既存のエディタでのアイテムタイプの色を踏襲
- カテゴリタグ名（取得は Phase 2 で。Phase 1 では省略可）

**右側**:
- 🔗 Deep Link コピーボタン（Phase 1 では配置のみ、Phase 4 で動作実装）
- ⋯ メニュー（Phase 1 では配置のみ）
- ✕ 閉じるボタン

### LeftPane（Phase 1 ではプレースホルダー）

```tsx
export function LeftPane({ itemType, itemId }: { itemType: ItemType; itemId: string }) {
  const t = useTranslations('modal');
  return (
    <div className="flex-1 overflow-y-auto p-6 md:w-[60%]">
      <p className="text-muted-foreground">
        {/* プレースホルダー: Phase 2 で実装 */}
        {itemType} detail: {itemId}
      </p>
    </div>
  );
}
```

### RightPane（Phase 1 ではプレースホルダー）

```tsx
export function RightPane({ itemType, itemId }: { itemType: ItemType; itemId: string }) {
  const t = useTranslations('modal');
  return (
    <div className="md:w-[40%] border-l overflow-y-auto p-6">
      <h3 className="font-semibold mb-4">{t('activity')}</h3>
      <p className="text-muted-foreground">
        {/* プレースホルダー: Phase 3 で実装 */}
        Activity timeline placeholder
      </p>
    </div>
  );
}
```

---

## 2. 既存コンポーネントからの接続

### 現在の詳細表示の開き方を調査

以下のファイルで、Vision / Reality / Action の詳細を開いている箇所を特定してください：

- `item-detail-panel.tsx` がどこから開かれているか
- `action-edit-modal.tsx` がどこから開かれているか
- `SortableVisionItem.tsx` / `SortableRealityItem.tsx` / `SortableActionItem.tsx` でのクリックハンドラ
- `kanban-card.tsx` でのクリックハンドラ

### 接続方法

**Phase 1 では既存モーダルと新モーダルを並行稼働させます**（既存を壊さない）。

既存の詳細表示トリガー（クリック等）に加えて、`UnifiedDetailModal` を開くための state を `project-editor.tsx` に追加：

```typescript
// project-editor.tsx に追加
const [unifiedModal, setUnifiedModal] = useState<{
  isOpen: boolean;
  itemType: ItemType;
  itemId: string;
} | null>(null);

function openUnifiedModal(itemType: ItemType, itemId: string) {
  setUnifiedModal({ isOpen: true, itemType, itemId });
}

function closeUnifiedModal() {
  setUnifiedModal(null);
}
```

**既存の詳細表示トリガーを新モーダルに切り替える**:

Vision / Reality の詳細アイコン（🔍やクリック）を `openUnifiedModal('vision', id)` に接続。
Action のクリックを `openUnifiedModal('action', id)` に接続。

**既存の `item-detail-panel` と `action-edit-modal` はまだ削除しない**。Phase 2 で左ペインの中身を完成させてから切り替え、Phase 4 で旧コンポーネントを削除する。

ただし、**既存のトリガーは新モーダルを開くように変更する**。もし新モーダルで足りない機能があった場合にすぐ戻せるよう、旧モーダルのコードは残しておく。

---

## 3. project-editor.tsx への統合

**対象**: WS版・非WS版の両方の project-editor.tsx

```tsx
import { UnifiedDetailModal } from '@/components/unified-detail-modal/UnifiedDetailModal';

// render 内
{unifiedModal && (
  <UnifiedDetailModal
    isOpen={true}
    onClose={closeUnifiedModal}
    itemType={unifiedModal.itemType}
    itemId={unifiedModal.itemId}
    chartId={chartId}
    workspaceId={wsId}  // WS版のみ
  />
)}
```

### Views（Kanban）からの接続

Kanban カード / Action Edit Modal からも UnifiedDetailModal を開けるようにする。

- `kanban-board.tsx` で Action カードクリック時に `openUnifiedModal('action', actionId)` を呼ぶ
- Props のバケツリレーが深くなる場合は、Context を使って `openUnifiedModal` を渡す

```tsx
// UnifiedModalContext.tsx（新規、必要な場合のみ）
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type ItemType = 'vision' | 'reality' | 'action';

interface UnifiedModalContextType {
  openModal: (itemType: ItemType, itemId: string) => void;
  closeModal: () => void;
  modalState: { itemType: ItemType; itemId: string } | null;
}

const UnifiedModalContext = createContext<UnifiedModalContextType | null>(null);

export function UnifiedModalProvider({
  children,
  chartId,
  workspaceId,
}: {
  children: ReactNode;
  chartId: string;
  workspaceId?: string;
}) {
  const [modalState, setModalState] = useState<{ itemType: ItemType; itemId: string } | null>(null);

  return (
    <UnifiedModalContext.Provider
      value={{
        openModal: (itemType, itemId) => setModalState({ itemType, itemId }),
        closeModal: () => setModalState(null),
        modalState,
      }}
    >
      {children}
      {modalState && (
        <UnifiedDetailModal
          isOpen={true}
          onClose={() => setModalState(null)}
          itemType={modalState.itemType}
          itemId={modalState.itemId}
          chartId={chartId}
          workspaceId={workspaceId}
        />
      )}
    </UnifiedModalContext.Provider>
  );
}

export function useUnifiedModal() {
  const context = useContext(UnifiedModalContext);
  if (!context) throw new Error('useUnifiedModal must be used within UnifiedModalProvider');
  return context;
}
```

---

## 4. i18n キーの追加

`messages/ja.json` と `messages/en.json` に `modal` namespace を追加：

```json
// ja.json
"modal": {
  "activity": "Activity",
  "vision": "Vision",
  "reality": "Reality",
  "action": "Action",
  "close": "閉じる",
  "previousItem": "前のアイテム",
  "nextItem": "次のアイテム",
  "copyLink": "リンクをコピー",
  "moreActions": "その他",
  "linkCopied": "リンクをコピーしました"
}

// en.json
"modal": {
  "activity": "Activity",
  "vision": "Vision",
  "reality": "Reality",
  "action": "Action",
  "close": "Close",
  "previousItem": "Previous item",
  "nextItem": "Next item",
  "copyLink": "Copy link",
  "moreActions": "More actions",
  "linkCopied": "Link copied"
}
```

---

## 5. 確認項目

### 動作確認

- [ ] Vision をクリック → 2ペインモーダルが開く
- [ ] Reality をクリック → 2ペインモーダルが開く
- [ ] Action をクリック → 2ペインモーダルが開く（Editor からも Kanban からも）
- [ ] ヘッダーにアイテムタイプバッジが正しく表示される
- [ ] ✕ ボタンで閉じる
- [ ] ESC キーで閉じる
- [ ] 背景クリックで閉じる
- [ ] 左ペイン（60%）と右ペイン（40%）が正しく分割される
- [ ] 右ペインに「Activity」ヘッダーが表示される
- [ ] 英語モードでも正しく表示される
- [ ] `tsc --noEmit` でエラーなし

### 未実装（Phase 2 以降に持ち越し）

- 左ペインの中身（タイトル編集、プロパティ、本文、変更履歴）→ Phase 2
- 右ペインの中身（コメント、タイムライン、フィルター）→ Phase 3
- ◀ ▶ ナビゲーション → Phase 4
- Deep Links → Phase 4
- 🔗 リンクコピー動作 → Phase 4
- ⋯ メニュー動作 → Phase 4
- 旧コンポーネント削除 → Phase 4
