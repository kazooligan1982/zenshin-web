"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  modal?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "日付を選択",
  disabled = false,
  className,
  modal,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // ISO string形式で保存（YYYY-MM-DD形式）
      const isoString = selectedDate.toISOString();
      onChange(isoString);
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          className={cn(
            "w-[110px] justify-start text-left font-normal h-6 text-xs flex items-center",
            !date && "text-gray-300 hover:text-gray-500",
            className
          )}
        >
          {date ? (
            <span className="flex items-center justify-center w-full">{format(date, "yyyy/MM/dd")}</span>
          ) : (
            <span className="flex items-center justify-center w-full"><CalendarPlus className="w-4 h-4" /></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={16}
        avoidCollisions={true}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}



