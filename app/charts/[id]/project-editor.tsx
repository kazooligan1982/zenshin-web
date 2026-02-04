"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDndContext,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Home,
  Target,
  AlertCircle,
  AlertTriangle,
  Telescope,
  Plus,
  ChevronRight,
  Trash2,
  X,
  Check,
  Zap,
  Maximize2,
  Minimize2,
  Calendar as CalendarIcon,
  UserPlus,
  User,
  GripVertical,
  Camera,
  Settings,
  MoreVertical,
  FileText,
  Tag,
  Circle,
  Clock,
  CheckCircle2,
  Pause,
  XCircle,
  Archive,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import TextareaAutosize from "react-textarea-autosize";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  Chart,
  Tension,
  ActionPlan,
  BreadcrumbItem,
  VisionItem,
  RealityItem,
  TensionStatus,
  Area,
} from "@/types/chart";
import {
  addVision,
  updateVisionItem,
  removeVision,
  addReality,
  updateRealityItem,
  removeReality,
  addTension,
  updateTensionItem,
  removeTension,
  toggleVisionRealityLinkAction,
  addActionPlan,
  updateActionPlanItem,
  removeActionPlan,
  telescopeActionPlan,
  getActionProgress,
  fetchChart,
  updateListOrder,
  updateVisionArea,
  updateRealityArea,
  updateTensionArea,
  updateActionArea,
  moveActionToTension,
  createSnapshot,
  updateChartData,
  addArea,
  updateAreaItem,
  removeArea,
  checkIncompleteTelescopeActions,
} from "./actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { AreaTagEditor } from "@/components/area-tag-editor";
import { TagManager } from "@/components/tag/TagManager";
import { AreaDropZone } from "./components/AreaDropZone";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// モジュールレベル変数（コンポーネント再マウントでもリセットされない）
let _pendingScrollRestore: number | null = null;
import { UndoNotification } from "@/components/undo-notification";
import { ItemDetailPanel } from "@/components/item-detail-panel";
import { FocusModeModal } from "@/components/focus-mode-modal";
import { fetchItemHistory, addItemHistoryEntry } from "./actions";
import { archiveChart, restoreChart, deleteChart } from "@/app/charts/actions";
import type { HistoryItem } from "@/types/chart";
import { useItemInput } from "@/hooks/use-item-input";

type StructuredTension = Tension & {
  actions: ActionPlan[];
};

type AreaGroup = {
  area: Area;
  tensions: StructuredTension[];
  orphanedActions: ActionPlan[];
};

type UncategorizedGroup = {
  tensions: StructuredTension[];
  orphanedActions: ActionPlan[];
};

type StructuredData = {
  categorized: AreaGroup[];
  uncategorized: UncategorizedGroup;
};

const TEXT_CLASSES = cn(
  "w-full",
  "text-sm",
  "text-gray-700",
  "font-normal",
  "antialiased",
  "bg-transparent",
  "border-0",
  "outline-none",
  "appearance-none",
  "focus:ring-0",
  "focus:outline-none"
);

const TEXT_FIXED_STYLE: CSSProperties = {
  lineHeight: "1.5rem",
  padding: 0,
  margin: 0,
  boxSizing: "border-box",
};

const TEXTAREA_CLASSES = cn(TEXT_CLASSES, "resize-none");

const VIEW_CLASSES = cn(
  TEXT_CLASSES,
  "cursor-text",
  "truncate",
  "whitespace-nowrap"
);

const iconButtonClass =
  "p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors";
const ICON_BTN_CLASS =
  "h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors p-0";
const ICON_CONTAINER_CLASS = "flex items-center gap-1 shrink-0 h-8 ml-2";

const navigateFocus = (
  currentElement: HTMLInputElement | HTMLTextAreaElement,
  direction: "prev" | "next"
) => {
  const scope = currentElement.closest("[data-nav-scope]");
  if (!scope) return false;

  const inputs = Array.from(
    scope.querySelectorAll(".keyboard-focusable")
  ) as Array<HTMLInputElement | HTMLTextAreaElement>;
  const currentIndex = inputs.indexOf(currentElement);
  if (currentIndex === -1) return false;

  if (direction === "prev" && currentIndex > 0) {
    const target = inputs[currentIndex - 1];
    target.focus();
    setTimeout(() => {
      target.setSelectionRange(target.value.length, target.value.length);
    }, 0);
    return true;
  }

  if (direction === "next" && currentIndex < inputs.length - 1) {
    const target = inputs[currentIndex + 1];
    target.focus();
    setTimeout(() => {
      target.setSelectionRange(0, 0);
    }, 0);
    return true;
  }

  return false;
};

const handleKeyboardNavigation = (e: React.KeyboardEvent) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  if (e.nativeEvent.isComposing) return;

  const element = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
  const scope = element.closest("[data-nav-scope]");

  if (!scope) {
    return;
  }

  const inputs = Array.from(scope.querySelectorAll(".keyboard-focusable"));
  const currentIndex = inputs.indexOf(element);
  const selectionStart = element.selectionStart ?? 0;
  const valueLength = element.value?.length ?? 0;

  if (e.key === "ArrowUp") {
    if (selectionStart === 0 && currentIndex > 0) {
      e.preventDefault();
      (inputs[currentIndex - 1] as HTMLElement).focus();
    } else {
    }
  }

  if (e.key === "ArrowDown") {
    if (selectionStart === valueLength && currentIndex < inputs.length - 1) {
      e.preventDefault();
      (inputs[currentIndex + 1] as HTMLElement).focus();
    } else {
    }
  }
};

const handleTextKeyboardNavigation = (e: React.KeyboardEvent) => {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  if (e.nativeEvent.isComposing) return;

  const element = e.currentTarget as HTMLTextAreaElement | HTMLInputElement;
  const scope = element.closest("[data-nav-scope]");
  if (!scope) return;

  const inputs = Array.from(
    scope.querySelectorAll(".keyboard-focusable")
  ) as Array<HTMLInputElement | HTMLTextAreaElement>;
  const currentIndex = inputs.indexOf(element);
  const selectionStart = element.selectionStart ?? 0;
  const valueLength = element.value?.length ?? 0;

  if (e.key === "ArrowDown") {
    if (selectionStart < valueLength) {
      e.preventDefault();
      element.setSelectionRange(valueLength, valueLength);
    } else if (currentIndex < inputs.length - 1) {
      e.preventDefault();
      const nextInput = inputs[currentIndex + 1];
      nextInput.focus();
      setTimeout(() => {
        nextInput.setSelectionRange(0, 0);
      }, 0);
    }
  }

  if (e.key === "ArrowUp") {
    if (selectionStart > 0) {
      e.preventDefault();
      element.setSelectionRange(0, 0);
    } else if (currentIndex > 0) {
      e.preventDefault();
      const prevInput = inputs[currentIndex - 1];
      prevInput.focus();
      setTimeout(() => {
        const len = prevInput.value?.length ?? 0;
        prevInput.setSelectionRange(len, len);
      }, 0);
    }
  }
};

const customCollisionDetection = (args: Parameters<typeof closestCenter>[0]) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;

  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) return rectCollisions;

  return closestCenter(args);
};

const splitItemsByDate = <T extends { id: string }>(
  items: T[],
  getDate: (item: T) => string | null | undefined
) => {
  const datedItems = items
    .filter((item) => !!getDate(item))
    .sort(
      (a, b) =>
        new Date(getDate(b)!).getTime() - new Date(getDate(a)!).getTime()
    );
  const undatedItems = items
    .filter((item) => !getDate(item))
    .sort(
      (a, b) =>
        ((a as any).sort_order ?? 0) - ((b as any).sort_order ?? 0)
    );
  const indexById = new Map(
    [...datedItems, ...undatedItems].map((item, index) => [item.id, index])
  );
  return { datedItems, undatedItems, indexById };
};
 

interface ProjectEditorProps {
  initialChart: Chart;
  chartId: string;
  currentUserId: string;
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null;
}


