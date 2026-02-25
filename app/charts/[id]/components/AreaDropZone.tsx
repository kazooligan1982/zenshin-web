"use client";

import { useTranslations } from "next-intl";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AreaDropZoneProps<T extends { id: string }> {
  areaId: string | null;
  areaName: string;
  areaColor?: string;
  items: T[];
  itemCount?: number;
  renderItem: (item: T, index: number) => ReactNode;
  listType: "vision" | "reality" | "tension" | "action";
  topContent?: ReactNode;
  showEmptyState?: boolean;
}

export function AreaDropZone<T extends { id: string }>({
  areaId,
  areaName,
  areaColor,
  items,
  itemCount,
  renderItem,
  listType,
  topContent,
  showEmptyState = true,
}: AreaDropZoneProps<T>) {
  const t = useTranslations("editor");
  const { setNodeRef, isOver } = useDroppable({
    id: `${listType}-area-${areaId ?? "uncategorized"}`,
    data: {
      areaId,
      type: `${listType}-area`,
    },
  });

  const { active } = useDndContext();
  const isDragging = !!active;
  const sortableIds = items.map((item) => item.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-0 transition-all min-h-[40px]",
        isDragging && isOver && "bg-blue-50 border-2 border-blue-400 shadow-md",
        isDragging && !isOver && "border-2 border-dashed border-gray-200",
        !isDragging && "border border-transparent"
      )}
      style={{
        ...(isOver && areaColor && {
          backgroundColor: `${areaColor}15`,
          borderColor: areaColor,
        }),
      }}
    >
      <div className="flex items-center mb-2">
        <span
          className="w-3 h-3 rounded-full mr-2 shrink-0"
          style={{ backgroundColor: areaColor || "#9CA3AF" }}
        />
        <span className="text-sm font-bold text-zenshin-navy">{areaName}</span>
        <span className="ml-2 text-xs text-zenshin-navy/40">{t("itemCount", { count: itemCount ?? items.length })}</span>
      </div>

      {topContent}

      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-[40px] space-y-1">
          {items.length > 0 ? (
            items.map((item, index) => renderItem(item, index))
          ) : (
            <>
              {showEmptyState && isDragging && (
                <div
                  className={cn(
                    "border-2 border-dashed rounded p-6 text-center transition-colors",
                    isOver
                      ? "border-blue-400 bg-blue-50 text-blue-600"
                      : "border-gray-300 text-gray-400"
                  )}
                >
                  <div className="text-sm font-medium">{t("dropHere")}</div>
                </div>
              )}
            </>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
