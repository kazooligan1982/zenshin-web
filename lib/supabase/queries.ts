import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import type {
  Chart,
  VisionItem,
  RealityItem,
  Tension,
  ActionPlan,
  Area,
  HistoryItem,
} from "@/types/chart";

// Chart取得（関連データを含む）
export async function getChartById(chartId: string): Promise<Chart | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Chart基本情報を取得
    const { data: chart, error: chartError } = await supabase
      .from("charts")
      .select("*")
      .eq("id", chartId)
      .single();

    if (chartError) {
      console.error("Error code:", chartError.code);
      console.error("Error message:", chartError.message);
      console.error("Error details:", chartError.details);
      return null;
    }

    if (!chart) {
      console.warn("Chart not found:", chartId);
      return null;
    }
    // Visionsを取得: target_date降順 (未来が上、NULLは最初) -> sort_order昇順
    const { data: visions, error: visionsError } = await supabase
      .from("visions")
      .select("*, vision_comments(count)")
      .eq("chart_id", chartId)
      .order("target_date", { ascending: false, nullsFirst: true })
      .order("sort_order", { ascending: true, nullsFirst: false });

    if (visionsError) {
      console.error("Error fetching visions:", visionsError);
    }

    // Realitiesを取得: created_at昇順（古いものが上、新しいものが下）
    const { data: realities, error: realitiesError } = await supabase
      .from("realities")
      .select("*, reality_comments(count)")
      .eq("chart_id", chartId)
      .order("created_at", { ascending: true });

    if (realitiesError) {
      console.error("Error fetching realities:", realitiesError);
    }

    // Tensionsを取得
    const { data: tensions, error: tensionsError } = await supabase
      .from("tensions")
      .select("*")
      .eq("chart_id", chartId)
      .order("created_at", { ascending: true });

    if (tensionsError) {
      console.error("Error fetching tensions:", tensionsError);
    }

    // Areasを取得: sort_order昇順
    const { data: areas, error: areasError } = await supabase
      .from("areas")
      .select("*")
      .eq("chart_id", chartId)
      .order("sort_order", { ascending: true });

    if (areasError) {
      console.error("Error fetching areas:", areasError);
      console.error("Areas error details:", JSON.stringify(areasError, null, 2));
    }

    // Tension-Vision関係を取得
    const tensionIds = tensions?.map((t: any) => t.id) || [];
    const { data: tensionVisions } = await supabase
      .from("tension_visions")
      .select("*")
      .in("tension_id", tensionIds);

    // Tension-Reality関係を取得
    const { data: tensionRealities } = await supabase
      .from("tension_realities")
      .select("*")
      .in("tension_id", tensionIds);

    // Actionsを取得: chart_idで取得（tension_idがnullのものも含む）
    const { data: actions } = await supabase
      .from("actions")
      .select("*, action_comments(count)")
      .eq("chart_id", chartId)
      .order("created_at", { ascending: true });

    // データを整形
    const visionMap = new Map(
      (visions || []).map((v: any) => [
        v.id,
        {
          id: v.id,
          content: v.content,
          createdAt: v.created_at,
          updatedAt: v.updated_at,
          assignee: v.assignee || undefined,
          dueDate: v.due_date || undefined,
          targetDate: v.target_date || undefined,
          isLocked: v.is_locked || false,
          area_id: v.area_id || null,
          comment_count: v.vision_comments?.[0]?.count ?? 0,
        } as VisionItem,
      ])
    );

    const realityMap = new Map(
      (realities || []).map((r: any) => [
        r.id,
        {
          id: r.id,
          content: r.content,
          createdAt: r.created_at,
          dueDate: r.due_date || undefined,
          relatedVisionId: r.related_vision_id || undefined,
          area_id: r.area_id || null,
          isLocked: r.is_locked || false,
          comment_count: r.reality_comments?.[0]?.count ?? 0,
        } as RealityItem,
      ])
    );

    const actionMap = new Map<string, ActionPlan[]>();
    const looseActions: ActionPlan[] = [];
    (actions || []).forEach((a: any) => {
      const action: ActionPlan = {
        id: a.id,
        title: a.title,
        dueDate: a.due_date || undefined,
        assignee: a.assignee || undefined,
        status: a.status || null,
        hasSubChart: !!(a.has_sub_chart || a.child_chart_id), // child_chart_idがあればhasSubChartもtrue
        subChartId: a.sub_chart_id || undefined,
        childChartId: a.child_chart_id || undefined,
        isCompleted: a.is_completed || false,
        area_id: a.area_id || null,
        comment_count: a.action_comments?.[0]?.count ?? 0,
      };
      if (a.tension_id) {
        if (!actionMap.has(a.tension_id)) {
          actionMap.set(a.tension_id, []);
        }
        actionMap.get(a.tension_id)!.push(action);
      } else {
        looseActions.push(action);
      }
    });

    const tensionsWithRelations: Tension[] = (tensions || []).map((t: any) => {
      const visionIds =
        tensionVisions
          ?.filter((tv: any) => tv.tension_id === t.id)
          .map((tv: any) => tv.vision_id) || [];
      const realityIds =
        tensionRealities
          ?.filter((tr: any) => tr.tension_id === t.id)
          .map((tr: any) => tr.reality_id) || [];

      return {
        id: t.id,
        title: t.title,
        description: t.description || undefined,
        status: t.status as "active" | "review_needed" | "resolved",
        area_id: t.area_id || null,
        visionIds,
        realityIds,
        actionPlans: actionMap.get(t.id) || [],
      };
    });

    // パンくずリストをSQL関数で取得
    const breadcrumbsList = await getBreadcrumbsFromSQL(chart.id);

    // 親チャート情報を取得（後方互換性のため）
    const parentInfo = await getParentChartInfo(chart.id);

    // Areasを整形
    const areasList: Area[] = (areas || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      color: a.color,
      sort_order: a.sort_order,
      chart_id: a.chart_id,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));

    return {
      id: chart.id,
      title: chart.title,
      description: (chart as any).description || null,
      due_date: (chart as any).due_date || null,
      visions: Array.from(visionMap.values()) as VisionItem[],
      realities: Array.from(realityMap.values()) as RealityItem[],
      tensions: tensionsWithRelations,
      looseActions,
      areas: areasList,
      parentChartId: parentInfo?.parentChartId,
      parentChartTitle: parentInfo?.parentChartTitle,
      parentActionId: chart.parent_action_id || parentInfo?.parentActionId,
      parentActionTitle: parentInfo?.parentActionTitle,
      breadcrumbs: breadcrumbsList,
    };
  } catch (error) {
    console.error("Error in getChartById:", error);
    return null;
  }
}

