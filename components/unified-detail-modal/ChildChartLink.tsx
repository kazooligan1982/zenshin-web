"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";

interface ChildChartLinkProps {
  childChartId: string;
  childChartTitle?: string | null;
  workspaceId?: string;
}

export function ChildChartLink({
  childChartId,
  childChartTitle,
  workspaceId,
}: ChildChartLinkProps) {
  const t = useTranslations("modal");
  const href = workspaceId
    ? `/workspaces/${workspaceId}/charts/${childChartId}`
    : `/charts/${childChartId}`;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("childChart")}</h3>
      <Link
        href={href}
        className="flex items-center gap-2 text-zenshin-teal hover:underline"
      >
        <BarChart3 className="h-4 w-4 shrink-0" />
        {childChartTitle || t("subChart")}
      </Link>
    </div>
  );
}
