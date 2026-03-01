import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { locales, type Locale } from "@/i18n/config";

export async function PATCH(request: Request) {
  const { locale } = (await request.json()) as { locale?: string };
  if (!locale || !locales.includes(locale as Locale)) {
    return NextResponse.json(
      { error: "Invalid locale" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        locale,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
