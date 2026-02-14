"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, FileText, Tag, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useItemInput } from "@/hooks/use-item-input";
import type { RealityItem, Area } from "@/types/chart";
import {
  ICON_BTN_CLASS,
  ICON_CONTAINER_CLASS,
  handleTextKeyboardNavigation,
} from "../editor-utils";

// SortableItemコンポーネント（Reality用）
export function SortableRealityItem({
  reality,
  index,
  highlightedItemId,
  handleUpdateReality,
  handleDeleteReality,
  areas,
  onOpenDetail,
  onOpenFocus,
  onOpenAreaSettings,
  currentUser,
  disabled = false,
}: {
  reality: RealityItem;
  index: number;
  highlightedItemId: string | null;
  handleUpdateReality: (id: string, field: "content" | "isLocked" | "areaId" | "dueDate", value: string | boolean | null) => Promise<void>;
  handleDeleteReality: (id: string) => Promise<void>;
  areas: Area[];
  onOpenDetail: (reality: RealityItem) => void;
  onOpenFocus: (reality: RealityItem, index: number) => void;
  onOpenAreaSettings?: () => void;
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null;
  disabled?: boolean;
}) {
  const area = areas.find((a) => a.id === reality.area_id);
  const realityInput = useItemInput({
    initialValue: reality.content || "",
    onSave: (val) => {
      if (val !== reality.content) {
        handleUpdateReality(reality.id, "content", val);
      }
    },
    index,
    sectionId: "reality",
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingThis,
  } = useSortable({
    id: reality.id,
    disabled,
    data: {
      type: "reality-item",
      areaId: reality.area_id || null,
    },
  });

  const style = {
    transform: disabled ? undefined : CSS.Transform.toString(transform),
    transition: disabled ? undefined : transition,
    opacity: isDraggingThis ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex w-full max-w-full items-center gap-2 py-3 px-2 bg-white border-b border-zenshin-navy/5 hover:bg-zenshin-cream/50 transition-colors ${
        highlightedItemId === reality.id ? "bg-white" : ""
      }`}
    >
      <div className="flex shrink-0 items-center gap-2">
        {disabled ? (
          <div className="w-4 h-6" />
        ) : (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing h-6 flex items-center text-zenshin-navy/40 opacity-0 group-hover:opacity-100"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <span className="text-[11px] font-mono text-zenshin-orange/50 w-5 text-right shrink-0 leading-6">
          {index + 1}
        </span>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <Input
          {...realityInput.bind}
          placeholder="今の現実を書く..."
          className="text-sm flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent keyboard-focusable"
          disabled={reality.isLocked}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              handleTextKeyboardNavigation(e);
              return;
            }
            realityInput.handleKeyDown(e);
          }}
        />
      </div>
      <div className={cn(ICON_CONTAINER_CLASS, "flex-none ml-auto")}>
        <div className="flex items-center gap-2 text-xs text-zenshin-navy/40">
          <span>
            {format(new Date(reality.createdAt), "MM/dd HH:mm", { locale: ja })}
          </span>
        </div>
        {reality.created_by &&
          currentUser &&
          reality.created_by === currentUser.id && (
            <div
              className="flex items-center justify-center rounded-md p-1"
              title={`記述者: ${currentUser.name || currentUser.email}`}
            >
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name || ""}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-medium">
                  {(currentUser.name || currentUser.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
          )}
        <div className="relative flex items-center justify-center h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className={ICON_BTN_CLASS}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(reality);
            }}
            title="詳細/履歴"
          >
            <FileText size={16} />
          </Button>
          {(reality.comment_count ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-zenshin-teal px-1 text-[10px] font-bold text-white ring-2 ring-white pointer-events-none z-10">
              {(reality.comment_count ?? 0) > 99 ? "99+" : reality.comment_count ?? 0}
            </span>
          )}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={`${ICON_BTN_CLASS} opacity-0 group-hover:opacity-100 transition-opacity`}
              onClick={(e) => e.stopPropagation()}
              title="タグを変更"
            >
              <Tag size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              {areas.map((area) => (
                <Button
                  key={area.id}
                  variant={reality.area_id === area.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-xs h-7"
                  onClick={() => handleUpdateReality(reality.id, "areaId", area.id)}
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: area.color }}
                  />
                  {area.name}
                </Button>
              ))}
              <Button
                variant={!reality.area_id ? "secondary" : "ghost"}
                className="w-full justify-start text-xs h-7 text-muted-foreground"
                onClick={() => handleUpdateReality(reality.id, "areaId", null)}
              >
                未分類
              </Button>
              {onOpenAreaSettings && (
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-500 hover:text-zenshin-navy hover:bg-gray-50 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAreaSettings();
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    新しいタグを追加
                  </button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-zenshin-navy/8 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zenshin-navy/40 hover:text-gray-600 hover:bg-transparent rounded-full p-0 shrink-0 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteReality(reality.id);
            }}
            title="削除"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
