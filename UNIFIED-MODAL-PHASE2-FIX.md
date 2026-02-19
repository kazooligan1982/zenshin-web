# Cursor指示書: 統一モーダル Phase 2 修正 — フィードバック対応

## 概要

UnifiedDetailModal Phase 2 の左ペインに対するフィードバック修正。全11件。

**i18n ルール**: 新しいUI文字列はすべて翻訳キーで管理。ja.json / en.json 両方に追加。英語モードでも確認。
**Git ルール**: main への直接 push は禁止。PR + squash merge。

---

## 修正一覧

### 1. Reality に「期限」を表示しない

**問題**: Reality には期限の概念がない。投稿時のタイムスタンプがあるだけ。
**修正**: `PropertiesPanel.tsx` で `itemType === 'reality'` の場合、期限行を非表示にする。

代わりに「作成日」を表示する：
```
📅 作成日    2026/02/15
```

i18n キー:
- ja: `"createdAt": "作成日"`
- en: `"createdAt": "Created"`

---

### 2. 「内容」セクションの見直し — タイトルとの重複解消

**問題**: タイトルと「内容」テキストエリアが同じ文章を表示していて冗長。

**修正方針**:
- Vision / Reality: タイトル = メインの文章。「内容」セクションは **「詳細」（Details）** に改名し、追加の補足説明用とする。タイトルの中身をそのまま内容にコピーしない。
  - 「詳細」エリアは任意入力。プレースホルダー: 「補足説明を追加...」
  - DB に description カラムがない場合は、このエリアは表示しない or 将来対応として非表示にする
- Action: 「内容」→「詳細」に改名。既存の description フィールドを表示。

i18n キー変更:
- ja: `"content": "内容"` → `"details": "詳細"`, `"contentPlaceholder"` → `"detailsPlaceholder": "補足説明を追加..."`
- en: `"content": "Content"` → `"details": "Details"`, `"contentPlaceholder"` → `"detailsPlaceholder": "Add details..."`

**Vision / Reality に description カラムがない場合**: 「詳細」セクション自体を非表示にする。タイトルだけで十分。Action のみ詳細を表示。

---

### 3. タイトルのインライン編集 — レイアウトシフトを防ぐ

**問題**: タイトルクリック時に input に切り替わると見た目が大きく変わる。

**修正**: input のスタイルをタイトル表示と完全に一致させる。
- 同じフォントサイズ、太さ、パディング
- border は `border-transparent` → フォーカス時のみ `border-blue-400`
- 背景色の変化を最小限に

```tsx
// 編集モード
<input
  className="text-xl font-semibold w-full bg-transparent border-b-2 border-transparent focus:border-blue-400 outline-none py-1"
  ...
/>

// 表示モード
<h2
  className="text-xl font-semibold py-1 cursor-pointer"
  ...
>
```

ポイント: **高さ・padding・font が表示モードと編集モードで完全に同じ**であること。

---

### 4. Action の詳細がリッチテキストとして壊れている

**問題**: Action の description に HTML（Tiptap 出力）が保存されているが、生の HTML タグが表示されている（`<p>`, `<br>`, `<a>` 等が見えている）。

**修正**: ContentEditor（→DetailsEditor に改名）で、HTML コンテンツを正しくレンダリングする。

方法A（シンプル）: `dangerouslySetInnerHTML` で表示
```tsx
// 表示モード
<div
  className="prose prose-sm max-w-none"
  dangerouslySetInnerHTML={{ __html: content }}
/>
```

方法B（推奨）: Tiptap の EditorContent を使ってリッチテキスト表示・編集
```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const editor = useEditor({
  extensions: [StarterKit, Link],
  content: description,
  onBlur: ({ editor }) => {
    onUpdate('description', editor.getHTML());
  },
});

return <EditorContent editor={editor} className="prose prose-sm max-w-none min-h-[120px]" />;
```

**既存のプロジェクトで Tiptap を使っている**（tech stack 確認済み）ので、方法B を使用してください。

---

### 5. Reality のバッジ色をオレンジに変更

**問題**: Reality のバッジが青だが、ZENSHIN のデザインでは Reality はオレンジ系。

