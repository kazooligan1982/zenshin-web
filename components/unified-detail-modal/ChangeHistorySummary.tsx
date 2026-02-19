"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ItemType } from "./ModalHeader";

interface ChartHistoryEntry {
  id: string;
  created_at: string;
  event_type: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  old_value_display?: string | null;
  new_value_display?: string | null;
  user_id?: string | null;
  changed_by_name?: string | null;
}

interface ChangeHistorySummaryProps {
  chartId: string;
  itemType: ItemType;
  itemId: string;
  locale?: string;
}

function formatHistoryValue(field: string, value: string): string {
  if (!value || value === "—" || value === "") return "";
  if (field === "dueDate" || field === "due_date") {
    try {
      const date = new Date(value);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}/${m}/${d}`;
    } catch {
      return value;
    }
  }
  return value;
}

function formatHistorySummary(entry: ChartHistoryEntry, t: (key: string, params?: Record<string, string>) => string): string {
  if (entry.event_type === "created") {
    return t("itemCreated");
  }
  if (entry.event_type === "deleted") {
    return t("itemDeleted");
  }
  const field = entry.field ?? "";
  const rawNew = entry.new_value_display ?? entry.new_value ?? "";
  const rawOld = entry.old_value_display ?? entry.old_value ?? "";
  const newVal = formatHistoryValue(field, rawNew) || rawNew;
  const oldVal = formatHistoryValue(field, rawOld) || rawOld;
  const fallback = "—";
  if (field === "content" || field === "description" || field === "title") {
    return t("contentChanged");
  }
  if (field === "assignee") {
    const display = !rawNew || rawNew === "—" || rawNew === "" ? t("noAssignee") : newVal;
    return t("assigneeChanged", { name: display });
  }
  if (field === "status") {
    return t("statusChanged", { old: oldVal || fallback, new: newVal || fallback });
  }
  if (field === "dueDate" || field === "due_date") {
    return t("dueDateChanged", { date: newVal || fallback });
  }
  if (field === "areaId" || field === "area_id") {
    return t("categoryChanged", { name: newVal || fallback });
  }
  return `${field}: ${oldVal || fallback} → ${newVal || fallback}`;
}

export function ChangeHistorySummary({
  chartId,
  itemType,
  itemId,
  locale = "ja",
}: ChangeHistorySummaryProps) {
  const t = useTranslations("modal");
  const [history, setHistory] = useState<ChartHistoryEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const entityType = itemType;
  const displayLimit = isExpanded ? 50 : 5;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/charts/${chartId}/chart-history?entityType=${entityType}&entityId=${itemId}&limit=${displayLimit}`
        );
        const data: ChartHistoryEntry[] = res.ok ? await res.json() : [];
        if (!cancelled) setHistory(data);
      } catch (e) {
        if (!cancelled) console.error("[ChangeHistorySummary] fetch error:", e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [chartId, itemId, entityType, displayLimit]);

  const dateFnsLocale = locale === "ja" ? ja : undefined;

  return (
    <div className="mt-4 w-full">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("changeHistory")}</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
      ) : (
        <div className="space-y-1">
          {history.map((entry) => {
            const changedByName = entry.changed_by_name ?? t("unknownUser");
            const description = formatHistorySummary(entry, t);
            return (
              <div
                key={entry.id}
                className="text-sm text-muted-foreground truncate overflow-hidden text-ellipsis whitespace-nowrap"
              >
                <span className="text-xs tabular-nums">
                  {format(new Date(entry.created_at), "M/d HH:mm", { locale: dateFnsLocale })}
                </span>
                {" "}
                <span>{changedByName}</span>
                {" — "}
                <span>{description}</span>
              </div>
            );
          })}
          {!isExpanded && history.length >= 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-muted-foreground"
              onClick={() => setIsExpanded(true)}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              {t("showAll", { count: history.length })}
            </Button>
          )}
          {isExpanded && history.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-muted-foreground"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronUp className="h-4 w-4 mr-1" />
              {t("collapseHistory")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
