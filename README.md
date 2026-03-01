# ZENSHIN CHART

思考の構造化を支援するチャートツールです。  
Vision / Reality / Tension / Action を一貫した流れで整理します。

## ドキュメント
- 設計思想 / 仕様 / 構造: `ZENSHIN_CHART.md`
- セットアップ手順: `QUICK_START.md`
- Supabase手順: `SUPABASE_SETUP.md`

## 開発環境の起動
```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## 構成の要点
- Next.js (App Router)
- Supabase (DB / Auth)
- 主要UI: `app/charts/[id]/project-editor.tsx`

## 備考
詳細な仕様・設計背景は `ZENSHIN_CHART.md` を参照してください。
