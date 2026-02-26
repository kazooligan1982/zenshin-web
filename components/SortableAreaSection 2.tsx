"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Area } from "@/types/chart";

interface SortableAreaSectionProps {
  areaId: string;
  area: Area;
  itemCount: number;
  children: ReactNode;
  /** Optional custom header content (e.g. translated item count). Defaults to "{itemCount}件". */
  headerContent?: ReactNode;
  className?: string;
}

/** Sortable area section for area reordering. Renders area header with GripVertical (except uncategorized). */
export function SortableAreaSection({
  areaId,
  area,
  itemCount,
  children,
  headerContent,
  className,
}: SortableAreaSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `area-${areaId}`,
    data: { type: "area", areaId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("space-y-2", isDragging && "opacity-50", className)}
    >
      <div className="flex items-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded text-zenshin-navy/40 hover:text-zenshin-navy hover:bg-zenshin-navy/8 transition-colors"
          aria-label="ドラッグして並び替え"
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: area.color || "#9CA3AF" }}
        />
        <span className="text-sm font-bold text-zenshin-navy">{area.name}</span>
        {headerContent ?? (
          <span className="ml-2 text-xs text-zenshin-navy/40">
            {itemCount}件
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