// パンくずリストをSQL関数で取得（WITH RECURSIVE使用）
async function getBreadcrumbsFromSQL(
  chartId: string
): Promise<Array<{ id: string; title: string; type: "chart" | "action" }>> {
  try {
    const supabase = await createClient();
    // SQL関数を呼び出し
    const { data, error } = await supabase.rpc("get_breadcrumbs", {
      p_chart_id: chartId,
    });

    if (error) {
      console.error("Error calling get_breadcrumbs function:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 重複排除: 隣り合うアイテムの名前が完全に一致する場合は、子の方を非表示
    const deduplicated: Array<{ id: string; title: string; type: "chart" | "action" }> = [];
    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const prev = i > 0 ? data[i - 1] : null;
      
      // 前のアイテムとタイトルが完全に一致する場合はスキップ
      if (prev && prev.title === current.title && prev.type === current.type) {
        continue;
      }

      deduplicated.push({
        id: current.id,
        title: current.title,
        type: current.type as "chart" | "action",
      });
    }

    return deduplicated;
  } catch (error) {
    console.error("Error in getBreadcrumbsFromSQL:", error);
    return [];
  }
}

// Breadcrumbsを構築（親アクション情報を含む）- 後方互換性のため残す
async function buildBreadcrumbsWithAction(
  parentChartId: string | null,
  parentActionId: string | null | undefined,
  parentInfo: { parentChartId?: string; parentChartTitle?: string; parentActionId?: string; parentActionTitle?: string } | null
): Promise<Array<{ id: string; title: string }>> {
  const breadcrumbs: Array<{ id: string; title: string }> = [];

  // 親チャート情報を追加
  if (parentInfo?.parentChartId && parentInfo?.parentChartTitle) {
    breadcrumbs.push({
      id: parentInfo.parentChartId,
      title: parentInfo.parentChartTitle,
    });
  }

  // 親アクション情報を追加
  if (parentInfo?.parentActionId && parentInfo?.parentActionTitle) {
    breadcrumbs.push({
      id: parentInfo.parentActionId,
      title: parentInfo.parentActionTitle,
    });
  }

  // 現在のチャートを追加
  breadcrumbs.push({ id: "root", title: "全社マスター" });

  return breadcrumbs;
}

// Breadcrumbsを構築（旧版、後方互換性のため残す）
// 注意: この関数は parent_chart_id を使用していましたが、現在のDBスキーマには存在しないため、
// parent_action_id 経由で親チャートを取得する必要があります。
// 実際には getBreadcrumbsFromSQL が使用されているため、この関数は使用されていません。
async function buildBreadcrumbs(
  parentChartId: string | null,
  breadcrumbs: Array<{ id: string; title: string }> = []
): Promise<Array<{ id: string; title: string }>> {
  if (!parentChartId) {
    return [{ id: "root", title: "全社マスター" }, ...breadcrumbs];
  }

  // parent_chart_id は存在しないため、parent_action_id 経由で取得する必要があります
  // この関数は実際には使用されていないため、簡易実装に留めます
  const supabase = await createClient();
  const { data: parentChart } = await supabase
    .from("charts")
    .select("id, title, parent_action_id")
    .eq("id", parentChartId)
    .single();

  if (parentChart) {
    const newBreadcrumbs = [
      { id: parentChart.id, title: parentChart.title },
      ...breadcrumbs,
    ];
    // parent_action_id 経由で親チャートを取得する必要があるが、
    // この関数は使用されていないため、ここでは終了します
    return [{ id: "root", title: "全社マスター" }, ...newBreadcrumbs];
  }

  return [{ id: "root", title: "全社マスター" }, ...breadcrumbs];
}

// Vision追加
export async function createVision(
  chartId: string,
  content: string,
  areaId?: string | null
): Promise<VisionItem | null> {
  try {
    console.log("[createVision] 開始 - chartId:", chartId, "content:", content, "areaId:", areaId);
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    // IDはDBが自動生成するため、idフィールドは含めない
    const insertData: any = {
      chart_id: chartId,
      content: content.trim(),
      user_id: user.id,
    };
    if (areaId) {
      insertData.area_id = areaId;
    }

    const { data, error } = await serverSupabase
      .from("visions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[createVision] Supabase error:", error);
      console.error("[createVision] Error details:", JSON.stringify(error, null, 2));
      return null;
    }

    if (!data) {
      console.error("[createVision] No data returned from insert");
      return null;
    }

    console.log("[createVision] 成功 - data:", data);
    return {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      assignee: data.assignee || undefined,
      dueDate: data.due_date || undefined,
      targetDate: data.target_date || undefined,
      isLocked: data.is_locked || false,
      area_id: data.area_id || null,
    };
  } catch (error) {
    console.error("[createVision] Exception:", error);
    return null;
  }
}

