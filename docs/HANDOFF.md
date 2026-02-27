# ZENSHIN CHART — Development Handoff

> **最終更新: 2026-02-14**
> 新チャットの冒頭にこのファイルを貼り付けてください。

---

## TL;DR（今どういう状態？）
- Next.js 15.5.12 + Supabase + Vercel で稼働中（`zenshin-web-alpha.vercel.app`）
- テスト基盤（Vitest + Playwright + GHA）導入済み
- TypeScript / ESLint のビルド時チェック有効
- UI/UXリデザイン完了（ZENSHINカラーパレット全画面適用）
- **window.confirm 全撲滅** → AlertDialog / Undo トーストに統一
- **Tension間Action移動UI** 実装済み（ドロップダウン方式）
- **子チャート完了→親Action自動完了** 実装済み
- **次の最優先タスク: `project-editor.tsx` の分割（5500行超）**

---

## 開発者プロフィール
- **名前:** Kazuto Yasuda
- **スキル:** プログラミング超初心者。Cursor（AI IDE）+ Claude で開発
- **必須:** コピペ可能なコマンド・Cursorプロンプト形式で提供すること
- **UI/UX感性:** 高い。設計判断は常にKazutoと議論して決める

---

## プロダクト概要
**ZENSHIN CHART** — Robert Fritz「構造的テンション」理論に基づく思考・創造活動支援ツール

### 概念モデル
```
Vision（理想）→ Reality（現実）→ Tension（ギャップ）→ Action（行動）
```
- Vision/Reality の間に Tension が生まれる
- Tension にタグ（Area）が紐づく
- Action は Tension 配下に属する
- Action のタグは Tension から継承される（Action個別のタグ変更は不要）
- Action はテレスコープで子チャート化可能（子チャート完了→親Action自動完了）

### 技術スタック
| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 15 (App Router, Webpack) |
| DB | Supabase + RLS |
| ホスティング | Vercel |
| CSS | Tailwind v4 |
| UI | shadcn/ui |
| リッチテキスト | Tiptap |
| トースト | sonner |
| D&D | dnd-kit |
| テスト | Vitest + Playwright + GHA |
| リポジトリ | `github.com/kazooligan1982/zenshin-web` |
| ブランチ保護 | main への直接 push 不可。PR + squash merge 必須 |

---

## プロダクトビジョン — 変更差分こそがコア資産

### 核心思想
ZENSHIN CHART の最大の提供価値は **「変更差分の蓄積 × AI分析 → 創造プロセスの加速」**。
ユーザーが Action を実行し、結果（成功/失敗）を受け取り、Reality が変わり、Vision に近づく。
このサイクルの**全変更履歴を最小の手間で記録**し、**AIが分析してアシスト**することで、
「成果が成果を呼ぶ前進構造」にユーザーが身を置き続けられるようにする。

### 詳細パネルの将来構想（フェーズ分け可能）

**Action の変更差分:**
- コメント（テキスト、@メンション引用）
- 外部サービス連携タスク（Notion, GitHub, ClickUp 等）
- 自動記録: タイトル変更、日付変更、担当者変更、テレスコープ実行（すべてタイムスタンプ付き）
- AI分析: 進捗具合、抜け漏れ、前進に必要なことの示唆

**Reality の変更差分:**
- タイトル変更履歴（タイムスタンプ付き）
- **どの Action に紐づいて Reality が変わったかの紐付け**（@メンションサジェスト or 自動紐付け）
- ここが最も人力では面倒な部分 → **AIアシスト必須領域**

**Vision の変更差分:**
- タイトル変更、担当者変更、日付変更、タグ変更
- Action/Reality と同様の変更差分格納

**βテスト段階で組み込みたいもの:**
- [ ] タイトル・日付・担当者・テレスコープの自動変更ログ（タイムスタンプ付き）
- [ ] コメント + @メンション（基本は実装済み）
- [ ] Reality 変更時の Action 紐付けサジェスト
- [ ] AI による変更差分の定期分析・サマリー
- [ ] 外部サービス連携（Notion, GitHub, ClickUp）

---

## ZENSHIN カラーパレット（全画面統一済み）
| 要素 | カラー | 用途 |
|------|--------|------|
| cream | #F3F0E3 | 背景の温かみ |
| orange | #F5853F | CTA・アクティブ |
| teal | #23967F | 成功・セカンダリ |
| charcoal | #282A2E | ダークUI |
| navy | #154665 | テキスト・アクセント |

