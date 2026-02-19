"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";
import { useEffect } from "react";

interface UndoNotificationProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function UndoNotification({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
}: UndoNotificationProps) {
  const tt = useTranslations("toast");
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div 
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]"
      style={{
        animation: "fadeInScale 0.2s ease-out forwards",
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-5 min-w-[360px] max-w-md">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onUndo}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-4 py-2"
            >
              {tt("undo")}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDismiss}
              className="h-7 w-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

