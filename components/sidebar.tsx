"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
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
  Building2,
  User,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/user-menu";
import { getCurrentWorkspace, getUserWorkspaces } from "@/lib/workspace";

const RECENT_CHARTS_KEY = "zenshin_recent_charts";
type RecentChart = {
  id: string;
  title: string;
  visitedAt: string;
};

export function Sidebar() {
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
  const [currentWorkspace, setCurrentWorkspace] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<
    {
      id: string;
      name: string;
      role: string;
    }[]
  >([]);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    async function loadWorkspaces() {
      const current = await getCurrentWorkspace();
      const all = await getUserWorkspaces();
      setCurrentWorkspace(current);
      setAllWorkspaces(all);
    }
    loadWorkspaces();
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1.5 transition-colors w-full">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <img src="/zenshin-icon.svg" alt="Z" className="w-8 h-8" />
              </div>
              {isHovered && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {currentWorkspace?.name || "Workspace"}
                    </p>
                    <p className="text-[11px] text-white/40 truncate">
                      {currentWorkspace?.role === "owner" ? "Owner" : "Member"}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/30 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Current Workspace
            </div>
            <DropdownMenuItem className="gap-3">
              <div className="w-8 h-8 bg-zenshin-navy rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">
                  {currentWorkspace?.name || "マイワークスペース"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentWorkspace?.role === "owner" ? "オーナー" : "メンバー"}
                </p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {allWorkspaces.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Other Workspaces
                </div>
                {allWorkspaces
                  .filter((ws) => ws.id !== currentWorkspace?.id)
                  .map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      className="gap-3 opacity-50"
                      disabled
                    >
                      <div className="w-8 h-8 bg-zenshin-charcoal rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{ws.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ws.role === "owner" ? "オーナー" : "メンバー"}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
              </>
            )}
            <DropdownMenuSeparator />
            <Link href="/settings/members">
              <DropdownMenuItem className="gap-2">
                <Users className="w-4 h-4" />
                メンバーを管理
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
              <Plus className="w-4 h-4" />
              新しいWorkspaceを作成
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <SidebarItem
          icon={Home}
          label="Home"
          href="/charts"
          active={pathname === "/charts"}
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
              href={`/charts/${chartId}`}
              active={pathname === `/charts/${chartId}`}
              expanded={isExpanded}
            />
            <SidebarItem
              icon={LayoutGrid}
              label="Views"
              href={`/charts/${chartId}/kanban`}
              active={pathname?.includes("/kanban")}
              expanded={isExpanded}
            />
            <SidebarItem
              icon={Camera}
              label="Snapshot"
              href={`/charts/${chartId}/snapshots`}
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
          href="/dashboard"
          active={pathname === "/dashboard"}
          expanded={isExpanded}
        />
        <SidebarItem
          icon={Users}
          label="Members"
          href="/settings/members"
          active={pathname === "/settings/members"}
          expanded={isExpanded}
        />
        <SidebarItem
          icon={Settings}
          label="Settings"
          href="/settings/archive"
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
                    href={`/charts/${chart.id}`}
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
