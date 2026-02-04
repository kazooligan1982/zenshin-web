import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getOrCreateWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    try {
      await getOrCreateWorkspace();
    } catch (error) {
      console.error("[auth/callback] workspace creation error:", error);
    }
  }

  return NextResponse.redirect(new URL("/charts", requestUrl.origin));
}
