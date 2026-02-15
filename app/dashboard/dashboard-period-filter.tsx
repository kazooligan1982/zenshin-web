"use client";

import React, { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [
  { value: "all", label: "全期間" },
  { value: "this_month", label: "今月" },
  { value: "last_month", label: "先月" },
  { value: "this_quarter", label: "今四半期" },
  { value: "last_quarter", label: "前四半期" },
  { value: "this_year", label: "今年" },
  { value: "custom", label: "カスタム" },
] as const;

function formatDateRange(fromStr: string, toStr: string): string {
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromFmt = sameYear ? format(from, "M/d", { locale: ja }) : format(from, "yyyy/M/d", { locale: ja });
  const toFmt = sameYear ? format(to, "M/d", { locale: ja }) : format(to, "yyyy/M/d", { locale: ja });
  return `${fromFmt} - ${toFmt}`;
}

type DashboardPeriodFilterProps = {
  period: string;
  from: string | null;
  to: string | null;
};

export function DashboardPeriodFilter({
  period,
  from,
  to,
}: DashboardPeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const prevPeriodRef = React.useRef(period);

  const updateParams = (updates: { period?: string; from?: string | null; to?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.period !== undefined) {
      if (updates.period === "all" || !updates.period) {
        params.delete("period");
        params.delete("from");
        params.delete("to");
      } else {
        params.set("period", updates.period);
        if (updates.period === "custom") {
          if (updates.from) params.set("from", updates.from);
          else params.delete("from");
          if (updates.to) params.set("to", updates.to);
          else params.delete("to");
        } else {
          params.delete("from");
          params.delete("to");
        }
      }
    } else if (updates.from !== undefined || updates.to !== undefined) {
      if (updates.from !== undefined) {
        if (updates.from) params.set("from", updates.from);
        else params.delete("from");
      }
      if (updates.to !== undefined) {
        if (updates.to) params.set("to", updates.to);
        else params.delete("to");
      }
    }
    const query = params.toString();
    const newUrl = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(newUrl, { scroll: false });
    });
  };

  const handlePeriodChange = (value: string) => {
    updateParams({ period: value });
  };

  // 「カスタム」を選択したときに自動でカレンダーを開く
  React.useEffect(() => {
    if (period === "custom" && prevPeriodRef.current !== "custom") {
      setRangeOpen(true);
    }
    prevPeriodRef.current = period;
  }, [period]);

  const handleClearCustom = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateParams({ period: "all" });
  };

  const dateRange: DateRange | undefined =
    from && to
      ? {
          from: new Date(from),
          to: new Date(to),
        }
      : from
        ? { from: new Date(from), to: undefined }
        : undefined;

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      updateParams({ from: null, to: null });
      return;
    }
    const fromStr = range.from ? format(range.from, "yyyy-MM-dd") : null;
    const toStr = range.to ? format(range.to, "yyyy-MM-dd") : null;
    updateParams({ from: fromStr, to: toStr });
    if (range.from && range.to) {
      setRangeOpen(false);
    }
  };

  const isCustom = period === "custom";
  const hasCustomDates = isCustom && from && to;

  return (
    <div
      className={cn(
        "flex items-center gap-2 transition-opacity",
        isPending && "opacity-70 pointer-events-none"
      )}
    >
      {!isCustom ? (
        <Select value={period || "all"} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px] border-zenshin-navy/15 text-zenshin-navy [&>span]:truncate">
            <SelectValue placeholder="全期間" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex h-9 w-[180px] items-center overflow-hidden rounded-md border border-zenshin-navy/15 bg-transparent text-sm">
          <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center gap-2 px-3 py-2 text-left font-normal min-w-0 h-full hover:bg-zenshin-navy/5 transition-colors",
                  hasCustomDates ? "text-zenshin-navy" : "text-zenshin-navy/50"
                )}
              >
                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {hasCustomDates ? formatDateRange(from, to) : "日付を選択"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleRangeSelect}
                numberOfMonths={1}
                defaultMonth={dateRange?.from ?? new Date()}
              />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={handleClearCustom}
            className="flex h-full shrink-0 items-center justify-center px-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title="全期間に戻す"
            aria-label="全期間に戻す"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-zenshin-navy/50 shrink-0" />
      )}
    </div>
  );
}
