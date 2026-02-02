"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, User } from "lucide-react";

interface Action {
  id: string;
  title: string;
  due_date: string | null;
  assignee: string | null;
  status: "todo" | "in_progress" | "done" | "pending" | "canceled" | null;
  is_completed: boolean | null;
  tension_id: string | null;
  vision_tags?: string[];
  depth: number;
  parent_action_id: string | null;
  tension_title: string | null;
  tension_area_name: string | null;
  tension_area_color: string | null;
  has_children: boolean;
}

interface KanbanCardProps {
  action: Action;
  isDragging?: boolean;
  onClick?: () => void;
}

export function KanbanCard({ action, isDragging, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingState } = useDraggable({
    id: action.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDraggingState ? 0.5 : 1,
    paddingLeft: `${action.depth * 16}px`,
  };

  const getBackgroundColor = () => {
    if (action.depth > 0) return "bg-gray-50";
    return "bg-white";
  };

  const isOverdue =
    !!action.due_date && new Date(action.due_date) < new Date();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "rounded-lg border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all",
        getBackgroundColor(),
        isDragging && "shadow-lg",
        "hover:shadow-md hover:border-gray-200",
        onClick && "cursor-pointer"
      )}
    >
      <p
        className={cn(
          "text-sm text-gray-800 leading-snug",
          action.is_completed && "line-through text-gray-400"
        )}
      >
        {action.title}
      </p>

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        {action.assignee && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[60px]">{action.assignee}</span>
          </div>
        )}
        {action.due_date && (
          <div className={cn("flex items-center gap-1", isOverdue && "text-red-500")}>
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(action.due_date), "MM/dd", { locale: ja })}</span>
          </div>
        )}
        {action.depth > 0 && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            L{action.depth}
          </span>
        )}
      </div>
    </Card>
  );
}
