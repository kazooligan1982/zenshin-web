import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/charts";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // 招待リンク経由でない場合のみワークスペースを作成/取得
    if (!next.startsWith("/invite/")) {
      try {
        await getOrCreateWorkspace();
      } catch (error) {
        console.error("[auth/callback] workspace creation error:", error);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
