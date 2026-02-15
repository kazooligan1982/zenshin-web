"use client";

import { Lightbulb } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

type CheckpointType = keyof typeof CHECKPOINTS;

const BORDER_COLORS: Record<CheckpointType, string> = {
  vision: "border-amber-400/60",
  reality: "border-emerald-500/60",
  action: "border-blue-500/60",
};

const ICON_COLORS: Record<CheckpointType, string> = {
  vision: "text-amber-500",
  reality: "text-emerald-500",
  action: "text-blue-500",
};

type CheckpointPopoverProps = {
  type: CheckpointType;
  iconSize?: "sm" | "default";
  className?: string;
};

export function CheckpointPopover({
  type,
  iconSize = "default",
  className,
}: CheckpointPopoverProps) {
  const items = CHECKPOINTS[type];
  const borderColor = BORDER_COLORS[type];
  const iconColor = ICON_COLORS[type];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors",
            className
          )}
          title="チェックポイント"
          aria-label="チェックポイントを表示"
        >
          <Lightbulb
            className={cn(
              iconColor,
              iconSize === "sm" ? "w-3 h-3" : "w-4 h-4"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className={cn(
          "w-[320px] p-3 text-sm border-l-4",
          borderColor
        )}
      >
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
