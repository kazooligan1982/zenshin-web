"use client";

import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, Link2, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ItemType = "vision" | "reality" | "action";

interface ModalHeaderProps {
  itemType: ItemType;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

// Vision=緑, Reality=オレンジ, Action=青（エディタのセクション色に合わせる）
const ITEM_TYPE_STYLES: Record<ItemType, { bg: string; text: string }> = {
  vision: { bg: "bg-teal-100", text: "text-teal-700" },
  reality: { bg: "bg-orange-100", text: "text-orange-700" },
  action: { bg: "bg-blue-100", text: "text-blue-700" },
};

export function ModalHeader({
  itemType,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ModalHeaderProps) {
  const t = useTranslations("modal");
  const style = ITEM_TYPE_STYLES[itemType];
  const typeLabel = t(itemType);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-white shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {/* ▲▼ ナビ */}
        <div className="flex flex-col shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground p-0.5 rounded hover:bg-muted/50 disabled:opacity-30"
            disabled={!hasPrevious}
            onClick={onPrevious}
            title={t("previousItem")}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground p-0.5 rounded hover:bg-muted/50 disabled:opacity-30"
            disabled={!hasNext}
            onClick={onNext}
            title={t("nextItem")}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* バッジ */}
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-sm font-semibold shrink-0",
            style.bg,
            style.text
          )}
        >
          {typeLabel}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          disabled
          title={t("copyLink")}
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          disabled
          title={t("moreActions")}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-zenshin-navy"
          onClick={onClose}
          title={t("close")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
