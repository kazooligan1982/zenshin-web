"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, Check, Search, Workflow } from "lucide-react";
import {
  getActionDependencies,
  searchChartActions,
  addActionDependency,
  removeActionDependency,
  type ActionDependencyItem,
} from "@/app/charts/[id]/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ActionDependenciesProps {
  chartId: string;
  actionId: string;
  onNavigate?: (itemType: "action", itemId: string) => void;
  onActivityChange?: () => void;
}

function StatusBadge({ status }: { status: string | null }) {
  const t = useTranslations("modal");
  const s = status ?? "todo";
  const labels: Record<string, string> = {
    todo: t("statusTodo"),
    in_progress: t("statusInProgress"),
    done: t("statusDone"),
    pending: t("statusPending"),
    canceled: t("statusCanceled"),
  };
  return (
    <span className="text-xs text-muted-foreground">
      ({labels[s] ?? s})
    </span>
  );
}

function DependencyItem({
  item,
  onNavigate,
  onRemove,
}: {
  item: ActionDependencyItem;
  onNavigate?: (itemType: "action", itemId: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("modal");
  const isCompleted = item.isCompleted === true || item.status === "done" || item.status === "canceled";

  const content = (
    <span className="flex items-center gap-2 truncate flex-1 min-w-0">
      {isCompleted && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
      <span
        className={isCompleted ? "line-through text-muted-foreground" : ""}
        title={item.title}
      >
        {item.title || "(無題)"}
      </span>
      <StatusBadge status={item.status} />
    </span>
  );

  return (
    <li className="flex items-center gap-2 group">
      <button
        type="button"
        onClick={() => onNavigate?.("action", item.actionId)}
        className="flex-1 min-w-0 text-left p-1.5 rounded-md hover:bg-gray-100 text-sm flex items-center gap-2 transition-colors cursor-pointer"
      >
        {content}
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="p-1 rounded hover:bg-zenshin-navy/10 text-zenshin-navy/40 hover:text-zenshin-navy transition-colors shrink-0 opacity-0 group-hover:opacity-100"
        title={t("removeLink")}
        aria-label={t("removeLink")}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

export function ActionDependencies({
  chartId,
  actionId,
  onNavigate,
  onActivityChange,
}: ActionDependenciesProps) {
  const t = useTranslations("modal");
  const tToast = useTranslations("toast");
  const [data, setData] = useState<{
    blockedBy: ActionDependencyItem[];
    blocking: ActionDependencyItem[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"blocked_by" | "blocking" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; status: string | null }[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getActionDependencies(chartId, actionId);
      setData(result);
    } catch (error) {
      console.error("[ActionDependencies] load error:", error);
      setData({ blockedBy: [], blocking: [] });
    } finally {
      setIsLoading(false);
    }
  }, [chartId, actionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!addMode) {
      setSearchResults([]);
      setSearchQuery("");
      return;
    }
    const timer = setTimeout(async () => {
      const results = await searchChartActions(chartId, searchQuery);
      setSearchResults(results.filter((a) => a.id !== actionId));
    }, 200);
    return () => clearTimeout(timer);
  }, [chartId, actionId, addMode, searchQuery]);

  const handleAdd = async (relatedActionId: string) => {
    if (!addMode) return;
    setIsAdding(true);
    try {
      await addActionDependency(chartId, actionId, relatedActionId, addMode);
      toast.success(t("dependencyAdded"));
      setAddMode(null);
      setAddOpen(false);
      load();
      onActivityChange?.();
    } catch (error) {
      console.error("[ActionDependencies] add error:", error);
      toast.error(tToast("error") || "エラーが発生しました");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (dependencyId: string) => {
    try {
      await removeActionDependency(dependencyId, actionId);
      toast.success(t("dependencyRemoved"));
      load();
      onActivityChange?.();
    } catch (error) {
      console.error("[ActionDependencies] remove error:", error);
      toast.error(tToast("error") || "エラーが発生しました");
    }
  };

  const hasIncompleteBlockers =
    data && data.blockedBy.some((b) => !b.isCompleted && b.status !== "done" && b.status !== "canceled");
  const hasAny = data && (data.blockedBy.length > 0 || data.blocking.length > 0);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-500">{t("dependencies")}</h3>
        {hasIncompleteBlockers && (
          <span
            className="w-2 h-2 rounded-full bg-orange-500 shrink-0"
            title={t("blockedBy")}
          />
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <>
            <div className="space-y-4">
              {data!.blockedBy.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t("blockedBy")}</h4>
                  <ul className="space-y-0.5">
                    {data!.blockedBy.map((item) => (
                      <DependencyItem
                        key={item.id}
                        item={item}
                        onNavigate={onNavigate}
                        onRemove={handleRemove}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {data!.blocking.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{t("blocking")}</h4>
                  <ul className="space-y-0.5">
                    {data!.blocking.map((item) => (
                      <DependencyItem
                        key={item.id}
                        item={item}
                        onNavigate={onNavigate}
                        onRemove={handleRemove}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {!hasAny && (
              <p className="text-sm text-gray-400 italic">{t("noDependencies")}</p>
            )}

            <Popover open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddMode(null); }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-zenshin-navy/20"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t("addDependency")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                {!addMode ? (
                  <div className="p-1">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zenshin-navy/5"
                      onClick={() => setAddMode("blocked_by")}
                    >
                      {t("blockedBy")}
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zenshin-navy/5"
                      onClick={() => setAddMode("blocking")}
                    >
                      {t("blocking")}
                    </button>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t("selectAction")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto space-y-0.5">
                      {searchResults.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-zenshin-navy/5 text-sm truncate disabled:opacity-50"
                            onClick={() => handleAdd(a.id)}
                            disabled={isAdding}
                          >
                            {a.title || "(無題)"}
                          </button>
                        </li>
                      ))}
                      {searchResults.length === 0 && searchQuery && (
                        <li className="px-2 py-2 text-sm text-muted-foreground">
                          {t("loading")}
                        </li>
                      )}
                    </ul>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setAddMode(null)}
                    >
                      ← {t("close")}
                    </button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>
    </div>
  );
}
