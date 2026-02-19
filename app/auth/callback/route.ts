import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  getOrCreateWorkspace,
  getPreferredWorkspaceId,
  getUserWorkspaces,
} from "@/lib/workspace";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  let next = requestUrl.searchParams.get("next") || "/charts";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // 招待リンク経由でない場合のみリダイレクト先を決定
    if (!next.startsWith("/invite/")) {
      try {
        if (next === "/charts") {
          const preferredId = await getPreferredWorkspaceId();
          if (preferredId) {
            next = `/workspaces/${preferredId}/charts`;
          } else {
            const workspaces = await getUserWorkspaces();
            if (workspaces.length === 0) {
              const workspaceId = await getOrCreateWorkspace();
              next = `/workspaces/${workspaceId}/charts`;
            } else {
              next = "/workspaces";
            }
          }
        }
      } catch (error) {
        console.error("[auth/callback] workspace resolution error:", error);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
