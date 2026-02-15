import Link from "next/link";
import {
  FolderOpen,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { getDashboardData } from "./actions";
import { DashboardChartFilter } from "./dashboard-chart-filter";
import { DashboardPeriodFilter } from "./dashboard-period-filter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ chartId?: string; period?: string; from?: string; to?: string }>;
}) {
  const resolvedParams = await searchParams;
  const selectedChartId = resolvedParams?.chartId ?? "all";
  const period = resolvedParams?.period ?? "all";
  const from = resolvedParams?.from ?? null;
  const to = resolvedParams?.to ?? null;
  const { stats, staleCharts, upcomingDeadlines, availableCharts } =
    await getDashboardData(selectedChartId, period, from, to);

  return (
    <div className="py-8 px-6 lg:px-10 min-h-screen">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zenshin-navy">ダッシュボード</h1>
          <p className="text-sm text-zenshin-navy/40 mt-1">チャートの状況を俯瞰する</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <DashboardPeriodFilter period={period} from={from} to={to} />
          <DashboardChartFilter
            charts={availableCharts}
            selectedChartId={selectedChartId}
          />
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">チャート数</span>
            <FolderOpen className="w-4 h-4 text-zenshin-navy/30" />
          </div>
          <div className="text-3xl font-bold text-zenshin-navy">{stats.totalCharts}</div>
        </div>

        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">アクション数</span>
            <Target className="w-4 h-4 text-zenshin-teal/60" />
          </div>
          <div className="text-3xl font-bold text-zenshin-navy">{stats.totalActions}</div>
        </div>

        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">完了</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{stats.completedActions}</div>
        </div>

        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">完了率</span>
            <TrendingUp className="w-4 h-4 text-zenshin-orange/60" />
          </div>
          <div className="text-3xl font-bold text-zenshin-navy">{stats.completionRate}%</div>
          <div className="w-full bg-zenshin-navy/8 rounded-full h-1.5 mt-3">
            <div
              className="bg-zenshin-teal h-1.5 rounded-full transition-all"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ステータス分布 */}
      <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5 mb-8">
        <h2 className="text-sm font-medium text-zenshin-navy/50 mb-4">ステータス分布</h2>
        <div className="flex gap-3 flex-wrap">
          <StatusBadge label="未着手" count={stats.statusDistribution.todo} color="bg-zenshin-navy/8 text-zenshin-navy" />
          <StatusBadge label="進行中" count={stats.statusDistribution.in_progress} color="bg-blue-50 text-blue-600" />
          <StatusBadge label="完了" count={stats.statusDistribution.done} color="bg-emerald-50 text-emerald-600" />
          <StatusBadge label="保留" count={stats.statusDistribution.pending} color="bg-amber-50 text-amber-600" />
          <StatusBadge label="中止" count={stats.statusDistribution.canceled} color="bg-zenshin-navy/5 text-zenshin-navy/40" />
        </div>
      </div>

      {/* 停滞 & 期限切れ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 停滞しているチャート */}
        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-medium text-zenshin-navy/50">停滞しているチャート</h2>
          </div>
          {staleCharts.length === 0 ? (
            <p className="text-sm text-zenshin-navy/40 text-center py-6">
              停滞しているチャートはありません 🎉
            </p>
          ) : (
            <div className="space-y-1">
              {staleCharts.map((chart) => (
                <Link
                  key={chart.id}
                  href={`/charts/${chart.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zenshin-cream/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderOpen className="w-4 h-4 text-zenshin-navy/30 shrink-0" />
                    <span className="text-sm text-zenshin-navy truncate group-hover:text-zenshin-navy/80">{chart.title}</span>
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 ml-3">
                    {chart.daysSinceUpdate}日前
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 期限切れ / 期限間近のアクション */}
        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-medium text-zenshin-navy/50">期限切れ / 期限間近のアクション</h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-zenshin-navy/40 text-center py-6">
              期限間近のアクションはありません 🎉
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingDeadlines.map((action) => (
                <Link
                  key={action.id}
                  href={`/charts/${action.chart_id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zenshin-cream/60 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-zenshin-navy truncate block group-hover:text-zenshin-navy/80">{action.title}</span>
                    <span className="text-xs text-zenshin-navy/40 truncate block">{action.chart_title}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-3 flex items-center gap-1 ${
                    action.isOverdue
                      ? "text-red-600 bg-red-50"
                      : "text-amber-600 bg-amber-50"
                  }`}>
                    {action.isOverdue ? (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        {Math.abs(action.daysUntilDue)}日超過
                      </>
                    ) : action.daysUntilDue === 0 ? (
                      "今日"
                    ) : (
                      `あと${action.daysUntilDue}日`
                    )}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className={`px-4 py-2 rounded-lg ${color}`}>
      <span className="font-bold text-lg">{count}</span>
      <span className="ml-2 text-sm">{label}</span>
    </div>
  );
}
