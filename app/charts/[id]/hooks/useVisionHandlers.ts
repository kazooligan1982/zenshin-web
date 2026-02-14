import type { VisionItem, Area } from "@/types/chart";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addVision, updateVisionItem, removeVision } from "../actions";

export function useVisionHandlers({
  chartId,
  visions,
  setVisions,
  selectedAreaId,
  isSubmittingVision,
  setIsSubmittingVision,
  pendingDeletions,
  setPendingDeletions,
  newVisionInput,
  chart,
  router,
}: {
  chartId: string;
  visions: VisionItem[];
  setVisions: React.Dispatch<React.SetStateAction<VisionItem[]>>;
  selectedAreaId: string;
  isSubmittingVision: boolean;
  setIsSubmittingVision: React.Dispatch<React.SetStateAction<boolean>>;
  pendingDeletions: Record<string, { type: string; item: any; tensionId?: string | null; timeoutId: NodeJS.Timeout }>;
  setPendingDeletions: React.Dispatch<React.SetStateAction<any>>;
  newVisionInput: { setValue: (val: string) => void };
  chart: { areas: Area[] };
  router: ReturnType<typeof useRouter>;
}) {
  const handleAddVision = async (content: string, areaIdOverride?: string | null) => {
    if (!content.trim() || isSubmittingVision) return;

    setIsSubmittingVision(true);
    const contentToAdd = content.trim();
    const areaId =
      areaIdOverride !== undefined
        ? (areaIdOverride === "uncategorized" ? null : areaIdOverride)
        : selectedAreaId === "all"
          ? null
          : selectedAreaId;

    // 楽観的にローカルStateを即時更新
    const tempId = `temp-${Date.now()}`;
    const optimisticVision: VisionItem = {
      id: tempId,
      content: contentToAdd,
      createdAt: new Date().toISOString(),
      area_id: areaId,
    };
    setVisions((prev) => [...prev, optimisticVision]);
    if (areaIdOverride === undefined) newVisionInput.setValue("");

    try {
      const newVision = await addVision(chartId, contentToAdd, areaId);
      if (newVision) {
        // 成功: tempIdを実際のIDに置換
        setVisions((prev) =>
          prev.map((v) => (v.id === tempId ? newVision : v))
        );
      } else {
        // 失敗: 楽観的に追加したものを削除
        setVisions((prev) => prev.filter((v) => v.id !== tempId));
        newVisionInput.setValue(contentToAdd);
        console.error("[handleAddVision] 保存失敗 - ロールバック");
      }
    } catch (error) {
      console.error("[handleAddVision] エラー:", error);
      setVisions((prev) => prev.filter((v) => v.id !== tempId));
      newVisionInput.setValue(contentToAdd);
    } finally {
      setIsSubmittingVision(false);
    }
  };

  const handleUpdateVision = async (
    id: string,
    field: "content" | "assignee" | "dueDate" | "targetDate" | "isLocked" | "areaId",
    value: string | boolean | null
  ) => {
    // 楽観的にローカル状態を即座に更新
    if (field === "assignee" || field === "dueDate" || field === "targetDate") {
      setVisions((prev) =>
        prev.map((vision) =>
          vision.id === id ? { ...vision, [field]: value } : vision
        )
      );
    }
    const success = await updateVisionItem(id, chartId, field, value);
    if (success) {
      if (field === "areaId") {
        const areaName = value
          ? chart.areas.find((area: Area) => area.id === value)?.name
          : "未分類";
        toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
      }
      // isLocked、areaIdが変更された場合のみrefresh（コンテンツ構造に影響するため）
      if (field === "isLocked" || field === "areaId") {
        router.refresh();
      }
    } else {
      console.error("[handleUpdateVision] 更新失敗");
      // 失敗時はロールバック
      if (field === "assignee" || field === "dueDate" || field === "targetDate") {
        router.refresh();
      }
    }
  };

  const handleDeleteVision = async (id: string) => {
    const vision = visions.find((v) => v.id === id);
    if (!vision) return;

    // 既存の削除予約があればキャンセル
    const existingKey = `vision-${id}`;
    if (pendingDeletions[existingKey]) {
      clearTimeout(pendingDeletions[existingKey].timeoutId);
    }

    // 楽観的UI更新（一時的に非表示）
    const originalVisions = [...visions];
    setVisions(visions.filter((v) => v.id !== id));

    // 15秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeVision(id, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setVisions(originalVisions);
        toast.error("削除に失敗しました", { duration: 5000 });
      }
      setPendingDeletions((prev) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 15000);

    // 削除予約を保存
    setPendingDeletions((prev) => ({
      ...prev,
      [existingKey]: {
        type: "vision",
        item: vision,
        timeoutId,
      },
    }));

    toast.success("Visionを削除しました", {
      duration: 15000,
      action: {
        label: "元に戻す",
        onClick: () => {
          clearTimeout(timeoutId);
          setVisions(originalVisions);
          setPendingDeletions((prev) => {
            const next = { ...prev };
            delete next[existingKey];
            return next;
          });
        },
      },
    });
  };

  return { handleAddVision, handleUpdateVision, handleDeleteVision };
}
