"use client";

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">{chart.title}</h3>
          <p className="text-sm text-muted-foreground">
            アーカイブ日: {chart.archived_at}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRestore} disabled={isLoading}>
            <RotateCcw className="w-4 h-4 mr-1" />
            復元
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
