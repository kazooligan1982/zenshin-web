"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock, LockOpen, Trash2 } from "lucide-react";
import { useLongPress } from "@/hooks/use-long-press";

interface ListItemActionsProps {
  isLocked: boolean;
  onLockToggle: () => void;
  onDelete: () => void;
  deleteTitle?: string;
  deleteDescription?: string;
  size?: "sm" | "md";
}

export function ListItemActions({
  isLocked,
  onLockToggle,
  onDelete,
  deleteTitle = "削除しますか？",
  deleteDescription = "この操作は取り消せません。本当に削除してもよろしいですか？",
  size = "sm",
}: ListItemActionsProps) {
  const handleLockToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLockToggle();
  };

  const { isPressing, ...longPressHandlers } = useLongPress({
    onLongPress: handleLockToggle,
    delay: 500,
  });

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";

  return (
    <div className="flex items-center gap-1">
      {/* 鍵アイコン (長押しでロック/アンロック) */}
      <div className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className={`${buttonSize} transition-all rounded-full p-1 ${
            isLocked
              ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              : "text-gray-600 hover:text-gray-700 hover:bg-gray-50"
          } ${isPressing ? "scale-95 bg-gray-100 dark:bg-gray-800" : ""}`}
          {...longPressHandlers}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title={isLocked ? "長押しでロック解除" : "長押しでロック"}
        >
          {isLocked ? (
            <Lock className={iconSize} />
          ) : (
            <LockOpen className={iconSize} />
          )}
        </Button>
      </div>

      {/* 削除ボタン */}
      <div className="flex items-center justify-center rounded-md cursor-pointer transition-all duration-200 p-1 hover:bg-gray-100 hover:ring-1 hover:ring-gray-200 opacity-0 group-hover:opacity-100">
        {!isLocked ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`${buttonSize} text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity rounded-full p-1`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                title="削除"
              >
                <Trash2 className={iconSize} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
                <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                  No
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className={`${buttonSize} text-muted-foreground/50 cursor-not-allowed transition-opacity rounded-full p-1`}
            disabled
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            title="ロック中は削除できません"
          >
            <Trash2 className={iconSize} />
          </Button>
        )}
      </div>
    </div>
  );
}

