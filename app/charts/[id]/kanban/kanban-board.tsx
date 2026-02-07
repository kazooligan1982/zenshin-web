"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { updateActionStatus } from "../actions";
import { KanbanCard } from "./kanban-card";
import { ActionEditModal } from "./action-edit-modal";
import { TreeView } from "./tree-view";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Filter, LayoutGrid, GitBranch, Zap } from "lucide-react";

interface Action {
  id: string;
  title: string;
  due_date: string | null;
  assignee: string | null;
  status: "todo" | "in_progress" | "done" | "pending" | "canceled" | null;
  is_completed: boolean | null;
  tension_id: string | null;
  child_chart_id: string | null;
  depth: number;
  parent_action_id: string | null;
  tension_title: string | null;
  tension_area_name: string | null;
  tension_area_color: string | null;
  vision_title: string | null;
  has_children: boolean;
  vision_tags?: string[];
}

interface TensionGroup {
  id: string;
  title: string;
  vision_title: string | null;
  area_name: string | null;
  area_color: string | null;
  actions: Action[];
}

interface KanbanBoardProps {
  projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "tree">("kanban");

  // ドラッグセンサーの設定（8px以上動かさないとドラッグ開始しない）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // フィルター状態
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchActions();
  }, [projectId, viewMode]);

  const fetchActions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/charts/${projectId}/actions`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.ok) {
        const data = await response.json();
        setActions(data);
      } else {
        console.error("Failed to fetch actions");
      }
    } catch (error) {
      console.error("Error fetching actions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // フィルタリングされたActions
  const filteredActions = useMemo(() => {
    let filtered = [...actions];

    // ステータスフィルター
    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => {
        const currentStatus =
          a.status || (a.is_completed ? "done" : "todo");
        return currentStatus === statusFilter;
      });
    }

    // 担当者フィルター
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        filtered = filtered.filter((a) => !a.assignee);
      } else {
        filtered = filtered.filter((a) => a.assignee === assigneeFilter);
      }
    }

    // 期限フィルター
    if (dueDateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthEnd = new Date(today);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      filtered = filtered.filter((a) => {
        if (!a.due_date) return dueDateFilter === "no_date";
        const dueDate = new Date(a.due_date);
        dueDate.setHours(0, 0, 0, 0);

        switch (dueDateFilter) {
          case "overdue":
            return dueDate < today;
          case "today":
            return dueDate.getTime() === today.getTime();
          case "this_week":
            return dueDate <= weekEnd;
          case "this_month":
            return dueDate <= monthEnd;
          default:
            return true;
        }
      });
    }

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [actions, statusFilter, assigneeFilter, dueDateFilter, searchQuery]);

  // 担当者一覧を取得
  const assignees = useMemo(() => {
    const uniqueAssignees = new Set(
      actions.map((a) => a.assignee).filter((a): a is string => !!a)
    );
    return Array.from(uniqueAssignees);
  }, [actions]);

  const tensionGroups = useMemo(() => {
    const groups = new Map<string, TensionGroup>();

    filteredActions.forEach((action) => {
      const key = action.tension_id || "unassigned";
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          title: action.tension_title || "未分類",
          vision_title: action.vision_title || null,
          area_name: action.tension_area_name || null,
          area_color: action.tension_area_color || null,
          actions: [],
        });
      }
      groups.get(key)!.actions.push(action);
    });

    return Array.from(groups.values());
  }, [filteredActions]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const actionId = active.id as string;
    const newStatus = over.id as "todo" | "in_progress" | "done" | "pending" | "canceled";

    const currentAction = actions.find((a) => a.id === actionId);
    if (!currentAction) return;

    const currentStatus =
      currentAction.status || (currentAction.is_completed ? "done" : "todo");
    if (currentStatus === newStatus) return;

    // 楽観的UI更新
    setActions((prev) =>
      prev.map((a) =>
        a.id === actionId
          ? { ...a, status: newStatus, is_completed: newStatus === "done" }
          : a
      )
    );

    try {
      await updateActionStatus(actionId, newStatus);
      await fetchActions();
    } catch (error) {
      console.error("Error updating action status:", error);
      await fetchActions();
    }
  };

  const handleCardClick = (action: Action) => {
    setSelectedAction(action);
    setIsEditModalOpen(true);
  };

  const columns = [
    { id: "todo", title: "未着手", color: "bg-zenshin-navy/5", headerColor: "text-zenshin-navy", dotColor: "bg-zenshin-navy/40" },
    { id: "in_progress", title: "進行中", color: "bg-blue-50/80", headerColor: "text-blue-600", dotColor: "bg-blue-500" },
    { id: "done", title: "完了", color: "bg-emerald-50/80", headerColor: "text-emerald-600", dotColor: "bg-emerald-500" },
    { id: "pending", title: "保留", color: "bg-amber-50/80", headerColor: "text-amber-600", dotColor: "bg-amber-500" },
    { id: "canceled", title: "中止", color: "bg-zenshin-navy/5", headerColor: "text-zenshin-navy/50", dotColor: "bg-zenshin-navy/30" },
  ];

  const TensionSection = ({
    tensionGroup,
    onCardClick,
  }: {
    tensionGroup: TensionGroup;
    onCardClick: (action: Action) => void;
  }) => {
    return (
      <div
        className="relative pl-3 border-l-2 transition-colors"
        style={{ borderColor: tensionGroup.area_color || "#E5E7EB" }}
      >
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {tensionGroup.area_name && (
              <span
                className="px-1.5 py-0.5 text-[10px] rounded-full text-white leading-none"
                style={{
                  backgroundColor: tensionGroup.area_color || "#9CA3AF",
                }}
              >
                {tensionGroup.area_name}
              </span>
            )}
            {tensionGroup.vision_title && (
              <span className="text-[10px] text-zenshin-navy/40">
                {tensionGroup.vision_title}
              </span>
            )}
          </div>
          <div className="flex items-start gap-1.5">
            <Zap className="w-3 h-3 text-zenshin-navy/60 shrink-0 mt-0.5" />
            <h3 className="text-[13px] font-bold text-zenshin-navy leading-snug">
              {tensionGroup.title}
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {tensionGroup.actions.map((action) => (
            <KanbanCard
              key={action.id}
              action={action}
              onClick={() => onCardClick(action)}
            />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-zenshin-navy/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zenshin-cream">
      {/* ヘッダー */}
      <div className="px-8 py-6 border-b bg-zenshin-cream">
        <h1 className="text-2xl font-bold text-zenshin-navy mb-2">Views</h1>
        <p className="text-sm text-zenshin-navy/50">
          アクションを様々な視点で確認
        </p>
      </div>

      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "kanban" | "tree")}
        className="flex-1 flex flex-col"
      >
        <div className="px-8 py-4 border-b bg-zenshin-cream">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-zenshin-navy/5 p-0.5">
              <TabsTrigger value="kanban" className="flex items-center gap-2 text-zenshin-navy/60 data-[state=active]:bg-white data-[state=active]:text-zenshin-navy data-[state=active]:shadow-sm hover:text-zenshin-navy transition-colors">
                <LayoutGrid className="w-4 h-4" />
                カンバン
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-2 text-zenshin-navy/60 data-[state=active]:bg-white data-[state=active]:text-zenshin-navy data-[state=active]:shadow-sm hover:text-zenshin-navy transition-colors">
                <GitBranch className="w-4 h-4" />
                ツリー
              </TabsTrigger>
            </TabsList>
          </div>

          {/* フィルターバー */}
          <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-7 w-auto gap-1 px-2.5 text-xs font-medium border-0 bg-transparent hover:bg-zenshin-navy/5 rounded-md shadow-none focus:ring-0 text-zenshin-navy/70">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ステータス</SelectItem>
                  <SelectItem value="todo">未着手</SelectItem>
                  <SelectItem value="in_progress">進行中</SelectItem>
                  <SelectItem value="done">完了</SelectItem>
                  <SelectItem value="pending">保留</SelectItem>
                  <SelectItem value="canceled">中止</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-7 w-auto gap-1 px-2.5 text-xs font-medium border-0 bg-transparent hover:bg-zenshin-navy/5 rounded-md shadow-none focus:ring-0 text-zenshin-navy/70">
                  <SelectValue placeholder="担当者" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">担当者</SelectItem>
                  <SelectItem value="unassigned">未割り当て</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                <SelectTrigger className="h-7 w-auto gap-1 px-2.5 text-xs font-medium border-0 bg-transparent hover:bg-zenshin-navy/5 rounded-md shadow-none focus:ring-0 text-zenshin-navy/70">
                  <SelectValue placeholder="期限" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">期限</SelectItem>
                  <SelectItem value="overdue">期限切れ</SelectItem>
                  <SelectItem value="today">今日</SelectItem>
                  <SelectItem value="this_week">今週</SelectItem>
                  <SelectItem value="this_month">今月</SelectItem>
                  <SelectItem value="no_date">期限なし</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zenshin-navy/30" />
                <Input
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 w-[160px] pl-7 text-xs border-0 bg-zenshin-navy/5 rounded-md shadow-none focus-visible:ring-1 focus-visible:ring-zenshin-navy/20 placeholder:text-zenshin-navy/30"
                />
              </div>
          </div>
        </div>

        <TabsContent value="kanban" className="flex-1 overflow-hidden m-0">
          <div className="flex-1 overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 p-6 h-full overflow-x-auto">
                {columns.map((column) => {
                  const columnTensionGroups = tensionGroups
                    .map((group) => ({
                      ...group,
                      actions: group.actions.filter((action) => {
                        const status =
                          action.status || (action.is_completed ? "done" : "todo");
                        return status === column.id;
                      }),
                    }))
                    .filter((group) => group.actions.length > 0);

                  const totalActions = columnTensionGroups.reduce(
                    (sum, group) => sum + group.actions.length,
                    0
                  );

                  return (
                    <div
                      key={column.id}
                      className="flex-1 min-w-[320px] flex flex-col"
                    >
                      <div
                        className={`${column.color} rounded-t-lg px-3 py-2.5 border-b border-zenshin-navy/10`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${column.dotColor}`} />
                          <h2 className={`font-semibold text-sm ${column.headerColor}`}>
                            {column.title}
                          </h2>
                          <span className="text-xs text-zenshin-navy/40 font-normal">
                            {totalActions}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 bg-white/60 rounded-b-lg p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-280px)]">
                        {columnTensionGroups.length > 0 ? (
                          columnTensionGroups.map((tensionGroup) => (
                            <TensionSection
                              key={tensionGroup.id}
                              tensionGroup={tensionGroup}
                              onCardClick={handleCardClick}
                            />
                          ))
                        ) : (
                          <div className="text-center text-zenshin-navy/40 text-sm py-8">
                            No actions
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <DragOverlay>
                {activeId ? (
                  <KanbanCard
                    action={actions.find((a) => a.id === activeId)!}
                    isDragging
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </TabsContent>

        <TabsContent value="tree" className="flex-1 overflow-auto m-0">
          <TreeView
            projectId={projectId}
            statusFilter={statusFilter}
            assigneeFilter={assigneeFilter}
            dueDateFilter={dueDateFilter}
            searchQuery={searchQuery}
          />
        </TabsContent>
      </Tabs>

      {/* 編集モーダル */}
      <ActionEditModal
        action={selectedAction}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAction(null);
        }}
        onSave={fetchActions}
        projectId={projectId}
      />
    </div>
  );
}
