"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CHECKPOINTS = {
  vision: [
    "本当に創り出したい状態を記述する。絵が浮かぶようにする",
    "数値化できている目標は数値化する",
    "相対的な表現（より、もっと）を避け、定量的な表現を心がける",
    "問題解決（なくしたいこと）ではなく、創り出したいこと（生み出すもの）を書く",
    "単なるプロセスではなく、実際の成果を記述する",
    "数値化しにくいものは、できる限り具体的に記述する",
  ],
  reality: [
    "全ての最終成果の目標に対して、現実をもれなく記載できているか",
    "的確に、定量的に表現できているか",
    "全体像を描けているか",
    "想定や論評になっていないか。客観的に記述する",
    "誇張なしに記述している",
    "経緯ではなく、現在の現実そのものを記述する",
    "全ての必要な事実を含めているか",
  ],
  action: [
    "全ての目標に対して該当部門を巻き込むアクションステップがあるか",
    "全ての行動ステップを実行したら、目標に到達するか",
    "行動ステップは正確で簡潔に記述されているか",
    "行動ステップの全てに責任者がいるか",
  ],
} as const;

export type CheckpointType = keyof typeof CHECKPOINTS;

const BORDER_COLORS: Record<CheckpointType, string> = {
  vision: "border-l-zenshin-teal",
  reality: "border-l-zenshin-orange",
  action: "border-l-zenshin-navy",
};

type CheckpointTriggerProps = {
  type: CheckpointType;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  iconSize?: "sm" | "default";
  className?: string;
};

export function CheckpointTrigger({
  type,
  isOpen,
  onToggle,
  iconSize = "default",
  className,
}: CheckpointTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center justify-center rounded transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        iconSize === "sm" ? "h-6 w-6" : "h-6 w-6",
        isOpen && "bg-muted/50 text-foreground",
        className
      )}
      title={isOpen ? "チェックポイントを閉じる" : "チェックポイントを表示"}
      aria-label={isOpen ? "チェックポイントを閉じる" : "チェックポイントを表示"}
      aria-expanded={isOpen}
    >
      <Lightbulb className={iconSize === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
    </button>
  );
}

type CheckpointFloatingPanelProps = {
  type: CheckpointType;
  anchorRect: { top: number; right: number; bottom: number; left: number } | null;
  onClose: () => void;
};

export function CheckpointFloatingPanel({
  type,
  anchorRect,
  onClose,
}: CheckpointFloatingPanelProps) {
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!anchorRect || typeof window === "undefined") return;

    const right = 16;
    let top = anchorRect.top;

    // 画面下部にはみ出さないよう調整
    const panelMaxHeight = 400;
    const viewportHeight = window.innerHeight;
    if (top + panelMaxHeight > viewportHeight - 16) {
      top = Math.max(16, viewportHeight - panelMaxHeight - 16);
    }
    if (top < 16) {
      top = 16;
    }

    setPosition({ top, right });
  }, [anchorRect]);

  if (!anchorRect || !position) return null;

  const items = CHECKPOINTS[type];
  const borderColor = BORDER_COLORS[type];

  return createPortal(
    <div
      className={cn(
        "fixed z-50 w-80 rounded-lg bg-white dark:bg-zinc-900 shadow-lg border border-border",
        "border-l-[3px]",
        borderColor
      )}
      style={{
        top: position.top,
        right: position.right,
      }}
      role="dialog"
      aria-label="チェックポイント"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">✨ チェックポイント</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="閉じる"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="max-h-[340px] overflow-y-auto px-3 py-2 space-y-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground/50 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}