**ステータス色:** 未着手: navy/30 / 進行中: blue-500 / 完了: emerald-500 / 保留: amber-500 / 中止: navy/30

---

## デザイン方針
- **AlertDialog:** `rounded-2xl shadow-xl max-w-sm`
- **トースト:** `bottom-center, rounded-xl` — 成功: 3秒 / エラー: 5秒 / Undo: 15秒
- **削除ボタン:** `bg-red-500 hover:bg-red-600`
- **アイコンコンテナ:** `flex items-center gap-3 shrink-0 h-8 ml-2`
- **hover表示アイコン:** `opacity-0 group-hover:opacity-100 transition-opacity`

---

## ファイル構成（主要）

```
app/charts/
├── page.tsx                    # チャート一覧
├── chart-card.tsx              # ChartCard（Server Component切り出し済み）
├── completed-charts-section.tsx
├── [id]/
│   ├── page.tsx                # チャート詳細
│   ├── project-editor.tsx      # メインエディタ（5500行超！分割が最優先課題）
│   ├── actions.ts              # Server Actions
│   ├── dashboard/page.tsx      # ダッシュボード
│   └── kanban/                 # カンバンビュー
components/
├── action-timeline/
│   ├── TimelineItem.tsx        # Undo トースト実装済み
│   └── CommentInput.tsx        # @mention（フラッシュ修正済み）
├── ui/
│   ├── date-picker.tsx         # 表示位置修正済み
│   └── ...
lib/
├── workspace-search.ts
└── supabase/queries.ts         # server createClient() 統一済み
```

---

## Critical Gotchas（地雷・必読）

### Cursor 使用時の注意（最重要）
- **Cursor が `toast.success(...)` を `toast.success\`...\`` に書き換えることがある** → 修正後必ず確認
- **同様に `revalidatePath(...)` も壊れやすい** → 修正後必ず確認
- 確認コマンド: `grep -n 'toast\.success' file | grep -v 'toast\.success('`
- プロンプトに「**これだけ修正してください。他は変更しないでください。**」と必ず付ける
- 巨大ファイル（project-editor.tsx）での Cursor 修正は暴走リスク高

### Supabase / RLS
- `lib/supabase/queries.ts` は必ず server `createClient()` を使う
- RLS INSERT後のRETURNING問題: INSERT直後のSELECTがRLSに引っかかることがある

### React / Next.js
- `useRef` は再マウントでリセット → 保持したい値は**モジュールレベル変数**
- スクロール位置保存は `useEffect` 内ではなく**ユーザー操作時点**で行う
- `useSearchParams()` は `<Suspense>` ラップ必須
- Next.js 15 では `searchParams` が Promise → `await searchParams`
- `Math.random()` はレンダー中に呼べない（React 19）

### Tailwind v4
- `darkMode: ["class"]` は型エラー → `darkMode: ["class", ".dark"]`

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| CSS が完全に壊れる | `.next` キャッシュ破損 | `rm -rf .next && npm run dev` |
| `next: command not found` | node_modules 破損 | `rm -rf .next node_modules package-lock.json && npm install && npm run dev` |
| `[object Event]` エラー | `toast.success\`...\`` 構文エラー | `grep -n 'toast\.success'` で確認・修正 |
| Server Action not found | `.next` キャッシュ古い | `rm -rf .next && npm run dev` |
| `missing required error components` | キャッシュ深刻破損 | `rm -rf .next .vercel node_modules package-lock.json && npm install && npm run dev` |
| ChunkLoadError | `.next` クリアで解決 | `rm -rf .next && npm run dev` |
| main に push 拒否 | ブランチ保護 | PR + squash merge |
| git branch で `(END)` | less ページャ | `q` を押す |

---

## 最近のマージ履歴（直近）

| PR | 内容 | 日付 |
|---|------|------|
| #81 | 残タスク一括（子チャート→親Action完了・DatePicker・@mention・console.log・revalidatePath修正） | 2026-02-14 |
| #80 | Tension間Action移動UI・D&Dタイトルバグ修正・toast構文修正 | 2026-02-13 |
| #79 | UI polish（window.confirm撲滅・タグアイコン非表示・アイコン間隔調整） | 2026-02-13 |
| #78 | 本番エラー修正（Server Component関数渡し） | 2026-02-12 |
| #53 | ワークスペースへのメンバー招待機能 | 以前 |
| #38 | Action追加後のスクロール問題修正 | 以前 |
| #37 | Supabase クライアント統一（全26関数） | 以前 |

