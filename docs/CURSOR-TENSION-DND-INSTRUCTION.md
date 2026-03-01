# Tension D&D ソート実装指示（Cursor用）

## 概要

Editor画面の Tension & Action エリアで、Tension同士の順番をドラッグ&ドロップで入れ替えられるようにする。

## 現状

- **Vision / Reality / Action** はすでに D&D 対応済み（dnd-kit 使用）
- **TensionGroup** は `useDroppable` のみで、ドロップ先としては機能するが **ドラッグ可能になっていない**
- `useDndHandlers.ts` には Tension の並び替えロジックが既に実装済み（254–339行付近）
  - `activeData?.type === "tension"` の分岐で、同一カテゴリ内の Tension 順序変更と DB 保存（`updateListOrder("tensions", ...)`）を処理
- Tension に `sort_order` カラムが存在し、`tensions` テーブルで利用可能

## 問題

Tension が `useSortable` でラップされていないため、ドラッグが開始されず、並び替えができない。

## 実装要件

### 1. SortableTensionItem の作成（または TensionGroup の拡張）

- `SortableVisionItem` と同様に、`useSortable` で Tension をラップする
- `id` は `tension-${tension.id}` 形式（`useDndHandlers` が `tension-` プレフィックスを期待）
- `data` に `{ type: "tension", areaId: ... }` を設定
- グリップハンドル（`GripVertical`）を追加し、`attributes` / `listeners` を付与
- `SortableContext` の `items` は `tensionsInSection.map(t => \`tension-${t.id}\`)`

### 2. 対象ファイル

| ファイル | 役割 |
|----------|------|
| `app/charts/[id]/components/TensionGroup.tsx` | TensionGroup を `useSortable` でラップするか、`SortableTensionItem` で包む |
| `app/charts/[id]/components/ActionSection.tsx` | `SortableContext` を追加し、`items` に Tension ID を渡す |
| `app/workspaces/[wsId]/charts/[id]/components/TensionGroup.tsx` | 上記と同様の変更（WS版） |
| `app/workspaces/[wsId]/charts/[id]/components/ActionSection.tsx` | 上記と同様の変更（WS版） |

### 3. 既存パターンとの整合

- `SortableVisionItem` を参考にする
  - `useSortable({ id: vision.id })` → Tension の場合は `id: \`tension-${tension.id}\``
  - `verticalListSortingStrategy` を使用
  - `CSS.Transform.toString(transform)` でスタイル適用
- `useDndHandlers.handleDragEnd` は既に Tension の並び替えを処理しているため、**ドラッグ可能にするだけでよい**

### 4. DB 保存

- `updateListOrder(items, "tensions", chartId)` が既に呼ばれている（`useDndHandlers.ts` 332行付近）
- `tensions` テーブルの `sort_order` カラムが存在することを確認
- **注意**: `add_sort_order_columns.sql` には visions/realities/actions のみ含まれており、tensions には sort_order が無い可能性がある。以下のマイグレーションを追加すること:

```sql
-- tensions テーブルに sort_order カラムを追加
ALTER TABLE tensions ADD COLUMN IF NOT EXISTS sort_order INTEGER;
CREATE INDEX IF NOT EXISTS idx_tensions_sort_order ON tensions(chart_id, area_id, sort_order NULLS LAST);
```

### 5. i18n

- 新規 UI 文言はすべて翻訳キーで管理
- `messages/ja.json` と `messages/en.json` の両方にキーを追加
- 例: グリップの `title` など、必要に応じて `editor.dragToReorder` などを追加

### 6. 対応範囲

- **WS版** (`app/workspaces/[wsId]/charts/[id]/`) と **非WS版** (`app/charts/[id]/`) の両方に対応すること

## 参考コード

### SortableVisionItem（参考）

```tsx
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
  id: vision.id,
});

const style = {
  transform: CSS.Transform.toString(transform),
  transition,
};

// グリップに attributes, listeners を付与
<div {...attributes} {...listeners} className="cursor-grab ...">
  <GripVertical />
</div>
```

### useDndHandlers の Tension 処理（既存）

- `activeData?.type === "tension"` で Tension の D&D を判定
- 同一エリア内の並び替え時: `arrayMove` で並び替え → `updateListOrder(items, "tensions", chartId)` で DB 更新

## 確認項目

- [ ] 同じカテゴリタグ内で Tension を D&D で上下に並び替えられる
- [ ] 並び替え後に `sort_order` が DB に保存される
- [ ] ページリロード後も順序が維持される
- [ ] WS版・非WS版の両方で動作する
- [ ] 英語モードでも正しく表示される（i18n 対応）
