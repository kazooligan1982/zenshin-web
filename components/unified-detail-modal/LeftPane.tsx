"use client";

import type { ItemType } from "./ModalHeader";

interface LeftPaneProps {
  itemType: ItemType;
  itemId: string;
}

export function LeftPane({ itemType, itemId }: LeftPaneProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 md:w-[60%] min-w-0">
      <p className="text-muted-foreground text-sm">
        {itemType} detail: {itemId}
      </p>
      <p className="text-muted-foreground/60 text-xs mt-2">
        Phase 2 で実装
      </p>
    </div>
  );
}
