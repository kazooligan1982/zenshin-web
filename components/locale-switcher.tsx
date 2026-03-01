"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import type { Locale } from "@/i18n/config";

interface LocaleSwitcherProps {
  expanded?: boolean;
  className?: string;
}

export function LocaleSwitcher({ expanded = true, className }: LocaleSwitcherProps) {
  const t = useTranslations("settings");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextLocale: Locale = locale === "ja" ? "en" : "ja";
  const switchLabel = locale === "ja" ? t("switchToEnglish") : t("switchToJapanese");

  async function switchLocale(newLocale: Locale) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;

    fetch("/api/user/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    }).catch(() => {});

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={() => switchLocale(nextLocale)}
      disabled={isPending}
      title={switchLabel}
      className={className ?? "flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 w-full justify-center"}
    >
      <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
      {expanded && (
        <span className="truncate">
          {isPending ? "..." : switchLabel}
        </span>
      )}
    </button>
  );
}