**修正**: `ModalHeader.tsx` のバッジ色:
- Vision: 緑（teal）— そのまま
- Reality: **オレンジ** — `bg-orange-100 text-orange-700 border-orange-300`
- Action: オレンジ → **別の色に変更が必要かも**。Reality がオレンジなら Action は何色にするか。

**提案**: エディタ画面でのセクション色に合わせる:
- Vision: 緑系（teal）
- Reality: オレンジ系（orange）
- Action: 青系（blue）

```tsx
const badgeColors = {
  vision: 'bg-teal-100 text-teal-700 border-teal-300',
  reality: 'bg-orange-100 text-orange-700 border-orange-300',
  action: 'bg-blue-100 text-blue-700 border-blue-300',
};
```

---

### 6. i18n 漏れ: 「Tension & Action」が英語のまま

**問題**: 日本語モードでエディタの領域タイトルが「Tension & Action」と英語表示。

**修正対象**: `project-editor.tsx`（WS版・非WS版）で「Tension & Action」をハードコードしている箇所を探し、翻訳キーに置換。

```bash
grep -rn "Tension & Action" app/
grep -rn "Tension &" app/
```

i18n キー:
- ja: `"tensionAndAction": "テンション＆アクション"`
- en: `"tensionAndAction": "Tension & Action"`

editor namespace に追加。

---

### 7. プロパティをフラット UI に変更（ClickUp 風）

**問題**: プロパティが枠線で囲まれた「テキスト領域」風に見える。ClickUp のようにフラットなインライン表示にしたい。

**修正**: `PropertiesPanel.tsx` の外枠を削除し、各行をフラットに並べる。

```tsx
// 変更前（枠あり）
<div className="border rounded-lg p-4">
  <p className="text-sm text-muted-foreground mb-2">プロパティ</p>
  ...
</div>

// 変更後（フラット、ClickUp風）
<div className="space-y-1">
  {/* PropertyRow を並べる。枠なし、hover でハイライト */}
</div>
```

`PropertyRow.tsx` の修正:
```tsx
function PropertyRow({ icon, label, children }) {
  return (
    <div className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-muted/30 transition-colors">
      <span className="text-muted-foreground w-5 shrink-0">{icon}</span>
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
}
```

**「プロパティ」というヘッダーテキストも削除**。ClickUp では各行がそのまま並ぶだけ。

値の表示もフラットに:
- カテゴリ: `● SaaS` テキスト表示、クリックでドロップダウン
- 担当者: アバター + 名前、クリックで選択
- 期限: `2026/03/15` テキスト表示、クリックでカレンダー
- ステータス: バッジ表示、クリックでドロップダウン

枠線やinput要素を直接見せないこと。**値はテキストとして表示し、クリックした時だけ編集UIが現れる**。

---

### 8. ステータスアイコンを変更（雷マーク → 別のもの）

**問題**: ステータスのアイコンが ⚡（雷）で、Tension のアイコンと被る。

**修正**: ステータスアイコンを以下のいずれかに変更:
- `CircleDot`（lucide-react）— ● 状態を表す
- `Activity`（lucide-react）— 進捗を表す
- `CheckCircle2`（lucide-react）— タスクの完了度

**推奨**: `CircleDot` を使用。

```tsx
import { CircleDot } from 'lucide-react';
// ステータス行のアイコン
<CircleDot className="w-4 h-4" />
```

---

### 9. 変更履歴に「誰が変更したか」を表示

**問題**: 変更履歴に日時と変更内容は出ているが、変更者が表示されていない。

**修正**: `ChangeHistorySummary.tsx` で `changed_by` を使って表示。

chart_history テーブルに `changed_by` (UUID) がある場合:
```
2/19 20:11  kazuto — 内容変更
2/18 10:00  tanaka — 担当者を @kazuto に変更
2/18 09:00  kazuto — 作成
```

members データから `changed_by` → 表示名に変換。members が渡されていない場合は「不明」と表示。

