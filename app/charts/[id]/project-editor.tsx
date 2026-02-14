"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
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
  ChevronDown,
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
  ArrowUpDown,
  ArrowRightLeft,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { fetchItemHistory, addItemHistoryEntry } from "./actions";
import { archiveChart, restoreChart, deleteChart } from "@/app/charts/actions";
import { updateChartStatusAction } from "./actions";
import type { HistoryItem } from "@/types/chart";
import { useItemInput } from "@/hooks/use-item-input";
import {
  StructuredTension,
  AreaGroup,
  UncategorizedGroup,
  StructuredData,
  TEXT_CLASSES,
  TEXT_FIXED_STYLE,
  TEXTAREA_CLASSES,
  VIEW_CLASSES,
  iconButtonClass,
  ICON_BTN_CLASS,
  ICON_CONTAINER_CLASS,
  navigateFocus,
  handleKeyboardNavigation,
  handleTextKeyboardNavigation,
  customCollisionDetection,
  splitItemsByDate,
  getActionStatusIcon,
  getActionStatusLabel,
} from "./editor-utils";
import { SortableVisionItem } from "./components/SortableVisionItem";
import { SortableRealityItem } from "./components/SortableRealityItem";
import { SortableActionItem } from "./components/SortableActionItem";
import { TensionGroup } from "./components/TensionGroup";
import { ActionSection } from "./components/ActionSection";
import { useVisionHandlers } from "./hooks/useVisionHandlers";

const DatePicker = dynamic(
  () => import("@/components/ui/date-picker").then((mod) => mod.DatePicker),
  { loading: () => null, ssr: false }
);
const CalendarComponent = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  { loading: () => null, ssr: false }
);
const AreaTagEditor = dynamic(
  () => import("@/components/area-tag-editor").then((mod) => mod.AreaTagEditor),
  { loading: () => null, ssr: false }
);
const TagManager = dynamic(
  () => import("@/components/tag/TagManager").then((mod) => mod.TagManager),
  { loading: () => null, ssr: false }
);
const ItemDetailPanel = dynamic(
  () =>
    import("@/components/item-detail-panel").then((mod) => mod.ItemDetailPanel),
  { loading: () => null, ssr: false }
);
const FocusModeModal = dynamic(
  () =>
    import("@/components/focus-mode-modal").then((mod) => mod.FocusModeModal),
  { loading: () => null, ssr: false }
);

// モジュールレベル変数（コンポーネント再マウントでもリセットされない）
let _pendingScrollRestore: number | null = null;

interface ProjectEditorProps {
  initialChart: Chart;
  chartId: string;
  workspaceId?: string;
  currentUserId: string;
  currentUser?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string | null;
  } | null;
}

