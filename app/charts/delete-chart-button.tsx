"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteChart } from "./actions";

export function DeleteChartButton({ chartId }: { chartId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm("このチャートを削除しますか？")) return;

    setIsDeleting(true);
    try {
      await deleteChart(chartId);
      toast.success("チャートを削除しました", {
        action: {
          label: "元に戻す",
          onClick: () => {
            toast.info("復元機能は準備中です");
          },
        },
      });
    } catch (error) {
      console.error("Failed to delete chart:", error);
      toast.error("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500 transition-colors"
      title="削除"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
