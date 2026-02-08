import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Calendar,
  RefreshCcw,
  FolderOpen,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { DeleteChartButton } from "./delete-chart-button";
import { NewChartButton } from "./new-chart-button";
import { getChartsHierarchy, type ChartWithMeta, type ProjectGroup } from "./actions";

export default async function ChartsPage() {
  const { projectGroups, recentCharts } = await getChartsHierarchy();

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
                「New Chart」ボタンから最初のチャートを作成しましょう
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {projectGroups.map((group) => (
                <ProjectGroupSection key={group.master.id} group={group} />
              ))}
            </div>
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

function ChartCard({ chart, isMaster = false }: { chart: ChartWithMeta; isMaster?: boolean }) {
  const depthLabel =
    chart.depth === 1
      ? "Master"
      : chart.depth === 2
        ? "2nd"
        : chart.depth === 3
          ? "3rd"
          : `${chart.depth}th`;

  // TODO: Replace with real action status data from backend
  const mockStatus = {
    total: 0,
    done: 0,
    inProgress: 0,
    onHold: 0,
    notStarted: 0,
    cancelled: 0,
  };

  const bgClass = isMaster
    ? "bg-zenshin-cream/60 border-zenshin-navy/12 hover:bg-white"
    : "bg-zenshin-cream/50 border-zenshin-navy/6 hover:bg-white";

  return (
    <Link href={`/charts/${chart.id}`}>
      <div className={`group relative rounded-xl border p-4 h-full hover:shadow-md hover:border-zenshin-orange/30 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col ${bgClass}`}>
        {/* Row 1: Badge + Status Bar */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <DepthBadge depth={chart.depth} label={depthLabel} />
            <StatusBar status={mockStatus} />
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
            <DeleteChartButton chartId={chart.id} />
          </div>
        </div>

        {/* Row 2: Title */}
        <h4 className={`font-bold text-zenshin-navy leading-snug mb-3 line-clamp-2 group-hover:text-zenshin-orange transition-colors ${isMaster ? "text-base" : "text-sm"}`}>
          {chart.title}
        </h4>

        {/* Row 3: Footer - pinned to bottom */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-zenshin-navy/5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zenshin-navy/70">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {chart.due_date ? (
                <span>期限: {format(new Date(chart.due_date), "MM/dd", { locale: ja })}</span>
              ) : (
                <span className="text-zenshin-orange/60">期限: 未設定</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <RefreshCcw className="w-3 h-3" />
              <span>更新: {format(new Date(chart.updated_at), "MM/dd", { locale: ja })}</span>
            </div>
          </div>
          {/* Member avatars placeholder */}
          <div className="flex -space-x-1.5 shrink-0">
            <div className="w-5 h-5 rounded-full bg-zenshin-teal/20 border-2 border-white" />
            <div className="w-5 h-5 rounded-full bg-zenshin-orange/20 border-2 border-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusBar({ status }: { status: { total: number; done: number; inProgress: number; onHold: number; notStarted: number; cancelled: number } }) {
  const { total, done, inProgress, onHold, notStarted, cancelled } = status;
  if (total === 0) return null;

  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {/* Mini progress bar */}
      <div className="flex h-1.5 flex-1 rounded-full overflow-hidden bg-zenshin-navy/5 max-w-[80px]">
        {done > 0 && <div className="bg-emerald-400" style={{ width: pct(done) }} />}
        {inProgress > 0 && <div className="bg-blue-400" style={{ width: pct(inProgress) }} />}
        {onHold > 0 && <div className="bg-amber-400" style={{ width: pct(onHold) }} />}
        {cancelled > 0 && <div className="bg-red-300" style={{ width: pct(cancelled) }} />}
        {notStarted > 0 && <div className="bg-zenshin-navy/10" style={{ width: pct(notStarted) }} />}
      </div>
      {/* Fraction */}
      <span className="text-[10px] text-zenshin-navy/40 whitespace-nowrap">
        {done}/{total}
      </span>
    </div>
  );
}

function DepthBadge({ depth, label }: { depth: number; label: string }) {
  const colorClass =
    depth === 1
      ? "bg-zenshin-navy text-white"
      : depth === 2
        ? "bg-zenshin-teal/15 text-zenshin-teal"
        : "bg-zenshin-orange/15 text-zenshin-orange";

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${colorClass}`}>
      {label}
    </span>
  );
}
