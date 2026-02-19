import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

export async function getUserLocale(): Promise<Locale> {
  // 1. Cookie（即時切替用）
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. user_preferences.locale（ログインユーザー）
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("locale")
      .eq("user_id", user.id)
      .single();
    if (prefs?.locale && locales.includes(prefs.locale as Locale)) {
      return prefs.locale as Locale;
    }
  }

  // 3. ブラウザ言語（Accept-Language）
  const headerStore = await headers();
  const acceptLang = headerStore.get("accept-language") || "";
  const browserLocale = acceptLang.split(",")[0]?.split("-")[0];
  if (browserLocale && locales.includes(browserLocale as Locale)) {
    return browserLocale as Locale;
  }

  // 4. デフォルト
  return defaultLocale;
}
