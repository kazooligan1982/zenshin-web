"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  Edit3,
  LayoutGrid,
  Camera,
  FolderOpen,
  Clock,
  ChevronDown,
  Plus,
  Check,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/user-menu";
import { getCurrentWorkspace, getUserWorkspaces } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/client";

const RECENT_CHARTS_KEY = "zenshin_recent_charts";

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const config: Record<string, { className: string; label: string }> = {
    owner: { className: "bg-amber-500/20 text-amber-400", label: "オーナー" },
    consultant: {
      className: "bg-violet-500/20 text-violet-400 min-w-[88px]",
      label: "コンサルタント",
    },
    editor: { className: "bg-blue-500/20 text-blue-400", label: "編集者" },
    viewer: { className: "bg-zenshin-charcoal/30 text-white/60", label: "閲覧者" },
  };
  const { className, label } = config[role] ?? {
    className: "bg-white/10 text-white/60",
    label: ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? "メンバー",
  };
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap",
        className
      )}
    >
      {label}
    </span>
  );
}
type RecentChart = {
  id: string;
  title: string;
  visitedAt: string;
};

type SidebarProps = {
  currentWsId?: string;
  currentWorkspace?: { id: string; name: string; role: string } | null;
  workspaces?: { id: string; name: string; role: string }[];
};

