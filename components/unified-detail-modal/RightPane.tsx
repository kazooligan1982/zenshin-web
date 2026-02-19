"use client";

import { useTranslations } from "next-intl";
import type { ItemType } from "./ModalHeader";

interface RightPaneProps {
  itemType: ItemType;
  itemId: string;
}

export function RightPane({ itemType, itemId }: RightPaneProps) {
  const t = useTranslations("modal");
  return (
    <div className="md:w-[40%] border-l overflow-y-auto p-6 min-w-0">
      <h3 className="font-semibold mb-4">{t("activity")}</h3>
      <p className="text-muted-foreground text-sm">
        {/* Phase 3 で実装 */}
        Activity timeline placeholder
      </p>
    </div>
  );
}
