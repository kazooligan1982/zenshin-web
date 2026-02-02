"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChart } from "@/app/charts/actions";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NewChartButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateChart = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const chart = await createChart("無題のチャート");
      toast.success("チャートを作成しました");
      router.push(`/charts/${chart.id}`);
    } catch (error) {
      console.error("Failed to create chart:", error);
      toast.error("チャートの作成に失敗しました");
      setIsCreating(false);
    }
  };

  return (
    <Button onClick={handleCreateChart} disabled={isCreating} className="gap-2">
      {isCreating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          作成中...
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          New Chart
        </>
      )}
    </Button>
  );
}
