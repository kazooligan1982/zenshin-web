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
  const [recentCharts, setRecentCharts] = useState<RecentChart[]>([]);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isInChart = !!chartId;
  const isExpanded = isHovered || isDropdownOpen;

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_CHARTS_KEY);
    if (stored) {
      try {
        setRecentCharts(JSON.parse(stored));
      } catch {
        setRecentCharts([]);
      }
    }

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
        "flex flex-col h-screen bg-[#1c1c1c] text-gray-400 border-r border-gray-800 transition-all duration-300 z-50 fixed left-0 top-0",
        isExpanded ? "w-64" : "w-16"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="h-14 flex items-center shrink-0 border-b border-gray-800 px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1.5 transition-colors w-full">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              {isHovered && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">Personal</p>
                    <p className="text-xs text-gray-500 truncate">Workspace</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Current Workspace
            </div>
            <DropdownMenuItem className="gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">Personal</p>
                <p className="text-xs text-muted-foreground">個人ワークスペース</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              Other Workspaces
            </div>
            <DropdownMenuItem className="gap-3 opacity-50" disabled>
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">Acme Corp</p>
                <p className="text-xs text-muted-foreground">coming soon</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 opacity-50" disabled>
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-medium">Client Project X</p>
                <p className="text-xs text-muted-foreground">coming soon</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
              <Plus className="w-4 h-4" />
              新しいWorkspaceを作成
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        <SidebarItem
          icon={Home}
          label="Home"
          href="/charts"
          active={pathname === "/charts"}
          expanded={isExpanded}
        />

        {isInChart && (
          <>
            <div className="my-2 border-t border-gray-800 mx-2" />

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

        <div className="my-2 border-t border-gray-800 mx-2" />

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
          href="#"
          disabled
          expanded={isExpanded}
          badge="soon"
        />
        <SidebarItem
          icon={Settings}
          label="Settings"
          href="/settings/archive"
          expanded={isExpanded}
        />

        {recentCharts.length > 0 && (
          <>
            <div className="my-2 border-t border-gray-800 mx-2" />

            {!isHovered ? (
              <div className="flex items-center justify-center px-3 py-2">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
            ) : (
              <>
                <div className="px-3 py-1 text-xs font-medium text-gray-500 flex items-center gap-2">
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
                        ? "bg-white/10 text-white"
                        : "hover:bg-white/5 hover:text-white"
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

      <div className="border-t border-gray-800 mt-auto">
        <UserMenu expanded={isExpanded} onOpenChange={handleDropdownOpenChange} />
      </div>

      {isHovered && (
        <div className="p-3 border-t border-gray-800 text-xs text-gray-600 text-center">
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
          ? "bg-white/10 text-white"
          : "hover:bg-white/5 hover:text-white",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className={cn("shrink-0", compact ? "w-4 h-4" : "w-5 h-5")} />
      {expanded && (
        <>
          <span className={cn("flex-1 truncate", compact && "text-sm")}>
            {label}
          </span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
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