API（`/api/charts/[id]/chart-history`）のレスポンスに `changed_by` を含め、表示名も join で取得:
```sql
SELECT ch.*, p.display_name as changed_by_name
FROM chart_history ch
LEFT JOIN profiles p ON ch.changed_by = p.id
WHERE ch.item_type = $1 AND ch.item_id = $2
ORDER BY ch.created_at DESC
```

---

### 10. 左右ペインのリサイズ機能

**問題**: 左ペイン（60%）と右ペイン（40%）の境界をドラッグして幅を調整したい。

**修正**: リサイズハンドルを追加。

```tsx
// UnifiedDetailModal.tsx 内
const [leftWidth, setLeftWidth] = useState(60); // パーセント

function handleMouseDown(e: React.MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = leftWidth;
  const containerWidth = containerRef.current?.offsetWidth || 1;

  function onMouseMove(e: MouseEvent) {
    const delta = e.clientX - startX;
    const newWidth = startWidth + (delta / containerWidth) * 100;
    setLeftWidth(Math.min(Math.max(newWidth, 30), 80)); // 30%〜80% に制限
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// レイアウト
<div ref={containerRef} className="flex flex-1 overflow-hidden">
  <div style={{ width: `${leftWidth}%` }} className="overflow-y-auto">
    <LeftPane ... />
  </div>

  {/* リサイズハンドル */}
  <div
    className="w-1 bg-border hover:bg-blue-400 cursor-col-resize shrink-0 transition-colors"
    onMouseDown={handleMouseDown}
  />

  <div style={{ width: `${100 - leftWidth}%` }} className="overflow-y-auto border-l">
    <RightPane ... />
  </div>
</div>
```

**レスポンシブ**: 画面幅が 800px 未満の場合、リサイズハンドル非表示 + 1カラム表示。

---

### 11. Reality の変更履歴 — Action との紐付け表示

**問題**: Reality が変化した時、「どの Action の結果として変わったか」を知りたい。

**Phase 2 では**: chart_history の基本表示（誰が・いつ・何を変更したか）のみ対応。
**将来（Phase 3 以降）**: Reality 変更時に「関連 Action」を紐付けるUIを追加。

現時点では変更履歴の表示改善（修正 #9）で対応し、Action紐付けは別タスクとして記録する。

---

## 修正対象ファイル

| ファイル | 修正内容 |
|---|---|
| `PropertiesPanel.tsx` | Reality の期限削除→作成日追加、フラットUI化、「プロパティ」ヘッダー削除 |
| `PropertyRow.tsx` | 枠なし、hover ハイライトのフラットスタイル |
| `LeftPane.tsx` | 「内容」→「詳細」改名、Vision/Reality は詳細非表示（descriptionカラムなし） |
| `ContentEditor.tsx` → `DetailsEditor.tsx` | ファイル名変更、Tiptap EditorContent でリッチテキスト表示 |
| `TitleEditor.tsx` | 編集時のレイアウトシフト防止 |
| `ChangeHistorySummary.tsx` | 変更者名の表示 |
| `ModalHeader.tsx` | Reality バッジ色をオレンジに、Action を青に |
| `UnifiedDetailModal.tsx` | リサイズハンドル追加、leftWidth state |
| `/api/charts/[id]/chart-history/route.ts` | changed_by_name を join で取得 |
| `project-editor.tsx`（WS版・非WS版） | 「Tension & Action」翻訳キー化 |
| `messages/ja.json`, `messages/en.json` | キー追加・変更 |

---

## 確認項目

- [ ] Reality: 期限なし、作成日あり
- [ ] Vision / Reality: 「詳細」セクションが非表示（description なし）
- [ ] Action: 「詳細」にリッチテキストが正しくレンダリングされる
- [ ] タイトル編集: レイアウトシフトなし
- [ ] プロパティ: 枠なしのフラット表示、hover でハイライト
- [ ] バッジ: Vision=緑、Reality=オレンジ、Action=青
- [ ] ステータスアイコン: 雷ではない
- [ ] 変更履歴: 変更者名が表示される
- [ ] 左右ペイン: 境界ドラッグで幅調整可能
- [ ] 「Tension & Action」が日本語で「テンション＆アクション」
- [ ] 英語モードですべて正しく表示
- [ ] `tsc --noEmit` でエラーなし