// SortableItemコンポーネント（Vision用）
// ============================================
// SortableVisionItem コンポーネント
// ============================================
function SortableVisionItem({
  vision,
  index,
  chartId,
  onUpdate,
  onDelete,
  areas,
  onOpenDetail,
  onOpenFocus,
  currentUser,
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
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null;
}) {
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const area = areas.find((a) => a.id === vision.area_id);
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
      className="group flex items-center gap-2 py-3 px-2 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded shrink-0"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-600 border-blue-200 text-[10px] h-6 inline-flex items-center px-2 shrink-0"
          style={{ minHeight: "1.5rem" }}
        >
          V-{String(index + 1).padStart(2, "0")}
        </Badge>
        {area && (
          <Badge
            variant="outline"
            className="text-[10px] h-6 inline-flex items-center px-2 shrink-0"
            style={{
              minHeight: "1.5rem",
              backgroundColor: `${area.color}20`,
              borderColor: area.color,
              color: area.color,
            }}
          >
            {area.name}
          </Badge>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Input
          {...visionInput.bind}
          placeholder="Visionを記述..."
          className="text-sm flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent keyboard-focusable"
          onKeyDown={(e) => {
            visionInput.handleKeyDown(e);
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              handleTextKeyboardNavigation(e);
            }
          }}
        />
      </div>

      <div className={cn(ICON_CONTAINER_CLASS, "flex-none ml-auto")}>
        <div className="w-[110px] relative flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200">
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
                  "relative group/avatar cursor-pointer flex items-center justify-center rounded-md transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200",
                  vision.assignee
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className={ICON_BTN_CLASS}
                  title={vision.assignee || "担当者を選択"}
                >
                  {vision.assignee ? (
                    currentUser?.avatar_url &&
                    vision.assignee === currentUser.email ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.name || ""}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-medium">
                        {vision.assignee.charAt(0).toUpperCase()}
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
                    title="担当者を解除"
                  >
                    ×
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-40 p-2 z-50"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                {currentUser && (
                  <Button
                    variant={vision.assignee === currentUser.email ? "secondary" : "ghost"}
                    className="w-full justify-start text-xs h-7 gap-2"
                    onClick={() => {
                      onUpdate(vision.id, "assignee", currentUser.email);
                      setAssigneePopoverOpen(false);
                    }}
                  >
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.name || ""}
                        className="h-4 w-4 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-medium flex-shrink-0">
                        {(currentUser.name || currentUser.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    {currentUser.name || currentUser.email}
                  </Button>
                )}
                {vision.assignee && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-xs h-7 text-muted-foreground"
                    onClick={() => {
                      onUpdate(vision.id, "assignee", "");
                      setAssigneePopoverOpen(false);
                    }}
                  >
                    クリア
                  </Button>
                )}
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
            title="詳細/履歴"
          >
            <FileText size={16} />
          </Button>
          {(vision.comment_count ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white ring-2 ring-white pointer-events-none z-10">
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
                未分類
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-transparent rounded-full p-0 shrink-0 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(vision.id);
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

// SortableItemコンポーネント（Reality用）
function SortableRealityItem({
  reality,
  index,
  highlightedItemId,
  handleUpdateReality,
  handleDeleteReality,
  areas,
  onOpenDetail,
  onOpenFocus,
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
      className={`group flex w-full max-w-full items-center gap-2 py-3 px-2 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors ${
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
            className="cursor-grab active:cursor-grabbing h-6 flex items-center text-gray-400 opacity-0 group-hover:opacity-100"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] h-6 inline-flex items-center px-2 shrink-0"
            style={{ minHeight: "1.5rem" }}
          >
            R-{String(index + 1).padStart(2, "0")}
          </Badge>
          {area && (
            <Badge
              variant="outline"
              className="text-[10px] h-6 inline-flex items-center px-2 shrink-0"
              style={{
                minHeight: "1.5rem",
                backgroundColor: `${area.color}20`,
                borderColor: area.color,
                color: area.color,
              }}
            >
              {area.name}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <TextareaAutosize
          {...realityInput.bind}
          placeholder="Realityを記述..."
          minRows={1}
          maxRows={5}
          className={cn(TEXTAREA_CLASSES, "keyboard-focusable")}
          style={TEXT_FIXED_STYLE}
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
        <div className="flex items-center gap-2 text-xs text-gray-400">
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
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white ring-2 ring-white pointer-events-none z-10">
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
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-transparent rounded-full p-0 shrink-0 transition-opacity"
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

// SortableItemコンポーネント（Action用）
const getActionStatusIcon = (
  status: ActionPlan["status"],
  isCompleted?: boolean
) => {
  if (isCompleted || status === "done") {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
  switch (status) {
    case "in_progress":
      return <Clock className="w-4 h-4 text-blue-500" />;
    case "pending":
      return <Pause className="w-4 h-4 text-yellow-500" />;
    case "canceled":
      return <XCircle className="w-4 h-4 text-gray-400" />;
    default:
      return <Circle className="w-4 h-4 text-gray-400" />;
  }
};

const getActionStatusLabel = (
  status: ActionPlan["status"],
  isCompleted?: boolean
) => {
  if (isCompleted || status === "done") return "完了";
  switch (status) {
    case "in_progress":
      return "進行中";
    case "pending":
      return "保留";
    case "canceled":
      return "中止";
    default:
      return "未着手";
  }
};

function SortableActionItem({
  actionPlan,
  actionIndex,
  tensionId,
  parentTensionAreaId,
  hideAreaBadge = false,
  availableTensions,
  isCompleted,
  handleUpdateActionPlan,
  handleDeleteActionPlan,
  handleTelescopeClick,
  telescopingActionId,
  currentUser,
  areas,
  chartId,
  onOpenDetailPanel,
  disabled = false,
}: {
  actionPlan: ActionPlan;
  actionIndex: number;
  tensionId: string | null;
  parentTensionAreaId?: string | null;
  hideAreaBadge?: boolean;
  availableTensions?: Tension[];
  isCompleted: boolean;
  handleUpdateActionPlan: (
    tensionId: string | null,
    actionId: string,
    field:
      | "title"
      | "dueDate"
      | "assignee"
      | "status"
      | "hasSubChart"
      | "subChartId"
      | "childChartId"
      | "isCompleted"
      | "status"
      | "description"
      | "areaId",
    value: string | boolean | null,
    options?: { removeFromTension?: boolean }
  ) => Promise<void>;
  handleDeleteActionPlan: (tensionId: string | null, actionId: string) => Promise<void>;
  handleTelescopeClick: (actionPlan: ActionPlan, tensionId: string | null) => Promise<void>;
  telescopingActionId: string | null;
  currentUser: { id?: string; email: string; name?: string; avatar_url?: string | null } | null;
  areas: Area[];
  chartId: string;
  onOpenDetailPanel: (itemType: "action", itemId: string, itemContent: string) => void;
  disabled?: boolean;
}) {
  const actionInput = useItemInput({
    initialValue: actionPlan.title || "",
    onSave: (val) => {
      if (val !== actionPlan.title) {
        handleUpdateActionPlan(tensionId, actionPlan.id, "title", val);
      }
    },
    index: actionIndex,
    sectionId: `action-${tensionId || "loose"}`,
  });
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDraggingThis,
  } = useSortable({
    id: actionPlan.id,
    disabled,
    data: {
      type: "action-item",
      areaId: actionPlan.area_id || null,
    },
  });

  const style = {
    transform: disabled ? undefined : CSS.Transform.toString(transform),
    transition: disabled ? undefined : transition,
    opacity: isDraggingThis ? 0.5 : 1,
  };
  const actionArea = areas.find((area) => area.id === actionPlan.area_id) || null;
  const actionAreaName = actionArea?.name ?? "未分類";
  const actionAreaColor = actionArea?.color ?? "#9CA3AF";
  const isDifferentFromParent =
    !hideAreaBadge &&
    parentTensionAreaId !== undefined &&
    (actionPlan.area_id ?? null) !== (parentTensionAreaId ?? null);
  const isOrphaned = !tensionId && !!availableTensions?.length;
  const [isMovingToTension, setIsMovingToTension] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [incompleteDialog, setIncompleteDialog] = useState<{
    isOpen: boolean;
    actionId: string;
    actionTitle: string;
    newStatus: string;
    incompleteCount: number;
    incompleteActions: { id: string; title: string; status: string }[];
  } | null>(null);
  const currentStatus =
    actionPlan.status || (isCompleted ? "done" : "todo");
  const router = useRouter();
  const handleChangeArea = async (newAreaId: string | null) => {
    if (tensionId) {
      const shouldRemove = window.confirm(
        "このActionを別のカテゴリーに変更すると、親Tensionと異なるカテゴリーになります。\n\n" +
          "【OK】: Tensionから切り離して未割り当てに移動\n" +
          "【キャンセル】: カテゴリーのみ変更(Tension内に残す)"
      );
      await handleUpdateActionPlan(tensionId, actionPlan.id, "areaId", newAreaId, {
        removeFromTension: shouldRemove,
      });
    } else {
      await handleUpdateActionPlan(null, actionPlan.id, "areaId", newAreaId, {
        removeFromTension: false,
      });
    }
  };

  const handleMoveToTension = async (targetTensionId: string) => {
    setIsMovingToTension(true);
    const result = await moveActionToTension(actionPlan.id, targetTensionId, chartId);
    if (!result.success) {
      toast.error("Tensionへの追加に失敗しました");
      setIsMovingToTension(false);
      return;
    }
    router.refresh();
    setIsMovingToTension(false);
  };

  const executeStatusChange = async (nextStatus: string) => {
    await handleUpdateActionPlan(tensionId, actionPlan.id, "status", nextStatus);
  };

  const handleStatusChange = async (nextStatus: string) => {
    if (nextStatus === currentStatus) return;
    if (
      (nextStatus === "done" || nextStatus === "canceled") &&
      actionPlan.childChartId
    ) {
      try {
        const result = await checkIncompleteTelescopeActions(actionPlan.id);
        if (result.hasIncomplete) {
          setIncompleteDialog({
            isOpen: true,
            actionId: actionPlan.id,
            actionTitle: actionPlan.title || "(無題)",
            newStatus: nextStatus,
            incompleteCount: result.incompleteCount,
            incompleteActions: result.incompleteActions,
          });
          return;
        }
      } catch (error) {
        console.error("Failed to check incomplete actions:", error);
      }
    }

    await executeStatusChange(nextStatus);
  };

  const handleStatusSelect = async (nextStatus: string) => {
    setIsStatusOpen(false);
    await handleStatusChange(nextStatus);
  };

  const handleConfirmStatusChange = async () => {
    if (!incompleteDialog) return;
    await executeStatusChange(incompleteDialog.newStatus);
    setIncompleteDialog(null);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-2 p-2 bg-white border-b border-gray-100/50 hover:bg-muted/50 transition-colors ${
          actionIndex === 0 ? "border-t border-gray-100/50" : ""
        } ${isCompleted ? "opacity-60" : ""}`}
      >
      {disabled ? (
        <div className="mr-1 w-4 h-4" />
      ) : (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-1">
          <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500" />
        </div>
      )}
      <div
        className="flex items-center"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Popover open={isStatusOpen} onOpenChange={setIsStatusOpen}>
          <PopoverTrigger asChild>
            <button
              className="shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="ステータスを変更"
            >
              {getActionStatusIcon(actionPlan.status || null, isCompleted)}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1 z-50" align="start">
            {[
              { value: "todo", label: "未着手", icon: <Circle className="w-4 h-4 text-gray-400" /> },
              { value: "in_progress", label: "進行中", icon: <Clock className="w-4 h-4 text-blue-500" /> },
              { value: "done", label: "完了", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
              { value: "pending", label: "保留", icon: <Pause className="w-4 h-4 text-yellow-500" /> },
              { value: "canceled", label: "中止", icon: <XCircle className="w-4 h-4 text-gray-400" /> },
            ].map((statusOption) => (
              <button
              key={statusOption.value}
                onClick={() => {
                  handleStatusSelect(statusOption.value);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100",
                  currentStatus === statusOption.value && "bg-gray-100"
                )}
              >
                {statusOption.icon}
                {statusOption.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <Badge
        variant="outline"
        className={`bg-purple-100 text-purple-700 border-purple-300 text-[10px] h-6 inline-flex items-center px-2 shrink-0 ${
          isCompleted ? "opacity-60" : ""
        }`}
        style={{ minHeight: "1.5rem" }}
      >
        A-{String(actionIndex + 1).padStart(2, "0")}
      </Badge>
      {!hideAreaBadge && (
        <Badge
          variant="outline"
          className={`text-[10px] h-6 inline-flex items-center px-2 shrink-0 ${
            isDifferentFromParent ? "ring-2 ring-yellow-400" : ""
          }`}
          style={{
            minHeight: "1.5rem",
            backgroundColor: `${actionAreaColor}20`,
            borderColor: actionAreaColor,
            color: actionAreaColor,
          }}
          title={isDifferentFromParent ? "親Tensionと異なるカテゴリ" : undefined}
        >
          {actionAreaName}
        </Badge>
      )}
      <Input
        {...actionInput.bind}
        placeholder="Actionを記述..."
        className={`text-sm flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent keyboard-focusable ${
          isCompleted ? "line-through text-gray-400" : ""
        }`}
        onKeyDown={(e) => {
          actionInput.handleKeyDown(e);
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            handleKeyboardNavigation(e);
          }
        }}
      />
      <div className={cn(ICON_CONTAINER_CLASS, isCompleted ? "opacity-60" : "")}>
        {isOrphaned && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 flex items-center justify-center rounded-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                disabled={isMovingToTension}
                title="Tensionに追加"
              >
                <Plus size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-gray-500">
                Tensionに追加:
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTensions?.map((tension) => (
                <DropdownMenuItem
                  key={tension.id}
                  onClick={() => handleMoveToTension(tension.id)}
                  disabled={isMovingToTension}
                >
                  <span className="truncate">
                    {tension.title || "(タイトルなし)"}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div
          className="w-[110px] relative flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <DatePicker
            value={actionPlan.dueDate || null}
            onChange={(date) => {
              handleUpdateActionPlan(tensionId, actionPlan.id, "dueDate", date || "");
            }}
            className="flex items-center justify-center"
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
                  "relative group/avatar cursor-pointer flex items-center justify-center rounded-md transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200",
                  actionPlan.assignee
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className={ICON_BTN_CLASS}
                  title={actionPlan.assignee || "担当者を選択"}
                >
                {actionPlan.assignee ? (
                  currentUser?.avatar_url &&
                  actionPlan.assignee === currentUser.email ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name || ""}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-medium">
                      {actionPlan.assignee.charAt(0).toUpperCase()}
                    </div>
                  )
                ) : (
                  <UserPlus className="w-3 h-3 text-muted-foreground" />
                )}
                </Button>
                {actionPlan.assignee && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateActionPlan(tensionId, actionPlan.id, "assignee", "");
                      setAssigneePopoverOpen(false);
                    }}
                    className="absolute -top-1 -right-1 hidden group-hover/avatar:flex h-4 w-4 items-center justify-center rounded-full bg-gray-500 text-white text-[10px] hover:bg-gray-600 transition-colors z-10"
                    title="担当者を解除"
                  >
                    ×
                  </button>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent
              className="w-40 p-2 z-50"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                {currentUser && (
                  <Button
                    variant={actionPlan.assignee === currentUser.email ? "secondary" : "ghost"}
                    className="w-full justify-start text-xs h-7 gap-2"
                    onClick={() => {
                      handleUpdateActionPlan(
                        tensionId,
                        actionPlan.id,
                        "assignee",
                        currentUser.email
                      );
                      setAssigneePopoverOpen(false);
                    }}
                  >
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.name || ""}
                        className="h-4 w-4 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-purple-500 text-white text-[8px] flex items-center justify-center font-medium flex-shrink-0">
                        {(currentUser.name || currentUser.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    {currentUser.name || currentUser.email}
                  </Button>
                )}
                {actionPlan.assignee && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-xs h-7 text-muted-foreground"
                    onClick={() => {
                      handleUpdateActionPlan(tensionId, actionPlan.id, "assignee", "");
                      setAssigneePopoverOpen(false);
                    }}
                  >
                    クリア
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className={cn(ICON_CONTAINER_CLASS, "ml-0")}>
          <div className="relative flex items-center justify-center h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className={ICON_BTN_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetailPanel("action", actionPlan.id, actionInput.value);
              }}
              title="詳細/履歴"
            >
              <FileText size={16} />
            </Button>
            {(actionPlan.comment_count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white ring-2 ring-white pointer-events-none z-10">
                {(actionPlan.comment_count ?? 0) > 99 ? "99+" : actionPlan.comment_count ?? 0}
              </span>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`${ICON_BTN_CLASS} opacity-0 group-hover:opacity-100 transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
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
                    variant={actionPlan.area_id === area.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-xs h-7"
                    onClick={() => handleChangeArea(area.id)}
                  >
                    {area.name}
                  </Button>
                ))}
                <Button
                  variant={actionPlan.area_id ? "ghost" : "secondary"}
                  className="w-full justify-start text-xs h-7 text-muted-foreground"
                  onClick={() => handleChangeArea(null)}
                >
                  未分類
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <div
            className={cn(
              "flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1",
              actionPlan.childChartId || actionPlan.hasSubChart
                ? "bg-purple-100 ring-1 ring-purple-300"
                : "hover:bg-gray-100 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100"
            )}
          >
            <Button
              onClick={() => handleTelescopeClick(actionPlan, tensionId)}
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 transition-opacity hover:bg-transparent rounded-full p-0",
                actionPlan.childChartId || actionPlan.hasSubChart
                  ? "text-purple-600 opacity-100"
                  : "text-gray-400 hover:text-gray-600"
              )}
              disabled={telescopingActionId === actionPlan.id}
              title={
                actionPlan.childChartId || actionPlan.hasSubChart
                  ? "チャート化済み（クリックで移動）"
                  : "テレスコープ（チャート化）"
              }
            >
              {telescopingActionId === actionPlan.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Telescope size={16} />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-transparent rounded-full p-0 shrink-0 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  title="削除"
                >
                  <Trash2 size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Actionを削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は取り消せません。本当に削除してもよろしいですか？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                    No
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteActionPlan(tensionId, actionPlan.id);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      </div>
      <AlertDialog
        open={incompleteDialog?.isOpen || false}
        onOpenChange={(open) => !open && setIncompleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              未完了のアクションがあります
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  「{incompleteDialog?.actionTitle}」のテレスコープ先に、
                  <span className="font-bold text-red-600 mx-1">
                    {incompleteDialog?.incompleteCount}件
                  </span>
                  の未完了アクションがあります。
                </p>
                {incompleteDialog?.incompleteActions &&
                  incompleteDialog.incompleteActions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">
                        未完了のアクション:
                      </p>
                      <ul className="space-y-1">
                        {incompleteDialog.incompleteActions.map((action) => (
                          <li
                            key={action.id}
                            className="text-sm text-gray-700 flex items-center gap-2"
                          >
                            <Circle className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate">{action.title}</span>
                          </li>
                        ))}
                        {incompleteDialog.incompleteCount > 5 && (
                          <li className="text-xs text-gray-500 pl-5">
                            他 {incompleteDialog.incompleteCount - 5}件...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                <p className="text-sm">
                  このまま「
                  {incompleteDialog?.newStatus === "done" ? "完了" : "中止"}
                  」にしますか？
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusChange}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {incompleteDialog?.newStatus === "done"
                ? "完了にする"
                : "中止にする"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TensionGroup({
  tension,
  tensionIndex,
  areaId,
  handleUpdateTension,
  handleDeleteTension,
  handleUpdateActionPlan,
  handleDeleteActionPlan,
  handleTelescopeClick,
  telescopingActionId,
  currentUser,
  areas,
  chartId,
  onOpenDetailPanel,
  onAddAction,
  isSubmittingAction,
  isOverlay = false,
  onOpenFocus,
}: {
  tension: Tension;
  tensionIndex: number;
  areaId: string | null;
  handleUpdateTension: (tensionId: string, field: "title" | "description" | "status", value: string | TensionStatus) => void;
  handleDeleteTension: (tensionId: string) => void;
  handleUpdateActionPlan: (
    tensionId: string | null,
    actionId: string,
    field: "title" | "dueDate" | "assignee" | "status" | "hasSubChart" | "subChartId" | "childChartId" | "isCompleted" | "description" | "areaId",
    value: string | boolean | null,
    options?: { removeFromTension?: boolean }
  ) => Promise<void>;
  handleDeleteActionPlan: (tensionId: string | null, actionId: string) => Promise<void>;
  handleTelescopeClick: (actionPlan: ActionPlan, tensionId: string | null) => Promise<void>;
  telescopingActionId: string | null;
  currentUser: { id?: string; email: string; name?: string } | null;
  areas: Area[];
  chartId: string;
  onOpenDetailPanel: (itemType: "action", itemId: string, itemContent: string) => void;
  onAddAction: (tensionId: string | null, title: string, areaId?: string | null) => void;
  isSubmittingAction: Record<string, boolean>;
  isOverlay?: boolean;
  onOpenFocus: (tension: Tension) => void;
}) {
  const [isMovingArea, setIsMovingArea] = useState(false);
  const tensionTitleInput = useItemInput({
    initialValue: tension.title || "",
    onSave: (val) => {
      if (val !== (tension.title || "")) {
        handleUpdateTension(tension.id, "title", val);
      }
    },
    index: tensionIndex,
    sectionId: `tension-${areaId || "uncategorized"}`,
  });
  const newActionInput = useItemInput({
    initialValue: "",
    onSave: () => {},
    sectionId: `new-action-${tension.id}`,
  });
  const { active } = useDndContext();
  const isDragging = !!active;
  const { setNodeRef: setActionListRef, isOver: isActionListOver } = useDroppable({
    id: `action-list-${tension.id}`,
    data: { areaId: areaId ?? null, type: "action-area" },
  });
  const { datedItems, undatedItems, indexById } = splitItemsByDate(
    tension.actionPlans,
    (action) => action.dueDate || null
  );
  const { setNodeRef } = useDroppable({
    id: `tension-${tension.id}`,
    data: {
      type: "tension",
      areaId: tension.area_id ?? areaId ?? null,
    },
  });

  const handleNewActionKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const title = newActionInput.value.trim();
      if (title) {
        onAddAction(tension.id, title, areaId);
        newActionInput.setValue("");
      }
      return;
    }
    newActionInput.handleKeyDown(e);
  };

  const handleMoveTensionArea = async (targetAreaId: string | null) => {
    setIsMovingArea(true);
    const result = await updateTensionArea(tension.id, targetAreaId, chartId, true);
    if (result.success) {
      const areaName =
        targetAreaId !== null ? areas.find((area) => area.id === targetAreaId)?.name : "未分類";
      toast.success(`${areaName ?? "未分類"} に移動しました`);
    } else {
      toast.error("移動に失敗しました");
    }
    setIsMovingArea(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group border border-gray-200 rounded-md bg-white transition-all",
        isOverlay && "shadow-2xl border-blue-500 ring-2 ring-blue-200"
      )}
    >
      <div className="flex items-center justify-between gap-4 px-3 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Input
            {...tensionTitleInput.bind}
            placeholder="Tensionタイトルを入力..."
            className="text-base font-semibold bg-transparent border-none focus-visible:ring-0 flex-1 min-w-0 keyboard-focusable"
            onKeyDown={(e) => {
              tensionTitleInput.handleKeyDown(e);
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                handleKeyboardNavigation(e);
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded transition-all hover:bg-gray-200 opacity-0 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isMovingArea}
                title="カテゴリーを変更"
              >
                <Tag className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleMoveTensionArea(null)}
                disabled={!tension.area_id}
              >
                未分類に移動
              </DropdownMenuItem>
              {areas.map((area) => (
                <DropdownMenuItem
                  key={area.id}
                  onClick={() => handleMoveTensionArea(area.id)}
                  disabled={tension.area_id === area.id}
                >
                  <span
                    className="mr-2 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: area.color }}
                  />
                  {area.name}
                  {tension.area_id === area.id ? " ✓" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                title="削除"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Tensionを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。本当に削除してもよろしいですか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>No</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTension(tension.id);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {!isOverlay && (
        <div className="px-3 py-2">
        {datedItems.length > 0 && (
          <SortableContext
            items={datedItems.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {datedItems.map((action) => (
              <SortableActionItem
                key={action.id}
                actionPlan={action}
                actionIndex={indexById.get(action.id) ?? 0}
                tensionId={tension.id}
                parentTensionAreaId={tension.area_id ?? null}
                hideAreaBadge
                isCompleted={action.isCompleted || false}
                handleUpdateActionPlan={handleUpdateActionPlan}
                handleDeleteActionPlan={handleDeleteActionPlan}
                handleTelescopeClick={handleTelescopeClick}
                telescopingActionId={telescopingActionId}
                currentUser={currentUser}
                areas={areas}
                chartId={chartId}
                onOpenDetailPanel={onOpenDetailPanel}
                disabled
              />
            ))}
          </SortableContext>
        )}
        {datedItems.length > 0 && undatedItems.length > 0 && (
          <div className="h-px bg-gray-100 my-3" />
        )}
        <div ref={setActionListRef} className="min-h-[40px]">
          <SortableContext
            items={undatedItems.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div id={`action-list-container-${tension.id}`} className="space-y-0">
              {undatedItems.length === 0 ? (
                isDragging ? (
                  <div
                    className={`border-2 border-dashed rounded p-6 text-center transition-colors ${
                      isActionListOver
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    <div className="text-sm font-medium">ここにドロップ</div>
                  </div>
                ) : null
              ) : (
                undatedItems.map((action) => (
                  <SortableActionItem
                    key={action.id}
                    actionPlan={action}
                    actionIndex={indexById.get(action.id) ?? 0}
                    tensionId={tension.id}
                    parentTensionAreaId={tension.area_id ?? null}
                    hideAreaBadge
                    isCompleted={action.isCompleted || false}
                    handleUpdateActionPlan={handleUpdateActionPlan}
                    handleDeleteActionPlan={handleDeleteActionPlan}
                    handleTelescopeClick={handleTelescopeClick}
                    telescopingActionId={telescopingActionId}
                    currentUser={currentUser}
                    areas={areas}
                    chartId={chartId}
                    onOpenDetailPanel={onOpenDetailPanel}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </div>
        <div className="p-2 border-t border-gray-100/50 bg-white">
          <div className="flex gap-2">
            <Input
              {...newActionInput.bind}
              onKeyDown={(e) => {
                handleNewActionKeyDown(e);
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  handleKeyboardNavigation(e);
                }
              }}
              placeholder="＋ このTensionにActionを追加"
              className="text-sm h-7 flex-1 keyboard-focusable"
              disabled={isSubmittingAction[tension.id]}
            />
            <Button
              onClick={() => {
                const title = newActionInput.value.trim();
                if (title) {
                  onAddAction(tension.id, title, areaId);
                  newActionInput.setValue("");
                }
              }}
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={!newActionInput.value.trim() || isSubmittingAction[tension.id]}
            >
              {isSubmittingAction[tension.id] ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function ActionSection({
  areaId,
  areaName,
  areaColor,
  tensionsInSection,
  looseActions,
  allTensions,
  handleUpdateActionPlan,
  handleDeleteActionPlan,
  handleTelescopeClick,
  telescopingActionId,
  currentUser,
  areas,
  chartId,
  onOpenDetailPanel,
  getSortedAndNumberedActions,
  isSubmittingAction,
  onAddAction,
  onAddTension,
  visions,
  realities,
  toggleVisionRealityLink,
  setHighlightedItemId,
  handleUpdateTension,
  handleDeleteTension,
  onOpenFocus,
}: {
  areaId: string | null;
  areaName: string;
  areaColor: string;
  tensionsInSection: Tension[];
  looseActions: ActionPlan[];
  allTensions: Tension[];
  handleUpdateActionPlan: (
    tensionId: string | null,
    actionId: string,
    field: "title" | "dueDate" | "assignee" | "status" | "hasSubChart" | "subChartId" | "childChartId" | "isCompleted" | "description" | "areaId",
    value: string | boolean | null
  ) => Promise<void>;
  handleDeleteActionPlan: (tensionId: string | null, actionId: string) => Promise<void>;
  handleTelescopeClick: (actionPlan: ActionPlan, tensionId: string | null) => Promise<void>;
  telescopingActionId: string | null;
  currentUser: { id?: string; email: string; name?: string } | null;
  areas: Area[];
  chartId: string;
  onOpenDetailPanel: (itemType: "action", itemId: string, itemContent: string) => void;
  getSortedAndNumberedActions: (actions: ActionPlan[]) => Array<{ action: ActionPlan; number: number }>;
  isSubmittingAction: Record<string, boolean>;
  onAddAction: (tensionId: string | null, title: string, areaId?: string | null) => void;
  onAddTension: (title: string, areaId?: string | null) => void;
  visions: VisionItem[];
  realities: RealityItem[];
  toggleVisionRealityLink: (tensionId: string, type: "vision" | "reality", id: string) => void;
  setHighlightedItemId: (id: string | null) => void;
  handleUpdateTension: (tensionId: string, field: "title" | "description" | "status", value: string | TensionStatus) => void;
  handleDeleteTension: (tensionId: string) => void;
  onOpenFocus: (tension: Tension) => void;
}) {
  const sectionKey = areaId || "uncategorized";
  const sectionId = `action-section-${sectionKey}`;
  const { setNodeRef, isOver } = useDroppable({
    id: sectionId,
    data: { areaId: areaId || null, type: "action-area" },
  });
  const { active } = useDndContext();
  const isDragging = !!active;
  const newTensionInput = useItemInput({
    initialValue: "",
    onSave: () => {},
    sectionId: `new-tension-${sectionKey}`,
  });
  const tensionActionCount = tensionsInSection.reduce(
    (sum, tension) => sum + tension.actionPlans.length,
    0
  );
  const sortedTensionsInSection = [...tensionsInSection].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const availableTensions = allTensions;

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 rounded-lg transition-all ${
        isDragging && isOver
          ? "bg-blue-50 border-2 border-blue-400 shadow-md"
          : isDragging
            ? "border-2 border-dashed border-gray-200"
            : "border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1">
        <Badge
          variant="outline"
          className="text-xs font-semibold h-6 inline-flex items-center px-2"
          style={{
            minHeight: "1.5rem",
            backgroundColor: `${areaColor}20`,
            borderColor: areaColor,
            color: areaColor,
          }}
        >
          {areaName}
        </Badge>
        <span className="text-xs text-muted-foreground">({tensionActionCount + looseActions.length}件)</span>
      </div>

      <div className="space-y-4 px-2">
        <div>
          <Input
            {...newTensionInput.bind}
            onKeyDown={async (e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const title = newTensionInput.value.trim();
                if (title) {
                  await onAddTension(title, areaId);
                  newTensionInput.setValue("");
                }
                return;
              }
              newTensionInput.handleKeyDown(e);
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                handleKeyboardNavigation(e);
              }
            }}
            placeholder={`「${areaName}」におけるTension(課題)を入力...`}
            className="h-8 text-sm keyboard-focusable"
          />
        </div>

        <div className="space-y-4">
          {sortedTensionsInSection.map((tension, tensionIndex) => (
            <TensionGroup
              key={tension.id}
              tension={tension}
              tensionIndex={tensionIndex}
              areaId={areaId}
              handleUpdateTension={handleUpdateTension}
              handleDeleteTension={handleDeleteTension}
              handleUpdateActionPlan={handleUpdateActionPlan}
              handleDeleteActionPlan={handleDeleteActionPlan}
              handleTelescopeClick={handleTelescopeClick}
              telescopingActionId={telescopingActionId}
              currentUser={currentUser}
              areas={areas}
              chartId={chartId}
              onOpenDetailPanel={onOpenDetailPanel}
              onAddAction={onAddAction}
              isSubmittingAction={isSubmittingAction}
              onOpenFocus={onOpenFocus}
            />
          ))}
        </div>
      </div>

      {looseActions.length > 0 && <div className="border-t border-gray-200 my-6" />}

      {/* 未割り当てのAction */}
      {(() => {
        const { datedItems, undatedItems, indexById } = splitItemsByDate(
          looseActions,
          (action) => action.dueDate || null
        );

        const shouldHideAreaBadge = (actionAreaId: string | null) =>
          (actionAreaId ?? null) === (areaId ?? null);

        return (
          <div
            className={`space-y-0 rounded-md bg-white min-h-[40px] ${
              isDragging && isOver
                ? "border-2 border-blue-400 shadow-md"
                : isDragging
                  ? "border-2 border-dashed border-gray-200"
                  : "border border-transparent"
            }`}
          >
            {datedItems.length > 0 && (
              <SortableContext
                items={datedItems.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {datedItems.map((action) => (
                  <SortableActionItem
                    key={action.id}
                    actionPlan={action}
                    actionIndex={indexById.get(action.id) ?? 0}
                    tensionId={null}
                    hideAreaBadge={shouldHideAreaBadge(action.area_id ?? null)}
                    availableTensions={availableTensions}
                    isCompleted={action.isCompleted || false}
                    handleUpdateActionPlan={handleUpdateActionPlan}
                    handleDeleteActionPlan={handleDeleteActionPlan}
                    handleTelescopeClick={handleTelescopeClick}
                    telescopingActionId={telescopingActionId}
                    currentUser={currentUser}
                    areas={areas}
                    chartId={chartId}
                    onOpenDetailPanel={onOpenDetailPanel}
                    disabled
                  />
                ))}
              </SortableContext>
            )}
            {datedItems.length > 0 && undatedItems.length > 0 && (
              <div className="h-px bg-gray-100 my-3" />
            )}
            <div className="min-h-[40px]">
              {undatedItems.length === 0 ? (
                isDragging ? (
                  <div
                    className={`border-2 border-dashed rounded p-6 text-center transition-colors ${
                      isOver
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    <div className="text-sm font-medium">ここにドロップ</div>
                  </div>
                ) : null
              ) : (
                <SortableContext
                  items={undatedItems.map((action) => action.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {undatedItems.map((action) => (
                    <SortableActionItem
                      key={action.id}
                      actionPlan={action}
                      actionIndex={indexById.get(action.id) ?? 0}
                      tensionId={null}
                      hideAreaBadge={shouldHideAreaBadge(action.area_id ?? null)}
                      availableTensions={availableTensions}
                      isCompleted={action.isCompleted || false}
                      handleUpdateActionPlan={handleUpdateActionPlan}
                      handleDeleteActionPlan={handleDeleteActionPlan}
                      handleTelescopeClick={handleTelescopeClick}
                      telescopingActionId={telescopingActionId}
                      currentUser={currentUser}
                      areas={areas}
                      chartId={chartId}
                      onOpenDetailPanel={onOpenDetailPanel}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
}

export function ProjectEditor({
  initialChart,
  chartId,
  currentUserId,
  currentUser: initialCurrentUser,
}: ProjectEditorProps) {
  const router = useRouter();
  // areasがundefinedの場合に空配列を設定
  const chartWithAreas: Chart = {
    ...initialChart,
    areas: initialChart.areas || [],
  };
  const [chart, setChart] = useState<Chart>(chartWithAreas);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!chart?.id || !chart?.title) return;
    const stored = localStorage.getItem("zenshin_recent_charts");
    let recentCharts: { id: string; title: string; visitedAt: string }[] = [];
    try {
      recentCharts = stored ? JSON.parse(stored) : [];
    } catch {
      recentCharts = [];
    }
    const nextRecent = {
      id: chart.id,
      title: chart.title,
      visitedAt: new Date().toISOString(),
    };
    const filtered = recentCharts.filter((item) => item.id !== chart.id);
    const updated = [nextRecent, ...filtered].slice(0, 3);
    localStorage.setItem("zenshin_recent_charts", JSON.stringify(updated));
    window.dispatchEvent(new Event("recentChartsUpdated"));
  }, [chart?.id, chart?.title]);
  const [visions, setVisions] = useState<VisionItem[]>(chart.visions);
  const [realities, setRealities] = useState<RealityItem[]>(chart.realities);
  const [tensions, setTensions] = useState<Tension[]>(chart.tensions);
  const [breadcrumbs] = useState<BreadcrumbItem[]>(chart.breadcrumbs || []);
  const [focusedArea, setFocusedArea] = useState<
    "vision" | "reality" | "tension" | null
  >(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const chartTitleInput = useItemInput({
    initialValue: chart.title || "",
    onSave: (val) => {
      if (val !== chart.title) {
        updateChartData(chartId, { title: val });
      }
    },
  });
  const newVisionInput = useItemInput({
    initialValue: "",
    onSave: () => {},
    sectionId: "new-vision",
  });
  const newRealityInput = useItemInput({
    initialValue: "",
    onSave: () => {},
    sectionId: "new-reality",
  });
  // 削除遅延実行用の状態管理
  const [pendingDeletions, setPendingDeletions] = useState<{
    [key: string]: {
      type: "vision" | "reality" | "action" | "tension";
      item: any;
      tensionId?: string | null;
      timeoutId: NodeJS.Timeout;
    };
  }>({});
  
  // Undo通知の表示状態
  const [undoNotification, setUndoNotification] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);
  
  // サイドパネルの状態
  const [detailPanel, setDetailPanel] = useState<{
    isOpen: boolean;
    itemType: "vision" | "reality" | "action";
    itemId: string;
    itemContent: string;
  } | null>(null);
  const [focusMode, setFocusMode] = useState<{
    isOpen: boolean;
    sectionType: "vision" | "reality" | "tension";
    itemId: string;
    title: string;
    content: string;
  } | null>(null);
  const [itemHistory, setItemHistory] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [looseActions, setLooseActions] = useState<ActionPlan[]>([]);
  const [telescopingActionId, setTelescopingActionId] = useState<string | null>(null);
  const [actionProgress, setActionProgress] = useState<
    Record<string, { total: number; completed: number; percentage: number }>
  >({});
  const [isSubmittingVision, setIsSubmittingVision] = useState(false);
  const [isSubmittingReality, setIsSubmittingReality] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState<Record<string, boolean>>({});
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);
  const [isChartMenuLoading, setIsChartMenuLoading] = useState(false);
  const [currentUser] = useState<{
    id: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null>(initialCurrentUser ?? null);
  const [chartDueDate, setChartDueDate] = useState<string | null>(initialChart.due_date || null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all"); // エリア選択状態


  const openFocusMode = (
    sectionType: "vision" | "reality" | "tension",
    itemId: string,
    title: string,
    content: string
  ) => {
    setFocusMode({
      isOpen: true,
      sectionType,
      itemId,
      title,
      content,
    });
  };

  const handleFocusModeSave = async (newContent: string) => {
    if (!focusMode) return;
    const trimmed = newContent.trim();
    if (trimmed === focusMode.content.trim()) return;

    if (focusMode.sectionType === "vision") {
      setVisions((prev) =>
        prev.map((vision) =>
          vision.id === focusMode.itemId
            ? { ...vision, content: trimmed }
            : vision
        )
      );
      await handleUpdateVision(focusMode.itemId, "content", trimmed);
      return;
    }

    if (focusMode.sectionType === "reality") {
      setRealities((prev) =>
        prev.map((reality) =>
          reality.id === focusMode.itemId
            ? { ...reality, content: trimmed }
            : reality
        )
      );
      await handleUpdateReality(focusMode.itemId, "content", trimmed);
      return;
    }

    setTensions((prev) =>
      prev.map((tension) =>
        tension.id === focusMode.itemId
          ? { ...tension, title: trimmed }
          : tension
      )
    );
    await handleUpdateTension(focusMode.itemId, "title", trimmed);
  };

  // D&D sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ナンバリング関数: Visionに番号を付与（日付が近い順に若い番号、日付がないものは作成順）
  const assignVisionNumbers = (visions: VisionItem[]): Array<{ vision: VisionItem; number: number }> => {
    const now = Date.now();
    const withDates = visions
      .filter(v => v.targetDate)
      .map(v => ({
        vision: v,
        date: new Date(v.targetDate!).getTime(),
        created: new Date((v as any).created_at || (v as any).createdAt || 0).getTime(),
      }))
      .sort((a, b) => {
        // 日付が近い順（現在に近い順）にソート
        const diffA = Math.abs(a.date - now);
        const diffB = Math.abs(b.date - now);
        if (diffA !== diffB) {
          return diffA - diffB; // 近い順
        }
        return a.created - b.created; // 同じ距離なら作成順
      });
    
    const withoutDates = visions
      .filter(v => !v.targetDate)
      .map(v => ({
        vision: v,
        created: new Date((v as any).created_at || (v as any).createdAt || 0).getTime(),
      }))
      .sort((a, b) => a.created - b.created); // 作成順（古い順）
    
    const result: Array<{ vision: VisionItem; number: number }> = [];
    let number = 1;
    
    // 日付があるものに番号を付与
    for (const item of withDates) {
      result.push({ vision: item.vision, number });
      number++;
    }
    
    // 日付がないものに続きの番号を付与
    for (const item of withoutDates) {
      result.push({ vision: item.vision, number });
      number++;
    }
    
    return result;
  };

  // ソート関数: Visionを番号の昇順でソート（表示用）#01が一番下、最大の番号が一番上
  // 降順表示にするため、配列を反転させる
  const sortVisionsByDate = (visions: VisionItem[]): VisionItem[] => {
    const numbered = assignVisionNumbers(visions);
    return numbered
      .sort((a, b) => {
        // 番号の昇順でソート（#1が最初、最大の番号が最後）
        return a.number - b.number;
      })
      .reverse() // 反転して降順表示（#1が一番下、最大の番号が一番上）
      .map(item => item.vision);
  };

  // Visionに番号を付与して降順でソートした結果を返す（表示用）
  const getSortedAndNumberedVisions = (visions: VisionItem[]): Array<{ vision: VisionItem; number: number }> => {
    const numbered = assignVisionNumbers(visions);
    return numbered
      .sort((a, b) => {
        // 番号の昇順でソート（#1が最初、最大の番号が最後）
        return a.number - b.number;
      })
      .reverse(); // 反転して降順表示（#1が一番下、最大の番号が一番上）
  };

  // Realityを降順でソート（作成順の降順、古いものが下、新しいものが上）
  const sortRealitiesByDate = (realities: RealityItem[]): RealityItem[] => {
    return [...realities].sort((a, b) => {
      const dateA = new Date((a as any).created_at || (a as any).createdAt || 0).getTime();
      const dateB = new Date((b as any).created_at || (b as any).createdAt || 0).getTime();
      // 降順（新しいものが上、古いものが下）
      return dateB - dateA;
    });
  };

  // ナンバリング関数: Actionに番号を付与（日付が近い順に若い番号、日付がないものは作成順）
  const assignActionNumbers = (actions: ActionPlan[]): Array<{ action: ActionPlan; number: number }> => {
    const now = Date.now();
    const withDates = actions
      .filter(a => a.dueDate)
      .map(a => ({
        action: a,
        date: new Date(a.dueDate!).getTime(),
        created: new Date((a as any).created_at || (a as any).createdAt || 0).getTime(),
      }))
      .sort((a, b) => {
        // 日付が近い順（現在に近い順）にソート
        const diffA = Math.abs(a.date - now);
        const diffB = Math.abs(b.date - now);
        if (diffA !== diffB) {
          return diffA - diffB; // 近い順
        }
        return a.created - b.created; // 同じ距離なら作成順
      });
    
    const withoutDates = actions
      .filter(a => !a.dueDate)
      .map(a => ({
        action: a,
        created: new Date((a as any).created_at || (a as any).createdAt || 0).getTime(),
      }))
      .sort((a, b) => a.created - b.created); // 作成順（古い順）
    
    const result: Array<{ action: ActionPlan; number: number }> = [];
    let number = 1;
    
    // 日付があるものに番号を付与
    for (const item of withDates) {
      result.push({ action: item.action, number });
      number++;
    }
    
    // 日付がないものに続きの番号を付与
    for (const item of withoutDates) {
      result.push({ action: item.action, number });
      number++;
    }
    
    return result;
  };

  // ソート関数: Actionを番号の降順でソート（表示用）#01が一番下、最大の番号が一番上
  const sortActionsByDate = (actions: ActionPlan[]): ActionPlan[] => {
    const numbered = assignActionNumbers(actions);
    return numbered
      .sort((a, b) => {
        // 番号の降順でソート（#1が一番下、最大の番号が一番上）
        return b.number - a.number;
      })
      .map(item => item.action);
  };

  // Actionに番号を付与して降順でソートした結果を返す（表示用）
  const getSortedAndNumberedActions = (actions: ActionPlan[]): Array<{ action: ActionPlan; number: number }> => {
    const numbered = assignActionNumbers(actions);
    return numbered.sort((a, b) => {
      // 番号の降順でソート（#1が一番下、最大の番号が一番上）
      return b.number - a.number;
    });
  };

  const chartSyncKey = useMemo(
    () =>
      JSON.stringify({
        visions: initialChart.visions,
        realities: initialChart.realities,
        tensions: initialChart.tensions,
        looseActions: initialChart.looseActions,
        areas: initialChart.areas,
        dueDate: initialChart.due_date,
      }),
    [initialChart]
  );

  // Chartデータが更新されたら状態を更新
  // initialChartが変更されたら（router.refresh()後）状態を更新
  useEffect(() => {
    // ※ _pendingScrollRestore はユーザー操作時点で保存済み（ここでは上書きしない）

    // areasがundefinedの場合に空配列を設定
    const chartWithAreas: Chart = {
      ...initialChart,
      areas: initialChart.areas || [],
    };
    setChart(chartWithAreas);
    setChartDueDate(initialChart.due_date || null);
    const getVisionDate = (vision: VisionItem) => vision.dueDate || null;
    const visionSplit = splitItemsByDate(initialChart.visions, getVisionDate);
    setVisions([...visionSplit.datedItems, ...visionSplit.undatedItems]);

    const realitySplit = splitItemsByDate(initialChart.realities, () => null);
    setRealities([...realitySplit.datedItems, ...realitySplit.undatedItems]);

    const sortedTensions = initialChart.tensions.map((tension) => {
      const actionSplit = splitItemsByDate(
        tension.actionPlans,
        (action) => action.dueDate || null
      );
      return {
        ...tension,
        actionPlans: [...actionSplit.datedItems, ...actionSplit.undatedItems],
      };
    });
    setTensions(sortedTensions);

    const looseSplit = splitItemsByDate(
      initialChart.looseActions || [],
      (action) => action.dueDate || null
    );
    setLooseActions([...looseSplit.datedItems, ...looseSplit.undatedItems]);

  }, [chartSyncKey]);

  // スクロール位置の復元（DOM更新後・ブラウザ描画前に同期実行）
  useLayoutEffect(() => {
    if (_pendingScrollRestore !== null && _pendingScrollRestore > 0) {
      const viewport = document.querySelector('[data-nav-scope="tension-action"]')
        ?.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      if (viewport) {
        viewport.scrollTop = _pendingScrollRestore;
      }
    }
  }, [tensions, looseActions]);

  const actionMetaById = useMemo(() => {
    const map = new Map<string, { tensionId: string | null; areaId: string | null }>();
    tensions.forEach((tension) => {
      tension.actionPlans.forEach((action) => {
        map.set(action.id, { tensionId: tension.id, areaId: action.area_id || null });
      });
    });
    looseActions.forEach((action) => {
      map.set(action.id, { tensionId: null, areaId: action.area_id || null });
    });
    return map;
  }, [tensions, looseActions]);

  const resolveTensionAreaId = (tension: Tension) => {
    if (tension.area_id) return tension.area_id;
    const visionArea = tension.visionIds
      .map((vid) => visions.find((v) => v.id === vid)?.area_id || null)
      .find((id) => id !== null);
    if (visionArea !== undefined && visionArea !== null) return visionArea;
    const realityArea = tension.realityIds
      .map((rid) => realities.find((r) => r.id === rid)?.area_id || null)
      .find((id) => id !== null);
    return realityArea ?? null;
  };

  const getVisionDate = (vision: VisionItem) => vision.dueDate || null;

  const groupedVisions = useMemo(() => {
    const areas = chart.areas ?? [];
    const result: Record<string, { dated: VisionItem[]; undated: VisionItem[] }> = {};
    areas.forEach((area) => {
      result[area.id] = { dated: [], undated: [] };
    });
    result.uncategorized = { dated: [], undated: [] };

    visions.forEach((vision) => {
      const areaKey =
        vision.area_id && result[vision.area_id] ? vision.area_id : "uncategorized";
      if (getVisionDate(vision)) {
        result[areaKey].dated.push(vision);
      } else {
        result[areaKey].undated.push(vision);
      }
    });

    Object.values(result).forEach((group) => {
      group.dated.sort(
        (a, b) => new Date(getVisionDate(b)!).getTime() - new Date(getVisionDate(a)!).getTime()
      );
      group.undated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    return result;
  }, [visions, chart.areas]);

  const groupedRealities = useMemo(() => {
    const areas = chart.areas ?? [];
    const result: Record<string, { dated: RealityItem[]; undated: RealityItem[] }> = {};
    areas.forEach((area) => {
      result[area.id] = { dated: [], undated: [] };
    });
    result.uncategorized = { dated: [], undated: [] };

    realities.forEach((reality) => {
      const areaKey =
        reality.area_id && result[reality.area_id] ? reality.area_id : "uncategorized";
      result[areaKey].undated.push(reality);
    });

    Object.values(result).forEach((group) => {
      group.undated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    return result;
  }, [realities, chart.areas]);

  const structuredData = useMemo<StructuredData>(() => {
    const areas = chart.areas ?? [];
    if (!areas || !tensions || !looseActions) {
      return {
        categorized: [],
        uncategorized: { tensions: [], orphanedActions: [] },
      };
    }

    const allActions = [
      ...looseActions,
      ...tensions.flatMap((tension) => tension.actionPlans),
    ];
    const assignedActionIds = new Set(
      tensions.flatMap((tension) => tension.actionPlans.map((action) => action.id))
    );

    const categorized = areas.map((area) => {
      const areaTensions = tensions
        .filter((tension) => tension.area_id === area.id)
        .map((tension) => ({
          ...tension,
          actions: [...tension.actionPlans].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          ),
        }))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const orphans = allActions
        .filter(
          (action) =>
            action.area_id === area.id &&
            !action.tension_id &&
            !assignedActionIds.has(action.id)
        )
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      return {
        area,
        tensions: areaTensions,
        orphanedActions: orphans,
      };
    });

    const uncategorizedTensions = tensions
      .filter((tension) => !tension.area_id)
      .map((tension) => ({
        ...tension,
        actions: [...tension.actionPlans].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        ),
      }))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    const uncategorizedOrphans = allActions
      .filter(
        (action) =>
          !action.area_id && !action.tension_id && !assignedActionIds.has(action.id)
      )
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return {
      categorized,
      uncategorized: {
        tensions: uncategorizedTensions,
        orphanedActions: uncategorizedOrphans,
      },
    };
  }, [chart.areas, tensions, looseActions]);

  useEffect(() => {
    console.group("📊 ZENSHIN Structured Data");

    const totalOrphans =
      structuredData.categorized.reduce(
        (sum, group) => sum + group.orphanedActions.length,
        0
      ) + structuredData.uncategorized.orphanedActions.length;

    if (totalOrphans > 0) {
      console.warn(
        "これらのActionはまだTensionに入っていません。フェーズ2でUI表示します。"
      );
    }

    console.groupEnd();
  }, [structuredData]);

  const handleTensionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    await handleActionSectionDragEnd(event);
  };

  const renderVisionItem = (vision: VisionItem, index: number) => (
    <SortableVisionItem
      key={vision.id}
      vision={vision}
      index={index}
      chartId={chartId}
      onUpdate={handleUpdateVision}
      onDelete={handleDeleteVision}
      areas={chart.areas || []}
      onOpenDetail={(item) => handleOpenDetailPanel("vision", item.id, item.content || "")}
      onOpenFocus={(item, itemIndex) =>
        openFocusMode(
          "vision",
          item.id,
          `Vision V-${String(itemIndex + 1).padStart(2, "0")}`,
          item.content || ""
        )
      }
      currentUser={currentUser}
    />
  );

  const renderVisionContent = () => {
    const areas = chart.areas ?? [];
    const showAll = selectedAreaId === "all";
    const showUncategorized = selectedAreaId === "uncategorized";
    const visibleAreas = showAll ? areas : areas.filter((area) => area.id === selectedAreaId);
    return (
      <div className="pt-3">
        {visibleAreas.map((area) => {
          const areaVisions = visions.filter((v) => v.area_id === area.id);
          return (
            <div key={area.id} className="mb-4 last:mb-0">
              <div className="flex items-center px-3 mb-1">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: area.color }}
                />
                <span className="text-sm font-bold text-gray-700">{area.name}</span>
                <span className="ml-2 text-xs text-gray-400">({areaVisions.length}件)</span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext items={areaVisions} strategy={verticalListSortingStrategy}>
                  {areaVisions.length === 0 ? (
                    <div className="text-gray-400 text-sm py-2 px-1 select-none opacity-60">
                      アイテムなし
                    </div>
                  ) : (
                    areaVisions.map((vision, index) => (
                      <SortableVisionItem
                        key={vision.id}
                        vision={vision}
                        index={index}
                        chartId={chartId}
                        onUpdate={handleUpdateVision}
                        onDelete={handleDeleteVision}
                        areas={chart.areas || []}
                        onOpenDetail={(item) =>
                          handleOpenDetailPanel("vision", item.id, item.content || "")
                        }
                        onOpenFocus={(item, itemIndex) =>
                          openFocusMode(
                            "vision",
                            item.id,
                            `Vision V-${String(itemIndex + 1).padStart(2, "0")}`,
                            item.content || ""
                          )
                        }
                        currentUser={currentUser}
                      />
                    ))
                  )}
                </SortableContext>
              </div>
            </div>
          );
        })}
        {(() => {
          if (!showAll && !showUncategorized) return null;
          const uncategorizedVisions = visions.filter((v) => !v.area_id);
          return (
            <div className="mb-4 last:mb-0">
              <div className="flex items-center px-3 mb-1">
                <span className="w-3 h-3 rounded-full mr-2 bg-gray-400" />
                <span className="text-sm font-bold text-gray-700">未分類</span>
                <span className="ml-2 text-xs text-gray-400">
                  ({uncategorizedVisions.length}件)
                </span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext
                  items={uncategorizedVisions}
                  strategy={verticalListSortingStrategy}
                >
                  {uncategorizedVisions.length === 0 ? (
                    <div className="text-gray-400 text-sm py-2 px-1 select-none opacity-60">
                      アイテムなし
                    </div>
                  ) : (
                    uncategorizedVisions.map((vision, index) => (
                      <SortableVisionItem
                        key={vision.id}
                        vision={vision}
                        index={index}
                        chartId={chartId}
                        onUpdate={handleUpdateVision}
                        onDelete={handleDeleteVision}
                        areas={chart.areas || []}
                        onOpenDetail={(item) =>
                          handleOpenDetailPanel("vision", item.id, item.content || "")
                        }
                        onOpenFocus={(item, itemIndex) =>
                          openFocusMode(
                            "vision",
                            item.id,
                            `Vision V-${String(itemIndex + 1).padStart(2, "0")}`,
                            item.content || ""
                          )
                        }
                        currentUser={currentUser}
                      />
                    ))
                  )}
                </SortableContext>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderRealityItem = (reality: RealityItem, index: number) => (
    <SortableRealityItem
      key={reality.id}
      reality={reality}
      index={index}
      highlightedItemId={highlightedItemId}
      handleUpdateReality={handleUpdateReality}
      handleDeleteReality={handleDeleteReality}
      areas={chart.areas}
      onOpenDetail={(item) => handleOpenDetailPanel("reality", item.id, item.content || "")}
      onOpenFocus={(item, itemIndex) =>
        openFocusMode(
          "reality",
          item.id,
          `Reality R-${String(itemIndex + 1).padStart(2, "0")}`,
          item.content || ""
        )
      }
      currentUser={currentUser}
    />
  );

  const renderRealityContent = () => {
    const areas = chart.areas ?? [];
    const showAll = selectedAreaId === "all";
    const showUncategorized = selectedAreaId === "uncategorized";
    const visibleAreas = showAll ? areas : areas.filter((area) => area.id === selectedAreaId);
    return (
      <div className="pt-3">
        {visibleAreas.map((area) => {
          const areaRealities = realities.filter((r) => r.area_id === area.id);
          return (
            <div key={area.id} className="mb-4 last:mb-0">
              <div className="flex items-center px-3 mb-1">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: area.color }}
                />
                <span className="text-sm font-bold text-gray-700">{area.name}</span>
                <span className="ml-2 text-xs text-gray-400">({areaRealities.length}件)</span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext items={areaRealities} strategy={verticalListSortingStrategy}>
                  {areaRealities.length === 0 ? (
                    <div className="text-gray-400 text-sm py-2 px-1 select-none opacity-60">
                      アイテムなし
                    </div>
                  ) : (
                    areaRealities.map((reality, index) => (
                      <SortableRealityItem
                        key={reality.id}
                        reality={reality}
                        index={index}
                        highlightedItemId={highlightedItemId}
                        handleUpdateReality={handleUpdateReality}
                        handleDeleteReality={handleDeleteReality}
                        areas={chart.areas}
                        onOpenDetail={(item) =>
                          handleOpenDetailPanel("reality", item.id, item.content || "")
                        }
                        onOpenFocus={(item, itemIndex) =>
                          openFocusMode(
                            "reality",
                            item.id,
                            `Reality R-${String(itemIndex + 1).padStart(2, "0")}`,
                            item.content || ""
                          )
                        }
                      />
                    ))
                  )}
                </SortableContext>
              </div>
            </div>
          );
        })}
        {(() => {
          if (!showAll && !showUncategorized) return null;
          const uncategorizedRealities = realities.filter((r) => !r.area_id);
          return (
            <div className="mb-4 last:mb-0">
              <div className="flex items-center px-3 mb-1">
                <span className="w-3 h-3 rounded-full mr-2 bg-gray-400" />
                <span className="text-sm font-bold text-gray-700">未分類</span>
                <span className="ml-2 text-xs text-gray-400">
                  ({uncategorizedRealities.length}件)
                </span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext
                  items={uncategorizedRealities}
                  strategy={verticalListSortingStrategy}
                >
                  {uncategorizedRealities.length === 0 ? (
                    <div className="text-gray-400 text-sm py-2 px-1 select-none opacity-60">
                      アイテムなし
                    </div>
                  ) : (
                    uncategorizedRealities.map((reality, index) => (
                      <SortableRealityItem
                        key={reality.id}
                        reality={reality}
                        index={index}
                        highlightedItemId={highlightedItemId}
                        handleUpdateReality={handleUpdateReality}
                        handleDeleteReality={handleDeleteReality}
                        areas={chart.areas}
                        onOpenDetail={(item) =>
                          handleOpenDetailPanel("reality", item.id, item.content || "")
                        }
                        onOpenFocus={(item, itemIndex) =>
                          openFocusMode(
                            "reality",
                            item.id,
                            `Reality R-${String(itemIndex + 1).padStart(2, "0")}`,
                            item.content || ""
                          )
                        }
                      />
                    ))
                  )}
                </SortableContext>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // Vision追加: 堅実な実装（Optimistic UIなし）
  const handleAddVision = async (content: string) => {
    if (!content.trim() || isSubmittingVision) return;
    
    setIsSubmittingVision(true);
    const contentToAdd = content.trim();
    // 選択中のエリアIDを取得（"all"の場合はnull）
    const areaId = selectedAreaId === "all" ? null : selectedAreaId;

    try {
      const newVision = await addVision(chartId, contentToAdd, areaId);

      if (newVision) {
        // 成功時のみフォームをクリア
        newVisionInput.setValue("");
        // revalidatePathが呼ばれたので、ページを再取得
        router.refresh();
      } else {
        // エラー時は入力内容を保持（既に入力されているので何もしない）
        console.error("[handleAddVision] 保存失敗 - 入力内容を保持");
      }
    } catch (error) {
      console.error("[handleAddVision] エラー:", error);
      // エラー時は入力内容を保持（既に入力されているので何もしない）
    } finally {
      setIsSubmittingVision(false);
    }
  };

  const handleUpdateVision = async (
    id: string,
    field: "content" | "assignee" | "dueDate" | "targetDate" | "isLocked" | "areaId",
    value: string | boolean | null
  ) => {
    if (field === "assignee") {
      setVisions((prev) =>
        prev.map((vision) =>
          vision.id === id ? { ...vision, assignee: value as string } : vision
        )
      );
      const success = await updateVisionItem(id, chartId, field, value);
      if (!success) {
        console.error("[handleUpdateVision] 更新失敗");
      }
      return;
    }
    // Server updateのみ（Optimistic UIなし）
    const success = await updateVisionItem(id, chartId, field, value);
    if (success) {
      if (field === "areaId") {
        const areaName = value
          ? chart.areas.find((area: Area) => area.id === value)?.name
          : "未分類";
        toast.success(`${areaName ?? "未分類"} に移動しました`);
      }
      // targetDate、isLockedが変更された場合は即座に反映するため、refreshする
      // contentの場合は画面リセットを避けるため、refreshしない
      if (
        field === "dueDate" ||
        field === "targetDate" ||
        field === "isLocked" ||
        field === "areaId"
      ) {
        router.refresh();
      }
    } else {
      console.error("[handleUpdateVision] 更新失敗");
    }
  };

  const handleDeleteVision = async (id: string) => {
    const vision = visions.find((v) => v.id === id);
    if (!vision) return;

    // 既存の削除予約があればキャンセル
    const existingKey = `vision-${id}`;
    if (pendingDeletions[existingKey]) {
      clearTimeout(pendingDeletions[existingKey].timeoutId);
    }

    // 楽観的UI更新（一時的に非表示）
    const originalVisions = [...visions];
    setVisions(visions.filter((v) => v.id !== id));

    // 5秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeVision(id, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setVisions(originalVisions);
        toast.error("削除に失敗しました");
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 5000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "vision",
        item: vision,
        timeoutId,
      },
    }));

    // Undo用の通知を表示
    setUndoNotification({
      message: "Visionを削除しました",
      onUndo: () => {
        // 削除をキャンセル
        clearTimeout(timeoutId);
        setVisions(originalVisions);
        setPendingDeletions((prev) => {
          const next = { ...prev };
          delete next[existingKey];
          return next;
        });
        setUndoNotification(null);
      },
    });
  };

  // Reality追加: 堅実な実装（Optimistic UIなし）
  const handleAddReality = async (content: string) => {
    if (!content.trim() || isSubmittingReality) return;
    
    setIsSubmittingReality(true);
    const contentToAdd = content.trim();
    // 選択中のエリアIDを取得（"all"の場合はnull）
    const areaId = selectedAreaId === "all" ? null : selectedAreaId;

    try {
      const newReality = await addReality(chartId, contentToAdd, areaId);

      if (newReality) {
        // 成功時のみフォームをクリア
        newRealityInput.setValue("");
        // revalidatePathが呼ばれたので、ページを再取得
        router.refresh();
      } else {
        // エラー時は入力内容を保持（既に入力されているので何もしない）
        console.error("[handleAddReality] 保存失敗 - 入力内容を保持");
      }
    } catch (error) {
      console.error("[handleAddReality] エラー:", error);
      // エラー時は入力内容を保持（既に入力されているので何もしない）
    } finally {
      setIsSubmittingReality(false);
    }
  };

  const handleUpdateReality = async (
    id: string,
    field: "content" | "isLocked" | "areaId" | "dueDate",
    value: string | boolean | null
  ) => {
    // Server updateのみ（Optimistic UIなし）
    const success = await updateRealityItem(id, chartId, field, value);
    if (success) {
      if (field === "areaId") {
        const areaName = value
          ? chart.areas.find((area: Area) => area.id === value)?.name
          : "未分類";
        toast.success(`${areaName ?? "未分類"} に移動しました`);
      }
      // 成功時はページを再取得
      router.refresh();
    } else {
      console.error("[handleUpdateReality] 更新失敗");
    }
  };

  const handleDeleteReality = async (id: string) => {
    const reality = realities.find((r) => r.id === id);
    if (!reality) return;

    // 既存の削除予約があればキャンセル
    const existingKey = `reality-${id}`;
    if (pendingDeletions[existingKey]) {
      clearTimeout(pendingDeletions[existingKey].timeoutId);
    }

    // 楽観的UI更新（一時的に非表示）
    const originalRealities = [...realities];
    setRealities(realities.filter((r) => r.id !== id));

    // 5秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeReality(id, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setRealities(originalRealities);
        toast.error("削除に失敗しました");
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 5000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "reality",
        item: reality,
        timeoutId,
      },
    }));

    // Undo用の通知を表示
    setUndoNotification({
      message: "Realityを削除しました",
      onUndo: () => {
        // 削除をキャンセル
        clearTimeout(timeoutId);
        setRealities(originalRealities);
        setPendingDeletions((prev) => {
          const next = { ...prev };
          delete next[existingKey];
          return next;
        });
        setUndoNotification(null);
      },
    });
  };

  // エリア作成ハンドラ
  const handleCreateArea = async (name: string, color: string): Promise<Area | null> => {
    const newArea = await addArea(chartId, name, color);
    if (newArea) {
      router.refresh();
    }
    return newArea;
  };

  // エリア更新ハンドラ
  const handleUpdateArea = async (
    areaId: string,
    updates: Partial<Pick<Area, "name" | "color">>
  ) => {
    const success = await updateAreaItem(areaId, chartId, updates);
    if (success) {
      router.refresh();
    }
  };

  // エリア削除ハンドラ
  const handleDeleteArea = async (areaId: string) => {
    const success = await removeArea(areaId, chartId);
    if (success) {
      router.refresh();
    }
  };

  const handleAddTension = async (title: string, areaId?: string | null) => {
    if (!title.trim()) return;
    const newTension = await addTension(chartId, title.trim(), areaId);
    if (newTension) {
      // 成功時はページを再取得
      router.refresh();
    }
  };

  const handleUpdateTension = async (
    tensionId: string,
    field: "title" | "description" | "status",
    value: string | TensionStatus
  ) => {
    // Server updateのみ（Optimistic UIなし）
    const success = await updateTensionItem(tensionId, chartId, field, value);
    if (success) {
      // titleとdescriptionの場合は画面リセットを避けるため、refreshしない
      // statusの場合はrefreshして最新状態を反映
      if (field === "status") {
        router.refresh();
      }
    } else {
      console.error("[handleUpdateTension] 更新失敗");
    }
  };

  const handleDeleteTension = async (tensionId: string) => {
    const tension = tensions.find((t) => t.id === tensionId);
    if (!tension) return;

    // 既存の削除予約があればキャンセル
    const existingKey = `tension-${tensionId}`;
    if (pendingDeletions[existingKey]) {
      clearTimeout(pendingDeletions[existingKey].timeoutId);
    }

    // 楽観的UI更新（一時的に非表示）
    const originalTensions = [...tensions];
    setTensions(tensions.filter((t) => t.id !== tensionId));

    // 5秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeTension(tensionId, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setTensions(originalTensions);
        toast.error("削除に失敗しました");
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 5000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "tension",
        item: tension,
        timeoutId,
      },
    }));

    // Undo用の通知を表示
    setUndoNotification({
      message: "Tensionを削除しました",
      onUndo: () => {
        // 削除をキャンセル
        clearTimeout(timeoutId);
        setTensions(originalTensions);
        setPendingDeletions((prev) => {
          const next = { ...prev };
          delete next[existingKey];
          return next;
        });
        setUndoNotification(null);
      },
    });
  };

  const toggleVisionRealityLink = async (
    tensionId: string,
    type: "vision" | "reality",
    itemId: string
  ) => {
    const tension = tensions.find((t) => t.id === tensionId);
    if (!tension) return;

    const isCurrentlyLinked =
      type === "vision"
        ? tension.visionIds.includes(itemId)
        : tension.realityIds.includes(itemId);

    // Server updateのみ（Optimistic UIなし）
    const success = await toggleVisionRealityLinkAction(
      tensionId,
      type,
      itemId,
      chartId,
      isCurrentlyLinked
    );
    if (success) {
      // 成功時はページを再取得
      router.refresh();
    } else {
      console.error("[toggleVisionRealityLink] 更新失敗");
    }
  };

  const handleAddActionPlan = async (
    tensionId: string | null,
    title: string,
    areaId?: string | null
  ) => {
    const submitKey = tensionId ?? "loose";
    if (!title.trim() || isSubmittingAction[submitKey]) return;

    // スクロール位置をユーザー操作時点で保存
    const scrollViewport = document.querySelector('[data-nav-scope="tension-action"]')
      ?.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (scrollViewport) {
      _pendingScrollRestore = scrollViewport.scrollTop;
      setTimeout(() => { _pendingScrollRestore = null; }, 10000);
    }

    setIsSubmittingAction({ ...isSubmittingAction, [submitKey]: true });
    const titleToAdd = title.trim();

    try {
      const newAction = await addActionPlan(tensionId, titleToAdd, areaId, chartId);

      if (newAction) {
        // ローカルState直接更新（router.refresh() を避けてスクロール維持 + 即時反映）
        if (tensionId) {
          setTensions((prev) =>
            prev.map((tension) =>
              tension.id === tensionId
                ? { ...tension, actionPlans: [...tension.actionPlans, newAction] }
                : tension
            )
          );
        } else {
          setLooseActions((prev) => [...prev, newAction]);
        }
      } else {
        console.error("[handleAddActionPlan] 保存失敗");
      }
    } catch (error) {
      console.error("[handleAddActionPlan] エラー:", error);
    } finally {
      setIsSubmittingAction({ ...isSubmittingAction, [submitKey]: false });
    }
  };

  const handleUpdateActionPlan = async (
    tensionId: string | null,
    actionId: string,
    field:
      | "title"
      | "dueDate"
      | "assignee"
      | "status"
      | "hasSubChart"
      | "subChartId"
      | "childChartId"
      | "isCompleted"
      | "description"
      | "areaId",
    value: string | boolean | null,
    options?: { removeFromTension?: boolean }
  ) => {
    const updateActionInState = (
      updater: (action: ActionPlan) => ActionPlan
    ) => {
      setTensions((prev) =>
        prev.map((tension) => ({
          ...tension,
          actionPlans: tension.actionPlans.map((action) =>
            action.id === actionId ? updater(action) : action
          ),
        }))
      );
      setLooseActions((prev) =>
        prev.map((action) => (action.id === actionId ? updater(action) : action))
      );
    };

    if (field === "assignee") {
      updateActionInState((action) => ({
        ...action,
        assignee: value as string,
      }));
      const success = await updateActionPlanItem(
        actionId,
        tensionId,
        field,
        value,
        chartId
      );
      if (!success) {
        console.error("[handleUpdateActionPlan] 更新失敗");
      }
      return;
    }

    if (field === "areaId") {
      const removeFromTension = options?.removeFromTension ?? false;
      if (tensionId && removeFromTension) {
        let movedAction: ActionPlan | null = null;
        setTensions((prev) =>
          prev.map((tension) => {
            if (tension.id !== tensionId) return tension;
            const remainingActions = tension.actionPlans.filter((action) => {
              if (action.id === actionId) {
                movedAction = { ...action, area_id: value as string | null, tension_id: null };
                return false;
              }
              return true;
            });
            return { ...tension, actionPlans: remainingActions };
          })
        );
        if (movedAction) {
          setLooseActions((prev) => [movedAction, ...prev]);
        }
      } else if (tensionId) {
        setTensions((prev) =>
          prev.map((tension) =>
            tension.id === tensionId
              ? {
                  ...tension,
                  actionPlans: tension.actionPlans.map((action) =>
                    action.id === actionId ? { ...action, area_id: value as string | null } : action
                  ),
                }
              : tension
          )
        );
      } else {
        setLooseActions((prev) =>
          prev.map((action) =>
            action.id === actionId ? { ...action, area_id: value as string | null } : action
          )
        );
      }
      const result = await updateActionArea(
        actionId,
        value as string | null,
        chartId,
        removeFromTension
      );
      if (!result.success) {
        toast.error("移動に失敗しました");
      }
      return;
    }

    if (field === "status") {
      const nextStatus = value as ActionPlan["status"];
      updateActionInState((action) => ({
        ...action,
        status: nextStatus,
        isCompleted: nextStatus === "done",
      }));
    } else if (field === "isCompleted") {
      const nextIsCompleted = Boolean(value);
      updateActionInState((action) => ({
        ...action,
        isCompleted: nextIsCompleted,
        status: nextIsCompleted ? "done" : action.status,
      }));
    }

    // Server updateのみ（Optimistic UIなし）
    const success = await updateActionPlanItem(actionId, tensionId, field, value, chartId);
    if (success) {
      // dueDateが変更された場合は即座に反映するため、refreshする
      // titleの場合は画面リセットを避けるため、refreshしない
      // isCompletedが変更された場合も即座に反映するため、refreshする
      if (field === "dueDate") {
        router.refresh();
      }
    } else {
      console.error("[handleUpdateActionPlan] 更新失敗");
      if (field === "status" || field === "isCompleted") {
        router.refresh();
      }
    }
  };

  const handleDeleteActionPlan = async (tensionId: string | null, actionId: string) => {
    // スクロール位置をユーザー操作時点で保存
    const scrollViewport = document.querySelector('[data-nav-scope="tension-action"]')
      ?.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (scrollViewport) {
      _pendingScrollRestore = scrollViewport.scrollTop;
      setTimeout(() => { _pendingScrollRestore = null; }, 10000);
    }
    const action = tensionId
      ? tensions.find((t) => t.id === tensionId)?.actionPlans.find((a) => a.id === actionId)
      : looseActions.find((a) => a.id === actionId);
    if (!action) return;

    // 既存の削除予約があればキャンセル
    const existingKey = `action-${actionId}`;
    if (pendingDeletions[existingKey]) {
      clearTimeout(pendingDeletions[existingKey].timeoutId);
    }

    // 楽観的UI更新（一時的に非表示）
    const originalTensions = [...tensions];
    const originalLooseActions = [...looseActions];
    if (tensionId) {
      const updatedTensions = tensions.map((t) =>
        t.id === tensionId
          ? { ...t, actionPlans: t.actionPlans.filter((a) => a.id !== actionId) }
          : t
      );
      setTensions(updatedTensions);
    } else {
      setLooseActions(looseActions.filter((a) => a.id !== actionId));
    }

    // 5秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeActionPlan(actionId, tensionId, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setTensions(originalTensions);
        setLooseActions(originalLooseActions);
        toast.error("削除に失敗しました");
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 5000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "action",
        item: action,
        tensionId,
        timeoutId,
      },
    }));

    // Undo用の通知を表示
    setUndoNotification({
      message: "Actionを削除しました",
      onUndo: () => {
        // 削除をキャンセル
        clearTimeout(timeoutId);
        setTensions(originalTensions);
        setLooseActions(originalLooseActions);
        setPendingDeletions((prev) => {
          const next = { ...prev };
          delete next[existingKey];
          return next;
        });
        setUndoNotification(null);
      },
    });
  };

  // サイドパネルを開く
  const handleOpenDetailPanel = async (
    itemType: "vision" | "reality" | "action",
    itemId: string,
    itemContent: string
  ) => {
    setDetailPanel({
      isOpen: true,
      itemType,
      itemId,
      itemContent,
    });
    if (itemType !== "action") {
      setIsLoadingHistory(true);
      try {
        const history = await fetchItemHistory(itemType, itemId);
        setItemHistory(history);
      } catch (error) {
        console.error("履歴の取得に失敗しました:", error);
        setItemHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    } else {
      setItemHistory([]);
      setIsLoadingHistory(false);
    }
  };

  // サイドパネルを閉じる
  const handleCloseDetailPanel = () => {
    setDetailPanel(null);
    setItemHistory([]);
  };

  // 履歴を追加
  const handleAddHistory = async (
    itemType: "vision" | "reality" | "action",
    itemId: string,
    content: string,
    type: "update" | "comment",
    updateMainContent: boolean
  ) => {
    await addItemHistoryEntry(itemType, itemId, content, type, updateMainContent, chartId);
    // 履歴を再取得
    const history = await fetchItemHistory(itemType, itemId);
    setItemHistory(history);
    // メインコンテンツを更新した場合はページをリフレッシュ
    if (updateMainContent) {
      router.refresh();
    }
  };

  const handleCommentCountChange = (
    itemType: "vision" | "reality" | "action",
    itemId: string,
    delta: number
  ) => {
    if (itemType === "vision") {
      setVisions((prev) =>
        prev.map((vision) =>
          vision.id === itemId
            ? {
                ...vision,
                comment_count: Math.max(0, (vision.comment_count ?? 0) + delta),
              }
            : vision
        )
      );
      return;
    }
    if (itemType === "reality") {
      setRealities((prev) =>
        prev.map((reality) =>
          reality.id === itemId
            ? {
                ...reality,
                comment_count: Math.max(0, (reality.comment_count ?? 0) + delta),
              }
            : reality
        )
      );
      return;
    }
    setTensions((prev) =>
      prev.map((tension) => ({
        ...tension,
        actionPlans: tension.actionPlans.map((actionPlan) =>
          actionPlan.id === itemId
            ? {
                ...actionPlan,
                comment_count: Math.max(
                  0,
                  (actionPlan.comment_count ?? 0) + delta
                ),
              }
            : actionPlan
        ),
      }))
    );
    setLooseActions((prev) =>
      prev.map((actionPlan) =>
        actionPlan.id === itemId
          ? {
              ...actionPlan,
              comment_count: Math.max(
                0,
                (actionPlan.comment_count ?? 0) + delta
              ),
            }
          : actionPlan
      )
    );
  };

  // ドラッグ＆ドロップハンドラ
  const handleDragEnd = async (event: DragEndEvent, type: "visions" | "realities" | "actions", tensionId?: string) => {
    const { active, over } = event;
    if (active.id === over?.id) return;

    if (type === "visions") {
      // ========== デバッグログ開始 ==========
      const activeVision = visions.find((v) => v.id === active.id);
      // ========== デバッグログ終了 ==========
      if (!over) {
        return;
      }

      const draggedItem = activeVision;
      if (!draggedItem) return;

      if (getVisionDate(draggedItem)) return;

      const overData = over.data?.current as { areaId?: string | null; type?: string } | undefined;
      const targetAreaId = overData?.areaId;
      const targetType = overData?.type;

      if (targetType === "vision-area" && targetAreaId !== draggedItem.area_id) {
          const previousState = visions;
          const targetAreaItems = visions.filter(
          (v) => !getVisionDate(v) && v.area_id === targetAreaId
          );
          const newSortOrder =
            Math.max(...targetAreaItems.map((v) => v.sort_order ?? 0), 0) + 1;

          setVisions((prev) =>
            prev.map((v) =>
              v.id === draggedItem.id
              ? { ...v, area_id: targetAreaId ?? null, sort_order: newSortOrder }
                : v
            )
          );

        try {
          const result = await updateVisionArea(draggedItem.id, targetAreaId ?? null, chartId);
          if (result.success) {
            const areaName =
              targetAreaId !== null
                ? chart.areas.find((a) => a.id === targetAreaId)?.name
                : "未分類";
            toast.success(`${areaName ?? "未分類"} に移動しました`);
          } else {
            throw new Error("Update failed");
          }
        } catch (error) {
          console.error("❌ Server update failed:", error);
          setVisions(previousState);
          toast.error("移動に失敗しました");
        }
        return;
      }

      const undatedVisions = visions.filter((v) => !getVisionDate(v));

      const oldIndex = undatedVisions.findIndex((v) => v.id === active.id);
      const newIndex = undatedVisions.findIndex((v) => v.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const previousState = visions;
      const reordered = arrayMove(undatedVisions, oldIndex, newIndex).map(
        (vision, index) => ({
          ...vision,
          sort_order: index,
        })
      );

      const datedVisions = visions
        .filter((v) => !!getVisionDate(v))
        .sort(
          (a, b) =>
            new Date(getVisionDate(a)!).getTime() -
            new Date(getVisionDate(b)!).getTime()
        );

      setVisions([...datedVisions, ...reordered]);
      const items = reordered.map((v, index) => ({ id: v.id, sort_order: index }));
      try {
        await updateListOrder(items, "visions", chartId);
      } catch (error) {
        console.error("Sort order update failed:", error);
        setVisions(previousState);
        toast.error("並び順の更新に失敗しました");
      }
    } else if (type === "realities") {
      if (!over) return;
      const draggedItem = realities.find((r) => r.id === active.id);
      if (!draggedItem) return;

      const overData = over.data?.current as { areaId?: string | null; type?: string } | undefined;
      const targetAreaId = overData?.areaId;
      const targetType = overData?.type;
      const currentAreaId = draggedItem.area_id ?? null;
      const isAreaMove =
        targetAreaId !== undefined &&
        targetAreaId !== currentAreaId &&
        (targetType === "reality-area" || targetType === "reality-item");

      if (isAreaMove) {
        const previousState = realities;
        const targetAreaItems = realities.filter(
          (r) => (r.area_id ?? null) === (targetAreaId ?? null)
        );
        const newSortOrder =
          Math.max(...targetAreaItems.map((r) => r.sort_order ?? 0), 0) + 1;

        setRealities((prev) =>
          prev.map((r) =>
            r.id === draggedItem.id
              ? { ...r, area_id: targetAreaId ?? null, sort_order: newSortOrder }
              : r
          )
        );

        const result = await updateRealityArea(draggedItem.id, targetAreaId ?? null, chartId);
        if (result.success) {
          const areaName =
            targetAreaId !== null
              ? chart.areas.find((a) => a.id === targetAreaId)?.name
              : "未分類";
          toast.success(`${areaName ?? "未分類"} に移動しました`);
        } else {
          setRealities(previousState);
          toast.error("移動に失敗しました");
        }
        return;
      }

      const undatedRealities = realities;
      const oldIndex = undatedRealities.findIndex((r) => r.id === active.id);
      const newIndex = undatedRealities.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const previousState = realities;
      const reordered = arrayMove(undatedRealities, oldIndex, newIndex).map(
        (reality, index) => ({
          ...reality,
          sort_order: index,
        })
      );
      setRealities(reordered);

      const items = reordered.map((r, index) => ({ id: r.id, sort_order: index }));
      try {
        await updateListOrder(items, "realities", chartId);
      } catch (error) {
        console.error("Sort order update failed:", error);
        setRealities(previousState);
        toast.error("並び順の更新に失敗しました");
      }
    } else if (type === "actions" && tensionId) {
      if (!over) return;
      const tension = tensions.find((t) => t.id === tensionId);
      if (!tension) return;

      const undatedActions = tension.actionPlans.filter((a) => !a.dueDate);
      const oldIndex = undatedActions.findIndex((a) => a.id === active.id);
      const newIndex = undatedActions.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const previousState = tensions;
      const reordered = arrayMove(undatedActions, oldIndex, newIndex).map(
        (action, index) => ({
          ...action,
          sort_order: index,
        })
      );
      const datedActions = tension.actionPlans
        .filter((a) => !!a.dueDate)
        .sort(
          (a, b) =>
            new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
        );

      const updatedTensions = tensions.map((t) =>
        t.id === tensionId
          ? { ...t, actionPlans: [...datedActions, ...reordered] }
          : t
      );
      setTensions(updatedTensions);

      const items = reordered.map((a, index) => ({ id: a.id, sort_order: index }));
      try {
        await updateListOrder(items, "actions", chartId, tensionId);
      } catch (error) {
        console.error("Sort order update failed:", error);
        setTensions(previousState);
        toast.error("並び順の更新に失敗しました");
      }
    }
  };

  const handleActionSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeData = active.data?.current as { type?: string; areaId?: string | null } | undefined;
    const overData = over.data?.current as { type?: string; areaId?: string | null } | undefined;
    if (activeData?.type === "tension") {
      const activeTensionId = activeId.replace(/^tension-/, "");
      const overTensionId = overId.replace(/^tension-/, "");
      const activeTension = tensions.find((tension) => tension.id === activeTensionId);
      if (!activeTension) return;

      const currentAreaId = resolveTensionAreaId(activeTension);
      const targetAreaId = overData?.areaId;
      const targetType = overData?.type;

      const isAreaMove =
        targetAreaId !== undefined &&
        targetAreaId !== currentAreaId &&
        (targetType === "tension-area" || targetType === "tension" || targetType === "action-area");

      if (isAreaMove) {
        const previousState = tensions;
        const targetAreaTensions = tensions.filter(
          (tension) => (resolveTensionAreaId(tension) || null) === (targetAreaId ?? null)
        );
        const newSortOrder =
          Math.max(...targetAreaTensions.map((tension) => tension.sort_order ?? 0), 0) + 1;

        setTensions((prev) =>
          prev.map((tension) =>
            tension.id === activeTensionId
              ? { ...tension, area_id: targetAreaId ?? null, sort_order: newSortOrder }
              : tension
          )
        );

        const result = await updateTensionArea(
          activeTensionId,
          targetAreaId ?? null,
          chartId,
          true
        );
        if (result.success) {
          const areaName =
            targetAreaId !== null ? chart.areas.find((a) => a.id === targetAreaId)?.name : "未分類";
          toast.success(`${areaName ?? "未分類"} に移動しました`);
        } else {
          setTensions(previousState);
          toast.error("移動に失敗しました");
        }
        return;
      }

      const overTension = tensions.find((tension) => tension.id === overTensionId);
      const overAreaId = overTension ? resolveTensionAreaId(overTension) : null;
      const isSameAreaSort =
        activeTensionId !== overTensionId &&
        !!overTension &&
        (overAreaId ?? null) === (currentAreaId ?? null);
      if (!isSameAreaSort) return;

      const sameAreaTensions = tensions
        .filter((tension) => (resolveTensionAreaId(tension) || null) === (currentAreaId ?? null))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const oldIndex = sameAreaTensions.findIndex((tension) => tension.id === activeTensionId);
      const newIndex = sameAreaTensions.findIndex((tension) => tension.id === overTensionId);
      if (oldIndex === -1 || newIndex === -1) return;

      const previousState = tensions;
      const reordered = arrayMove(sameAreaTensions, oldIndex, newIndex).map((tension, index) => ({
        ...tension,
        sort_order: index + 1,
      }));
      const sortMap = new Map(reordered.map((tension) => [tension.id, tension.sort_order]));

      setTensions((prev) =>
        prev.map((tension) =>
          sortMap.has(tension.id)
            ? { ...tension, sort_order: sortMap.get(tension.id) }
            : tension
        )
      );

      const items = reordered.map((tension, index) => ({ id: tension.id, sort_order: index + 1 }));
      try {
        await updateListOrder(items, "tensions", chartId);
      } catch (error) {
        console.error("Sort order update failed:", error);
        setTensions(previousState);
        toast.error("並び順の更新に失敗しました");
      }
      return;
    }

    const activeMeta = actionMetaById.get(activeId);
    if (!activeMeta) return;

    const allActions = [
      ...looseActions,
      ...tensions.flatMap((tension) => tension.actionPlans),
    ];
    const activeAction = allActions.find((action) => action.id === activeId);
    if (!activeAction || activeAction.dueDate) return;
    const overAction = allActions.find((action) => action.id === overId);
    if (overAction?.dueDate) return;

    const overAreaId = overData?.areaId;
    let targetAreaId = overAreaId ?? null;
    let targetTensionId = activeMeta.tensionId;

    if (overAreaId === undefined) {
      const overMeta = actionMetaById.get(overId);
      targetAreaId = overMeta?.areaId ?? null;
      if (overMeta) {
        targetTensionId = overMeta.tensionId;
      }
    }

    const currentAreaId = activeMeta.areaId ?? null;
    if (targetAreaId !== currentAreaId) {
      const previousTensions = tensions;
      const previousLooseActions = looseActions;
      const targetAreaActions = allActions.filter(
        (action) => !action.dueDate && (action.area_id ?? null) === (targetAreaId ?? null)
      );
      const newSortOrder =
        Math.max(...targetAreaActions.map((action) => action.sort_order ?? 0), 0) + 1;

      if (activeMeta.tensionId) {
        setTensions((prev) =>
          prev.map((tension) =>
            tension.id === activeMeta.tensionId
              ? {
                  ...tension,
                  actionPlans: tension.actionPlans.map((action) =>
                    action.id === activeId
                      ? { ...action, area_id: targetAreaId, sort_order: newSortOrder }
                      : action
                  ),
                }
              : tension
          )
        );
      } else {
        setLooseActions((prev) =>
          prev.map((action) =>
            action.id === activeId
              ? { ...action, area_id: targetAreaId, sort_order: newSortOrder }
              : action
          )
        );
      }
      const result = await updateActionArea(activeId, targetAreaId ?? null, chartId, false);
      if (result.success) {
        const areaName =
          targetAreaId !== null ? chart.areas.find((a) => a.id === targetAreaId)?.name : "未分類";
        toast.success(`${areaName ?? "未分類"} に移動しました`);
      } else {
        setTensions(previousTensions);
        setLooseActions(previousLooseActions);
        toast.error("移動に失敗しました");
      }
      return;
    }

    if (targetTensionId === activeMeta.tensionId && actionMetaById.has(overId)) {
      if (activeMeta.tensionId) {
        await handleDragEnd(event, "actions", activeMeta.tensionId);
      } else {
        const undatedActions = looseActions.filter((a) => !a.dueDate);
        const oldIndex = undatedActions.findIndex((a) => a.id === activeId);
        const newIndex = undatedActions.findIndex((a) => a.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const previousState = looseActions;
        const reordered = arrayMove(undatedActions, oldIndex, newIndex).map(
          (action, index) => ({
            ...action,
            sort_order: index,
          })
        );
        const datedActions = looseActions
          .filter((a) => !!a.dueDate)
          .sort(
            (a, b) =>
              new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
          );
        setLooseActions([...datedActions, ...reordered]);
        const items = reordered.map((a, index) => ({ id: a.id, sort_order: index }));
        try {
          await updateListOrder(items, "actions", chartId);
        } catch (error) {
          console.error("Sort order update failed:", error);
          setLooseActions(previousState);
          toast.error("並び順の更新に失敗しました");
        }
      }
    }
  };

  const handleTelescopeClick = async (actionPlan: ActionPlan, tensionId: string | null) => {
    // 既に子チャートが存在する場合は遷移
    if (actionPlan.childChartId) {
      router.push(`/charts/${actionPlan.childChartId}`);
      return;
    }

    // ローディング状態を設定
    setTelescopingActionId(actionPlan.id);

    try {
      // テレスコーピング: 新しいチャートを作成
      const newChartId = await telescopeActionPlan(actionPlan.id, tensionId, chartId);

      if (newChartId) {
        // 成功: 新しいチャートに遷移
        router.push(`/charts/${newChartId}`);
      } else {
        // エラー: ローディング状態を解除
        setTelescopingActionId(null);
        console.error("4. Failed - result:", newChartId);
        console.error("Failed to create child chart");
      }
    } catch (error) {
      setTelescopingActionId(null);
      console.error("5. Exception caught:", error);
      console.error("Error in telescope:", error);
    }
  };

  // 子チャートの進捗情報を取得
  useEffect(() => {
    const fetchProgress = async () => {
      const progressMap: Record<string, { total: number; completed: number; percentage: number }> = {};
      
      for (const tension of tensions) {
        for (const actionPlan of tension.actionPlans) {
          if (actionPlan.childChartId) {
            const progress = await getActionProgress(actionPlan.childChartId);
            if (progress) {
              progressMap[actionPlan.id] = progress;
            }
          }
        }
      }
      
      setActionProgress(progressMap);
    };

    fetchProgress();
  }, [tensions]);

  const getVisionById = (id: string) => visions.find((v) => v.id === id);
  const getRealityById = (id: string) => realities.find((r) => r.id === id);

  const handleCreateSnapshot = async () => {
    if (isSavingSnapshot) return;

    setIsSavingSnapshot(true);
    try {
      const result = await createSnapshot(chartId, undefined, "manual");
      if (result.success) {
        toast.success("スナップショットを保存しました");
      } else {
        toast.error(`スナップショットの保存に失敗しました: ${result.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("[handleCreateSnapshot] エラー:", error);
      toast.error("スナップショットの保存中にエラーが発生しました");
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleArchiveChart = async () => {
    if (!chart?.id) return;
    if (!confirm(`「${chart.title}」とその全てのサブチャートをアーカイブしますか？`)) {
      return;
    }
    setIsChartMenuLoading(true);
    try {
      const result = await archiveChart(chart.id);
      toast.success(`${result.archivedCount}件のチャートをアーカイブしました`, {
        action: {
          label: "元に戻す",
          onClick: async () => {
            await restoreChart(chart.id);
            toast.success("アーカイブを復元しました");
            router.refresh();
          },
        },
      });
      if (chart.parentChartId) {
        router.push(`/charts/${chart.parentChartId}`);
      } else {
        router.push("/charts");
      }
    } catch (error) {
      console.error("Failed to archive:", error);
      toast.error("アーカイブに失敗しました");
    } finally {
      setIsChartMenuLoading(false);
    }
  };

  const handleDeleteChart = async () => {
    if (!chart?.id) return;
    if (!confirm(`「${chart.title}」を完全に削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }
    setIsChartMenuLoading(true);
    try {
      await deleteChart(chart.id);
      toast.success("チャートを削除しました");
      if (chart.parentChartId) {
        router.push(`/charts/${chart.parentChartId}`);
      } else {
        router.push("/charts");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("削除に失敗しました");
    } finally {
      setIsChartMenuLoading(false);
    }
  };

  const handleUpdateChartDueDate = async (dueDate: string | null) => {
    try {
      const { error } = await supabase
        .from("charts")
        .update({
          due_date: dueDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chart.id);

      if (error) {
        console.error("[handleUpdateChartDueDate] Error:", error);
        return;
      }

      setChart((prev) => ({ ...prev, due_date: dueDate }));
      setChartDueDate(dueDate);
    } catch (err) {
      console.error("[handleUpdateChartDueDate] Exception:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA]">
      {/* Undo通知（画面中央） */}
      {undoNotification && (
        <UndoNotification
          message={undoNotification.message}
          onUndo={undoNotification.onUndo}
          onDismiss={() => setUndoNotification(null)}
          duration={5000}
        />
      )}
      {/* ヘッダー */}
      <header className="border-b bg-white sticky top-0 z-10">
        {/* 上段: パンくず & アクション */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/charts" className="hover:text-gray-700 transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            {(() => {
              const breadcrumbItems = breadcrumbs.filter((crumb) => crumb.id !== "root");
              if (breadcrumbItems.length === 0) {
                return (
                  <span className="text-gray-900 font-medium truncate max-w-[200px]">
                    {chart.title}
                  </span>
                );
              }
              return breadcrumbItems.map((crumb, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                const isCurrentChart =
                  crumb.id === chartId && (crumb.type === "chart" || !crumb.type);
                const isClickable =
                  !isLast && !isCurrentChart && (crumb.type === "chart" || !crumb.type);

                return (
                  <div key={`${crumb.id}-${index}`} className="flex items-center gap-2 shrink-0">
                    {isClickable ? (
                      <Link
                        href={`/charts/${crumb.id}`}
                        className="hover:text-gray-700 transition-colors truncate max-w-[150px]"
                      >
                        {crumb.title}
                      </Link>
                    ) : (
                      <span
                        className={`truncate max-w-[200px] ${
                          isLast || isCurrentChart ? "text-gray-900 font-medium" : "text-gray-500"
                        }`}
                      >
                        {crumb.title}
                      </span>
                    )}
                    {!isLast && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  </div>
                );
              });
            })()}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={handleCreateSnapshot}>
              {isSavingSnapshot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-1.5" />
              )}
              Snapshot
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isChartMenuLoading}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleArchiveChart} className="gap-2">
                  <Archive className="w-4 h-4" />
                  アーカイブ
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteChart}
                  className="gap-2 text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 中段: タイトル */}
        <div className="px-6 py-4">
          <input
            type="text"
            {...chartTitleInput.bind}
            className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none w-full hover:bg-gray-50 focus:bg-gray-50 rounded px-1 -ml-1 transition-colors"
            placeholder="チャート名を入力..."
          />
        </div>

        {/* 下段: メタデータ & フィルター */}
        <div className="flex items-center gap-4 px-6 py-3 bg-gray-50/50 border-t border-gray-100">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md px-2 py-1.5 transition-colors">
                <CalendarIcon className="w-4 h-4" />
                <span>
                  {chartDueDate
                    ? format(new Date(chartDueDate), "yyyy/MM/dd")
                    : "期限未設定"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
              <CalendarComponent
                mode="single"
                selected={chartDueDate ? new Date(chartDueDate) : undefined}
                onSelect={(date) => {
                  handleUpdateChartDueDate(date ? date.toISOString() : null);
                }}
                initialFocus
              />
              {chartDueDate && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-gray-500 hover:text-red-500"
                    onClick={() => handleUpdateChartDueDate(null)}
                  >
                    期限をクリア
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <div className="w-px h-4 bg-gray-300" />

          <Select value={selectedAreaId || "all"} onValueChange={(value) => setSelectedAreaId(value)}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue placeholder="すべてのタグ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのタグ</SelectItem>
              <SelectItem value="uncategorized">未分類</SelectItem>
              {chart.areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: area.color }}
                    />
                    {area.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-sm text-gray-600"
            onClick={() => setTagManagerOpen(true)}
          >
            <Settings className="w-4 h-4 mr-1.5" />
            タグ設定
          </Button>
        </div>
      </header>

      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        areas={chart.areas}
        onCreateArea={handleCreateArea}
        onUpdateArea={handleUpdateArea}
        onDeleteArea={handleDeleteArea}
      />

      {/* メインエリア */}
      <div className="flex-1 overflow-hidden bg-[#F5F7FA]">
        {focusedArea ? (
          <div className="h-full p-6">
            {focusedArea === "vision" && (
              <div className="h-full">
                <div className="flex flex-col bg-white border-2 border-blue-200 rounded-lg shadow-sm h-full">
                  <div className="px-3 py-2 border-b bg-white flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h2 className="text-base font-bold text-foreground leading-tight">Vision</h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setFocusedArea(null)}
                    >
                      <Minimize2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 overflow-auto">
                    <DndContext
                      id="dnd-context-vision"
                      sensors={sensors}
                      collisionDetection={customCollisionDetection}
                      onDragEnd={(e) => handleDragEnd(e, "visions")}
                    >
                      <div id="vision-list-container" className="space-y-0" data-nav-scope="vision">
                        {renderVisionContent()}
                      </div>
                    </DndContext>
                  </ScrollArea>
                  <div className="p-2 border-t bg-white shrink-0">
                    <div className="flex gap-2">
                      <Input
                        {...newVisionInput.bind}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddVision(newVisionInput.value);
                            return;
                          }
                          newVisionInput.handleKeyDown(e);
                        }}
                        placeholder="新しいVisionを入力... (Enterで追加)"
                        className="text-sm h-7 flex-1"
                        disabled={isSubmittingVision}
                      />
                      <Button
                        onClick={() => handleAddVision(newVisionInput.value)}
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={!newVisionInput.value.trim() || isSubmittingVision}
                      >
                        {isSubmittingVision ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {focusedArea === "reality" && (
              <div className="h-full">
                <div className="flex flex-col bg-white border-2 border-orange-200 rounded-lg shadow-sm h-full overflow-hidden">
                  <div className="px-3 py-2 border-b bg-white flex items-center justify-between rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        Reality
                      </h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setFocusedArea(null)}
                    >
                      <Minimize2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 overflow-auto">
                    <DndContext
                      id="dnd-context-reality-focused"
                      sensors={sensors}
                      collisionDetection={customCollisionDetection}
                      onDragEnd={(e) => handleDragEnd(e, "realities")}
                    >
                      <div
                        id="reality-list-container"
                        className="space-y-0"
                        data-nav-scope="reality"
                      >
                        {renderRealityContent()}
                      </div>
                    </DndContext>
                  </ScrollArea>
                  <div className="p-2 border-t bg-white shrink-0">
                    <div className="flex gap-2">
                      <Input
                        {...newRealityInput.bind}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddReality(newRealityInput.value);
                            return;
                          }
                          newRealityInput.handleKeyDown(e);
                        }}
                        placeholder="新しいRealityを入力... (Enterで追加)"
                        className="text-sm h-7 flex-1"
                        disabled={isSubmittingReality}
                      />
                      <Button
                        onClick={() => handleAddReality(newRealityInput.value)}
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={
                          !newRealityInput.value.trim() || isSubmittingReality
                        }
                      >
                        {isSubmittingReality ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {focusedArea === "tension" && (
              <div className="h-full">
                <div className="flex flex-col bg-white border-2 border-gray-300 rounded-lg shadow-sm h-full overflow-hidden">
                  <div className="px-3 py-2 border-b bg-white flex items-center justify-between rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        Tension & Action
                      </h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setFocusedArea(null)}
                    >
                      <Minimize2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="p-3 space-y-4" data-nav-scope="tension-action">
                      {(() => {
                        const areaOrder =
                          selectedAreaId === "all"
                            ? [...chart.areas.map((area) => area.id), null]
                            : selectedAreaId === "uncategorized"
                              ? [null]
                              : [selectedAreaId];

                        return (
                          <DndContext
                            id="dnd-context-action-focused"
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleTensionDragEnd}
                          >
                            <div className="space-y-4">
                              {areaOrder.map((areaId) => {
                                const area = areaId
                                  ? chart.areas.find((a) => a.id === areaId)
                                  : null;
                                const areaName = area ? area.name : "未分類";
                                const areaColor = area ? area.color : "#9CA3AF";
                                const group = areaId
                                  ? structuredData.categorized.find(
                                      (g) => g.area.id === areaId
                                    )
                                  : structuredData.uncategorized;

                                const tensionsInSection = group ? group.tensions : [];
                                const looseActionsInSection = group
                                  ? group.orphanedActions
                                  : [];

                                return (
                                  <ActionSection
                                    key={areaId || "uncategorized"}
                                    areaId={areaId}
                                    areaName={areaName}
                                    areaColor={areaColor}
                                    tensionsInSection={tensionsInSection}
                                    looseActions={looseActionsInSection}
                                    allTensions={tensions}
                                    handleUpdateActionPlan={handleUpdateActionPlan}
                                    handleDeleteActionPlan={handleDeleteActionPlan}
                                    handleTelescopeClick={handleTelescopeClick}
                                    telescopingActionId={telescopingActionId}
                                    currentUser={currentUser}
                                    areas={chart.areas}
                                    chartId={chartId}
                                    onOpenDetailPanel={handleOpenDetailPanel}
                                    getSortedAndNumberedActions={
                                      getSortedAndNumberedActions
                                    }
                                    isSubmittingAction={isSubmittingAction}
                                    onAddAction={handleAddActionPlan}
                                    onAddTension={handleAddTension}
                                    visions={visions}
                                    realities={realities}
                                    toggleVisionRealityLink={toggleVisionRealityLink}
                                    setHighlightedItemId={setHighlightedItemId}
                                    handleUpdateTension={handleUpdateTension}
                                    handleDeleteTension={handleDeleteTension}
                                    onOpenFocus={(tension) => {
                                      openFocusMode(
                                        "tension",
                                        tension.id,
                                        tension.title || "Tension",
                                        tension.title || ""
                                      );
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </DndContext>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex gap-4 overflow-hidden">
            {/* Left Panel: Context Source (Vision + Reality) */}
            <div className="w-1/2 h-full p-6 flex flex-col gap-4 overflow-hidden">
              {/* Vision Area - 50% */}
              <div className="flex-1 min-h-0">
                <div className="h-full flex flex-col bg-white border-2 border-blue-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-white flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <h2 className="text-base font-bold text-foreground leading-tight">Vision</h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setFocusedArea(focusedArea === "vision" ? null : "vision")}
                    >
                      {focusedArea === "vision" ? (
                        <Minimize2 className="w-3 h-3" />
                      ) : (
                        <Maximize2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 overflow-auto">
                    <DndContext
                      id="dnd-context-vision-focused"
                      sensors={sensors}
                      collisionDetection={customCollisionDetection}
                      onDragEnd={(e) => handleDragEnd(e, "visions")}
                    >
                      <div id="vision-list-container" className="space-y-0" data-nav-scope="vision">
                        {renderVisionContent()}
                      </div>
                    </DndContext>
                  </ScrollArea>
                  <div className="p-2 border-t bg-white shrink-0">
                    <div className="flex gap-2">
                      <Input
                        {...newVisionInput.bind}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddVision(newVisionInput.value);
                            return;
                          }
                          newVisionInput.handleKeyDown(e);
                        }}
                        placeholder="新しいVisionを入力... (Enterで追加)"
                        className="text-sm h-7 flex-1"
                        disabled={isSubmittingVision}
                      />
                      <Button
                        onClick={() => handleAddVision(newVisionInput.value)}
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={!newVisionInput.value.trim() || isSubmittingVision}
                      >
                        {isSubmittingVision ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reality Area - 50% */}
              <div className="flex-1 min-h-0">
                <div className="h-full flex flex-col bg-white border-2 border-orange-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="px-3 py-2 border-b bg-white flex items-center justify-between rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <h2 className="text-base font-bold text-foreground leading-tight">Reality</h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setFocusedArea(focusedArea === "reality" ? null : "reality")}
                    >
                      {focusedArea === "reality" ? (
                        <Minimize2 className="w-3 h-3" />
                      ) : (
                        <Maximize2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 min-h-0 overflow-auto">
                    <DndContext
                      id="dnd-context-reality"
                      sensors={sensors}
                      collisionDetection={customCollisionDetection}
                      onDragEnd={(e) => handleDragEnd(e, "realities")}
                    >
                      <div id="reality-list-container" className="space-y-0" data-nav-scope="reality">
                        {renderRealityContent()}
                      </div>
                    </DndContext>
                  </ScrollArea>
                  <div className="p-2 border-t bg-white shrink-0">
                    <div className="flex gap-2">
                      <Input
                        {...newRealityInput.bind}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddReality(newRealityInput.value);
                            return;
                          }
                          newRealityInput.handleKeyDown(e);
                        }}
                        placeholder="新しいRealityを入力... (Enterで追加)"
                        className="text-sm h-7 flex-1"
                        disabled={isSubmittingReality}
                      />
                      <Button
                        onClick={() => handleAddReality(newRealityInput.value)}
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={!newRealityInput.value.trim() || isSubmittingReality}
                      >
                        {isSubmittingReality ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Tension & Action - 50% */}
            <div className="w-1/2 h-full p-6 overflow-hidden">
              <div className="flex flex-col bg-white border-2 border-gray-300 rounded-lg shadow-sm h-full overflow-hidden">
                <div className="px-3 py-2 border-b bg-white flex items-center justify-between rounded-t-lg shrink-0">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <h2 className="text-base font-bold text-foreground leading-tight">Tension & Action</h2>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setFocusedArea(focusedArea === "tension" ? null : "tension")}
                  >
                    {focusedArea === "tension" ? (
                      <Minimize2 className="w-3 h-3" />
                    ) : (
                      <Maximize2 className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-3 space-y-4" data-nav-scope="tension-action">
                    {(() => {
                      const areaOrder =
                        selectedAreaId === "all"
                          ? [...chart.areas.map((area) => area.id), null]
                          : selectedAreaId === "uncategorized"
                            ? [null]
                            : [selectedAreaId];

                      return (
                        <DndContext
                          id="dnd-context-action"
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleTensionDragEnd}
                        >
                          <div className="space-y-4">
                            {areaOrder.map((areaId) => {
                              const area = areaId ? chart.areas.find((a) => a.id === areaId) : null;
                              const areaName = area ? area.name : "未分類";
                              const areaColor = area ? area.color : "#9CA3AF";
                              const group = areaId
                                ? structuredData.categorized.find((g) => g.area.id === areaId)
                                : structuredData.uncategorized;

                              const tensionsInSection = group ? group.tensions : [];
                              const looseActionsInSection = group ? group.orphanedActions : [];

                              return (
                                <ActionSection
                                  key={areaId || "uncategorized"}
                                  areaId={areaId}
                                  areaName={areaName}
                                  areaColor={areaColor}
                                  tensionsInSection={tensionsInSection}
                                  looseActions={looseActionsInSection}
                                  allTensions={tensions}
                                  handleUpdateActionPlan={handleUpdateActionPlan}
                                  handleDeleteActionPlan={handleDeleteActionPlan}
                                  handleTelescopeClick={handleTelescopeClick}
                                  telescopingActionId={telescopingActionId}
                                  currentUser={currentUser}
                                  areas={chart.areas}
                                  chartId={chartId}
                                  onOpenDetailPanel={handleOpenDetailPanel}
                                  getSortedAndNumberedActions={getSortedAndNumberedActions}
                                  isSubmittingAction={isSubmittingAction}
                                  onAddAction={handleAddActionPlan}
                                  onAddTension={handleAddTension}
                                  visions={visions}
                                  realities={realities}
                                  toggleVisionRealityLink={toggleVisionRealityLink}
                                  setHighlightedItemId={setHighlightedItemId}
                                  handleUpdateTension={handleUpdateTension}
                                  handleDeleteTension={handleDeleteTension}
                                  onOpenFocus={(tension) => {
                                    openFocusMode(
                                      "tension",
                                      tension.id,
                                      tension.title || "Tension",
                                      tension.title || ""
                                    );
                                  }}
                                />
                              );
                            })}
                          </div>
                        </DndContext>
                      );
                    })()}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {focusMode && (
        <FocusModeModal
          isOpen={focusMode.isOpen}
          onClose={() => setFocusMode(null)}
          title={focusMode.title}
          sectionType={focusMode.sectionType}
          initialContent={focusMode.content}
          onSave={handleFocusModeSave}
        />
      )}

      {/* 詳細サイドパネル */}
      {detailPanel && (
        <ItemDetailPanel
          isOpen={detailPanel.isOpen}
          onClose={handleCloseDetailPanel}
          itemType={detailPanel.itemType}
          itemId={detailPanel.itemId}
          itemContent={detailPanel.itemContent}
          history={itemHistory}
          currentUserId={currentUserId || currentUser?.id}
          currentUser={currentUser}
          chartId={chartId}
          onAddHistory={handleAddHistory}
          onCommentCountChange={handleCommentCountChange}
        />
      )}
    </div>
  );
}