---

## 既知の問題・残タスク

### 最優先
- [ ] **project-editor.tsx 分割**（5500行超）
  - 切り出し候補: SortableActionItem, TensionGroup, ActionSection, ComparisonView, D&Dハンドラー群
  - Context API 導入検討（共有state受け渡し）
- [ ] **変更差分ログ基盤** — `action_history` テーブル設計 → タイトル・日付・担当者変更の自動記録

### D&D Tension間移動（将来課題）
- 現在はドロップダウンUIで代替済み
- 各Tensionが別々の `SortableContext` → Context跨ぎドラッグが認識されない
- 解決案: 単一 `SortableContext` で全Action管理 + `onDragEnd` でTension判定
- ドロップゾーンID: `action-list-${tensionId}`, `tension-${tensionId}`, `action-section-${areaId}`
- `moveActionToTension` API は正しく動作確認済み

### その他
- [ ] #56 Unknown flash bug
- [ ] Home のバーチャート復元
- [ ] Dashboard の期間フィルタ（Q単位）
- [ ] コメント投稿時のUnknownフラッシュ（根本原因未解決）
- [ ] #52 any型の段階的解消
- [ ] #27 メンバーアイコン未実装

---

## Roadmap

### Phase A+: βテスト準備 ✅ ほぼ完了
1. ✅ バグ修正・技術的負債解消
2. ✅ メンバー招待機能
3. ✅ Jam.dev 導入
4. ✅ パフォーマンス改善（DOMContentLoaded 49%改善）
5. ✅ UI/UXリデザイン
6. ✅ window.confirm 全撲滅
7. ✅ Tension間Action移動UI
8. ✅ 子チャート完了→親Action自動完了
9. 🔜 project-editor.tsx 分割
10. 🔜 変更差分ログ基盤

### Phase B: コアUX改善
- D&D Tension間移動（dnd-kit構造変更）
- Tension配下のActionステータスソート/グルーピング
- カンバンボード改善

### Phase C: 実用機能
- チャート共有・権限管理
- ダッシュボード + Slackダイジェスト連携
- マルチチャネル通知システム

### Phase D: 拡張機能
- Action間の依存関係
- i18n（日本語・英語）
- AIコーチ機能
- 外部サービス連携（Slack, GitHub, Notion, ClickUp）

---

## Git ワークフロー

```bash
# ブランチ作成
git checkout main && git pull origin main
git checkout -b fix/branch-name

# 作業 & コミット
git add -A && git commit -m "fix: 説明"

# PR 作成 & マージ
git push origin fix/branch-name
gh pr create --title "fix: タイトル" --body "説明" --base main
gh pr merge --squash

# main に戻る
git checkout main && git pull origin main
```

## Cursor プロンプトテンプレート

```
@ファイルパス を修正してください。他のファイルは変更しないでください。

## 目的
（何を・なぜ修正するか）

## 修正箇所（行番号付近）

変更前:
（現在のコード）

変更後:
（修正後のコード）

これだけ修正してください。他は変更しないでください。
```

---

## Database Schema（主要テーブル）

### workspaces
- id, name, owner_id, created_at
- RLS: メンバーまたはオーナーが閲覧可能

### workspace_members
- id, workspace_id, user_id, role (owner/editor/viewer)

### workspace_invitations
- id, workspace_id, invite_code, created_by, is_active, expires_at

### charts
- id, title, status, workspace_id, parent_action_id, due_date, ...

### actions
- id, title, status, is_completed, chart_id, tension_id, child_chart_id, due_date, assignee, area_id, sort_order, ...

---

## Jam.dev（バグ報告ツール）
- Chrome拡張 + GitHub連携 + Slack連携 設定済み
- Recording Link: https://recorder.jam.dev/XuL8jPv
- βテスター → Recording Link で録画 → Slack (#zenshin-bugs) に送信

---

## セッションログ
詳細な作業記録は `docs/sessions/` に日付別で保存:
- `2026-02-14.md` — PR#78〜#81（本番エラー修正、UI polish、Tension間移動、残タスク一括）
- 過去のセッション → `/mnt/transcripts/` 配下