// Vision更新
export async function updateVision(
  visionId: string,
  chartId: string,
  updates: Partial<VisionItem>
): Promise<boolean> {
  try {
    const serverClient = await createClient();
    const updateData: any = {};
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.targetDate !== undefined) updateData.target_date = updates.targetDate;
    if (updates.isLocked !== undefined) updateData.is_locked = updates.isLocked;
    if (updates.area_id !== undefined) updateData.area_id = updates.area_id;

    const { error } = await serverClient
      .from("visions")
      .update(updateData)
      .eq("id", visionId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("Error updating vision:", error);
      return false;
    }

    const syncUpdates: Record<string, string | null> = {};
    if (updates.dueDate !== undefined) syncUpdates.due_date = updates.dueDate as string | null;
    if (updates.assignee !== undefined) syncUpdates.assignee = updates.assignee as string | null;
    if (updates.area_id !== undefined) syncUpdates.area_id = updates.area_id as string | null;

    if (Object.keys(syncUpdates).length > 0) {
      try {
        const { data: chart } = await serverClient
          .from("charts")
          .select("parent_action_id")
          .eq("id", chartId)
          .single();

        if (chart?.parent_action_id) {
          await serverClient
            .from("actions")
            .update({
              ...syncUpdates,
              updated_at: new Date().toISOString(),
            })
            .eq("id", chart.parent_action_id);
        }
      } catch (syncError) {
        console.error("Failed to sync with parent action:", syncError);
      }
    }

    return true;
  } catch (error) {
    console.error("Error in updateVision:", error);
    return false;
  }
}

