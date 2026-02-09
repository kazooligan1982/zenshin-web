"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { restoreChart, deleteChart } from "@/app/charts/actions";

type ArchivedChart = {
  id: string;
  title: string;
  archived_at: string;
};

export function ArchivedChartCard({ chart }: { chart: ArchivedChart }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      await restoreChart(chart.id);
      toast.success("チャートを復元しました");
      router.refresh();
    } catch (error) {
      console.error("Failed to restore chart:", error);
      toast.error("復元に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このチャートを完全に削除しますか？\nこの操作は取り消せません。")) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteChart(chart.id);
      toast.success("チャートを削除しました");
      router.refresh();
    } catch (error) {
      console.error("Failed to delete chart:", error);
      toast.error("削除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-4 flex items-center justify-between gap-4">
      <div>
        <h3 className="font-medium text-zenshin-navy">{chart.title}</h3>
        <p className="text-sm text-zenshin-navy/40">
          アーカイブ日: {chart.archived_at}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestore}
          disabled={isLoading}
          className="border-zenshin-navy/10 text-zenshin-navy hover:bg-zenshin-cream"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          復元
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isLoading}
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
