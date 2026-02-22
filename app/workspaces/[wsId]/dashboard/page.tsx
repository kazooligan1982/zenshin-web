import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  FolderOpen,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  AlertCircle,
  FileText,
  User,
  Link2,
  Users,
} from "lucide-react";
import { getDashboardData } from "./actions";
import { DashboardChartFilter } from "./dashboard-chart-filter";
import { DashboardPeriodFilter } from "./dashboard-period-filter";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ wsId: string }>;
  searchParams?: Promise<{ chartId?: string; period?: string; from?: string; to?: string }>;
}) {
  const { wsId } = await params;
  const resolvedParams = await searchParams;
  const selectedChartId = resolvedParams?.chartId ?? "all";
  const period = resolvedParams?.period ?? "all";
  const from = resolvedParams?.from ?? null;
  const to = resolvedParams?.to ?? null;
  const { stats, staleCharts, upcomingDeadlines, delayImpacts, availableCharts } =
    await getDashboardData(wsId, selectedChartId, period, from, to);
  const t = await getTranslations("dashboard");
  const tKanban = await getTranslations("kanban");

  return (
    <div className="py-8 px-6 lg:px-10 min-h-screen">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zenshin-navy">{t("title")}</h1>
          <p className="text-sm text-zenshin-navy/40 mt-1">{t("subtitle")}</p>
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
            <span className="text-sm text-zenshin-navy/50">{t("chartCount")}</span>
            <FolderOpen className="w-4 h-4 text-zenshin-navy/30" />
          </div>
          <div className="text-3xl font-bold text-zenshin-navy">{stats.totalCharts}</div>
        </div>

        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">{t("actionCount")}</span>
            <Target className="w-4 h-4 text-zenshin-teal/60" />
          </div>
          <div className="text-3xl font-bold text-zenshin-navy">{stats.totalActions}</div>
        </div>

        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">{t("completed")}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">{stats.completedActions}</div>
        </div>

        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zenshin-navy/50">{t("completionRate")}</span>
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
        <h2 className="text-sm font-medium text-zenshin-navy/50 mb-4">{t("statusDistribution")}</h2>
        <div className="flex gap-3 flex-wrap">
          <StatusBadge label={tKanban("todo")} count={stats.statusDistribution.todo} color="bg-zenshin-navy/8 text-zenshin-navy" />
          <StatusBadge label={tKanban("inProgress")} count={stats.statusDistribution.in_progress} color="bg-blue-50 text-blue-600" />
          <StatusBadge label={tKanban("done")} count={stats.statusDistribution.done} color="bg-emerald-50 text-emerald-600" />
          <StatusBadge label={tKanban("pending")} count={stats.statusDistribution.pending} color="bg-amber-50 text-amber-600" />
          <StatusBadge label={tKanban("canceled")} count={stats.statusDistribution.canceled} color="bg-zenshin-navy/5 text-zenshin-navy/40" />
        </div>
      </div>

      {/* 遅延インパクト */}
      {delayImpacts.length > 0 && (
        <section className="bg-white rounded-xl border border-zenshin-navy/8 p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-zenshin-navy">{t("delayImpact")}</h2>
            <span className="text-sm text-red-500 font-medium">
              {delayImpacts.length}{t("delayImpactCount")}
            </span>
          </div>
          <div className="space-y-4">
            {delayImpacts.map((impact) => (
              <div
                key={impact.action.id}
                className="border border-red-100 bg-red-50/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-medium">❌</span>
                    <span className="font-medium text-zenshin-navy">{impact.action.title}</span>
                  </div>
                  <span className="text-sm text-red-500 font-medium">
                    {t("daysOverdue", { count: impact.action.daysOverdue })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zenshin-navy/60 mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{impact.chart.title}</span>
                </div>
                {impact.assignee && (
                  <div className="flex items-center gap-2 text-sm text-zenshin-navy/60 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{impact.assignee.name}</span>
                  </div>
                )}
                {impact.blockedActions.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 mb-1">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>
                      {t("blocking")}: {impact.blockedActions.map((a) => a.title).join(", ")}
                    </span>
                  </div>
                )}
                {impact.affectedPeople.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-zenshin-navy/50">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {t("affectedPeople")}: {impact.affectedPeople.map((p) => p.name).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 停滞 & 期限切れ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 停滞しているチャート */}
        <div className="bg-white rounded-xl border border-zenshin-navy/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-medium text-zenshin-navy/50">{t("stalledCharts")}</h2>
          </div>
          {staleCharts.length === 0 ? (
            <p className="text-sm text-zenshin-navy/40 text-center py-6">
              {t("noStalledCharts")}
            </p>
          ) : (
            <div className="space-y-1">
              {staleCharts.map((chart) => (
                <Link
                  key={chart.id}
                  href={`/workspaces/${wsId}/charts/${chart.id}`}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zenshin-cream/60 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderOpen className="w-4 h-4 text-zenshin-navy/30 shrink-0" />
                    <span className="text-sm text-zenshin-navy truncate group-hover:text-zenshin-navy/80">{chart.title}</span>
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 ml-3">
                    {t("staleDaysUpdated", { days: chart.daysSinceUpdate })}
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
            <h2 className="text-sm font-medium text-zenshin-navy/50">{t("overdueActions")}</h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-zenshin-navy/40 text-center py-6">
              {t("noOverdueActions")}
            </p>
          ) : (
            <div className="space-y-1">
              {upcomingDeadlines.map((action) => (
                <Link
                  key={action.id}
                  href={`/workspaces/${wsId}/charts/${action.chart_id}`}
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
                        {t("daysOverdue", { count: Math.abs(action.daysUntilDue) })}
                        {action.blockingCount > 0 && (
                          <span className="text-orange-500 ml-1">
                            ⛓️ {action.blockingCount}{t("actionsBlocked")}
                          </span>
                        )}
                      </>
                    ) : action.daysUntilDue === 0 ? (
                      t("today")
                    ) : (
                      t("daysLeft", { count: action.daysUntilDue })
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
