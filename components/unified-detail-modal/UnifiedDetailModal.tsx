"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ModalHeader, type ItemType } from "./ModalHeader";
import { LeftPane } from "./LeftPane";
import { RightPane } from "./RightPane";
import { cn } from "@/lib/utils";

export interface UnifiedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: ItemType;
  itemId: string;
  chartId: string;
  workspaceId?: string;
}

export function UnifiedDetailModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  chartId,
  workspaceId,
}: UnifiedDetailModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unified-modal-title"
    >
      <div
        className={cn(
          "flex flex-col bg-white rounded-xl shadow-2xl",
          "w-[95vw] md:w-[80vw] md:max-w-[1200px] md:min-w-[800px]",
          "h-[85vh] max-h-[90vh]",
          "animate-in zoom-in-95 fade-in duration-200",
          "overflow-hidden"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader itemType={itemType} onClose={onClose} />
        <div className="flex flex-1 min-h-0 md:flex-row flex-col">
          <LeftPane itemType={itemType} itemId={itemId} />
          <RightPane itemType={itemType} itemId={itemId} />
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : null;
}
