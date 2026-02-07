# ZENSHIN CHART — Development Handoff（新チャット貼り付け用）

## TL;DR（今どういう状態？）
- Next.js 15.5.12 で稼働中。テスト基盤（Vitest + Playwright + GHA）は導入済み。
- TypeScript / ESLint のビルド時チェックを有効化済み（NEXT_DISABLE_TYPESCRIPT / NEXT_DISABLE_ESLINT を削除）。
- Supabase RLS でのサイレント失敗を回避するため、`queries.ts` は server `createClient()` に統一済み（#37）。
- **ワークスペースへのメンバー招待機能**を実装済み（招待リンク生成・参加・メンバー一覧）。
- Phase A（バグ修正・技術的負債）はほぼ完了。次はβテスト準備（Jam.dev導入、パフォーマンス改善）へ。

## Versions / Environment
- Next.js: 15.5.12
- Node: v22.x / npm: 10.x
- Supabase + RLS / Tailwind / shadcn

## Dev Workflow（運用）
- GitHub Flow: Issue → Branch → PR → CI → Merge → Auto-deploy
- main ブランチ: ruleset で保護
- 環境構築: brew/gh 導入済み、Vitest + Playwright + GHA 設定済み

## Critical Gotchas（地雷・必読）

### Supabase / RLS
- `lib/supabase/queries.ts` の追加関数は必ず server `createClient()` を使う（RLSサイレント失敗防止）
- #37 で全26関数を server `createClient()` に統一済み（今後も遵守）
- **RLS INSERT後のRETURNING問題**: INSERT直後に自動実行されるSELECT（RETURNING）がRLSに引っかかることがある。例: workspaces作成直後はまだworkspace_membersにレコードがないため、SELECTポリシーで弾かれる → `owner_id = auth.uid()` をSELECTポリシーに追加して対処済み
- `workspace_members.role` は `owner` / `editor` / `viewer` のみ許可（check制約あり）

### React / Next.js
- `useRef` はコンポーネント再マウントでリセットされる。`revalidatePath` / `router.refresh()` 後もデータを保持したい場合は **モジュールレベル変数**（コンポーネント関数の外で `let` 宣言）を使うこと
- `useEffect` はブラウザ描画**後**に実行される → スクロール位置の復元など「描画前に同期実行」が必要な処理には **`useLayoutEffect`** を使う
- `router.refresh()` を避けて**楽観的UI更新**（ローカルState即更新 → サーバー処理 → 失敗時ロールバック）にすると体感速度が大幅改善
- `useEffect([initialChart])` が実行される時点ではスクロール位置はすでに 0 にリセットされている → スクロール位置の保存は `useEffect` 内ではなく**ユーザー操作時点**（`handleXxx` 関数の冒頭）で行う
- `useSearchParams()` を使うコンポーネントは `<Suspense>` でラップ必須（ビルドエラー防止）
- Next.js 15 では `searchParams` が Promise になった → `await searchParams` が必要

### 開発環境
- **node_modules 破損防止**: dev サーバー起動中に `rm -rf .next` を実行すると node_modules が巻き込まれて壊れることがある → 必ず `Ctrl + C` でサーバーを止めてから `rm -rf .next` → `npm run dev` の3ステップで
- 破損時の復旧: `rm -rf node_modules package-lock.json .next && npm install --legacy-peer-deps`

### console.log
- 本番コードに `console.log` は残さない（#10で約300行削除済み）
- `sed` による一括削除は複数行にまたがる `console.log()` を壊すので使わない → Cursorに任せる

## Recently Merged（直近マージ済み）
- #53 ワークスペースへのメンバー招待機能
- #9 ESLint エラー解消 + NEXT_DISABLE_ESLINT 削除
- #8 TypeScript 型エラー解消 + NEXT_DISABLE_TYPESCRIPT 削除
- #10 console.log 削除（約300行）
- #38 Action追加後のスクロール問題修正
- #5 サブチャート削除/アーカイブ修正
- #37 Supabase クライアント統一（全26関数）
- #31 リスト項目内の全集中モード拡大ボタン削除
- #30 コメント投稿者 unknown 表示 + ローディングシフト解消
- #28 コメントバッジ数の即時更新
- #29 エリアタグの付け替えができない
- #26 Vision Date Picker が反映されない
- #25 テスト自動化基盤（Vitest + Playwright + GHA）

