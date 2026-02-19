"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Link2, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ItemType = "vision" | "reality" | "action";

interface ModalHeaderProps {
  itemType: ItemType;
  onClose: () => void;
}

// Vision=緑, Reality=青, Action=オレンジ（既存エディタの色を踏襲）
const ITEM_TYPE_STYLES: Record<ItemType, { bg: string; text: string }> = {
  vision: { bg: "bg-zenshin-teal/20", text: "text-zenshin-teal" },
  reality: { bg: "bg-zenshin-navy/20", text: "text-zenshin-navy" },
  action: { bg: "bg-zenshin-orange/20", text: "text-zenshin-orange" },
};

export function ModalHeader({ itemType, onClose }: ModalHeaderProps) {
  const t = useTranslations("modal");
  const style = ITEM_TYPE_STYLES[itemType];
  const typeLabel = t(itemType);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b bg-white shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled
            title={t("previousItem")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled
            title={t("nextItem")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
      <div className="flex items-center gap-1 shrink-0">
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
