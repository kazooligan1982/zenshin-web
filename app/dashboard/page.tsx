import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  LayoutDashboard,
  FolderOpen,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "./actions";
import { DashboardChartFilter } from "./dashboard-chart-filter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ chartId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const selectedChartId = resolvedParams?.chartId ?? "all";
  const { stats, staleCharts, upcomingDeadlines, availableCharts } =
    await getDashboardData(selectedChartId);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>
        <DashboardChartFilter
          charts={availableCharts}
          selectedChartId={selectedChartId}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Charts
            </CardTitle>
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCharts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actions
            </CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.completedActions}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completionRate}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Action Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <StatusBadge
              label="未着手"
              count={stats.statusDistribution.todo}
              color="bg-gray-100 text-gray-700"
            />
            <StatusBadge
              label="進行中"
              count={stats.statusDistribution.in_progress}
              color="bg-blue-100 text-blue-700"
            />
            <StatusBadge
              label="完了"
              count={stats.statusDistribution.done}
              color="bg-green-100 text-green-700"
            />
            <StatusBadge
              label="保留"
              count={stats.statusDistribution.pending}
              color="bg-yellow-100 text-yellow-700"
            />
            <StatusBadge
              label="中止"
              count={stats.statusDistribution.canceled}
              color="bg-gray-100 text-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              停滞しているチャート
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staleCharts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                停滞しているチャートはありません 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {staleCharts.map((chart) => (
                  <Link
                    key={chart.id}
                    href={`/charts/${chart.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{chart.title}</span>
                    </div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      {chart.daysSinceUpdate}日前
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              期限切れ / 期限間近のアクション
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                期限間近のActionはありません 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((action) => (
                  <Link
                    key={action.id}
                    href={`/charts/${action.chart_id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{action.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6 truncate">
                        {action.chart_title}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        action.isOverdue
                          ? "text-red-600 border-red-300 bg-red-50"
                          : "text-orange-600 border-orange-300"
                      }
                    >
                      {action.isOverdue ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {Math.abs(action.daysUntilDue)}日超過
                        </span>
                      ) : action.daysUntilDue === 0 ? (
                        "今日"
                      ) : (
                        `あと${action.daysUntilDue}日`
                      )}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
