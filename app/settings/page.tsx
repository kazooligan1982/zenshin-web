import Link from "next/link";
import { Archive, FolderOpen } from "lucide-react";
import { getArchivedCharts } from "@/app/charts/actions";

export default async function SettingsPage() {
  const archivedCharts = await getArchivedCharts();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Archive className="w-8 h-8 text-muted-foreground" />
        <h1 className="text-2xl font-bold">アーカイブされたチャート</h1>
      </div>

      {archivedCharts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>アーカイブされたチャートはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {archivedCharts.map((chart) => (
            <Link
              key={chart.id}
              href={`/charts/${chart.id}`}
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
            >
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{chart.title}</p>
                <p className="text-sm text-muted-foreground">
                  アーカイブ日:{" "}
                  {new Date(chart.archived_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