export function Sidebar(props?: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const chartId = params?.id as string | undefined;

  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recentCharts, setRecentCharts] = useState<RecentChart[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(RECENT_CHARTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [fetchedWorkspace, setFetchedWorkspace] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [fetchedAllWorkspaces, setFetchedAllWorkspaces] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentWorkspace = props?.currentWorkspace ?? fetchedWorkspace;
  const allWorkspaces = props?.workspaces ?? fetchedAllWorkspaces;
  const wsId = props?.currentWsId ?? currentWorkspace?.id;

  const router = useRouter();
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWsName.trim() }),
      });
      if (!res.ok) throw new Error("作成に失敗しました");
      const workspace = await res.json();
      setIsCreatingWs(false);
      setNewWsName("");
      router.push(`/workspaces/${workspace.id}/charts`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  const isInChart = !!chartId;
  const isExpanded = isHovered || isDropdownOpen;

  useEffect(() => {
    const handleUpdate = () => {
      const updated = localStorage.getItem(RECENT_CHARTS_KEY);
      if (updated) {
        try {
          setRecentCharts(JSON.parse(updated));
        } catch {}
      }
    };

    window.addEventListener("recentChartsUpdated", handleUpdate);
    return () => window.removeEventListener("recentChartsUpdated", handleUpdate);
  }, []);

  useEffect(() => {
    if (props?.currentWorkspace && props?.workspaces) return;
    async function loadWorkspaces() {
      const current = await getCurrentWorkspace();
      const all = await getUserWorkspaces();
      setFetchedWorkspace(current);
      setFetchedAllWorkspaces(all);
    }
    loadWorkspaces();
  }, [props?.currentWorkspace, props?.workspaces]);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    }
    loadUser();
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isDropdownOpen) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  const handleDropdownOpenChange = (open: boolean) => {
    if (open && closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsDropdownOpen(open);
    if (!open) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 300);
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-zenshin-charcoal text-white/70 border-r border-white/5 transition-all duration-300 z-50 fixed left-0 top-0",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Workspace Header */}
      <div className="h-14 flex items-center shrink-0 border-b border-white/5 px-2">
        <DropdownMenu modal={false} onOpenChange={handleDropdownOpenChange}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1.5 transition-colors w-full">
              <div className="flex items-center shrink-0">
                <div className="relative">
                  <img src="/zenshin-icon.svg" alt="Z" className="w-8 h-8" />
                  {!isExpanded && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold text-amber-400/70"
                      title="β版"
                    >
                      β
                    </span>
                  )}
                </div>
                {isExpanded && (
                  <span
                    className="ml-1.5 self-start pt-0.5 text-[10px] font-light tracking-wider uppercase text-amber-400/70"
                    title="β版"
                  >
                    beta
                  </span>
                )}
              </div>
              {isHovered && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                      {currentWorkspace?.name || "Workspace"}
                      <RoleBadge role={currentWorkspace?.role} />
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="w-[280px] min-w-[280px]"
          >
            {userEmail && (
              <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b">
                {userEmail}
              </div>
            )}
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Current Workspace
            </div>
            <DropdownMenuItem className="gap-3 cursor-default" onSelect={(e) => e.preventDefault()}>
              <div className="w-8 h-8 bg-zenshin-navy rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-semibold">
                {(currentWorkspace?.name || "W").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-medium truncate flex items-center gap-2 flex-wrap">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{currentWorkspace?.name || "マイワークスペース"}</span>
                  <RoleBadge role={currentWorkspace?.role} />
                </p>
              </div>
            </DropdownMenuItem>
            {allWorkspaces.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Other Workspaces
                </div>
                {allWorkspaces
                  .filter((ws) => ws.id !== currentWorkspace?.id)
                  .map((ws) => (
                    <Link key={ws.id} href={`/workspaces/${ws.id}/charts`}>
                      <DropdownMenuItem
                        className="gap-3 cursor-pointer"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <div className="w-8 h-8 bg-zenshin-charcoal rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-semibold">
                          {(ws.name || "W").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="font-medium truncate flex items-center gap-2 flex-wrap">
                            <span className="truncate">{ws.name}</span>
                            <RoleBadge role={ws.role} />
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  ))}
              </>
            )}
            <DropdownMenuSeparator />
            <Link href={wsId ? `/workspaces/${wsId}/settings/members` : "/settings/members"}>
              <DropdownMenuItem className="gap-2">
                <Users className="w-4 h-4" />
                メンバーを管理
              </DropdownMenuItem>
            </Link>
            {isCreatingWs ? (
              <div className="px-2 py-2 space-y-2">
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCreateWorkspace();
                    if (e.key === "Escape") {
                      setIsCreatingWs(false);
                      setNewWsName("");
                    }
                  }}
                  placeholder="ワークスペース名"
                  className="w-full px-2 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-zenshin-teal/50"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newWsName.trim()}
                    className="flex-1 px-2 py-1 text-xs font-medium text-white bg-zenshin-teal rounded-md hover:bg-zenshin-teal/90 disabled:opacity-40"
                  >
                    作成
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingWs(false);
                      setNewWsName("");
                    }}
                    className="flex-1 px-2 py-1 text-xs font-medium text-zenshin-navy/60 bg-zenshin-navy/5 rounded-md hover:bg-zenshin-navy/10"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <DropdownMenuItem
                className="gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  setIsCreatingWs(true);
                }}
              >
                <Plus className="w-4 h-4" />
                新しいWorkspaceを作成
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <SidebarItem
          icon={Home}
          label="Home"
          href={wsId ? `/workspaces/${wsId}/charts` : "/charts"}
          active={wsId ? pathname === `/workspaces/${wsId}/charts` : pathname === "/charts"}
          expanded={isExpanded}
        />

        {isInChart && (
          <>
            <div className="my-2 mx-3">
              <div className="h-px bg-white/5" />
            </div>

            <SidebarItem
              icon={Edit3}
              label="Editor"
              href={wsId ? `/workspaces/${wsId}/charts/${chartId}` : `/charts/${chartId}`}
              active={pathname === `/workspaces/${wsId}/charts/${chartId}` || pathname === `/charts/${chartId}`}
              expanded={isExpanded}
            />
            <SidebarItem
              icon={LayoutGrid}
              label="Views"
              href={wsId ? `/workspaces/${wsId}/charts/${chartId}/kanban` : `/charts/${chartId}/kanban`}
              active={pathname?.includes("/kanban")}
              expanded={isExpanded}
            />
            <SidebarItem
              icon={Camera}
              label="Snapshot"
              href={wsId ? `/workspaces/${wsId}/charts/${chartId}/snapshots` : `/charts/${chartId}/snapshots`}
              active={pathname?.includes("/snapshots")}
              expanded={isExpanded}
            />
          </>
        )}

        <div className="my-2 mx-3">
          <div className="h-px bg-white/5" />
        </div>

        <SidebarItem
          icon={LayoutDashboard}
          label="Dashboard"
          href={wsId ? `/workspaces/${wsId}/dashboard` : "/dashboard"}
          active={wsId ? pathname === `/workspaces/${wsId}/dashboard` : pathname === "/dashboard"}
          expanded={isExpanded}
        />
        <SidebarItem
          icon={Users}
          label="Members"
          href={wsId ? `/workspaces/${wsId}/settings/members` : "/settings/members"}
          active={wsId ? pathname === `/workspaces/${wsId}/settings/members` : pathname === "/settings/members"}
          expanded={isExpanded}
        />
        <SidebarItem
          icon={Settings}
          label="Settings"
          href={wsId ? `/workspaces/${wsId}/settings` : "/settings/archive"}
          active={
            wsId
              ? pathname === `/workspaces/${wsId}/settings` ||
                pathname === `/workspaces/${wsId}/settings/archive`
              : pathname === "/settings" || pathname === "/settings/archive"
          }
          expanded={isExpanded}
        />

        {recentCharts.length > 0 && (
          <>
            <div className="my-2 mx-3">
              <div className="h-px bg-white/5" />
            </div>

            {!isHovered ? (
              <div className="flex items-center justify-center px-3 py-2">
                <Clock className="w-5 h-5 text-white/20" />
              </div>
            ) : (
              <>
                <div className="px-3 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Quick Access
                </div>

                {recentCharts.map((chart) => (
                  <Link
                    key={chart.id}
                    href={wsId ? `/workspaces/${wsId}/charts/${chart.id}` : `/charts/${chart.id}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors text-sm",
                      chartId === chart.id
                        ? "bg-zenshin-orange/15 text-zenshin-orange"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate">{chart.title}</span>
                  </Link>
                ))}
              </>
            )}
          </>
        )}
      </nav>

      {/* User Menu */}
      <div className="border-t border-white/5 mt-auto">
        <UserMenu expanded={isExpanded} onOpenChange={handleDropdownOpenChange} />
      </div>

      {/* Tagline */}
      {isHovered && (
        <div className="px-3 py-2.5 border-t border-white/5 text-[10px] text-white/20 text-center tracking-wide">
          緊張構造で前進を生み出す
        </div>
      )}
    </aside>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  href,
  active = false,
  expanded = false,
  disabled = false,
  badge,
  compact = false,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  badge?: string;
  compact?: boolean;
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg transition-colors",
        compact ? "px-3 py-1.5" : "px-3 py-2",
        active
          ? "bg-zenshin-orange/15 text-zenshin-orange"
          : "text-white/50 hover:bg-white/5 hover:text-white/80",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className={cn("shrink-0", compact ? "w-4 h-4" : "w-5 h-5")} />
      {expanded && (
        <>
          <span className={cn("flex-1 truncate", compact ? "text-sm" : "text-sm font-medium")}>
            {label}
          </span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/40">
              {badge}
            </span>
          )}
        </>
      )}
    </div>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