## In Progress（着手中）
- なし

## Known Issues / TODO（未着手）
- #52 any型の段階的解消（Phase B以降、ファイルを触るついでに対応）
- #27 メンバーアイコン未実装（権限管理と同時対応予定）
- パフォーマンス問題（ロード時間が長い）→ 優先度高

## Roadmap

### Phase A+: βテスト準備（今週）
1. ✅ バグ修正・技術的負債解消
2. ✅ メンバー招待機能
3. 🔜 Jam.dev 導入（Slack/GitHub Issues連携、AI機能）
4. 🔜 パフォーマンス改善（計測→ボトルネック特定→対処）
5. 🔜 UI/UXリデザイン（モダン＆シンプル、開発者にも一般人にもウケが良い）

### Phase B: コアUX改善
- #13 Areas間でActionをドラッグ&ドロップ移動
- #32 Tension配下のActionをステータスでソート/グルーピング
- #14 カンバンボード改善

### Phase C: 実用機能
- チャートを特定の人と共有
- 閲覧のみ/編集可能の権限管理
- 担当者アイコン表示（#27）

### Phase D: 拡張機能
- #22 Action間の依存関係
- #21 i18n（日本語・英語）
- #24 AIコーチ機能

## Database Schema（主要テーブル）

### workspaces
- id, name, owner_id, created_at
- RLS: メンバーまたはオーナーが閲覧可能、オーナーが作成/更新/削除可能

### workspace_members
- id, workspace_id, user_id, role (owner/editor/viewer)
- RLS: 自分のレコードまたは所属ワークスペースのメンバーを閲覧可能

### workspace_invitations
- id, workspace_id, invite_code, created_by, is_active, expires_at, created_at
- 招待リンク機能で使用

## Local Dev Tips
- サーバーサイド変更後: `Ctrl + C` → `rm -rf .next` → `npm run dev`
- ChunkLoadError: `.next` クリア
- テスト: `localhost:3000` で実施（本番URLで確認しない）
- コミットメッセージ: 日本語 + `fix:` / `feat:` / `refactor:` プレフィックス
- ビルド確認: `npx next build`（TypeScript + ESLint チェックが走る）

## Links
- 仕様書: `ZENSHIN_CHART.md`（root）
- トランスクリプト: `/mnt/transcripts/` 配下

## Jam.dev（バグ報告ツール）

### 概要
βテスターからのフィードバック収集に使用。スクリーンショット/録画 + コンソールログ + デバイス情報を自動取得。

### 設定済み
- ✅ Chrome拡張機能インストール
- ✅ GitHub連携（zenshin-web リポジトリ）
- ✅ Slack連携（U2Cワークスペース）
- ✅ Team プラン（14日間無料トライアル、AI機能有効）
- ✅ Recording Link: https://recorder.jam.dev/XuL8jPv

### 運用フロー

| 用途 | ツール |
|------|--------|
| 自分の開発・デバッグ | Chrome 拡張 |
| βテスターからの報告 | Recording Links → Slack (#zenshin-bugs) |
| Issue 化 | Slack で確認 → 手動で GitHub へ |

### 使い方

**自分で使う場合（Chrome拡張）：**
1. バグを発見 → 拡張機能アイコンをクリック
2. スクショ or 録画を選択
3. 送信先を選択（Slack / GitHub）

**βテスターに依頼する場合：**
1. Recording Link を共有: https://recorder.jam.dev/XuL8jPv
2. テスターがリンクを開いて録画
3. テスターが Slack (#zenshin-bugs) に送信
4. 有用なフィードバックのみ手動で GitHub Issue 化

### AI機能（Jam AI）
- 自動タイトル生成
- 再現手順（repro steps）自動生成
- エラー分析・コード修正提案（JamGPT）