import {
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { NewChartButton } from "./new-chart-button";
import { ChartCard } from "./chart-card";
import { CompletedChartsSection } from "./completed-charts-section";
import { getChartsHierarchy, type ChartWithMeta, type ProjectGroup } from "./actions";

export default async function ChartsPage() {
  const { projectGroups, recentCharts, completedCharts } = await getChartsHierarchy();

  return (
    <div className="min-h-screen bg-zenshin-cream">
      <div className="max-w-7xl mx-auto py-10 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-zenshin-navy tracking-tight">
              Home
            </h1>
            <p className="text-sm text-zenshin-navy/60 mt-1">
              あなたの緊張構造チャート
            </p>
          </div>
          <NewChartButton />
        </div>

        {/* Recent Activity */}
        {recentCharts.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-4 h-4 text-zenshin-orange" />
              <h2 className="text-sm font-bold text-zenshin-navy/70 uppercase tracking-wider">
                Recent Activity
              </h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
              {recentCharts.map((chart) => (
                <div key={chart.id} className="snap-start shrink-0 w-[280px]">
                  <ChartCard chart={chart} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Charts */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <FolderOpen className="w-4 h-4 text-zenshin-teal" />
            <h2 className="text-sm font-bold text-zenshin-navy/70 uppercase tracking-wider">
              All Charts
            </h2>
          </div>

          {projectGroups.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-white/60 border border-zenshin-navy/10">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-zenshin-navy/20" />
              <p className="text-lg font-semibold text-zenshin-navy/60">
                まだチャートがありません
              </p>
              <p className="text-sm mt-2 text-zenshin-navy/40">
                「チャートを作成」ボタンから最初のチャートを作成しましょう
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {projectGroups.map((group) => (
                <ProjectGroupSection key={group.master.id} group={group} />
              ))}
            </div>
          )}

          {/* 完了済みチャート */}
          {completedCharts.length > 0 && (
            <CompletedChartsSection completedCharts={completedCharts} />
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectGroupSection({ group }: { group: ProjectGroup }) {
  const { master, layers } = group;
  const layerDepths = Object.keys(layers)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="bg-white rounded-2xl border border-zenshin-navy/8 shadow-sm overflow-hidden p-5">
      {/* Master Chart - same card style */}
      <div className="mb-4">
        <ChartCard chart={master} isMaster />
      </div>

      {/* Sub Charts */}
      {layerDepths.length > 0 ? (
        layerDepths.map((depth) => (
          <div key={depth}>
            <div className="flex items-center gap-3 mb-3 mt-4">
              <div className="h-px bg-zenshin-navy/10 flex-1" />
              <span className="text-[10px] font-bold text-zenshin-navy/40 uppercase tracking-widest">
                {depth === 2
                  ? "2nd Charts"
                  : depth === 3
                    ? "3rd Charts"
                    : `${depth}th Charts`}
              </span>
              <div className="h-px bg-zenshin-navy/10 flex-1" />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 snap-x [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:opacity-0 [&:hover::-webkit-scrollbar]:opacity-100 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zenshin-navy/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zenshin-navy/25">
              {layers[depth].map((chart) => (
                <div key={chart.id} className="snap-start shrink-0 w-[260px]">
                  <ChartCard chart={chart} />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-zenshin-navy/30 italic py-2">
          サブチャートはまだありません
        </p>
      )}
    </div>
  );
}
