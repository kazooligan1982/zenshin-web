import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchChart } from "./actions";
import { createClient } from "@/utils/supabase/server";

const ProjectEditor = dynamic(
  () => import("./project-editor").then((mod) => mod.ProjectEditor),
  {
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        読み込み中...
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let currentUser = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, name, avatar_url")
        .eq("id", user.id)
        .single();
      currentUser = profile || {
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.name || user.email?.split("@")[0] || "",
        avatar_url: null,
      };
    }
    const chart = await fetchChart(id);

    if (!chart) {
      // 環境変数が設定されていない場合のフォールバック
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        return (
          <div className="flex items-center justify-center h-screen bg-[#F5F7FA]">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
              <h2 className="text-xl font-bold mb-4">Supabase設定が必要です</h2>
              <p className="text-sm text-muted-foreground mb-4">
                データベースに接続するには、環境変数を設定してください。
              </p>
              <div className="bg-gray-50 p-4 rounded text-xs font-mono">
                <p className="mb-2">.env.local ファイルに以下を追加：</p>
                <p>NEXT_PUBLIC_SUPABASE_URL=your_url</p>
                <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key</p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                詳細は <code className="bg-gray-100 px-1 rounded">SUPABASE_SETUP.md</code> を参照してください。
              </p>
            </div>
          </div>
        );
      }
      
      notFound();
    }

    const editorKey = JSON.stringify(
      chart.tensions.flatMap((tension) =>
        (tension.actionPlans || []).map((action) => ({
          id: action.id,
          status: action.status,
          isCompleted: action.isCompleted,
        }))
      )
    );

    return (
      <ProjectEditor
        key={editorKey}
        initialChart={chart}
        chartId={id}
        currentUserId={user?.id ?? ""}
        currentUser={currentUser}
      />
    );
  } catch (error) {
    console.error("Error loading chart:", error);
    return (
      <div className="flex items-center justify-center h-screen bg-[#F5F7FA]">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold mb-4 text-destructive">エラーが発生しました</h2>
          <p className="text-sm text-muted-foreground mb-4">
            データの読み込みに失敗しました。
          </p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "不明なエラー"}
          </p>
        </div>
      </div>
    );
  }
}
