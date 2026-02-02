import { supabase } from "@/lib/supabase";

// すべてのチャートを取得（プロジェクト一覧用）
export async function getAllCharts() {
  if (!supabase) {
    console.warn("[getAllCharts] Supabase client not initialized.");
    console.warn("[getAllCharts] URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "設定済み" : "未設定");
    console.warn("[getAllCharts] Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "設定済み" : "未設定");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("charts")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[getAllCharts] Error fetching charts:", error);
      console.error("[getAllCharts] Error code:", error.code);
      console.error("[getAllCharts] Error message:", error.message);
      console.error("[getAllCharts] Error details:", error.details);
      console.error("[getAllCharts] Error hint:", error.hint);
      
      // よくあるエラーの説明
      if (error.code === "PGRST116") {
        console.error("[getAllCharts] ⚠️ テーブル 'charts' が見つかりません。supabase/schema.sql を実行してください。");
      } else if (error.code === "42501") {
        console.error("[getAllCharts] ⚠️ 権限エラーです。RLSポリシーを確認してください。");
      } else if (error.code === "PGRST301") {
        console.error("[getAllCharts] ⚠️ リクエストが拒否されました。APIキーが正しいか確認してください。");
      }
      
      return [];
    }

    console.log("[getAllCharts] ✅ 成功:", data?.length || 0, "件のチャートを取得");
    return data || [];
  } catch (error) {
    console.error("[getAllCharts] 予期しないエラー:", error);
    return [];
  }
}