export function ProjectEditor({
  initialChart,
  chartId,
  workspaceId,
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
  const [hoveredSection, setHoveredSection] = useState<
    "vision" | "reality" | "tension" | null
  >(null);
  const [focusedArea, setFocusedArea] = useState<
    "vision" | "reality" | "tension" | null
  >(null);
  const [viewMode, setViewMode] = useState<"default" | "comparison">("default");
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [archiveChartDialogOpen, setArchiveChartDialogOpen] = useState(false);
  const [deleteChartDialogOpen, setDeleteChartDialogOpen] = useState(false);
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
  const [sortByStatus, setSortByStatus] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showCompletedTensions, setShowCompletedTensions] = useState(false);
  const [expandedCompletedTensions, setExpandedCompletedTensions] = useState<Set<string>>(new Set());

  const { handleAddVision, handleUpdateVision, handleDeleteVision } = useVisionHandlers({
    chartId,
    visions,
    setVisions,
    selectedAreaId,
    isSubmittingVision,
    setIsSubmittingVision,
    pendingDeletions,
    setPendingDeletions,
    newVisionInput,
    chart,
    router,
  });

  const toggleCompletedTensionExpand = (tensionId: string) => {
    setExpandedCompletedTensions((prev) => {
      const next = new Set(prev);
      if (next.has(tensionId)) {
        next.delete(tensionId);
      } else {
        next.add(tensionId);
      }
      return next;
    });
  };

  const isTensionCompleted = (tension: Tension) => {
    if (tension.status === "resolved") return true;
    if (
      tension.actionPlans.length > 0 &&
      tension.actionPlans.every((a) => a.status === "done" || a.isCompleted)
    ) {
      return true;
    }
    return false;
  };

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
    [initialChart.id]
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
      onOpenAreaSettings={() => setTagManagerOpen(true)}
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
                <span className="text-sm font-bold text-zenshin-navy">{area.name}</span>
                <span className="ml-2 text-xs text-zenshin-navy/40">({areaVisions.length}件)</span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext items={areaVisions} strategy={verticalListSortingStrategy}>
                  {areaVisions.length === 0 ? (
                    <div className="text-zenshin-navy/40 text-sm py-2 px-1 select-none opacity-60">
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
                        onOpenAreaSettings={() => setTagManagerOpen(true)}
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
                <span className="text-sm font-bold text-zenshin-navy">未分類</span>
                <span className="ml-2 text-xs text-zenshin-navy/40">
                  ({uncategorizedVisions.length}件)
                </span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext
                  items={uncategorizedVisions}
                  strategy={verticalListSortingStrategy}
                >
                  {uncategorizedVisions.length === 0 ? (
                    <div className="text-zenshin-navy/40 text-sm py-2 px-1 select-none opacity-60">
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
                        onOpenAreaSettings={() => setTagManagerOpen(true)}
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
      onOpenAreaSettings={() => setTagManagerOpen(true)}
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
                <span className="text-sm font-bold text-zenshin-navy">{area.name}</span>
                <span className="ml-2 text-xs text-zenshin-navy/40">({areaRealities.length}件)</span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext items={areaRealities} strategy={verticalListSortingStrategy}>
                  {areaRealities.length === 0 ? (
                    <div className="text-zenshin-navy/40 text-sm py-2 px-1 select-none opacity-60">
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
                        onOpenAreaSettings={() => setTagManagerOpen(true)}
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
          const uncategorizedRealities = realities.filter((r) => !r.area_id);
          return (
            <div className="mb-4 last:mb-0">
              <div className="flex items-center px-3 mb-1">
                <span className="w-3 h-3 rounded-full mr-2 bg-gray-400" />
                <span className="text-sm font-bold text-zenshin-navy">未分類</span>
                <span className="ml-2 text-xs text-zenshin-navy/40">
                  ({uncategorizedRealities.length}件)
                </span>
              </div>
              <div className="space-y-1 px-3 py-2 transition-all min-h-[40px]">
                <SortableContext
                  items={uncategorizedRealities}
                  strategy={verticalListSortingStrategy}
                >
                  {uncategorizedRealities.length === 0 ? (
                    <div className="text-zenshin-navy/40 text-sm py-2 px-1 select-none opacity-60">
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
                        onOpenAreaSettings={() => setTagManagerOpen(true)}
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

  // Reality追加: 楽観的UI（ローカルState即時更新）
  // areaIdOverride: ComparisonView などからエリアを指定して追加する場合に渡す（"uncategorized" は null にマップ）
  const handleAddReality = async (content: string, areaIdOverride?: string | null) => {
    if (!content.trim() || isSubmittingReality) return;

    setIsSubmittingReality(true);
    const contentToAdd = content.trim();
    const areaId =
      areaIdOverride !== undefined
        ? (areaIdOverride === "uncategorized" ? null : areaIdOverride)
        : selectedAreaId === "all"
          ? null
          : selectedAreaId;

    // 楽観的にローカルStateを即時更新
    const tempId = `temp-${Date.now()}`;
    const optimisticReality: RealityItem = {
      id: tempId,
      content: contentToAdd,
      createdAt: new Date().toISOString(),
      area_id: areaId,
    };
    setRealities((prev) => [...prev, optimisticReality]);
    if (areaIdOverride === undefined) newRealityInput.setValue("");

    try {
      const newReality = await addReality(chartId, contentToAdd, areaId);
      if (newReality) {
        // 成功: tempIdを実際のIDに置換
        setRealities((prev) =>
          prev.map((r) => (r.id === tempId ? newReality : r))
        );
      } else {
        // 失敗: 楽観的に追加したものを削除
        setRealities((prev) => prev.filter((r) => r.id !== tempId));
        newRealityInput.setValue(contentToAdd);
        console.error("[handleAddReality] 保存失敗 - ロールバック");
      }
    } catch (error) {
      console.error("[handleAddReality] エラー:", error);
      setRealities((prev) => prev.filter((r) => r.id !== tempId));
      newRealityInput.setValue(contentToAdd);
    } finally {
      setIsSubmittingReality(false);
    }
  };

  const handleUpdateReality = async (
    id: string,
    field: "content" | "isLocked" | "areaId" | "dueDate",
    value: string | boolean | null
  ) => {
    // 楽観的にローカルStateを即時更新
    const originalRealities = [...realities];
    setRealities((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "content") return { ...r, content: value as string };
        if (field === "isLocked") return { ...r, isLocked: value as boolean };
        if (field === "areaId") return { ...r, area_id: value as string | null };
        if (field === "dueDate") return { ...r, dueDate: (value as string) || undefined };
        return r;
      })
    );
    if (field === "areaId") {
      const areaName = value
        ? chart.areas.find((area: Area) => area.id === value)?.name
        : "未分類";
      toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
    }

    const success = await updateRealityItem(id, chartId, field, value);
    if (!success) {
      // 失敗: ロールバック
      setRealities(originalRealities);
      console.error("[handleUpdateReality] 更新失敗 - ロールバック");
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

    // 15秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeReality(id, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setRealities(originalRealities);
        toast.error("削除に失敗しました", { duration: 5000 });
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 15000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "reality",
        item: reality,
        timeoutId,
      },
    }));

    toast.success("Realityを削除しました", {
      duration: 15000,
      action: {
        label: "元に戻す",
        onClick: () => {
          clearTimeout(timeoutId);
          setRealities(originalRealities);
          setPendingDeletions((prev) => {
            const next = { ...prev };
            delete next[existingKey];
            return next;
          });
        },
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
    const titleToAdd = title.trim();

    // 楽観的にローカルStateを即時更新
    const tempId = `temp-${Date.now()}`;
    const optimisticTension: Tension = {
      id: tempId,
      title: titleToAdd,
      status: "active" as TensionStatus,
      area_id: areaId ?? null,
      visionIds: [],
      realityIds: [],
      actionPlans: [],
    };
    setTensions((prev) => [...prev, optimisticTension]);

    try {
      const newTension = await addTension(chartId, titleToAdd, areaId);
      if (newTension) {
        // 成功: tempIdを実際のデータに置換
        setTensions((prev) =>
          prev.map((t) => (t.id === tempId ? newTension : t))
        );
      } else {
        // 失敗: ロールバック
        setTensions((prev) => prev.filter((t) => t.id !== tempId));
        console.error("[handleAddTension] 保存失敗 - ロールバック");
      }
    } catch (error) {
      console.error("[handleAddTension] エラー:", error);
      setTensions((prev) => prev.filter((t) => t.id !== tempId));
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
      // statusの場合はローカルstateを即座に更新してUIをリアルタイム反映
      if (field === "status") {
        setTensions((prev) =>
          prev.map((t) =>
            t.id === tensionId ? { ...t, status: value as TensionStatus } : t
          )
        );
        if (value === "resolved") {
          toast.success("Tensionを完了にしました", { duration: 3000 });
        } else if (value === "active") {
          toast.success("Tensionを再開しました", { duration: 3000 });
        }
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

    // 15秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeTension(tensionId, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setTensions(originalTensions);
        toast.error("削除に失敗しました", { duration: 5000 });
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 15000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "tension",
        item: tension,
        timeoutId,
      },
    }));

    toast.success("Tensionを削除しました", {
      duration: 15000,
      action: {
        label: "元に戻す",
        onClick: () => {
          clearTimeout(timeoutId);
          setTensions(originalTensions);
          setPendingDeletions((prev) => {
            const next = { ...prev };
            delete next[existingKey];
            return next;
          });
        },
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

  const handleOptimisticMove = (sourceTensionId: string, targetTensionId: string, action: ActionPlan) => {
    setTensions((prev) =>
      prev.map((tension) => {
        if (tension.id === sourceTensionId) {
          return { ...tension, actionPlans: tension.actionPlans.filter((a) => a.id !== action.id) };
        }
        if (tension.id === targetTensionId) {
          return { ...tension, actionPlans: [...tension.actionPlans, action] };
        }
        return tension;
      })
    );
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
          setLooseActions((prev) => (movedAction ? [movedAction, ...prev] : prev));
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
        toast.error("移動に失敗しました", { duration: 5000 });
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

    // dueDateは楽観的にローカル状態を更新
    if (field === "dueDate") {
      updateActionInState((action) => ({
        ...action,
        dueDate: value as string | undefined,
      }));
    }

    // titleも楽観的にローカル状態を更新（D&D時のstate再構築で古い値に戻るのを防ぐ）
    if (field === "title") {
      updateActionInState((action) => ({
        ...action,
        title: value as string,
      }));
    }

    const success = await updateActionPlanItem(actionId, tensionId, field, value, chartId);
    if (!success) {
      console.error("[handleUpdateActionPlan] 更新失敗");
      // 失敗時はロールバック
      if (field === "dueDate" || field === "status" || field === "isCompleted") {
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

    // 15秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeActionPlan(actionId, tensionId, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setTensions(originalTensions);
        setLooseActions(originalLooseActions);
        toast.error("削除に失敗しました", { duration: 5000 });
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 15000);

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

    toast.success("Actionを削除しました", {
      duration: 15000,
      action: {
        label: "元に戻す",
        onClick: () => {
          clearTimeout(timeoutId);
          setTensions(originalTensions);
          setLooseActions(originalLooseActions);
          setPendingDeletions((prev) => {
            const next = { ...prev };
            delete next[existingKey];
            return next;
          });
        },
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
            toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
          } else {
            throw new Error("Update failed");
          }
        } catch (error) {
          console.error("❌ Server update failed:", error);
          setVisions(previousState);
          toast.error("移動に失敗しました", { duration: 5000 });
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
        toast.error("並び順の更新に失敗しました", { duration: 5000 });
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
          toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
        } else {
          setRealities(previousState);
          toast.error("移動に失敗しました", { duration: 5000 });
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
        toast.error("並び順の更新に失敗しました", { duration: 5000 });
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
        toast.error("並び順の更新に失敗しました", { duration: 5000 });
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
          toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
        } else {
          setTensions(previousState);
          toast.error("移動に失敗しました", { duration: 5000 });
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
        toast.error("並び順の更新に失敗しました", { duration: 5000 });
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
        toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
      } else {
        setTensions(previousTensions);
        setLooseActions(previousLooseActions);
        toast.error("移動に失敗しました", { duration: 5000 });
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
          toast.error("並び順の更新に失敗しました", { duration: 5000 });
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
        toast.success("スナップショットを保存しました", { duration: 3000 });
      } else {
        toast.error(`スナップショットの保存に失敗しました: ${result.error || "不明なエラー"}`, { duration: 5000 });
      }
    } catch (error) {
      console.error("[handleCreateSnapshot] エラー:", error);
      toast.error("スナップショットの保存中にエラーが発生しました", { duration: 5000 });
    } finally {
      setIsSavingSnapshot(false);
    }
  };

  const handleArchiveChart = async () => {
    if (!chart?.id) return;
    setArchiveChartDialogOpen(false);
    setIsChartMenuLoading(true);
    try {
      const result = await archiveChart(chart.id);
      toast.success(`${result.archivedCount}件のチャートをアーカイブしました`, {
        duration: 3000,
        action: {
          label: "元に戻す",
          onClick: async () => {
            await restoreChart(chart.id);
            toast.success("アーカイブを復元しました", { duration: 3000 });
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
      toast.error("アーカイブに失敗しました", { duration: 5000 });
    } finally {
      setIsChartMenuLoading(false);
    }
  };

  const handleDeleteChart = async () => {
    if (!chart?.id) return;
    setDeleteChartDialogOpen(false);
    setIsChartMenuLoading(true);
    try {
      await deleteChart(chart.id);
      toast.success("チャートを削除しました", { duration: 3000 });
      if (chart.parentChartId) {
        router.push(`/charts/${chart.parentChartId}`);
      } else {
        router.push("/charts");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("削除に失敗しました", { duration: 5000 });
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

      // 親アクションの日付も同期（子→親）
      if (chart.parentActionId) {
        const { error: parentError } = await supabase
          .from("actions")
          .update({
            due_date: dueDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", chart.parentActionId);
        if (parentError) {
          console.error("[handleUpdateChartDueDate] parent action sync error:", parentError);
        }
      }
    } catch (err) {
      console.error("[handleUpdateChartDueDate] Exception:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zenshin-cream">
      {/* アーカイブ確認ダイアログ */}
      <AlertDialog open={archiveChartDialogOpen} onOpenChange={setArchiveChartDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-gray-200 shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-zenshin-navy">
              チャートをアーカイブしますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              「{chart?.title}」とその全てのサブチャートをアーカイブします。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg px-4 py-2 text-sm">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg px-4 py-2 text-sm bg-zenshin-navy text-white hover:bg-zenshin-navy/90"
              onClick={handleArchiveChart}
            >
              アーカイブする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 完全削除確認ダイアログ */}
      <AlertDialog open={deleteChartDialogOpen} onOpenChange={setDeleteChartDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-gray-200 shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-zenshin-navy">
              チャートを完全に削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg px-4 py-2 text-sm">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600"
              onClick={handleDeleteChart}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ヘッダー */}
      <header className="border-b border-zenshin-navy/10 bg-zenshin-cream sticky top-0 z-10">
        {/* 上段: パンくず & アクション */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-zenshin-navy/5">
          <nav className="flex items-center gap-2 text-sm text-zenshin-navy/50">
            <Link href="/charts" className="hover:text-zenshin-navy transition-colors">
              <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 text-zenshin-navy/30" />
            {(() => {
              const breadcrumbItems = breadcrumbs.filter((crumb) => crumb.id !== "root");
              if (breadcrumbItems.length === 0) {
                return (
                  <span className="text-zenshin-navy font-medium truncate max-w-[200px]">
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
                        className="hover:text-zenshin-navy transition-colors truncate max-w-[150px]"
                      >
                        {crumb.title}
                      </Link>
                    ) : (
                      <span
                        className={`truncate max-w-[200px] ${
                          isLast || isCurrentChart ? "text-zenshin-navy font-medium" : "text-zenshin-navy/50"
                        }`}
                      >
                        {crumb.title}
                      </span>
                    )}
                    {!isLast && <ChevronRight className="w-4 h-4 text-zenshin-navy/30" />}
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
                <DropdownMenuItem
                  onSelect={async () => {
                    const newStatus = chart.status === "completed" ? "active" : "completed";
                    const result = await updateChartStatusAction(chartId, newStatus);
                    if (result.error) {
                      toast.error("ステータスの更新に失敗しました", { duration: 5000 });
                    } else {
                      setChart((prev) => ({ ...prev, status: newStatus }));
                      toast.success(
                        newStatus === "completed" ? "チャートを完了にしました" : "チャートを再開しました",
                        { duration: 3000 }
                      );
                    }
                  }}
                  className="gap-2"
                >
                  {chart.status === "completed" ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      チャートを再開
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      チャートを完了にする
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setArchiveChartDialogOpen(true)}
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  アーカイブ
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDeleteChartDialogOpen(true)}
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
        <div className="px-6 py-4 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            {...chartTitleInput.bind}
            className="text-2xl font-bold text-zenshin-navy bg-transparent border-none outline-none w-full hover:bg-zenshin-cream focus:bg-zenshin-cream rounded px-1 -ml-1 transition-colors min-w-0"
            placeholder="チャートの目的を一言で"
          />
          {chart.status === "completed" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              完了
            </span>
          )}
        </div>

        {/* 下段: メタデータ & フィルター */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-zenshin-navy/5">
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zenshin-navy/70 hover:text-zenshin-navy hover:bg-white/60 rounded-lg transition-colors cursor-pointer">
                  <CalendarIcon className="w-3.5 h-3.5" />
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
                      className="w-full text-zenshin-navy/50 hover:text-red-500"
                      onClick={() => handleUpdateChartDueDate(null)}
                    >
                      期限をクリア
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="h-3.5 w-px bg-gray-200" />

            <Select value={selectedAreaId || "all"} onValueChange={(value) => setSelectedAreaId(value)}>
              <SelectTrigger className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zenshin-navy/70 hover:text-zenshin-navy hover:bg-white/60 rounded-lg transition-colors cursor-pointer border-0 shadow-none bg-transparent h-auto w-auto justify-start min-w-0">
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

            <div className="h-3.5 w-px bg-gray-200" />

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zenshin-navy/70 hover:text-zenshin-navy hover:bg-white/60 rounded-lg transition-colors cursor-pointer"
              onClick={() => setTagManagerOpen(true)}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>タグ設定</span>
            </button>
          </div>

          {/* モード切替トグル */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5">
            <button
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                viewMode === "default"
                  ? "bg-zenshin-orange text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setViewMode("default")}
            >
              標準モード
            </button>
            <button
              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                viewMode === "comparison"
                  ? "bg-zenshin-orange text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setViewMode("comparison")}
            >
              対比モード
            </button>
          </div>
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
      <div className="flex-1 overflow-hidden bg-zenshin-cream">
        {focusedArea ? (
          <div className="h-full p-6">
            {focusedArea === "vision" && (
              <div className="h-full">
                <div
                  className={`flex flex-col bg-white border-2 rounded-lg shadow-sm h-full transition-all duration-200 ${
                    hoveredSection === "vision"
                      ? "border-zenshin-teal shadow-md shadow-zenshin-teal/20"
                      : "border-zenshin-teal/50"
                  }`}
                >
                  <div className="px-3 py-2 border-b bg-zenshin-teal/10 flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-zenshin-teal" />
                      <h2 className="text-base font-bold text-zenshin-navy leading-tight">Vision</h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-zenshin-navy/15 rounded transition-colors"
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
                        placeholder="＋ 新しいVisionを追加"
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
                <div
                  className={`flex flex-col bg-white border-2 rounded-lg shadow-sm h-full overflow-hidden transition-all duration-200 ${
                    hoveredSection === "reality"
                      ? "border-zenshin-orange shadow-md shadow-zenshin-orange/20"
                      : "border-zenshin-orange/50"
                  }`}
                >
                  <div className="px-3 py-2 border-b bg-zenshin-orange/10 flex items-center justify-between rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-zenshin-orange" />
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        Reality
                      </h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-zenshin-navy/15 rounded transition-colors"
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
                        placeholder="＋ 新しいRealityを追加"
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
                <div
                  className={`flex flex-col bg-white border-2 rounded-lg shadow-sm h-full overflow-hidden transition-all duration-200 ${
                    hoveredSection === "tension"
                      ? "border-zenshin-navy shadow-md shadow-zenshin-navy/20"
                      : "border-zenshin-navy/30"
                  }`}
                >
                  <div className="px-3 py-2 border-b bg-zenshin-navy/8 flex items-center justify-between rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-zenshin-navy" />
                      <h2 className="text-base font-bold text-foreground leading-tight">
                        Tension & Action
                      </h2>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-6 w-6 rounded transition-colors ${
                          sortByStatus
                            ? "bg-zenshin-navy/15 text-zenshin-navy"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        onClick={() => setSortByStatus(!sortByStatus)}
                        title="ステータス順に並べ替え"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-6 w-6 rounded transition-colors ${
                          hideCompleted
                            ? "bg-zenshin-orange/15 text-zenshin-orange"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        onClick={() => setHideCompleted(!hideCompleted)}
                        title={hideCompleted ? "完了済みを表示" : "完了済みを非表示"}
                      >
                        {hideCompleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        onClick={() => setFocusedArea(null)}
                        title="元に戻す"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </Button>
                    </div>
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

                        const allCompletedTensions: Tension[] = [];
                        areaOrder.forEach((areaId) => {
                          const group = areaId
                            ? structuredData.categorized.find(
                                (g) => g.area.id === areaId
                              )
                            : structuredData.uncategorized;
                          const tensions = group ? group.tensions : [];
                          allCompletedTensions.push(
                            ...tensions.filter((t) => isTensionCompleted(t))
                          );
                        });

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
                                const activeTensions = tensionsInSection.filter(
                                  (t) => !isTensionCompleted(t)
                                );
                                const looseActionsInSection = group
                                  ? group.orphanedActions
                                  : [];

                                return (
                                  <ActionSection
                                    key={areaId || "uncategorized"}
                                    areaId={areaId}
                                    areaName={areaName}
                                    areaColor={areaColor}
                                    tensionsInSection={activeTensions}
                                    looseActions={looseActionsInSection}
                                    allTensions={tensions}
                                    handleOptimisticMove={handleOptimisticMove}
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
                                    sortByStatus={sortByStatus}
                                    hideCompleted={hideCompleted}
                                    expandedCompletedTensions={expandedCompletedTensions}
                                    toggleCompletedTensionExpand={toggleCompletedTensionExpand}
                                  />
                                );
                              })}
                              {allCompletedTensions.length > 0 && (
                                <div className="border-t border-gray-100 mt-2">
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2.5 w-full text-left text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                    onClick={() =>
                                      setShowCompletedTensions(!showCompletedTensions)
                                    }
                                  >
                                    {showCompletedTensions ? (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                    完了済みTension（{allCompletedTensions.length}件）
                                  </button>
                                  {showCompletedTensions && (
                                    <div className="opacity-60">
                                      {allCompletedTensions.map((tension) => (
                                        <TensionGroup
                                          key={tension.id}
                                          tension={tension}
                                          tensionIndex={0}
                                          areaId={tension.area_id ?? null}
                                          allTensions={tensions}
                                          handleOptimisticMove={handleOptimisticMove}
                                          handleUpdateTension={handleUpdateTension}
                                          handleDeleteTension={handleDeleteTension}
                                          handleUpdateActionPlan={
                                            handleUpdateActionPlan
                                          }
                                          handleDeleteActionPlan={
                                            handleDeleteActionPlan
                                          }
                                          handleTelescopeClick={
                                            handleTelescopeClick
                                          }
                                          telescopingActionId={telescopingActionId}
                                          currentUser={currentUser}
                                          areas={chart.areas}
                                          chartId={chartId}
                                          onOpenDetailPanel={handleOpenDetailPanel}
                                          onAddAction={handleAddActionPlan}
                                          isSubmittingAction={isSubmittingAction}
                                          onOpenFocus={(t) =>
                                            openFocusMode(
                                              "tension",
                                              t.id,
                                              t.title || "Tension",
                                              t.title || ""
                                            )
                                          }
                                          sortByStatus={sortByStatus}
                                          hideCompleted={hideCompleted}
                                          expandedCompletedTensions={expandedCompletedTensions}
                                          toggleCompletedTensionExpand={toggleCompletedTensionExpand}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
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
        ) : viewMode === "comparison" ? (
          <ComparisonView
            visions={visions}
            realities={realities}
            tensions={tensions}
            looseActions={looseActions}
            areas={chart.areas ?? []}
            selectedAreaFilter={selectedAreaId}
            structuredData={structuredData}
            chartId={chartId}
            sensors={sensors}
            onTensionDragEnd={handleTensionDragEnd}
            onVisionRealityDragEnd={handleDragEnd}
            handleUpdateVision={handleUpdateVision}
            handleDeleteVision={handleDeleteVision}
            handleAddVision={handleAddVision}
            handleUpdateReality={handleUpdateReality}
            handleDeleteReality={handleDeleteReality}
            handleAddReality={handleAddReality}
            isSubmittingVision={isSubmittingVision}
            isSubmittingReality={isSubmittingReality}
            handleUpdateActionPlan={handleUpdateActionPlan}
            handleDeleteActionPlan={handleDeleteActionPlan}
            handleTelescopeClick={handleTelescopeClick}
            telescopingActionId={telescopingActionId}
            currentUser={currentUser}
            onOpenDetailPanel={handleOpenDetailPanel}
            onOpenAreaSettings={() => setTagManagerOpen(true)}
            highlightedItemId={highlightedItemId}
            onOpenFocusVision={(item, itemIndex) =>
              openFocusMode(
                "vision",
                item.id,
                `Vision V-${String(itemIndex + 1).padStart(2, "0")}`,
                item.content || ""
              )
            }
            onOpenFocusReality={(item, itemIndex) =>
              openFocusMode(
                "reality",
                item.id,
                `Reality R-${String(itemIndex + 1).padStart(2, "0")}`,
                item.content || ""
              )
            }
            getSortedAndNumberedActions={getSortedAndNumberedActions}
            isSubmittingAction={isSubmittingAction}
            onAddAction={handleAddActionPlan}
            onAddTension={handleAddTension}
            toggleVisionRealityLink={toggleVisionRealityLink}
            setHighlightedItemId={setHighlightedItemId}
            handleUpdateTension={handleUpdateTension}
            handleDeleteTension={handleDeleteTension}
            onOpenFocusTension={(t) =>
              openFocusMode("tension", t.id, t.title || "Tension", t.title || "")
            }
            sortByStatus={sortByStatus}
            setSortByStatus={setSortByStatus}
            hideCompleted={hideCompleted}
            setHideCompleted={setHideCompleted}
            showCompletedTensions={showCompletedTensions}
            setShowCompletedTensions={setShowCompletedTensions}
            isTensionCompleted={isTensionCompleted}
            expandedCompletedTensions={expandedCompletedTensions}
            toggleCompletedTensionExpand={toggleCompletedTensionExpand}
            handleOptimisticMove={handleOptimisticMove}
          />
        ) : (
          <div className="h-full flex gap-4 overflow-hidden">
            {/* Left Panel: Context Source (Vision + Reality) */}
            <div className="w-1/2 h-full p-6 flex flex-col gap-4 overflow-hidden">
              {/* Vision Area - 50% */}
              <div className="flex-1 min-h-0">
                <div
                  className={`h-full flex flex-col bg-white border-2 rounded-lg shadow-sm overflow-hidden transition-all duration-200 ${
                    hoveredSection === "vision"
                      ? "border-zenshin-teal shadow-md shadow-zenshin-teal/20"
                      : "border-zenshin-teal/50"
                  }`}
                >
                  <div className="px-3 py-2 border-b bg-zenshin-teal/10 flex items-center justify-between rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-zenshin-teal" />
                      <h2 className="text-base font-bold text-zenshin-navy leading-tight">Vision</h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-zenshin-teal/15 hover:text-zenshin-teal rounded transition-colors"
                      onClick={() =>
                        setFocusedArea(focusedArea === "vision" ? null : "vision")
                      }
                      onMouseEnter={() => setHoveredSection("vision")}
                      onMouseLeave={() => setHoveredSection(null)}
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
                        placeholder="＋ 新しいVisionを追加"
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
                <div
                  className={`h-full flex flex-col bg-white border-2 rounded-lg shadow-sm overflow-hidden transition-all duration-200 ${
                    hoveredSection === "reality"
                      ? "border-zenshin-orange shadow-md shadow-zenshin-orange/20"
                      : "border-zenshin-orange/50"
                  }`}
                >
                  <div className="px-3 py-2 border-b bg-zenshin-orange/10 flex items-center justify-between rounded-t-lg shrink-0">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-zenshin-orange" />
                      <h2 className="text-base font-bold text-zenshin-navy leading-tight">Reality</h2>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-zenshin-orange/15 hover:text-zenshin-orange rounded transition-colors"
                      onClick={() =>
                        setFocusedArea(focusedArea === "reality" ? null : "reality")
                      }
                      onMouseEnter={() => setHoveredSection("reality")}
                      onMouseLeave={() => setHoveredSection(null)}
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
                        placeholder="＋ 新しいRealityを追加"
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
              <div
                className={`flex flex-col bg-white border-2 rounded-lg shadow-sm h-full overflow-hidden transition-all duration-200 ${
                  hoveredSection === "tension"
                    ? "border-zenshin-navy shadow-md shadow-zenshin-navy/20"
                    : "border-zenshin-navy/30"
                }`}
              >
                <div className="px-3 py-2 border-b bg-zenshin-navy/8 flex items-center justify-between rounded-t-lg shrink-0">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-zenshin-navy" />
                    <h2 className="text-base font-bold text-zenshin-navy leading-tight">Tension & Action</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-6 w-6 rounded transition-colors ${
                        sortByStatus
                          ? "bg-zenshin-navy/15 text-zenshin-navy"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      }`}
                      onClick={() => setSortByStatus(!sortByStatus)}
                      title="ステータス順に並べ替え"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-6 w-6 rounded transition-colors ${
                        hideCompleted
                          ? "bg-zenshin-orange/15 text-zenshin-orange"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      }`}
                      onClick={() => setHideCompleted(!hideCompleted)}
                      title={hideCompleted ? "完了済みを表示" : "完了済みを非表示"}
                    >
                      {hideCompleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      onClick={() =>
                        setFocusedArea(focusedArea === "tension" ? null : "tension")
                      }
                      onMouseEnter={() => setHoveredSection("tension")}
                      onMouseLeave={() => setHoveredSection(null)}
                      title={focusedArea === "tension" ? "元に戻す" : "拡大表示"}
                    >
                      {focusedArea === "tension" ? (
                        <Minimize2 className="w-3 h-3" />
                      ) : (
                        <Maximize2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
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

                      const allCompletedTensions: Tension[] = [];
                      areaOrder.forEach((areaId) => {
                        const group = areaId
                          ? structuredData.categorized.find((g) => g.area.id === areaId)
                          : structuredData.uncategorized;
                        const tensionsFromGroup = group ? group.tensions : [];
                        allCompletedTensions.push(
                          ...tensionsFromGroup.filter((t) => isTensionCompleted(t))
                        );
                      });

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
                              const activeTensions = tensionsInSection.filter(
                                (t) => !isTensionCompleted(t)
                              );
                              const looseActionsInSection = group ? group.orphanedActions : [];

                              return (
                                <ActionSection
                                  key={areaId || "uncategorized"}
                                  areaId={areaId}
                                  areaName={areaName}
                                  areaColor={areaColor}
                                  tensionsInSection={activeTensions}
                                  looseActions={looseActionsInSection}
                                  allTensions={tensions}
                                  handleOptimisticMove={handleOptimisticMove}
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
                                  sortByStatus={sortByStatus}
                                  hideCompleted={hideCompleted}
                                  expandedCompletedTensions={expandedCompletedTensions}
                                  toggleCompletedTensionExpand={toggleCompletedTensionExpand}
                                />
                              );
                            })}
                            {allCompletedTensions.length > 0 && (
                              <div className="border-t border-gray-100 mt-2">
                                <button
                                  type="button"
                                  className="flex items-center gap-2 px-4 py-2.5 w-full text-left text-sm text-gray-400 hover:text-gray-600 transition-colors"
                                  onClick={() =>
                                    setShowCompletedTensions(!showCompletedTensions)
                                  }
                                >
                                  {showCompletedTensions ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                  完了済みTension（{allCompletedTensions.length}件）
                                </button>
                                {showCompletedTensions && (
                                  <div className="opacity-60">
                                    {allCompletedTensions.map((tension) => (
                                      <TensionGroup
                                        key={tension.id}
                                        tension={tension}
                                        tensionIndex={0}
                                        areaId={tension.area_id ?? null}
                                        allTensions={tensions}
                                        handleOptimisticMove={handleOptimisticMove}
                                        handleUpdateTension={handleUpdateTension}
                                        handleDeleteTension={handleDeleteTension}
                                        handleUpdateActionPlan={
                                          handleUpdateActionPlan
                                        }
                                        handleDeleteActionPlan={
                                          handleDeleteActionPlan
                                        }
                                        handleTelescopeClick={handleTelescopeClick}
                                        telescopingActionId={telescopingActionId}
                                        currentUser={currentUser}
                                        areas={chart.areas}
                                        chartId={chartId}
                                        onOpenDetailPanel={handleOpenDetailPanel}
                                        onAddAction={handleAddActionPlan}
                                        isSubmittingAction={isSubmittingAction}
                                        onOpenFocus={(t) =>
                                          openFocusMode(
                                            "tension",
                                            t.id,
                                            t.title || "Tension",
                                            t.title || ""
                                          )
                                        }
                                        sortByStatus={sortByStatus}
                                        hideCompleted={hideCompleted}
                                        expandedCompletedTensions={expandedCompletedTensions}
                                        toggleCompletedTensionExpand={toggleCompletedTensionExpand}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
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
          workspaceId={workspaceId}
          onAddHistory={handleAddHistory}
          onCommentCountChange={handleCommentCountChange}
        />
      )}
    </div>
  );
}

function ComparisonView({
  visions,
  realities,
  tensions,
  looseActions,
  areas,
  selectedAreaFilter,
  structuredData,
  chartId,
  sensors,
  onTensionDragEnd,
  onVisionRealityDragEnd,
  handleUpdateVision,
  handleDeleteVision,
  handleAddVision,
  handleUpdateReality,
  handleDeleteReality,
  handleAddReality,
  isSubmittingVision,
  isSubmittingReality,
  handleUpdateActionPlan,
  handleDeleteActionPlan,
  handleTelescopeClick,
  telescopingActionId,
  currentUser,
  onOpenDetailPanel,
  onOpenAreaSettings,
  highlightedItemId,
  onOpenFocusVision,
  onOpenFocusReality,
  getSortedAndNumberedActions,
  isSubmittingAction,
  onAddAction,
  onAddTension,
  toggleVisionRealityLink,
  setHighlightedItemId,
  handleUpdateTension,
  handleDeleteTension,
  onOpenFocusTension,
  sortByStatus,
  setSortByStatus,
  hideCompleted,
  setHideCompleted,
  showCompletedTensions,
  setShowCompletedTensions,
  isTensionCompleted,
  expandedCompletedTensions = new Set(),
  toggleCompletedTensionExpand,
  handleOptimisticMove,
}: {
  visions: VisionItem[];
  realities: RealityItem[];
  tensions: Tension[];
  looseActions: ActionPlan[];
  areas: Area[];
  selectedAreaFilter: string;
  structuredData: StructuredData;
  chartId: string;
  sensors: ReturnType<typeof useSensors>;
  onTensionDragEnd: (event: DragEndEvent) => void;
  onVisionRealityDragEnd: (event: DragEndEvent, type: "visions" | "realities") => void;
  handleUpdateVision: (id: string, field: "content" | "assignee" | "dueDate" | "targetDate" | "isLocked" | "areaId", value: string | boolean | null) => Promise<void>;
  handleDeleteVision: (id: string) => Promise<void>;
  handleAddVision: (content: string, areaId?: string | null) => void;
  handleUpdateReality: (id: string, field: "content" | "isLocked" | "areaId" | "dueDate", value: string | boolean | null) => Promise<void>;
  handleDeleteReality: (id: string) => Promise<void>;
  handleAddReality: (content: string, areaId?: string | null) => void;
  isSubmittingVision: boolean;
  isSubmittingReality: boolean;
  handleUpdateActionPlan: (
    tensionId: string | null,
    actionId: string,
    field: "title" | "dueDate" | "assignee" | "status" | "hasSubChart" | "subChartId" | "childChartId" | "isCompleted" | "description" | "areaId",
    value: string | boolean | null
  ) => Promise<void>;
  handleDeleteActionPlan: (tensionId: string | null, actionId: string) => Promise<void>;
  handleTelescopeClick: (actionPlan: ActionPlan, tensionId: string | null) => Promise<void>;
  telescopingActionId: string | null;
  currentUser: { id?: string; email: string; name?: string; avatar_url?: string | null } | null;
  onOpenDetailPanel: (itemType: "vision" | "reality" | "action", itemId: string, itemContent: string) => void;
  onOpenAreaSettings?: () => void;
  highlightedItemId: string | null;
  onOpenFocusVision: (item: VisionItem, index: number) => void;
  onOpenFocusReality: (item: RealityItem, index: number) => void;
  getSortedAndNumberedActions: (actions: ActionPlan[]) => Array<{ action: ActionPlan; number: number }>;
  isSubmittingAction: Record<string, boolean>;
  onAddAction: (tensionId: string | null, title: string, areaId?: string | null) => void;
  onAddTension: (title: string, areaId?: string | null) => void;
  toggleVisionRealityLink: (tensionId: string, type: "vision" | "reality", id: string) => void;
  setHighlightedItemId: (id: string | null) => void;
  handleUpdateTension: (tensionId: string, field: "title" | "description" | "status", value: string | TensionStatus) => void;
  handleDeleteTension: (tensionId: string) => void;
  onOpenFocusTension: (tension: Tension) => void;
  sortByStatus: boolean;
  setSortByStatus: (v: boolean) => void;
  hideCompleted: boolean;
  setHideCompleted: (v: boolean) => void;
  showCompletedTensions: boolean;
  setShowCompletedTensions: (v: boolean) => void;
  isTensionCompleted: (tension: Tension) => boolean;
  expandedCompletedTensions?: Set<string>;
  toggleCompletedTensionExpand?: (tensionId: string) => void;
  handleOptimisticMove?: (sourceTensionId: string, targetTensionId: string, action: ActionPlan) => void;
}) {
  const [visionInputByArea, setVisionInputByArea] = useState<Record<string, string>>({});
  const [realityInputByArea, setRealityInputByArea] = useState<Record<string, string>>({});

  const allAreaIds = useMemo(() => {
    const areaIds = new Set<string>();
    visions.forEach((v) => areaIds.add(v.area_id || "uncategorized"));
    realities.forEach((r) => areaIds.add(r.area_id || "uncategorized"));
    return Array.from(areaIds);
  }, [visions, realities]);

  const getAreaName = (areaId: string) => {
    if (areaId === "uncategorized") return "未分類";
    const area = areas.find((a) => a.id === areaId);
    return area?.name || "未分類";
  };

  const getAreaColor = (areaId: string) => {
    if (areaId === "uncategorized") return "#9CA3AF";
    const area = areas.find((a) => a.id === areaId);
    return area?.color || "#9CA3AF";
  };

  const areaOrder =
    selectedAreaFilter === "all"
      ? [...areas.map((a) => a.id), null]
      : selectedAreaFilter === "uncategorized"
        ? [null]
        : [selectedAreaFilter];

  const handleVrDragEnd = (event: DragEndEvent) => {
    const isVision = visions.some((v) => v.id === event.active.id);
    onVisionRealityDragEnd(event, isVision ? "visions" : "realities");
  };

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* V/R対比エリア — コンテンツに合わせて伸びる */}
      <div className="flex-none p-6 pb-3">
        <DndContext
          id="dnd-context-comparison-vr"
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragEnd={handleVrDragEnd}
        >
          <div className="space-y-6">
            {allAreaIds.map((areaId) => {
              const areaVisions = visions.filter((v) => (v.area_id || "uncategorized") === areaId);
              const areaRealities = realities.filter((r) => (r.area_id || "uncategorized") === areaId);

              if (selectedAreaFilter !== "all" && selectedAreaFilter !== areaId) return null;
              if (areaVisions.length === 0 && areaRealities.length === 0) return null;

              const visionInput = visionInputByArea[areaId] ?? "";
              const realityInput = realityInputByArea[areaId] ?? "";
              const setVisionInput = (v: string) =>
                setVisionInputByArea((prev) => ({ ...prev, [areaId]: v }));
              const setRealityInput = (v: string) =>
                setRealityInputByArea((prev) => ({ ...prev, [areaId]: v }));

              return (
                <div
                  key={areaId}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                >
                  {/* タグ名ヘッダー — カードの上部 */}
                  <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getAreaColor(areaId) }}
                    />
                    <span className="text-sm font-semibold text-zenshin-navy">
                      {getAreaName(areaId)}
                    </span>
                  </div>

                  {/* V | R 横並び */}
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    {/* Vision側 */}
                    <div className="p-0">
                      <div className="px-3 py-1.5 bg-zenshin-teal/8 border-b border-gray-100 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-zenshin-teal" />
                        <span className="text-xs font-bold text-zenshin-teal uppercase tracking-wider">Vision</span>
                      </div>
                      <div className="space-y-1 px-2 py-2 min-h-[40px]">
                        <SortableContext items={areaVisions} strategy={verticalListSortingStrategy}>
                          {areaVisions.length === 0 ? (
                            <div className="text-zenshin-navy/40 text-sm py-2 px-1 select-none opacity-60">
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
                                areas={areas}
                                onOpenDetail={(item) =>
                                  onOpenDetailPanel("vision", item.id, item.content || "")
                                }
                                onOpenFocus={(item, itemIndex) =>
                                  onOpenFocusVision(item, itemIndex)
                                }
                                onOpenAreaSettings={onOpenAreaSettings}
                                currentUser={currentUser as any}
                              />
                            ))
                          )}
                        </SortableContext>
                      </div>
                      <div className="p-2 border-t border-gray-100 flex gap-2">
                        <Input
                          value={visionInput}
                          onChange={(e) => setVisionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (visionInput.trim()) {
                                handleAddVision(visionInput.trim(), areaId === "uncategorized" ? null : areaId);
                                setVisionInput("");
                              }
                              return;
                            }
                          }}
                          placeholder="＋ 新しいVisionを追加"
                          className="text-sm h-7 flex-1"
                          disabled={isSubmittingVision}
                        />
                        <Button
                          onClick={() => {
                            if (visionInput.trim()) {
                              handleAddVision(visionInput.trim(), areaId === "uncategorized" ? null : areaId);
                              setVisionInput("");
                            }
                          }}
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={!visionInput.trim() || isSubmittingVision}
                        >
                          {isSubmittingVision ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Reality側 */}
                    <div className="p-0">
                      <div className="px-3 py-1.5 bg-zenshin-orange/8 border-b border-gray-100 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-zenshin-orange" />
                        <span className="text-xs font-bold text-zenshin-orange uppercase tracking-wider">Reality</span>
                      </div>
                      <div className="space-y-1 px-2 py-2 min-h-[40px]">
                        <SortableContext items={areaRealities} strategy={verticalListSortingStrategy}>
                          {areaRealities.length === 0 ? (
                            <div className="text-zenshin-navy/40 text-sm py-2 px-1 select-none opacity-60">
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
                                areas={areas}
                                onOpenDetail={(item) =>
                                  onOpenDetailPanel("reality", item.id, item.content || "")
                                }
                                onOpenFocus={(item, itemIndex) =>
                                  onOpenFocusReality(item, itemIndex)
                                }
                                onOpenAreaSettings={onOpenAreaSettings}
                                currentUser={currentUser as any}
                              />
                            ))
                          )}
                        </SortableContext>
                      </div>
                      <div className="p-2 border-t border-gray-100 flex gap-2">
                        <Input
                          value={realityInput}
                          onChange={(e) => setRealityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (realityInput.trim()) {
                                handleAddReality(realityInput.trim(), areaId === "uncategorized" ? null : areaId);
                                setRealityInput("");
                              }
                              return;
                            }
                          }}
                          placeholder="＋ 新しいRealityを追加"
                          className="text-sm h-7 flex-1"
                          disabled={isSubmittingReality}
                        />
                        <Button
                          onClick={() => {
                            if (realityInput.trim()) {
                              handleAddReality(realityInput.trim(), areaId === "uncategorized" ? null : areaId);
                              setRealityInput("");
                            }
                          }}
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          disabled={!realityInput.trim() || isSubmittingReality}
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
              );
            })}
          </div>
        </DndContext>
      </div>

      {/* T&Aエリア — 残りの高さを使う、最低でも画面の80%確保 */}
      <div className="flex-1 min-h-[80vh] px-6 pt-3 pb-6">
        <div className="flex flex-col bg-white border-2 border-zenshin-navy/30 rounded-lg shadow-sm overflow-hidden h-full">
          <div className="px-3 py-2 border-b bg-zenshin-navy/8 flex items-center justify-between rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zenshin-navy" />
              <h2 className="text-base font-bold text-zenshin-navy leading-tight">Tension & Action</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className={`h-6 w-6 rounded transition-colors ${
                  sortByStatus
                    ? "bg-zenshin-navy/15 text-zenshin-navy"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setSortByStatus(!sortByStatus)}
                title="ステータス順に並べ替え"
              >
                <ArrowUpDown className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`h-6 w-6 rounded transition-colors ${
                  hideCompleted
                    ? "bg-zenshin-orange/15 text-zenshin-orange"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setHideCompleted(!hideCompleted)}
                title={hideCompleted ? "完了済みを表示" : "完了済みを非表示"}
              >
                {hideCompleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0 overflow-auto">
            <div className="p-3 space-y-4" data-nav-scope="tension-action">
              <DndContext
                id="dnd-context-action-comparison"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onTensionDragEnd}
              >
                <div className="space-y-4">
                  {(() => {
                    const allCompletedTensions: Tension[] = [];
                    areaOrder.forEach((areaId) => {
                      const group = areaId
                        ? structuredData.categorized.find((g) => g.area.id === areaId)
                        : structuredData.uncategorized;
                      const tensionsFromGroup = group ? group.tensions : [];
                      allCompletedTensions.push(
                        ...tensionsFromGroup.filter((t) => isTensionCompleted(t))
                      );
                    });
                    return (
                      <>
                        {areaOrder.map((areaId) => {
                          const area = areaId ? areas.find((a) => a.id === areaId) : null;
                          const areaName = area ? area.name : "未分類";
                          const areaColor = area ? area.color : "#9CA3AF";
                          const group = areaId
                            ? structuredData.categorized.find((g) => g.area.id === areaId)
                            : structuredData.uncategorized;

                          const tensionsInSection = group ? group.tensions : [];
                          const activeTensions = tensionsInSection.filter(
                            (t) => !isTensionCompleted(t)
                          );
                          const looseActionsInSection = group ? group.orphanedActions : [];

                          return (
                            <ActionSection
                              key={areaId || "uncategorized"}
                              areaId={areaId}
                              areaName={areaName}
                              areaColor={areaColor}
                              tensionsInSection={activeTensions}
                              looseActions={looseActionsInSection}
                              allTensions={tensions}
                              handleOptimisticMove={handleOptimisticMove}
                              handleUpdateActionPlan={handleUpdateActionPlan}
                              handleDeleteActionPlan={handleDeleteActionPlan}
                              handleTelescopeClick={handleTelescopeClick}
                              telescopingActionId={telescopingActionId}
                              currentUser={currentUser}
                              areas={areas}
                              chartId={chartId}
                              onOpenDetailPanel={onOpenDetailPanel}
                              getSortedAndNumberedActions={getSortedAndNumberedActions}
                              isSubmittingAction={isSubmittingAction}
                              onAddAction={onAddAction}
                              onAddTension={onAddTension}
                              visions={visions}
                              realities={realities}
                              toggleVisionRealityLink={toggleVisionRealityLink}
                              setHighlightedItemId={setHighlightedItemId}
                              handleUpdateTension={handleUpdateTension}
                              handleDeleteTension={handleDeleteTension}
                              onOpenFocus={onOpenFocusTension}
                              sortByStatus={sortByStatus}
                              hideCompleted={hideCompleted}
                              expandedCompletedTensions={expandedCompletedTensions}
                              toggleCompletedTensionExpand={toggleCompletedTensionExpand}
                            />
                          );
                        })}
                        {allCompletedTensions.length > 0 && (
                          <div className="border-t border-gray-100 mt-2">
                            <button
                              type="button"
                              className="flex items-center gap-2 px-4 py-2.5 w-full text-left text-sm text-gray-400 hover:text-gray-600 transition-colors"
                              onClick={() =>
                                setShowCompletedTensions(!showCompletedTensions)
                              }
                            >
                              {showCompletedTensions ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              完了済みTension（{allCompletedTensions.length}件）
                            </button>
                            {showCompletedTensions && (
                              <div className="opacity-60">
                                {allCompletedTensions.map((tension) => (
                                  <TensionGroup
                                    key={tension.id}
                                    tension={tension}
                                    tensionIndex={0}
                                    areaId={tension.area_id ?? null}
                                    allTensions={tensions}
                                    handleOptimisticMove={handleOptimisticMove}
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
                                    onOpenFocus={onOpenFocusTension}
                                    sortByStatus={sortByStatus}
                                    hideCompleted={hideCompleted}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </DndContext>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
