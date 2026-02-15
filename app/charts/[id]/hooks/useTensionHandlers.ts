import type { Tension, TensionStatus, ActionPlan, VisionItem, RealityItem, Area } from "@/types/chart";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addTension,
  updateTensionItem,
  removeTension,
  toggleVisionRealityLinkAction,
  updateTensionArea,
} from "../actions";

export function useTensionHandlers({
  chartId,
  tensions,
  setTensions,
  visions,
  realities,
  looseActions,
  setLooseActions,
  pendingDeletions,
  setPendingDeletions,
  areas,
  router,
}: {
  chartId: string;
  tensions: Tension[];
  setTensions: React.Dispatch<React.SetStateAction<Tension[]>>;
  visions: VisionItem[];
  realities: RealityItem[];
  looseActions: ActionPlan[];
  setLooseActions: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  pendingDeletions: Record<string, { type: string; item: any; tensionId?: string | null; timeoutId: NodeJS.Timeout }>;
  setPendingDeletions: React.Dispatch<React.SetStateAction<any>>;
  areas: Area[];
  router: ReturnType<typeof useRouter>;
}) {
  const handleAddTension = async (title: string, areaId?: string | null) => {
    if (!title.trim()) return;
    const titleToAdd = title.trim();

    // 楽観的にローカルStateを即時更新
    const tempId = `temp-${Date.now()}`;
    const optimisticTension: Tension = {
      id: tempId,
      title: titleToAdd,
      status: "active" as TensionStatus,
      area_id: areaId ?? null,
      visionIds: [],
      realityIds: [],
      actionPlans: [],
    };
    setTensions((prev) => [...prev, optimisticTension]);

    try {
      const newTension = await addTension(chartId, titleToAdd, areaId);
      if (newTension) {
        // 成功: tempIdを実際のデータに置換
        setTensions((prev) =>
          prev.map((t) => (t.id === tempId ? newTension : t))
        );
      } else {
        // 失敗: ロールバック
        setTensions((prev) => prev.filter((t) => t.id !== tempId));
        console.error("[handleAddTension] 保存失敗 - ロールバック");
      }
    } catch (error) {
      console.error("[handleAddTension] エラー:", error);
      setTensions((prev) => prev.filter((t) => t.id !== tempId));
    }
  };

  const handleUpdateTension = async (
    tensionId: string,
    field: "title" | "description" | "status",
    value: string | TensionStatus
  ) => {
    const previousState = tensions;
    // 楽観的にローカル状態を即時更新（title, description, status すべて）
    setTensions((prev) =>
      prev.map((t) =>
        t.id === tensionId ? { ...t, [field]: value } : t
      )
    );
    try {
      const success = await updateTensionItem(tensionId, chartId, field, value);
      if (success) {
        if (field === "status") {
          if (value === "resolved") {
            toast.success("Tensionを完了にしました", { duration: 3000 });
          } else if (value === "active") {
            toast.success("Tensionを再開しました", { duration: 3000 });
          }
        }
        router.refresh();
      } else {
        setTensions(previousState);
        console.error("[handleUpdateTension] 更新失敗");
      }
    } catch (error) {
      console.error("[handleUpdateTension] エラー:", error);
      setTensions(previousState);
    }
  };

  const handleMoveTensionArea = async (tensionId: string, targetAreaId: string | null) => {
    const tension = tensions.find((t) => t.id === tensionId);
    if (!tension) return;

    const previousState = tensions;
    setTensions((prev) =>
      prev.map((t) =>
        t.id === tensionId ? { ...t, area_id: targetAreaId } : t
      )
    );
    try {
      const result = await updateTensionArea(tensionId, targetAreaId, chartId, true);
      if (result.success) {
        const areaName =
          targetAreaId !== null ? areas.find((a) => a.id === targetAreaId)?.name : "未分類";
        toast.success(`${areaName ?? "未分類"} に移動しました`, { duration: 3000 });
        router.refresh();
      } else {
        setTensions(previousState);
        toast.error("移動に失敗しました", { duration: 5000 });
      }
    } catch (error) {
      console.error("[handleMoveTensionArea] エラー:", error);
      setTensions(previousState);
      toast.error("移動に失敗しました", { duration: 5000 });
    }
  };

  const handleDeleteTension = async (tensionId: string) => {
    const tension = tensions.find((t) => t.id === tensionId);
    if (!tension) return;

    // 既存の削除予約があればキャンセル
    const existingKey = `tension-${tensionId}`;
    if (pendingDeletions[existingKey]) {
      clearTimeout(pendingDeletions[existingKey].timeoutId);
    }

    // 楽観的UI更新（一時的に非表示）
    const originalTensions = [...tensions];
    setTensions(tensions.filter((t) => t.id !== tensionId));

    // 15秒後に実際に削除
    const timeoutId = setTimeout(async () => {
      const success = await removeTension(tensionId, chartId);
      if (success) {
        router.refresh();
      } else {
        // 削除失敗時は元に戻す
        setTensions(originalTensions);
        toast.error("削除に失敗しました", { duration: 5000 });
      }
      setPendingDeletions((prev: Record<string, any>) => {
        const next = { ...prev };
        delete next[existingKey];
        return next;
      });
    }, 15000);

    // 削除予約を保存
    setPendingDeletions((prev: Record<string, any>) => ({
      ...prev,
      [existingKey]: {
        type: "tension",
        item: tension,
        timeoutId,
      },
    }));

    toast.success("Tensionを削除しました", {
      duration: 15000,
      action: {
        label: "元に戻す",
        onClick: () => {
          clearTimeout(timeoutId);
          setTensions(originalTensions);
          setPendingDeletions((prev: Record<string, any>) => {
            const next = { ...prev };
            delete next[existingKey];
            return next;
          });
        },
      },
    });
  };

  const toggleVisionRealityLink = async (
    tensionId: string,
    type: "vision" | "reality",
    itemId: string
  ) => {
    const tension = tensions.find((t) => t.id === tensionId);
    if (!tension) return;

    const isCurrentlyLinked =
      type === "vision"
        ? tension.visionIds.includes(itemId)
        : tension.realityIds.includes(itemId);

    // Server updateのみ（Optimistic UIなし）
    const success = await toggleVisionRealityLinkAction(
      tensionId,
      type,
      itemId,
      chartId,
      isCurrentlyLinked
    );
    if (success) {
      // 成功時はページを再取得
      router.refresh();
    } else {
      console.error("[toggleVisionRealityLink] 更新失敗");
    }
  };

  const handleOptimisticMove = (sourceTensionId: string, targetTensionId: string, action: ActionPlan) => {
    setTensions((prev) =>
      prev.map((tension) => {
        if (tension.id === sourceTensionId) {
          return { ...tension, actionPlans: tension.actionPlans.filter((a) => a.id !== action.id) };
        }
        if (tension.id === targetTensionId) {
          return { ...tension, actionPlans: [...tension.actionPlans, action] };
        }
        return tension;
      })
    );
  };

  return {
    handleAddTension,
    handleUpdateTension,
    handleDeleteTension,
    handleMoveTensionArea,
    toggleVisionRealityLink,
    handleOptimisticMove,
  };
}
