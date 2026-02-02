"use client";

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

  console.log(`📦 AreaDropZone [${listType}] [${areaName}]:`, {
    dropId: `${listType}-area-${areaId ?? "uncategorized"}`,
    data: { areaId, type: `${listType}-area` },
    itemCount: items.length,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-1 px-3 py-2 transition-all min-h-[40px]",
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
      <div className="flex items-center gap-2 mb-2">
        {areaColor && (
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: areaColor }}
          />
        )}
        <h3 className="font-semibold text-sm text-gray-700">{areaName}</h3>
        <span className="text-xs text-gray-400">({itemCount ?? items.length}件)</span>
      </div>

      {topContent}

      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-[40px]">
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
                  <div className="text-sm font-medium">ここにドロップ</div>
                </div>
              )}
            </>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
