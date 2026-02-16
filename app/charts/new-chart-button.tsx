"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChart } from "@/app/charts/actions";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NewChartButton({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateChart = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const chart = await createChart("無題のチャート", workspaceId);
      toast.success("チャートを作成しました", { duration: 3000 });
      router.push(workspaceId ? `/workspaces/${workspaceId}/charts/${chart.id}` : `/charts/${chart.id}`);
    } catch (error) {
      console.error("Failed to create chart:", error);
      toast.error("チャートの作成に失敗しました", { duration: 5000 });
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateChart}
      disabled={isCreating}
      className="gap-2 bg-zenshin-orange hover:bg-zenshin-orange/90 text-white rounded-xl shadow-sm"
    >
      {isCreating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          作成中...
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          チャートを作成
        </>
      )}
    </Button>
  );
}