// Vision削除
export async function deleteVision(
  visionId: string,
  chartId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("visions")
      .delete()
      .eq("id", visionId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("Error deleting vision:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteVision:", error);
    return false;
  }
}

// Reality追加
export async function createReality(
  chartId: string,
  content: string,
  areaId?: string | null
): Promise<RealityItem | null> {
  try {
    console.log("[createReality] 開始 - chartId:", chartId, "content:", content, "areaId:", areaId);
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    // IDはDBが自動生成するため、idフィールドは含めない
    const insertData: any = {
      chart_id: chartId,
      content: content.trim(),
      user_id: user.id,
    };
    if (areaId) {
      insertData.area_id = areaId;
    }

    const { data, error } = await serverSupabase
      .from("realities")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[createReality] Supabase error:", error);
      console.error("[createReality] Error details:", JSON.stringify(error, null, 2));
      return null;
    }

    if (!data) {
      console.error("[createReality] No data returned from insert");
      return null;
    }

    console.log("[createReality] 成功 - data:", data);
    return {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      dueDate: data.due_date || undefined,
      relatedVisionId: data.related_vision_id || undefined,
      area_id: data.area_id || null,
    };
  } catch (error) {
    console.error("[createReality] Exception:", error);
    return null;
  }
}

// Reality更新
export async function updateReality(
  realityId: string,
  chartId: string,
  updates: Partial<Pick<RealityItem, "content" | "isLocked" | "area_id" | "dueDate">>
): Promise<boolean> {
  try {
    const serverClient = await createClient();
    const updateData: any = {};
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.isLocked !== undefined) updateData.is_locked = updates.isLocked;
    if (updates.area_id !== undefined) updateData.area_id = updates.area_id;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;

    const { error } = await serverClient
      .from("realities")
      .update(updateData)
      .eq("id", realityId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("Error updating reality:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateReality:", error);
    return false;
  }
}

// Reality削除
export async function deleteReality(
  realityId: string,
  chartId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("realities")
      .delete()
      .eq("id", realityId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("Error deleting reality:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteReality:", error);
    return false;
  }
}

