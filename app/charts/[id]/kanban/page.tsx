import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { KanbanBoard } from "./kanban-board";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function KanbanPage({ params }: PageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  // チャートの存在確認
  const { data: chart } = await supabase
    .from("charts")
    .select("id, title")
    .eq("id", projectId)
    .single();

  if (!chart) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <KanbanBoard projectId={projectId} />
    </div>
  );
}

