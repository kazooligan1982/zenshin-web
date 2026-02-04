"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/lib/workspace";

export type ChartWithMeta = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  parent_action_id: string | null;
  depth: number;
};

export type ProjectGroup = {
  master: ChartWithMeta;
  layers: {
    [depth: number]: ChartWithMeta[];
  };
};

export async function createChart(
  title: string = "無題のチャート"
): Promise<{ id: string; title: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const workspaceId = await getOrCreateWorkspace();

  const { data, error } = await supabase
    .from("charts")
    .insert({
      title,
      user_id: user.id,
      workspace_id: workspaceId,
    })
    .select()
    .single();

  if (error) {
    console.error("[createChart] Error:", error);
    throw error;
  }

  revalidatePath("/charts");
  return data;
}

export async function getChartsHierarchy(): Promise<{
  projectGroups: ProjectGroup[];
  recentCharts: ChartWithMeta[];
}> {

  const supabase = await createClient();
  const workspaceId = await getOrCreateWorkspace();

  const { data: charts, error } = await supabase
    .from("charts")
    .select("id, title, description, due_date, created_at, updated_at, parent_action_id")
    .is("archived_at", null)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getChartsHierarchy] error:", error);
    throw error;
  }

  const { data: actions } = await supabase
    .from("actions")
    .select("id, chart_id, child_chart_id");

  const childToParentChartMap = new Map<string, string>();
  for (const action of actions || []) {
    if (action.child_chart_id && action.chart_id) {
      childToParentChartMap.set(action.child_chart_id, action.chart_id);
    }
  }

  const getChartDepth = (chartId: string, visited = new Set<string>()): number => {
    if (visited.has(chartId)) return 1;
    visited.add(chartId);
    const parentChartId = childToParentChartMap.get(chartId);
    if (!parentChartId) return 1;
    return 1 + getChartDepth(parentChartId, visited);
  };

  const chartsWithDepth: ChartWithMeta[] = (charts || []).map((chart) => ({
    ...chart,
    depth: getChartDepth(chart.id),
  }));

  const masterCharts = chartsWithDepth.filter((chart) => chart.depth === 1);
  const subCharts = chartsWithDepth.filter((chart) => chart.depth > 1);

  const projectGroups: ProjectGroup[] = masterCharts.map((master) => {
    const findDescendants = (parentId: string): ChartWithMeta[] => {
      const children = subCharts.filter((sub) => {
        const subParentChartId = childToParentChartMap.get(sub.id);
        return subParentChartId === parentId;
      });
      const descendants = [...children];
      for (const child of children) {
        descendants.push(...findDescendants(child.id));
      }
      return descendants;
    };

    const descendants = findDescendants(master.id);
    const layers: { [depth: number]: ChartWithMeta[] } = {};
    for (const sub of descendants) {
      if (!layers[sub.depth]) {
        layers[sub.depth] = [];
      }
      layers[sub.depth].push(sub);
    }

    return { master, layers };
  });

  const recentCharts = chartsWithDepth.slice(0, 4);


  return { projectGroups, recentCharts };
}

export async function deleteChart(chartId: string) {
  const supabase = await createClient();
  const allChartIds = await getAllDescendantChartIds(supabase, chartId);
  allChartIds.push(chartId);

  await supabase
    .from("actions")
    .update({ child_chart_id: null, has_sub_chart: false })
    .in("child_chart_id", allChartIds);

  await supabase
    .from("actions")
    .update({ sub_chart_id: null })
    .in("sub_chart_id", allChartIds);

  const { error: deleteError } = await supabase
    .from("charts")
    .delete()
    .eq("id", chartId);
  if (deleteError) {
    console.error("[deleteChart] error:", deleteError);
    throw deleteError;
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/charts");
  return { success: true };
}

export async function archiveChart(chartId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const allChartIds = await getAllDescendantChartIds(supabase, chartId);
  allChartIds.push(chartId);

  const { error } = await supabase
    .from("charts")
    .update({ archived_at: now })
    .in("id", allChartIds);

  if (error) {
    console.error("[archiveChart] error:", error);
    throw error;
  }

  await supabase
    .from("actions")
    .update({ child_chart_id: null, has_sub_chart: false })
    .in("child_chart_id", allChartIds);

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/charts");

  return { success: true, archivedCount: allChartIds.length };
}

export async function restoreChart(chartId: string) {
  const supabase = await createClient();

  const allChartIds = await getAllDescendantChartIds(supabase, chartId);
  allChartIds.push(chartId);

  const { error } = await supabase
    .from("charts")
    .update({ archived_at: null })
    .in("id", allChartIds);

  if (error) {
    console.error("[restoreChart] error:", error);
    throw error;
  }

  for (const id of allChartIds) {
    const { data: chart } = await supabase
      .from("charts")
      .select("parent_action_id")
      .eq("id", id)
      .single();

    if (chart?.parent_action_id) {
      await supabase
        .from("actions")
        .update({ child_chart_id: id, has_sub_chart: true })
        .eq("id", chart.parent_action_id);
    }
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/charts");
  revalidatePath("/settings/archive");

  return { success: true };
}

async function getAllDescendantChartIds(
  supabase: any,
  chartId: string
): Promise<string[]> {
  const result: string[] = [];
  const { data: actions } = await supabase
    .from("actions")
    .select("child_chart_id")
    .eq("chart_id", chartId)
    .not("child_chart_id", "is", null);

  for (const action of actions || []) {
    if (action.child_chart_id) {
      result.push(action.child_chart_id);
      const descendants = await getAllDescendantChartIds(
        supabase,
        action.child_chart_id
      );
      result.push(...descendants);
    }
  }

  return result;
}

export async function getArchivedCharts() {
  const supabase = await createClient();
  const workspaceId = await getOrCreateWorkspace();
  const { data: charts, error } = await supabase
    .from("charts")
    .select("id, title, description, archived_at, created_at, updated_at, parent_action_id")
    .not("archived_at", "is", null)
    .eq("workspace_id", workspaceId)
    .order("archived_at", { ascending: false });

  if (error) {
    console.error("[getArchivedCharts] error:", error);
    throw error;
  }

  return charts || [];
}
