"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FolderOpen, User, Calendar, CircleDot, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyRow } from "./PropertyRow";
import { DatePicker } from "@/components/ui/date-picker";
import type { ItemType } from "./ModalHeader";
import type { VisionItem, RealityItem, ActionPlan, Area, Tension } from "@/types/chart";
import { cn } from "@/lib/utils";

type ModalItem = VisionItem | RealityItem | ActionPlan;

interface PropertiesPanelProps {
  itemType: ItemType;
  item: ModalItem;
  areas: Area[];
  members: { id: string; email: string; name?: string; avatar_url?: string }[];
  currentUser: { id?: string; email: string; name?: string; avatar_url?: string | null } | null;
  tensions?: Tension[];
  onUpdate: (field: string, value: string | boolean | null) => void;
  locale?: string;
}

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "todo", labelKey: "todo" },
  { value: "in_progress", labelKey: "inProgress" },
  { value: "done", labelKey: "done" },
  { value: "pending", labelKey: "pending" },
  { value: "canceled", labelKey: "canceled" },
];

export function PropertiesPanel({
  itemType,
  item,
  areas,
  members,
  currentUser,
  tensions = [],
  onUpdate,
  locale = "ja",
}: PropertiesPanelProps) {
  const t = useTranslations("modal");
  const tk = useTranslations("kanban");
  const tAction = useTranslations("action");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [tensionOpen, setTensionOpen] = useState(false);

  const areaId = "area_id" in item ? item.area_id : null;
  const assignee = "assignee" in item ? (item as VisionItem | ActionPlan).assignee : null;
  const dueDate = "dueDate" in item ? item.dueDate : null;
  const createdAt = "createdAt" in item ? (item as VisionItem | RealityItem).createdAt : null;
  const status = itemType === "action" ? (item as ActionPlan).status : null;

  const area = areas.find((a) => a.id === areaId);
  const assigneeMember =
    members.find((m) => m.email === assignee) ??
    (currentUser && assignee === currentUser.email ? currentUser : null);
  const membersList = members.length > 0 ? members : currentUser ? [currentUser] : [];

  // Action の所属テンション（tensions から直接検索）
  const currentTensionId =
    itemType === "action"
      ? tensions.find((t) => t.actionPlans.some((a) => a.id === item.id))?.id ?? null
      : null;
  const currentTensionName =
    itemType === "action"
      ? tensions.find((t) => t.actionPlans.some((a) => a.id === item.id))?.title ?? null
      : null;
  const isTensionCompleted = (t: Tension) =>
    t.status === "resolved" ||
    (t.actionPlans.length > 0 &&
      t.actionPlans.every((a) => a.status === "done" || a.isCompleted));

  return (
    <div className="space-y-0">
      {/* カテゴリ - 全タイプ共通 */}
      <PropertyRow icon={<FolderOpen className="h-4 w-4" />} label={t("category")}>
        <Select
          value={areaId ?? "untagged"}
          onValueChange={(v) => {
            onUpdate("areaId", v === "untagged" ? null : v);
            setCategoryOpen(false);
          }}
          open={categoryOpen}
          onOpenChange={setCategoryOpen}
        >
          <SelectTrigger className="h-auto min-h-0 py-0 px-0 border-0 shadow-none ring-0 bg-transparent hover:bg-transparent focus:ring-0 w-auto max-w-full [&>svg]:hidden">
            <SelectValue placeholder={t("noCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="untagged">{tk("untagged")}</SelectItem>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: a.color }}
                  />
                  {a.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* テンション - Action のみ（カテゴリの下） */}
      {itemType === "action" && (
        <PropertyRow icon={<Zap className="h-4 w-4" />} label={t("parentTension")}>
          <Select
            value={currentTensionId ?? "__none__"}
            onValueChange={(v) => {
              onUpdate("tensionId", v === "__none__" ? null : v);
              setTensionOpen(false);
            }}
            open={tensionOpen}
            onOpenChange={setTensionOpen}
          >
            <SelectTrigger className="h-auto min-h-0 py-0 px-0 border-0 shadow-none ring-0 bg-transparent hover:bg-transparent focus:ring-0 w-auto max-w-full [&>svg]:hidden">
              <SelectValue placeholder={t("noTension")}>
                {currentTensionName || t("noTension")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("noTension")}</SelectItem>
              {tensions
                .filter((t) => !isTensionCompleted(t))
                .map((tension) => (
                  <SelectItem key={tension.id} value={tension.id}>
                    <span className="truncate max-w-[300px] block">
                      {tension.title || tAction("noTitle")}
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </PropertyRow>
      )}

      {/* 担当者 - Vision, Action のみ */}
      {(itemType === "vision" || itemType === "action") && (
        <PropertyRow icon={<User className="h-4 w-4" />} label={t("assignee")}>
          <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 text-sm text-left w-full min-w-0 hover:text-foreground pl-0",
                  !assignee && "text-muted-foreground"
                )}
              >
                {assignee ? (
                  assigneeMember?.avatar_url ? (
                    <img
                      src={assigneeMember.avatar_url}
                      alt={assigneeMember.name || ""}
                      className="h-5 w-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-zenshin-navy text-white text-xs flex items-center justify-center font-medium shrink-0">
                      {(assigneeMember?.name || assigneeMember?.email || assignee).charAt(0).toUpperCase()}
                    </div>
                  )
                ) : null}
                <span className="truncate">
                  {assignee ? (assigneeMember?.name || assigneeMember?.email || assignee) : t("noAssignee")}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 max-h-[280px] overflow-y-auto p-2 z-[100]" align="start">
              <div className="space-y-0.5">
                <Button
                  variant={!assignee ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm h-9 gap-2"
                  onClick={() => {
                    onUpdate("assignee", null);
                    setAssigneeOpen(false);
                  }}
                >
                  {!assignee ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
                  {t("noAssignee")}
                </Button>
                {membersList.map((member) => (
                  <Button
                    key={member.email}
                    variant={assignee === member.email ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm h-9 gap-2"
                    onClick={() => {
                      onUpdate("assignee", member.email);
                      setAssigneeOpen(false);
                    }}
                  >
                    {assignee === member.email ? <Check className="h-4 w-4 shrink-0" /> : <span className="w-4" />}
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.name || ""}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-zenshin-navy text-white text-xs flex items-center justify-center font-medium shrink-0">
                        {(member.name || member.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate">{member.name || member.email}</span>
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </PropertyRow>
      )}

      {/* 期限 - Vision, Action のみ（Reality には期限なし） */}
      {itemType !== "reality" && (
        <PropertyRow icon={<Calendar className="h-4 w-4" />} label={t("dueDate")}>
          <DatePicker
            value={dueDate ?? null}
            onChange={(date) => onUpdate("dueDate", date)}
            className="h-auto min-h-0 text-sm pl-0"
          />
        </PropertyRow>
      )}

      {/* 作成日 - Reality のみ */}
      {itemType === "reality" && createdAt && (
        <PropertyRow icon={<Calendar className="h-4 w-4" />} label={t("createdAt")}>
          <span className="text-sm pl-0">
            {new Date(createdAt).toLocaleDateString(locale === "ja" ? "ja-JP" : "en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </span>
        </PropertyRow>
      )}

      {/* ステータス - Action のみ */}
      {itemType === "action" && (
        <PropertyRow icon={<CircleDot className="h-4 w-4" />} label={t("status")}>
          <Select
            value={(status || "todo") as string}
            onValueChange={(v) => {
              onUpdate("status", v);
              setStatusOpen(false);
            }}
            open={statusOpen}
            onOpenChange={setStatusOpen}
          >
            <SelectTrigger className="h-auto min-h-0 p-0 border-0 shadow-none ring-0 bg-transparent hover:bg-transparent focus:ring-0 focus:outline-none text-sm w-auto [&>svg]:opacity-50 [&>svg]:w-3.5 [&>svg]:h-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {tk(opt.labelKey as "todo" | "inProgress" | "done" | "pending" | "canceled")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyRow>
      )}
    </div>
  );
}