// Tension追加
export async function createTension(
  chartId: string,
  title: string = "",
  areaId?: string | null
): Promise<Tension | null> {
  try {
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    const { data, error } = await serverSupabase
      .from("tensions")
      .insert({
        chart_id: chartId,
        title,
        status: "active",
        area_id: areaId ?? null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating tension:", error);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      status: data.status as "active" | "review_needed" | "resolved",
      area_id: data.area_id || null,
      visionIds: [],
      realityIds: [],
      actionPlans: [],
    };
  } catch (error) {
    console.error("Error in createTension:", error);
    return null;
  }
}

// Tension更新
export async function updateTension(
  tensionId: string,
  chartId: string,
  updates: Partial<Pick<Tension, "title" | "description" | "status">>
): Promise<boolean> {
  try {
    const serverClient = await createClient();
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { error } = await serverClient
      .from("tensions")
      .update(updateData)
      .eq("id", tensionId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("Error updating tension:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateTension:", error);
    return false;
  }
}

// Tension削除
export async function deleteTension(
  tensionId: string,
  chartId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("tensions")
      .delete()
      .eq("id", tensionId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("Error deleting tension:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteTension:", error);
    return false;
  }
}

// Tension-Vision関係の更新
export async function toggleTensionVisionLink(
  tensionId: string,
  visionId: string,
  chartId: string,
  isLinked: boolean
): Promise<boolean> {
  try {
    const supabase = await createClient();
    if (isLinked) {
      // リンクを削除
      const { error } = await supabase
        .from("tension_visions")
        .delete()
        .eq("tension_id", tensionId)
        .eq("vision_id", visionId);

      if (error) {
        console.error("Error removing vision link:", error);
        return false;
      }
    } else {
      // リンクを追加
      const user = await getAuthenticatedUser();
      const { error } = await supabase
        .from("tension_visions")
        .insert({
          tension_id: tensionId,
          vision_id: visionId,
          user_id: user.id,
        });

      if (error) {
        console.error("Error adding vision link:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in toggleTensionVisionLink:", error);
    return false;
  }
}

// Tension-Reality関係の更新
export async function toggleTensionRealityLink(
  tensionId: string,
  realityId: string,
  chartId: string,
  isLinked: boolean
): Promise<boolean> {
  try {
    const supabase = await createClient();
    if (isLinked) {
      // リンクを削除
      const { error } = await supabase
        .from("tension_realities")
        .delete()
        .eq("tension_id", tensionId)
        .eq("reality_id", realityId);

      if (error) {
        console.error("Error removing reality link:", error);
        return false;
      }
    } else {
      // リンクを追加
      const user = await getAuthenticatedUser();
      const { error } = await supabase
        .from("tension_realities")
        .insert({
          tension_id: tensionId,
          reality_id: realityId,
          user_id: user.id,
        });

      if (error) {
        console.error("Error adding reality link:", error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in toggleTensionRealityLink:", error);
    return false;
  }
}

// Action追加
export async function createAction(
  tensionId: string | null,
  title: string,
  areaId?: string | null,
  chartIdInput?: string | null
): Promise<{ action: ActionPlan | null; chartId: string | null }> {
  try {
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    let chartId = chartIdInput || null;
    if (tensionId) {
      const { data: tension, error: tensionError } = await serverSupabase
        .from("tensions")
        .select("chart_id")
        .eq("id", tensionId)
        .single();

      if (tensionError || !tension) {
        console.error("Error fetching tension:", tensionError);
        return { action: null, chartId: null };
      }

      chartId = tension.chart_id;
    }

    if (!chartId) {
      console.error("Error creating action: chartId is required");
      return { action: null, chartId: null };
    }

    const insertData: any = {
      chart_id: chartId,
      tension_id: tensionId,
      title,
      has_sub_chart: false,
      user_id: user.id,
    };
    if (areaId) {
      insertData.area_id = areaId;
    }

    const { data, error } = await serverSupabase
      .from("actions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating action:", error);
      return { action: null, chartId };
    }

    return {
      action: {
        id: data.id,
        title: data.title,
        dueDate: data.due_date || undefined,
        assignee: data.assignee || undefined,
        hasSubChart: data.has_sub_chart || false,
        subChartId: data.sub_chart_id || undefined,
        childChartId: data.child_chart_id || undefined,
        area_id: data.area_id || null,
      },
      chartId,
    };
  } catch (error) {
    console.error("Error in createAction:", error);
    return { action: null, chartId: null };
  }
}

// Action更新
export async function updateAction(
  actionId: string,
  tensionId: string | null,
  updates: Partial<ActionPlan>,
  chartId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    console.log("[updateAction] using server client", {
      actionId,
      table: "actions",
    });
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.hasSubChart !== undefined)
      updateData.has_sub_chart = updates.hasSubChart;
    if (updates.subChartId !== undefined)
      updateData.sub_chart_id = updates.subChartId;
    if (updates.childChartId !== undefined)
      updateData.child_chart_id = updates.childChartId;
    if (updates.isCompleted !== undefined)
      updateData.is_completed = updates.isCompleted;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.area_id !== undefined) updateData.area_id = updates.area_id;

    let query = supabase.from("actions").update(updateData).eq("id", actionId);
    if (tensionId) {
      query = query.eq("tension_id", tensionId);
    } else {
      query = query.is("tension_id", null);
      if (chartId) {
        query = query.eq("chart_id", chartId);
      }
    }

    const { error } = await query;

    if (error) {
      console.error("Error updating action:", error);
      return false;
    }

    const syncUpdates: Record<string, string | null> = {};
    if (updates.dueDate !== undefined) syncUpdates.due_date = updates.dueDate as string | null;
    if (updates.assignee !== undefined) syncUpdates.assignee = updates.assignee as string | null;
    if (updates.area_id !== undefined) syncUpdates.area_id = updates.area_id as string | null;

    if (Object.keys(syncUpdates).length > 0) {
      try {
        let childChartId = updates.childChartId;
        if (!childChartId) {
          const { data: action } = await supabase
            .from("actions")
            .select("child_chart_id")
            .eq("id", actionId)
            .single();
          childChartId = action?.child_chart_id || undefined;
        }

        if (childChartId) {
          await supabase
            .from("visions")
            .update({
              ...syncUpdates,
              updated_at: new Date().toISOString(),
            })
            .eq("chart_id", childChartId);
        }
      } catch (syncError) {
        console.error("Failed to sync with child visions:", syncError);
      }
    }

    return true;
  } catch (error) {
    console.error("Error in updateAction:", error);
    return false;
  }
}

// Action削除
export async function deleteAction(
  actionId: string,
  tensionId: string | null,
  chartId?: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    let query = supabase.from("actions").delete().eq("id", actionId);
    if (tensionId) {
      query = query.eq("tension_id", tensionId);
    } else {
      query = query.is("tension_id", null);
      if (chartId) {
        query = query.eq("chart_id", chartId);
      }
    }
    const { error } = await query;

    if (error) {
      console.error("Error deleting action:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteAction:", error);
    return false;
  }
}

// Chart更新（タイトル、概要、期限など）
export async function updateChart(
  chartId: string,
  updates: { title?: string; description?: string | null; due_date?: Date | string | null }
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.due_date !== undefined) {
      // Dateオブジェクトの場合はISO文字列に変換、nullの場合はそのまま
      updateData.due_date = updates.due_date instanceof Date 
        ? updates.due_date.toISOString().split('T')[0] 
        : updates.due_date;
    }

    const { error } = await supabase
      .from("charts")
      .update(updateData)
      .eq("id", chartId);

    if (error) {
      console.error("Error updating chart:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateChart:", error);
    return false;
  }
}

// テレスコーピング: アクションから子チャートを作成または取得
export async function telescopeAction(
  actionId: string,
  tensionId: string | null,
  chartId?: string
): Promise<string | null> {
  try {
    console.log("[telescopeAction] start", { actionId, tensionId, chartId });
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    // 1. アクション情報を取得
    let actionQuery = serverSupabase
      .from("actions")
      .select("id, title, child_chart_id, due_date, area_id, assignee, chart_id")
      .eq("id", actionId);
    if (tensionId) {
      actionQuery = actionQuery.eq("tension_id", tensionId);
    } else {
      actionQuery = actionQuery.is("tension_id", null);
      if (chartId) {
        actionQuery = actionQuery.eq("chart_id", chartId);
      }
    }

    const { data: action, error: actionError } = await actionQuery.single();

    if (actionError || !action) {
      console.error("Error fetching action:", actionError);
      return null;
    }
    console.log("[telescopeAction] fetched action:", action);

    // 2. 既に子チャートが存在する場合はそのIDを返す
    if (action.child_chart_id) {
      console.log("[telescopeAction] child chart exists:", action.child_chart_id);
      return action.child_chart_id;
    }

    // 3. 新規チャート作成フロー
    // 3-1. 新しいチャートを作成
    const { data: newChart, error: chartError } = await serverSupabase
      .from("charts")
      .insert({
        title: action.title,
        parent_action_id: actionId,
        due_date: action.due_date,
        user_id: user.id,
      })
      .select()
      .single();

    if (chartError || !newChart) {
      console.error("Error creating chart:", chartError);
      return null;
    }
    console.log("[telescopeAction] created chart:", newChart);

    // 3-2. 親アクションのタグを1つだけ子チャートにコピー
    let childAreaId: string | null = null;
    if (action.area_id) {
      const { data: parentArea, error: parentAreaError } = await serverSupabase
        .from("areas")
        .select("id, name, color, sort_order")
        .eq("id", action.area_id)
        .single();

      if (parentAreaError) {
        console.warn("[telescopeAction] Failed to fetch parent area:", parentAreaError);
      } else if (parentArea) {
        const { data: createdArea, error: areaError } = await serverSupabase
          .from("areas")
          .insert({
            chart_id: newChart.id,
            name: parentArea.name,
            color: parentArea.color,
            sort_order: parentArea.sort_order ?? 0,
            user_id: user.id,
          })
          .select("id")
          .single();

        if (areaError) {
          console.warn("[telescopeAction] Failed to copy area:", areaError);
        } else {
          childAreaId = createdArea?.id ?? null;
        }
      }
    }

    // 3-3. 親アクションのタイトルをVisionとして自動登録
    const { error: visionError } = await serverSupabase
      .from("visions")
      .insert({
        chart_id: newChart.id,
        content: action.title,
        due_date: action.due_date,
        area_id: childAreaId,
        assignee: action.assignee,
        user_id: user.id,
      });

    if (visionError) {
      console.error("Error creating vision:", visionError);
      // Visionの作成に失敗してもチャートは作成されているので、チャートIDを返す
    }
    console.log("[telescopeAction] created initial vision");

    // 3-4. 親アクションのchild_chart_idを更新
    const { error: updateActionError } = await serverSupabase
      .from("actions")
      .update({ child_chart_id: newChart.id, has_sub_chart: true })
      .eq("id", actionId);

    if (updateActionError) {
      console.error("Error updating action:", updateActionError);
      // チャートは作成されたが、アクションの更新に失敗した場合もチャートIDを返す
      return newChart.id;
    }
    console.log("[telescopeAction] updated action with child chart:", newChart.id);

    return newChart.id;
  } catch (error) {
    console.error("Error in telescopeAction:", error);
    return null;
  }
}

// 親チャートと親アクション情報を取得（パンくずリスト用）
export async function getParentChartInfo(
  chartId: string
): Promise<{ parentChartId?: string; parentChartTitle?: string; parentActionId?: string; parentActionTitle?: string } | null> {
  try {
    const supabase = await createClient();
    const { data: chart, error } = await supabase
      .from("charts")
      .select("id, title, parent_action_id")
      .eq("id", chartId)
      .single();

    if (error || !chart) {
      return null;
    }

    let parentChartId: string | undefined;
    let parentChartTitle: string | undefined;
    let parentActionId: string | undefined;
    let parentActionTitle: string | undefined;

    // parent_action_idから親アクション情報を取得
    if (chart.parent_action_id) {
      const { data: parentAction } = await supabase
        .from("actions")
        .select("id, title, tension_id, chart_id")
        .eq("id", chart.parent_action_id)
        .single();

      if (parentAction) {
        parentActionId = parentAction.id;
        parentActionTitle = parentAction.title;

        // 親アクションから親チャート情報を取得
      if (!parentAction.tension_id) {
        return null;
      }

        if (parentAction.tension_id) {
          const { data: parentTension } = await supabase
            .from("tensions")
            .select("chart_id")
            .eq("id", parentAction.tension_id)
            .single();

          if (parentTension) {
            const { data: parentChart } = await supabase
              .from("charts")
              .select("id, title")
              .eq("id", parentTension.chart_id)
              .single();

            if (parentChart) {
              parentChartId = parentChart.id;
              parentChartTitle = parentChart.title;
            }
          }
        } else if (parentAction.chart_id) {
          const { data: parentChart } = await supabase
            .from("charts")
            .select("id, title")
            .eq("id", parentAction.chart_id)
            .single();

          if (parentChart) {
            parentChartId = parentChart.id;
            parentChartTitle = parentChart.title;
          }
        }
      }
    }

    return {
      parentChartId,
      parentChartTitle,
      parentActionId,
      parentActionTitle,
    };
  } catch (error) {
    console.error("Error in getParentChartInfo:", error);
    return null;
  }
}

// 子チャートの進捗情報を取得（Action消化率）
export async function getChildChartProgress(
  childChartId: string
): Promise<{ total: number; completed: number; percentage: number } | null> {
  try {
    const supabase = await createClient();
    // 子チャートのすべてのTensionを取得
    const { data: tensions } = await supabase
      .from("tensions")
      .select("id, status")
      .eq("chart_id", childChartId);

    if (!tensions || tensions.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const tensionIds = tensions.map((t: any) => t.id);

    // すべてのActionを取得
    const { data: actions } = await supabase
      .from("actions")
      .select("id")
      .in("tension_id", tensionIds);

    if (!actions) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const total = actions.length;
    // Tensionのstatusが'resolved'のものを完了としてカウント
    // 注意: より正確には、各Actionにstatusフィールドを追加する方が良いが、
    // 現在はTensionのstatusで判定
    const resolvedTensionIds = tensions
      .filter((t: any) => t.status === "resolved")
      .map((t: any) => t.id);
    
    const { data: completedActions } = await supabase
      .from("actions")
      .select("id")
      .in("tension_id", resolvedTensionIds);

    const completed = completedActions?.length || 0;

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  } catch (error) {
    console.error("Error in getChildChartProgress:", error);
    return null;
  }
}

// エリア作成
export async function createArea(
  chartId: string,
  name: string,
  color: string = "#3b82f6"
): Promise<Area | null> {
  try {
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    // 既存のエリアの最大sort_orderを取得
    const { data: existingAreas } = await serverSupabase
      .from("areas")
      .select("sort_order")
      .eq("chart_id", chartId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const maxSortOrder = existingAreas && existingAreas.length > 0 
      ? existingAreas[0].sort_order 
      : 0;

    const { data, error } = await serverSupabase
      .from("areas")
      .insert({
        chart_id: chartId,
        name: name.trim(),
        color: color,
        sort_order: maxSortOrder + 1,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[createArea] Supabase error:", error);
      return null;
    }

    if (!data) {
      console.error("[createArea] No data returned from insert");
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      color: data.color,
      sort_order: data.sort_order,
      chart_id: data.chart_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error("[createArea] Exception:", error);
    return null;
  }
}

// エリア更新
export async function updateArea(
  areaId: string,
  chartId: string,
  updates: Partial<Pick<Area, "name" | "color">>
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.color !== undefined) updateData.color = updates.color;

    const { error } = await supabase
      .from("areas")
      .update(updateData)
      .eq("id", areaId)
      .eq("chart_id", chartId);

    if (error) {
      console.error("[updateArea] Supabase error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[updateArea] Exception:", error);
    return false;
  }
}

// エリア削除（削除前に、そのエリアが付いているVision/Realityを未分類に戻す）
export async function deleteArea(
  areaId: string,
  chartId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    // まず、そのエリアが付いているVisionとRealityを未分類（null）に戻す
    const { error: visionError } = await supabase
      .from("visions")
      .update({ area_id: null })
      .eq("area_id", areaId)
      .eq("chart_id", chartId);

    if (visionError) {
      console.error("[deleteArea] Error updating visions:", visionError);
      return false;
    }

    const { error: realityError } = await supabase
      .from("realities")
      .update({ area_id: null })
      .eq("area_id", areaId)
      .eq("chart_id", chartId);

    if (realityError) {
      console.error("[deleteArea] Error updating realities:", realityError);
      return false;
    }

    // エリアを削除
    const { error: deleteError } = await supabase
      .from("areas")
      .delete()
      .eq("id", areaId)
      .eq("chart_id", chartId);

    if (deleteError) {
      console.error("[deleteArea] Supabase error:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[deleteArea] Exception:", error);
    return false;
  }
}

// 履歴取得
export async function getItemHistory(
  itemType: "vision" | "reality" | "action",
  itemId: string
): Promise<HistoryItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("item_history")
      .select("*")
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getItemHistory] Supabase error:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      content: item.content,
      type: item.type as "update" | "comment",
      createdAt: item.created_at,
      createdBy: item.created_by || undefined,
    }));
  } catch (error) {
    console.error("[getItemHistory] Exception:", error);
    return [];
  }
}

