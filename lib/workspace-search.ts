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
  query: string,
  chartId?: string
): Promise<SearchResult[]> {
  try {
    const supabase = await createClient();

    let chartsInWorkspace: { id: string; title: string | null }[] = [];
    if (workspaceId) {
      const { data, error } = await supabase
        .from("charts")
        .select("id, title")
        .eq("workspace_id", workspaceId);
      if (error || !data?.length) return [];
      chartsInWorkspace = data;
    } else if (chartId) {
      const { data } = await supabase
        .from("charts")
        .select("id, title")
        .eq("id", chartId)
        .single();
      if (data) chartsInWorkspace = [data];
    }
    if (!chartsInWorkspace.length) return [];

    const chartIds = chartId
      ? chartsInWorkspace.some((c: { id: string }) => c.id === chartId)
        ? [chartId]
        : []
      : chartsInWorkspace.map((c: { id: string; title: string | null }) => c.id);

    if (chartIds.length === 0) return [];

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

    if (chartsErr || visionsErr || realitiesErr || tensionsErr || actionsErr) {
      return [];
    }

    const results: SearchResult[] = [];

    if (!chartId) {
      (chartsData || []).forEach((row: { id: string; title: string | null }) => {
        results.push({
          type: "chart",
          id: row.id,
          title: row.title?.trim() || "(無題)",
          chartTitle: row.title?.trim() || "(無題)",
          chartId: row.id,
        });
      });
    }

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

export interface MemberSearchResult {
  type: "user";
  id: string;
  title: string;
  email: string;
}

export async function searchWorkspaceMembers(
  workspaceId: string,
  query: string
): Promise<MemberSearchResult[]> {
  if (!workspaceId) return [];
  try {
    const supabase = await createClient();
    const { data: members } = await supabase
      .from("workspace_members")
      .select("user_id, profiles(email, name)")
      .eq("workspace_id", workspaceId);

    if (!members) return [];
    const pattern = query.trim().toLowerCase();
    const membersList = Array.isArray(members) ? members : [];
    return membersList
      .filter((m: unknown) => {
        const p = (m as { profiles?: { email?: string; name?: string } }).profiles;
        const name = (Array.isArray(p) ? p[0] : p)?.name || "";
        const email = (Array.isArray(p) ? p[0] : p)?.email || "";
        if (!pattern) return true;
        return (
          name.toLowerCase().includes(pattern) ||
          email.toLowerCase().includes(pattern)
        );
      })
      .slice(0, 20)
      .map((m: unknown) => {
        const row = m as { user_id: string; profiles?: { email?: string; name?: string } | { email?: string; name?: string }[] };
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          type: "user" as const,
          id: `user:${row.user_id}`,
          title: p?.name || p?.email || "(不明)",
          email: p?.email || "",
        };
      });
  } catch {
    return [];
  }
}

export async function searchWorkspaceCharts(
  workspaceId: string,
  query: string
): Promise<SearchResult[]> {
  if (!workspaceId) return [];
  try {
    const supabase = await createClient();
    let q = supabase
      .from("charts")
      .select("id, title")
      .eq("workspace_id", workspaceId)
      .limit(20);
    if (query.trim()) {
      q = q.ilike("title", `%${query.trim()}%`);
    }
    const { data } = await q;
    return (data ?? []).map((row: { id: string; title: string | null }) => ({
      type: "chart" as const,
      id: row.id,
      title: row.title?.trim() || "(無題)",
      chartTitle: row.title?.trim() || "(無題)",
      chartId: row.id,
    }));
  } catch {
    return [];
  }
}
