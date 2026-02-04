# ZENSHIN CHART — Development Handoff（新チャット貼り付け用）

## TL;DR（今どういう状態？）
- Next.js 15.5.7 で稼働中。テスト基盤（Vitest + Playwright + GHA）は導入済み。
- Supabase RLS でのサイレント失敗を回避するため、`queries.ts` は server `createClient()` に統一済み（#37）。
- 直近はコメント系と全集中モードUI、エリアタグの反映系を修正済み。
- 現在のブロッカーは #5（サブチャート削除/アーカイブ不整合）。

## Versions / Environment
- Next.js: 15.5.7
- Node / npm: TODO
- その他: Supabase + RLS / Tailwind / shadcn

## Dev Workflow（運用）
- GitHub Flow: Issue → Branch → PR → CI → Merge → Auto-deploy
- main ブランチ: ruleset で保護
- 環境構築: brew/gh 導入済み、Vitest + Playwright + GHA 設定済み

## Critical Gotchas（地雷・必読）
- Supabase `lib/supabase/queries.ts` の追加関数は必ず server `createClient()` を使う（RLSサイレント失敗防止）
- #37 で全26関数を server `createClient()` に統一済み（今後も遵守）

## Recently Merged（直近マージ済み）
- #25 テスト自動化基盤（Vitest + Playwright + GHA）
- #26 Vision Date Picker が反映されない
- #29 エリアタグの付け替えができない
- #37 Supabase クライアント統一（全26関数）
- #28 コメントバッジ数の即時更新
- #30 コメント投稿者 unknown 表示 + ローディングシフト解消
- #31 リスト項目内の全集中モード拡大ボタン削除

## In Progress（着手中）
- #5 サブチャート削除/アーカイブが機能しない
  - 削除: 外部キー制約で弾かれる可能性大
  - アーカイブ: `archived_at` は更新されるが親 Action の `child_chart_id` が残り表示が消えない

## Known Issues / TODO（未着手）
- #27 メンバーアイコン未実装（権限管理 #18 と同時対応予定）
- 新規Action追加後に Tension 領域先頭にスクロールしてしまう（Issue作成済み）

## Next Steps（次にやること）
1. #5 を解決
2. #18 権限管理（workspaces/members/chart_permissions）
3. #27 メンバーアイコン

## Local Dev Tips
- サーバーサイド変更後: `rm -rf .next && npm run dev`
- ChunkLoadError: `.next` クリア
- テスト: `localhost:3000` で実施（本番URLで確認しない）
- コミットメッセージ: 日本語 + `fix:` / `feat:` / `refactor:` プレフィックス

## Links
- 仕様書: `ZENSHIN_CHART.md`（root）/ TODO: `docs/ZENSHIN_CHART.md` に移動
