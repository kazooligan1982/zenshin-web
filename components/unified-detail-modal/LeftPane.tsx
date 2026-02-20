"use client";

import { useTranslations } from "next-intl";
import { TitleEditor } from "./TitleEditor";
import { PropertiesPanel } from "./PropertiesPanel";
import { DetailsEditor } from "./DetailsEditor";
import { ChildChartLink } from "./ChildChartLink";
import { LinkedResources } from "./LinkedResources";
import { ItemRelations } from "./ItemRelations";
import { ChangeHistorySummary } from "./ChangeHistorySummary";
import type { ItemType } from "./ModalHeader";
import type { VisionItem, RealityItem, ActionPlan, Area, Tension } from "@/types/chart";

export type ModalItem = VisionItem | RealityItem | ActionPlan;

interface LeftPaneProps {
  itemType: ItemType;
  itemId: string;
  item: ModalItem | null;
  areas: Area[];
  members: { id: string; email: string; name?: string; avatar_url?: string }[];
  currentUser: { id?: string; email: string; name?: string; avatar_url?: string | null } | null;
  tensions: Tension[];
  chartId: string;
  workspaceId?: string;
  childChartTitle?: string | null;
  onUpdate: (field: string, value: string | boolean | null) => void;
  locale?: string;
  onNavigate?: (itemType: ItemType, itemId: string) => void;
}

export function LeftPane({
  itemType,
  itemId,
  item,
  areas,
  members,
  currentUser,
  tensions,
  chartId,
  workspaceId,
  childChartTitle,
  onUpdate,
  locale,
  onNavigate,
}: LeftPaneProps) {
  const t = useTranslations("modal");

  if (!item) {
    return (
      <div className="w-full">
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      </div>
    );
  }

  const title =
    itemType === "action"
      ? (item as ActionPlan).title ?? ""
      : ((item as VisionItem | RealityItem).content ?? "").slice(0, 200);
  // Action のみ description（詳細）を表示。Vision/Reality には description カラムがないため非表示
  const description =
    itemType === "action" ? (item as ActionPlan).description ?? "" : "";
  const childChartId = itemType === "action" ? (item as ActionPlan).childChartId : null;

  const handleTitleSave = (newTitle: string) => {
    if (itemType === "action") {
      onUpdate("title", newTitle);
    } else {
      onUpdate("content", newTitle);
    }
  };

  const handleDetailsSave = (newContent: string) => {
    if (itemType === "action") {
      onUpdate("description", newContent);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="w-full">
        <TitleEditor
        title={title}
        onSave={handleTitleSave}
        placeholder={t("untitled")}
        />
      </div>

      <PropertiesPanel
        itemType={itemType}
        item={item}
        areas={areas}
        members={members}
        currentUser={currentUser}
        tensions={tensions}
        onUpdate={onUpdate}
        locale={locale}
      />

      <LinkedResources
        chartId={chartId}
        itemType={itemType}
        itemId={itemId}
      />

      <ItemRelations
        chartId={chartId}
        itemType={itemType}
        itemId={itemId}
        onNavigate={onNavigate}
      />

      {/* Action のみ「詳細」セクションを表示。Vision/Reality は description がないため非表示 */}
      {itemType === "action" && (
        <div className="w-full max-w-[800px]">
          <DetailsEditor
            value={description}
            onSave={handleDetailsSave}
            placeholder={t("detailsPlaceholder")}
          />
        </div>
      )}

      {itemType === "action" && childChartId && (
        <ChildChartLink
          childChartId={childChartId}
          childChartTitle={childChartTitle}
          workspaceId={workspaceId}
        />
      )}

      <ChangeHistorySummary
        chartId={chartId}
        itemType={itemType}
        itemId={itemId}
        tensions={tensions}
        areas={areas}
        locale={locale}
      />
    </div>
  );
}
