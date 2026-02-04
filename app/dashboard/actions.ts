"use server";

import { createClient } from "@/lib/supabase/server";

export type DashboardStats = {
  totalCharts: number;
  totalActions: number;
  completedActions: number;
  completionRate: number;
  statusDistribution: {
    todo: number;
    in_progress: number;
    done: number;
    pending: number;
    canceled: number;
  };
};

export type StaleChart = {
  id: string;
  title: string;
  updated_at: string;
  daysSinceUpdate: number;
};

export type UpcomingDeadline = {
  id: string;
  title: string;
  due_date: string;
  status: string;
  chart_id: string;
  chart_title: string;
  isOverdue: boolean;
  daysUntilDue: number;
};

export async function getDashboardData(chartId?: string): Promise<{
  stats: DashboardStats;
  staleCharts: StaleChart[];
  upcomingDeadlines: UpcomingDeadline[];
  availableCharts: { id: string; title: string }[];
}> {
  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: allChartsForFilter } = await supabase
    .from("charts")
    .select("id, title")
    .is("archived_at", null)
    .is("parent_action_id", null)
    .order("title");

  let targetChartIds: string[] | null = null;
  if (chartId && chartId !== "all") {
    targetChartIds = await getAllDescendantChartIds(supabase, chartId);
    targetChartIds.push(chartId);
  }

  let chartsQuery = supabase
    .from("charts")
    .select("id, title, updated_at")
    .is("archived_at", null);

  if (targetChartIds) {
    chartsQuery = chartsQuery.in("id", targetChartIds);
  }

  const { data: charts, error: chartsError } = await chartsQuery;

  if (chartsError) {
    console.error("[getDashboardData] charts error:", chartsError);
    throw chartsError;
  }

  let actionsQuery = supabase
    .from("actions")
    .select(
      `
      id,
      title,
      status,
      is_completed,
      due_date,
      tension_id,
      tensions!inner(chart_id, charts!inner(id, title, archived_at))
    `
    )
    .is("tensions.charts.archived_at", null);

  if (targetChartIds) {
    actionsQuery = actionsQuery.in("tensions.chart_id", targetChartIds);
  }

  const { data: actions, error: actionsError } = await actionsQuery;

  if (actionsError) {
    console.error("[getDashboardData] actions error:", actionsError);
  }

  const allActions = actions || [];
  const allCharts = charts || [];

  const statusDistribution = {
    todo: 0,
    in_progress: 0,
    done: 0,
    pending: 0,
    canceled: 0,
  };

  for (const action of allActions) {
    const status = action.status || (action.is_completed ? "done" : "todo");
    if (status in statusDistribution) {
      statusDistribution[status as keyof typeof statusDistribution]++;
    } else {
      statusDistribution.todo++;
    }
  }

  const completedActions = statusDistribution.done + statusDistribution.canceled;
  const totalActions = allActions.length;
  const completionRate =
    totalActions > 0 ? Math.round((statusDistribution.done / totalActions) * 100) : 0;

  const staleCharts: StaleChart[] = allCharts
    .filter((chart) => new Date(chart.updated_at) < sevenDaysAgo)
    .map((chart) => {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - new Date(chart.updated_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return {
        id: chart.id,
        title: chart.title,
        updated_at: chart.updated_at,
        daysSinceUpdate,
      };
    })
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
    .slice(0, 5);

  const upcomingDeadlines: UpcomingDeadline[] = allActions
    .filter((action) => {
      if (!action.due_date) return false;
      if (action.status === "done" || action.status === "canceled") return false;
      const dueDate = new Date(action.due_date);
      return dueDate <= sevenDaysFromNow;
    })
    .map((action: any) => {
      const dueDate = new Date(action.due_date);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const chartData = action.tensions?.charts;
      return {
        id: action.id,
        title: action.title || "(無題)",
        due_date: action.due_date,
        status: action.status || "todo",
        chart_id: chartData?.id || "",
        chart_title: chartData?.title || "",
        isOverdue: daysUntilDue < 0,
        daysUntilDue,
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
    .slice(0, 10);

  const stats: DashboardStats = {
    totalCharts: allCharts.length,
    totalActions,
    completedActions: statusDistribution.done,
    completionRate,
    statusDistribution,
  };

  return {
    stats,
    staleCharts,
    upcomingDeadlines,
    availableCharts: allChartsForFilter || [],
  };
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
