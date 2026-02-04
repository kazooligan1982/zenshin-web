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
    { id: "todo", title: "To Do", color: "bg-gray-50" },
    { id: "in_progress", title: "In Progress", color: "bg-blue-50" },
    { id: "done", title: "Done", color: "bg-green-50" },
    { id: "pending", title: "Pending", color: "bg-yellow-50" },
    { id: "canceled", title: "Canceled", color: "bg-gray-100" },
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
        className="relative pl-4 border-l-2 transition-colors"
        style={{ borderColor: tensionGroup.area_color || "#E5E7EB" }}
      >
        <div className="mb-3">
          {tensionGroup.vision_title && (
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] bg-purple-50 text-purple-600 rounded-full font-medium truncate max-w-[200px]">
                {tensionGroup.vision_title}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            <h3 className="text-sm font-bold text-gray-800 leading-tight">
              {tensionGroup.title}
            </h3>
          </div>

          {tensionGroup.area_name && (
            <span
              className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full text-white"
              style={{
                backgroundColor: tensionGroup.area_color || "#9CA3AF",
              }}
            >
              {tensionGroup.area_name}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ヘッダー */}
      <div className="px-8 py-6 border-b bg-white">
        <h1 className="text-2xl font-bold mb-2">Views</h1>
        <p className="text-sm text-gray-500">
          プロジェクトのアクションを様々な視点で確認
        </p>
      </div>

      <Tabs
        value={viewMode}
        onValueChange={(v) => setViewMode(v as "kanban" | "tree")}
        className="flex-1 flex flex-col"
      >
        <div className="px-8 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                カンバン
              </TabsTrigger>
              <TabsTrigger value="tree" className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                ツリー
              </TabsTrigger>
            </TabsList>
          </div>

          {/* フィルターバー */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <Filter className="w-4 h-4" />
              <span>フィルター</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs border-gray-200">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="todo">未着手</SelectItem>
                  <SelectItem value="in_progress">進行中</SelectItem>
                  <SelectItem value="done">完了</SelectItem>
                  <SelectItem value="pending">保留</SelectItem>
                  <SelectItem value="canceled">中止</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="h-8 w-[120px] text-xs border-gray-200">
                  <SelectValue placeholder="担当者" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="unassigned">未割り当て</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                <SelectTrigger className="h-8 w-[120px] text-xs border-gray-200">
                  <SelectValue placeholder="期限" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="overdue">期限切れ</SelectItem>
                  <SelectItem value="today">今日</SelectItem>
                  <SelectItem value="this_week">今週</SelectItem>
                  <SelectItem value="this_month">今月</SelectItem>
                  <SelectItem value="no_date">期限なし</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative min-w-[220px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="アクション名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs border-gray-200"
                />
              </div>
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
                        className={`${column.color} rounded-t-lg p-3 border-b border-gray-200`}
                      >
                        <h2 className="font-semibold text-gray-800">
                          {column.title} ({totalActions})
                        </h2>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-b-lg p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-280px)]">
                        {columnTensionGroups.length > 0 ? (
                          columnTensionGroups.map((tensionGroup) => (
                            <TensionSection
                              key={tensionGroup.id}
                              tensionGroup={tensionGroup}
                              onCardClick={handleCardClick}
                            />
                          ))
                        ) : (
                          <div className="text-center text-gray-400 text-sm py-8">
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
