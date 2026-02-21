"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Target, Search, Zap, Play } from "lucide-react";
import { getItemRelations, type ItemRelation } from "@/app/charts/[id]/actions";
import type { ItemType } from "./ModalHeader";

// Vision: Target, Reality: Search, Tension: Zap, Action: Play
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  vision: Target,
  reality: Search,
  tension: Zap,
  action: Play,
};

const TYPE_COLORS: Record<string, string> = {
  vision: "text-teal-600",
  reality: "text-orange-600",
  tension: "text-zenshin-navy",
  action: "text-blue-600",
};

interface ItemRelationsProps {
  chartId: string;
  itemType: ItemType;
  itemId: string;
  onNavigate?: (itemType: ItemType, itemId: string) => void;
}

function RelationItem({
  rel,
  onNavigate,
}: {
  rel: ItemRelation;
  onNavigate?: (itemType: ItemType, itemId: string) => void;
}) {
  const Icon = TYPE_ICONS[rel.type] ?? Zap;
  const colorClass = TYPE_COLORS[rel.type] ?? "text-muted-foreground";
  // Modal supports vision, reality, action. Tension modal not implemented yet.
  const isNavigable = ["vision", "reality", "action"].includes(rel.type) && !!onNavigate;

  const handleClick = () => {
    if (isNavigable && onNavigate) {
      onNavigate(rel.type as ItemType, rel.id);
    }
  };

  const content = (
    <span className="flex items-center gap-2 truncate">
      <Icon className={`w-4 h-4 shrink-0 ${colorClass}`} />
      <span className="truncate" title={rel.title}>
        {rel.title || "(無題)"}
      </span>
    </span>
  );

  if (isNavigable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-zenshin-navy/5 text-sm flex items-center gap-2 transition-colors cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="px-2.5 py-1.5 text-sm flex items-center gap-2 text-muted-foreground">
      {content}
    </div>
  );
}

export function ItemRelations({
  chartId,
  itemType,
  itemId,
  onNavigate,
}: ItemRelationsProps) {
  const t = useTranslations("modal");
  const [data, setData] = useState<{ references: ItemRelation[]; referencedBy: ItemRelation[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getItemRelations(chartId, itemType, itemId);
      setData(result);
    } catch (error) {
      console.error("[ItemRelations] load error:", error);
      setData({ references: [], referencedBy: [] });
    } finally {
      setIsLoading(false);
    }
  }, [chartId, itemType, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  const hasAny = data && (data.references.length > 0 || data.referencedBy.length > 0);

  return (
    <div className="w-full space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{t("relations")}</h3>

      <div className="rounded-lg border border-zenshin-navy/10 bg-zenshin-cream/30 p-3 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : !hasAny ? (
          <p className="text-sm text-muted-foreground">
            {t("noRelations")} — {t("noRelationsHint")}
          </p>
        ) : (
          <div className="space-y-4">
            {data!.references.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t("references")}</h4>
                <ul className="space-y-0.5">
                  {data!.references.map((r) => (
                    <li key={`ref-${r.type}-${r.id}`}>
                      <RelationItem rel={r} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data!.referencedBy.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t("referencedBy")}</h4>
                <ul className="space-y-0.5">
                  {data!.referencedBy.map((r) => (
                    <li key={`refby-${r.type}-${r.id}`}>
                      <RelationItem rel={r} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
