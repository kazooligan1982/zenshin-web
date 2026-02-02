import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Home,
  Calendar,
  RefreshCcw,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteChartButton } from "./delete-chart-button";
import { NewChartButton } from "./new-chart-button";
import { getChartsHierarchy, type ChartWithMeta, type ProjectGroup } from "./actions";

export default async function ChartsPage() {
  const { projectGroups, recentCharts } = await getChartsHierarchy();

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Home className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Home</h1>
        </div>
        <NewChartButton />
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
          Recent Activity
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {recentCharts.map((chart) => (
            <div key={chart.id} className="snap-start shrink-0 w-[280px]">
              <ChartCard chart={chart} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-6 text-muted-foreground">
          All Charts
        </h2>

        {projectGroups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">まだチャートがありません</p>
            <p className="text-sm mt-2">
              「New Chart」ボタンから最初のチャートを作成しましょう
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {projectGroups.map((group) => (
              <ProjectGroupSection key={group.master.id} group={group} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProjectGroupSection({ group }: { group: ProjectGroup }) {
  const { master, layers } = group;
  const layerDepths = Object.keys(layers)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="border-b pb-8 last:border-0">
      <Link
        href={`/charts/${master.id}`}
        className="group flex items-center gap-3 mb-4 hover:opacity-80 transition-opacity"
      >
        <FolderOpen className="h-6 w-6 text-primary" />
        <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
          {master.title}
        </h3>
        <Badge className="bg-gray-900 text-white">Master</Badge>
        {master.due_date && (
          <span className="text-sm text-muted-foreground flex items-center gap-1 ml-auto">
            <Calendar className="w-4 h-4" />
            {format(new Date(master.due_date), "yyyy/MM/dd", { locale: ja })}
          </span>
        )}
      </Link>

      {layerDepths.length > 0 ? (
        layerDepths.map((depth) => (
          <div key={depth} className="mt-6">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {depth === 2
                  ? "2nd Charts"
                  : depth === 3
                    ? "3rd Charts"
                    : `${depth}th Charts`}
              </span>
              <div className="h-px bg-border flex-1" />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 px-1 snap-x">
              {layers[depth].map((chart) => (
                <div key={chart.id} className="snap-start shrink-0 w-[300px]">
                  <ChartCard chart={chart} />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground italic py-2 ml-9">
          サブチャートはまだありません
        </p>
      )}
    </div>
  );
}

function ChartCard({ chart }: { chart: ChartWithMeta }) {
  const depthLabel =
    chart.depth === 1
      ? "Master"
      : chart.depth === 2
        ? "2nd"
        : chart.depth === 3
          ? "3rd"
          : `${chart.depth}th`;
  const depthColor =
    chart.depth === 1
      ? "bg-gray-900 text-white"
      : chart.depth === 2
        ? "bg-blue-100 text-blue-700"
        : "bg-green-100 text-green-700";

  return (
    <Link href={`/charts/${chart.id}`}>
      <Card className="h-full hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-start mb-3">
            <Badge className={depthColor}>{depthLabel}</Badge>
            <DeleteChartButton chartId={chart.id} />
          </div>

          <h4 className="font-bold text-base leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors">
            {chart.title}
          </h4>

          <div className="mt-auto grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-muted-foreground">
            {chart.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  期限: {format(new Date(chart.due_date), "MM/dd", { locale: ja })}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <RefreshCcw className="w-3 h-3" />
              <span>
                更新: {format(new Date(chart.updated_at), "MM/dd", { locale: ja })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
