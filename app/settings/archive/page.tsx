import { Archive, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getArchivedCharts } from "@/app/charts/actions";
import { ArchivedChartCard } from "./archived-chart-card";

export default async function ArchivePage() {
  const archivedCharts = await getArchivedCharts();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Archive className="w-8 h-8 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">アーカイブ</h1>
          <p className="text-muted-foreground text-sm">
            アーカイブされたチャートを管理
          </p>
        </div>
      </div>

      {archivedCharts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>アーカイブされたチャートはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedCharts.map((chart) => (
            <ArchivedChartCard
              key={chart.id}
              chart={{
                ...chart,
                archived_at: chart.archived_at
                  ? format(new Date(chart.archived_at), "yyyy/MM/dd HH:mm", { locale: ja })
                  : "",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
