import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ActionWithHierarchy {
  id: string;
  title: string;
  content: string | null;
  due_date: string | null;
  assignee: string | null;
  status: string | null;
  is_completed: boolean | null;
  tension_id: string | null;
  child_chart_id: string | null;
  depth: number;
  parent_action_id: string | null;
  tension_title: string | null;
  tension_area_name: string | null;
  tension_area_color: string | null;
  vision_title: string | null;
  has_children: boolean;
  vision_tags?: string[];
}

async function getVisionTagMap(
  supabase: any,
  chartId: string,
  tensionIds: string[]
) {
  if (tensionIds.length === 0) {
    return {
      tensionVisions: [],
      visionIndexMap: new Map<string, number>(),
    };
  }

  const [tensionVisionsRes, visionsRes] = await Promise.all([
    supabase
      .from("tension_visions")
      .select("tension_id, vision_id")
      .in("tension_id", tensionIds),
    supabase
      .from("visions")
      .select("id, content")
      .eq("chart_id", chartId)
      .order("created_at", { ascending: true }),
  ]);
  const tensionVisions = tensionVisionsRes.data;
  const visions = visionsRes.data;

  const visionIndexMap = new Map<string, number>();
  const visionContentMap = new Map<string, string>();
  visions?.forEach((v: any, index: number) => {
    visionIndexMap.set(v.id, index + 1);
    if (v.content) {
      visionContentMap.set(v.id, v.content);
    }
  });

  const tensionVisionTitleMap = new Map<string, string>();
  tensionIds.forEach((tensionId) => {
    const related = (tensionVisions || [])
      .filter((tv: any) => tv.tension_id === tensionId)
      .map((tv: any) => ({
        visionId: tv.vision_id,
        index: visionIndexMap.get(tv.vision_id) || Number.MAX_SAFE_INTEGER,
      }))
      .sort((a: any, b: any) => a.index - b.index);
    const first = related[0];
    if (first) {
      const title = visionContentMap.get(first.visionId);
      if (title) {
        tensionVisionTitleMap.set(tensionId, title);
      }
    }
  });

  return {
    tensionVisions: tensionVisions || [],
    visionIndexMap,
    tensionVisionTitleMap,
  };
}

async function getActionsWithHierarchy(
  supabase: any,
  chartId: string,
  depth: number = 0,
  parentActionId: string | null = null,
  tensionInfo: {
    title: string | null;
    areaName: string | null;
    areaColor: string | null;
    visionTitle: string | null;
  } | null = null
): Promise<ActionWithHierarchy[]> {
  const results: ActionWithHierarchy[] = [];

  const { data: tensions } = await supabase
    .from("tensions")
    .select("id, title, description, area_id, areas (name, color)")
    .eq("chart_id", chartId)
    .order("created_at", { ascending: true });

  const tensionIds = (tensions || []).map((t: any) => t.id);
  const { tensionVisions, visionIndexMap, tensionVisionTitleMap } =
    await getVisionTagMap(supabase, chartId, tensionIds);

  if (!tensions || tensions.length === 0) {
    const { data: actions } = await supabase
      .from("actions")
      .select("*")
      .eq("chart_id", chartId)
      .order("created_at", { ascending: true });

    const actionsList = actions || [];
    const actionsWithChildren = actionsList.filter(
      (a: any) => a.child_chart_id
    );
    const childResults = await Promise.all(
      actionsWithChildren.map((a: any) =>
        getActionsWithHierarchy(
          supabase,
          a.child_chart_id,
          depth + 1,
          a.id,
          tensionInfo
        )
      )
    );
    const childMap = new Map<string, ActionWithHierarchy[]>();
    actionsWithChildren.forEach((a: any, i: number) => {
      childMap.set(a.id, childResults[i]);
    });

    for (const action of actionsList) {
      results.push({
        id: action.id,
        title: action.title || action.content || "(無題)",
        content: action.content,
        due_date: action.due_date,
        assignee: action.assignee,
        status: action.status,
        is_completed: action.is_completed,
        tension_id: action.tension_id,
        child_chart_id: action.child_chart_id,
        depth,
        parent_action_id: parentActionId,
        tension_title: tensionInfo?.title || null,
        tension_area_name: tensionInfo?.areaName || null,
        tension_area_color: tensionInfo?.areaColor || null,
        vision_title: tensionInfo?.visionTitle || null,
        has_children: !!action.child_chart_id,
      });
      if (action.child_chart_id) {
        results.push(...(childMap.get(action.id) || []));
      }
    }

    return results;
  }

  const tensionActionResults = await Promise.all(
    (tensions || []).map((tension: any) =>
      supabase
        .from("actions")
        .select("*")
        .eq("tension_id", tension.id)
        .order("created_at", { ascending: true })
    )
  );

  for (let i = 0; i < (tensions || []).length; i++) {
    const tension = (tensions || [])[i];
    const { data: actions } = tensionActionResults[i];
    const actionsList = actions || [];
    const currentTensionInfo = {
      title: tension.title || tension.description || null,
      areaName: tension.areas?.name || null,
      areaColor: tension.areas?.color || null,
      visionTitle: tensionVisionTitleMap?.get(tension.id) || null,
    };

    const actionsWithChildren = actionsList.filter(
      (a: any) => a.child_chart_id
    );
    const childResults = await Promise.all(
      actionsWithChildren.map((a: any) =>
        getActionsWithHierarchy(
          supabase,
          a.child_chart_id,
          depth + 1,
          a.id,
          currentTensionInfo
        )
      )
    );
    const childMap = new Map<string, ActionWithHierarchy[]>();
    actionsWithChildren.forEach((a: any, idx: number) => {
      childMap.set(a.id, childResults[idx]);
    });

    for (const action of actionsList) {
      const relatedVisions = tensionVisions
        .filter((tv: any) => tv.tension_id === action.tension_id)
        .map((tv: any) => {
          const index = visionIndexMap.get(tv.vision_id);
          return index ? `V-${String(index).padStart(2, "0")}` : null;
        })
        .filter((tag: string | null): tag is string => tag !== null);

      results.push({
        id: action.id,
        title: action.title || action.content || "(無題)",
        content: action.content,
        due_date: action.due_date,
        assignee: action.assignee,
        status: action.status,
        is_completed: action.is_completed,
        tension_id: tension.id,
        child_chart_id: action.child_chart_id,
        depth,
        parent_action_id: parentActionId,
        tension_title: currentTensionInfo.title,
        tension_area_name: currentTensionInfo.areaName,
        tension_area_color: currentTensionInfo.areaColor,
        vision_title: currentTensionInfo.visionTitle,
        has_children: !!action.child_chart_id,
        vision_tags: relatedVisions,
      });
      if (action.child_chart_id) {
        results.push(...(childMap.get(action.id) || []));
      }
    }
  }

  return results;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const actions = await getActionsWithHierarchy(supabase, projectId);

    return NextResponse.json(actions);
  } catch (error) {
    console.error("Error in GET /api/charts/[id]/actions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