// 履歴追加
export async function addItemHistory(
  itemType: "vision" | "reality" | "action",
  itemId: string,
  content: string,
  type: "update" | "comment",
  updateMainContent: boolean
): Promise<HistoryItem | null> {
  try {
    const user = await getAuthenticatedUser();
    const serverSupabase = await createClient();
    // 履歴を追加
    const { data, error } = await serverSupabase
      .from("item_history")
      .insert({
        item_type: itemType,
        item_id: itemId,
        content: content.trim(),
        type,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[addItemHistory] Supabase error:", error);
      return null;
    }

    // メインコンテンツも更新する場合
    if (updateMainContent && type === "update") {
      if (itemType === "vision") {
        await serverSupabase
          .from("visions")
          .update({ content: content.trim() })
          .eq("id", itemId);
      } else if (itemType === "reality") {
        await serverSupabase
          .from("realities")
          .update({ content: content.trim() })
          .eq("id", itemId);
      } else if (itemType === "action") {
        await serverSupabase
          .from("actions")
          .update({ title: content.trim() })
          .eq("id", itemId);
      }
    }

    return {
      id: data.id,
      content: data.content,
      type: data.type as "update" | "comment",
      createdAt: data.created_at,
      createdBy: data.created_by || undefined,
    };
  } catch (error) {
    console.error("[addItemHistory] Exception:", error);
    return null;
  }
}

