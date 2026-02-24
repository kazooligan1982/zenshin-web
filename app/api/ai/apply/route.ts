import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chartId, visions, realities, tensions, actions } = await req.json();

  const { data: chart } = await supabase
    .from("charts")
    .select("id, workspace_id")
    .eq("id", chartId)
    .single();

  if (!chart) {
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });
  }

  const visionInserts = (visions || []).map(
    (v: { title: string }, i: number) => ({
      chart_id: chartId,
      content: (v.title || "").trim() || "(無題)",
      sort_order: i,
    })
  );
  if (visionInserts.length > 0) {
    const { error } = await supabase.from("visions").insert(visionInserts);
    if (error) {
      console.error("[ai/apply] visions insert error:", error);
      return NextResponse.json(
        { error: "Failed to insert visions" },
        { status: 500 }
      );
    }
  }

  const realityInserts = (realities || []).map(
    (r: { title: string }, i: number) => ({
      chart_id: chartId,
      content: (r.title || "").trim() || "(無題)",
      sort_order: i,
    })
  );
  if (realityInserts.length > 0) {
    const { error } = await supabase.from("realities").insert(realityInserts);
    if (error) {
      console.error("[ai/apply] realities insert error:", error);
      return NextResponse.json(
        { error: "Failed to insert realities" },
        { status: 500 }
      );
    }
  }

  const tensionIds: string[] = [];
  for (const t of tensions || []) {
    const { data: inserted, error } = await supabase
      .from("tensions")
      .insert({
        chart_id: chartId,
        title: (t.title || "").trim() || "(無題)",
        status: "active",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[ai/apply] tension insert error:", error);
      continue;
    }
    if (inserted) {
      tensionIds.push(inserted.id);
    }
  }

  const actionInserts = (actions || []).map((a: { title: string; tensionIndex?: number }) => ({
    chart_id: chartId,
    title: (a.title || "").trim() || "(無題)",
    tension_id: a.tensionIndex != null && tensionIds[a.tensionIndex] ? tensionIds[a.tensionIndex] : null,
  }));
  if (actionInserts.length > 0) {
    const { error } = await supabase.from("actions").insert(actionInserts);
    if (error) {
      console.error("[ai/apply] actions insert error:", error);
      return NextResponse.json(
        { error: "Failed to insert actions" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
