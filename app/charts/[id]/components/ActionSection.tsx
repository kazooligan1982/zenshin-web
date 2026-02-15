"use client";

import { useDroppable, useDndContext } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useItemInput } from "@/hooks/use-item-input";
import type { Tension, ActionPlan, TensionStatus, VisionItem, RealityItem, Area } from "@/types/chart";
import {
  handleKeyboardNavigation,
  splitItemsByDate,
  getActionStatusIcon,
  getActionStatusLabel,
} from "../editor-utils";
import { SortableActionItem } from "./SortableActionItem";
import { TensionGroup } from "./TensionGroup";

export function ActionSection({
  areaId,
  areaName,
  areaColor,
  tensionsInSection,
  looseActions,
  allTensions,
  handleOptimisticMove,
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
  onMoveTensionArea,
  onOpenFocus,
  sortByStatus = false,
  hideCompleted = false,
  expandedCompletedTensions,
  toggleCompletedTensionExpand,
}: {
  areaId: string | null;
  areaName: string;
  areaColor: string;
  tensionsInSection: Tension[];
  looseActions: ActionPlan[];
  allTensions: Tension[];
  handleOptimisticMove?: (sourceTensionId: string, targetTensionId: string, action: ActionPlan) => void;
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
  onMoveTensionArea?: (tensionId: string, targetAreaId: string | null) => Promise<void>;
  onOpenFocus: (tension: Tension) => void;
  sortByStatus?: boolean;
  hideCompleted?: boolean;
  expandedCompletedTensions?: Set<string>;
  toggleCompletedTensionExpand?: (tensionId: string) => void;
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
            placeholder={`「${areaName}」のTensionを追加...`}
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
              allTensions={allTensions}
              handleOptimisticMove={handleOptimisticMove}
              handleUpdateTension={handleUpdateTension}
              handleDeleteTension={handleDeleteTension}
              onMoveTensionArea={onMoveTensionArea}
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
              sortByStatus={sortByStatus}
              hideCompleted={hideCompleted}
              expandedCompletedTensions={expandedCompletedTensions}
              toggleCompletedTensionExpand={toggleCompletedTensionExpand}
            />
          ))}
        </div>
      </div>

      {looseActions.length > 0 && <div className="border-t border-gray-200 my-6" />}

      {/* 未割り当てのAction */}
      {looseActions.length > 0 &&
      (() => {
        const LOOSE_STATUS_ORDER = ["in_progress", "todo", "pending", "unset", "done", "canceled"] as const;
        const visibleLoose = hideCompleted
          ? looseActions.filter((a) => a.status !== "done" && !a.isCompleted)
          : looseActions;
        const looseHiddenCount = hideCompleted
          ? looseActions.length - visibleLoose.length
          : 0;
        const looseGroupedByStatus = sortByStatus
          ? LOOSE_STATUS_ORDER.reduce<{ key: string; actions: ActionPlan[] }[]>(
              (acc, key) => {
                const group = visibleLoose.filter((a) => {
                  if (a.isCompleted || a.status === "done") return key === "done";
                  return (a.status || "unset") === key;
                });
                if (group.length > 0) acc.push({ key, actions: group });
                return acc;
              },
              [] as { key: string; actions: ActionPlan[] }[]
            )
          : null;
        const { datedItems, undatedItems, indexById } = splitItemsByDate(
          visibleLoose,
          (action) => action.dueDate || null
        );
        const looseIndexById = new Map(
          visibleLoose.map((a, i) => [a.id, i])
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
            {sortByStatus && looseGroupedByStatus && looseGroupedByStatus.length > 0 ? (
              <div className="space-y-0">
                {looseGroupedByStatus.map(({ key, actions: groupActions }, idx) => (
                  <div key={key}>
                    <div
                      className={
                        idx === 0
                          ? "flex items-center gap-1.5 px-2 pt-1 pb-1"
                          : "flex items-center gap-1.5 px-2 pt-3 pb-1 border-t border-gray-100"
                      }
                    >
                      {getActionStatusIcon(
                        key === "unset" ? null : (key as ActionPlan["status"]),
                        key === "done"
                      )}
                      <span className="text-xs font-medium text-gray-500">
                        {getActionStatusLabel(
                          key === "unset" ? null : (key as ActionPlan["status"]),
                          key === "done"
                        )}{" "}
                        ({groupActions.length})
                      </span>
                    </div>
                    <SortableContext
                      items={groupActions.map((a) => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {groupActions.map((action) => (
                        <SortableActionItem
                          key={action.id}
                          actionPlan={action}
                          actionIndex={looseIndexById.get(action.id) ?? 0}
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
                          disabled={key === "done"}
                          allTensions={allTensions}
                          handleOptimisticMove={handleOptimisticMove}
                        />
                      ))}
                    </SortableContext>
                  </div>
                ))}
              </div>
            ) : (
              <>
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
                    allTensions={allTensions}
                    handleOptimisticMove={handleOptimisticMove}
                  />
                ))}
              </SortableContext>
            )}
            {datedItems.length > 0 && undatedItems.length > 0 && (
              <div className="h-px bg-zenshin-navy/8 my-3" />
            )}
            <div className="min-h-[40px]">
              {undatedItems.length === 0 ? (
                isDragging ? (
                  <div
                    className={`border-2 border-dashed rounded p-6 text-center transition-colors ${
                      isOver
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-zenshin-navy/40"
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
                      allTensions={allTensions}
                      handleOptimisticMove={handleOptimisticMove}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
              </>
            )}
            {hideCompleted && looseHiddenCount > 0 && (
              <div className="text-center py-1.5 text-xs text-gray-300">
                {looseHiddenCount}件の完了済みActionを非表示中
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
