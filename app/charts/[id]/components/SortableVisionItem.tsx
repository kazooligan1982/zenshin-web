"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { GripVertical, FileText, Tag, Plus, Trash2, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/components/member-avatar";
import { useItemInput } from "@/hooks/use-item-input";
import type { VisionItem, Area } from "@/types/chart";
import {
  ICON_BTN_CLASS,
  ICON_CONTAINER_CLASS,
  handleTextKeyboardNavigation,
} from "../editor-utils";

const DatePicker = dynamic(
  () => import("@/components/ui/date-picker").then((mod) => mod.DatePicker),
  { loading: () => null, ssr: false }
);

// SortableItemコンポーネント（Vision用）
// ============================================
// SortableVisionItem コンポーネント
// ============================================
export function SortableVisionItem({
  vision,
  index,
  chartId,
  onUpdate,
  onDelete,
  areas,
  onOpenDetail,
  onOpenFocus,
  onOpenAreaSettings,
  currentUser,
  workspaceMembers = [],
}: {
  vision: VisionItem;
  index: number;
  chartId: string;
  onUpdate: (
    id: string,
    field: "content" | "assignee" | "dueDate" | "targetDate" | "isLocked" | "areaId",
    value: string | boolean | null
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  areas: Area[];
  onOpenDetail: (vision: VisionItem) => void;
  onOpenFocus: (vision: VisionItem, index: number) => void;
  onOpenAreaSettings?: () => void;
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null;
  workspaceMembers?: { id: string; email: string; name?: string; avatar_url?: string }[];
}) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const tTags = useTranslations("tags");
  const tAction = useTranslations("action");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const area = areas.find((a) => a.id === vision.area_id);
  const assigneeMember = workspaceMembers.find((m) => m.email === vision.assignee);
  const visionInput = useItemInput({
    initialValue: vision.content || "",
    onSave: (val) => {
      if (val !== vision.content) {
        onUpdate(vision.id, "content", val);
      }
    },
    index,
    sectionId: "vision",
  });

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: vision.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 py-1.5 px-2 bg-white border-b border-zenshin-navy/5 hover:bg-zenshin-cream/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-zenshin-navy/8 rounded shrink-0"
      >
        <GripVertical className="h-4 w-4 text-zenshin-navy/40" />
      </div>

      <span className="text-[11px] font-mono text-zenshin-teal/50 w-5 text-right shrink-0 leading-5">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        {!visionInput.isEditing ? (
          <span
            id={visionInput.bind.id}
            tabIndex={0}
            role="textbox"
            className={cn(
              "block w-full text-sm leading-5 line-clamp-2 cursor-text min-w-0",
              !visionInput.value && "text-muted-foreground"
            )}
            onClick={() => visionInput.setIsEditing(true)}
            onFocus={() => visionInput.setIsEditing(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                visionInput.setIsEditing(true);
              }
            }}
          >
            {visionInput.value || t("visionIdealPlaceholder")}
          </span>
        ) : (
          <Textarea
            {...visionInput.bind}
            placeholder={t("visionIdealPlaceholder")}
            rows={2}
            className="text-sm flex-1 w-full border-none shadow-none focus-visible:ring-0 bg-transparent keyboard-focusable resize-none leading-5 min-h-0 py-0"
            autoFocus
            onKeyDown={(e) => {
              visionInput.handleKeyDown(e);
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                handleTextKeyboardNavigation(e);
              }
            }}
          />
        )}
      </div>

      <div className={cn(ICON_CONTAINER_CLASS, "flex-none ml-auto")}>
        <div className="w-[110px] relative flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-zenshin-navy/8 hover:ring-1 hover:ring-gray-200">
          <DatePicker
            value={vision.dueDate || null}
            onChange={(date) => onUpdate(vision.id, "dueDate", date || null)}
            className="flex items-center justify-center"
            modal={true}
          />
        </div>
        <div className="w-[36px] flex justify-center">
          <Popover
            open={assigneePopoverOpen}
            onOpenChange={setAssigneePopoverOpen}
          >
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "relative group/avatar cursor-pointer flex items-center justify-center rounded-md transition-all duration-200 p-1 hover:bg-zenshin-navy/8 hover:ring-1 hover:ring-gray-200",
                  vision.assignee
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className={ICON_BTN_CLASS}
                  title={vision.assignee || t("selectAssignee")}
                >
                  {vision.assignee ? (
                    assigneeMember?.avatar_url ? (
                      <img
                        src={assigneeMember.avatar_url}
                        alt={assigneeMember.name || ""}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-zenshin-navy text-white text-[10px] flex items-center justify-center font-medium">
                        {(assigneeMember?.name || assigneeMember?.email || vision.assignee).charAt(0).toUpperCase()}
                      </div>
                    )
                  ) : (
                    <UserPlus className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>
                {vision.assignee && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(vision.id, "assignee", "");
                      setAssigneePopoverOpen(false);
                    }}
                    className="absolute -top-1 -right-1 hidden group-hover/avatar:flex h-4 w-4 items-center justify-center rounded-full bg-gray-500 text-white text-[10px] hover:bg-gray-600 transition-colors z-10"
                    title={t("clearAssignee")}
                  >
                    ×
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="!w-56 max-w-56 max-h-[240px] overflow-y-auto overflow-x-hidden p-2 z-50"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-0.5">
                {/* 担当者なし */}
                <button
                  className={cn(
                    "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-gray-100 transition-colors",
                    !vision.assignee && "bg-gray-100"
                  )}
                  onClick={() => {
                    onUpdate(vision.id, "assignee", "");
                    setAssigneePopoverOpen(false);
                  }}
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {!vision.assignee && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="w-5 h-5 rounded-full bg-gray-300 shrink-0" />
                  <span className="text-gray-500">{tAction("noAssignee")}</span>
                </button>

                {/* メンバー一覧 */}
                {(workspaceMembers.length > 0 ? workspaceMembers : (currentUser ? [{ id: currentUser.id, name: currentUser.name, email: currentUser.email, avatar_url: currentUser.avatar_url }] : [])).map((member) => {
                  const isSelected = vision.assignee === member.email;
                  const displayName = member.name || member.email || "?";
                  return (
                    <button
                      key={member.id}
                      className={cn(
                        "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-gray-100 transition-colors",
                        isSelected && "bg-gray-100"
                      )}
                      onClick={() => {
                        onUpdate(vision.id, "assignee", member.email);
                        setAssigneePopoverOpen(false);
                      }}
                    >
                      <span className="w-4 h-4 flex items-center justify-center shrink-0">
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <MemberAvatar name={displayName} avatarUrl={member.avatar_url} />
                      <span className="truncate min-w-0 flex-1 text-left">{displayName}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="relative flex items-center justify-center h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className={ICON_BTN_CLASS}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(vision);
            }}
            title={t("detailHistory")}
          >
            <FileText size={16} />
          </Button>
          {(vision.comment_count ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-zenshin-teal px-1 text-[10px] font-bold text-white ring-2 ring-white pointer-events-none z-10">
              {(vision.comment_count ?? 0) > 99 ? "99+" : vision.comment_count ?? 0}
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
              onPointerDown={(e) => e.stopPropagation()}
              title={t("changeTag")}
            >
              <Tag size={16} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              {areas.map((area) => (
                <Button
                  key={area.id}
                  variant={vision.area_id === area.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-xs h-7"
                  onClick={() => onUpdate(vision.id, "areaId", area.id)}
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: area.color }}
                  />
                  {area.name}
                </Button>
              ))}
              <Button
                variant={!vision.area_id ? "secondary" : "ghost"}
                className="w-full justify-start text-xs h-7 text-muted-foreground"
                onClick={() => onUpdate(vision.id, "areaId", null)}
              >
                {tTags("untagged")}
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
                    {tTags("addNew")}
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
              onDelete(vision.id);
            }}
            title={tc("delete")}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
