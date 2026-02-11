"use server";

import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  type: "chart" | "vision" | "reality" | "tension" | "action";
  id: string;
  title: string;
  chartTitle: string;
  chartId: string;
}

const LIMIT_PER_TABLE = 20;

export async function searchWorkspaceItems(
  workspaceId: string,
  query: string
): Promise<SearchResult[]> {
  try {
    const supabase = await createClient();

    const { data: chartsInWorkspace, error: chartsError } = await supabase
      .from("charts")
      .select("id, title")
      .eq("workspace_id", workspaceId);

    console.log("[Search] workspaceId:", workspaceId, "charts found:", chartsInWorkspace?.length, "error:", chartsError);

    if (chartsError || !chartsInWorkspace?.length) {
      return [];
    }

    const chartIds = chartsInWorkspace.map((c: { id: string; title: string | null }) => c.id);
    const chartTitleMap = new Map<string, string>(
      chartsInWorkspace.map((c: { id: string; title: string | null }) => [
        c.id,
        c.title?.trim() || "(無題)",
      ])
    );

    const hasQuery = query.trim().length > 0;
    const pattern = `%${query.trim()}%`;

    const chartsQuery = supabase
      .from("charts")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .limit(LIMIT_PER_TABLE);
    if (hasQuery) {
      chartsQuery.ilike("title", pattern);
    }

    const visionsQuery = supabase
      .from("visions")
      .select("id, content, chart_id")
      .in("chart_id", chartIds)
      .limit(LIMIT_PER_TABLE);
    if (hasQuery) {
      visionsQuery.ilike("content", pattern);
    }

    const realitiesQuery = supabase
      .from("realities")
      .select("id, content, chart_id")
      .in("chart_id", chartIds)
      .limit(LIMIT_PER_TABLE);
    if (hasQuery) {
      realitiesQuery.ilike("content", pattern);
    }

    const tensionsQuery = supabase
      .from("tensions")
      .select("id, title, description, chart_id")
      .in("chart_id", chartIds)
      .limit(LIMIT_PER_TABLE);
    if (hasQuery) {
      tensionsQuery.or(`title.ilike.${pattern},description.ilike.${pattern}`);
    }

    const actionsQuery = supabase
      .from("actions")
      .select("id, title, chart_id")
      .in("chart_id", chartIds)
      .limit(LIMIT_PER_TABLE);
    if (hasQuery) {
      actionsQuery.ilike("title", pattern);
    }

    const [
      { data: chartsData, error: chartsErr },
      { data: visionsData, error: visionsErr },
      { data: realitiesData, error: realitiesErr },
      { data: tensionsData, error: tensionsErr },
      { data: actionsData, error: actionsErr },
    ] = await Promise.all([
      chartsQuery,
      visionsQuery,
      realitiesQuery,
      tensionsQuery,
      actionsQuery,
    ]);

    console.log("[Search] query results:", {
      charts: chartsData?.length ?? "err:" + chartsErr?.message,
      visions: visionsData?.length ?? "err:" + visionsErr?.message,
      realities: realitiesData?.length ?? "err:" + realitiesErr?.message,
      tensions: tensionsData?.length ?? "err:" + tensionsErr?.message,
      actions: actionsData?.length ?? "err:" + actionsErr?.message,
    });

    if (chartsErr || visionsErr || realitiesErr || tensionsErr || actionsErr) {
      return [];
    }

    const results: SearchResult[] = [];

    (chartsData || []).forEach((row: { id: string; title: string | null }) => {
      results.push({
        type: "chart",
        id: row.id,
        title: row.title?.trim() || "(無題)",
        chartTitle: row.title?.trim() || "(無題)",
        chartId: row.id,
      });
    });

    (visionsData || []).forEach(
      (row: { id: string; content: string | null; chart_id: string }) => {
        results.push({
          type: "vision",
          id: row.id,
          title: (row.content?.trim() || "").slice(0, 200) || "(無題)",
          chartTitle: chartTitleMap.get(row.chart_id) || "(無題)",
          chartId: row.chart_id,
        });
      }
    );

    (realitiesData || []).forEach(
      (row: { id: string; content: string | null; chart_id: string }) => {
        results.push({
          type: "reality",
          id: row.id,
          title: (row.content?.trim() || "").slice(0, 200) || "(無題)",
          chartTitle: chartTitleMap.get(row.chart_id) || "(無題)",
          chartId: row.chart_id,
        });
      }
    );

    (tensionsData || []).forEach(
      (row: {
        id: string;
        title: string | null;
        description: string | null;
        chart_id: string;
      }) => {
        const title =
          row.title?.trim() ||
          (row.description?.trim() || "").slice(0, 200) ||
          "(無題)";
        results.push({
          type: "tension",
          id: row.id,
          title,
          chartTitle: chartTitleMap.get(row.chart_id) || "(無題)",
          chartId: row.chart_id,
        });
      }
    );

    (actionsData || []).forEach(
      (row: {
        id: string;
        title: string | null;
        chart_id: string;
      }) => {
        const title = row.title?.trim() || "(無題)";
        results.push({
          type: "action",
          id: row.id,
          title,
          chartTitle: chartTitleMap.get(row.chart_id) || "(無題)",
          chartId: row.chart_id,
        });
      }
    );

    return results;
  } catch {
    return [];
  }
}
