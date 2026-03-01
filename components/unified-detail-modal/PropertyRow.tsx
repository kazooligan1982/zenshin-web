"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PropertyRowProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  className?: string;
}

export function PropertyRow({ icon, label, children, className }: PropertyRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-1 px-1 -mx-1 rounded hover:bg-muted/20 transition-colors cursor-pointer min-h-[28px]",
        className
      )}
    >
      <span className="text-muted-foreground shrink-0 w-5 flex justify-center">{icon}</span>
      <span className="text-sm text-muted-foreground w-20 shrink-0 whitespace-nowrap">{label}</span>
      <div className="flex-1 min-w-0 text-sm pl-0">{children}</div>
    </div>
  );
}
