"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Settings,
  CreditCard,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  expanded: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UserMenu({ expanded, onOpenChange }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="p-3 h-14 flex items-center">
        <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse shrink-0" />
      </div>
    );
  }

  if (!user) return null;

  const getInitials = () => {
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user.email?.charAt(0).toUpperCase() || "U";
  };

  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-3 w-full h-14 px-3 rounded-lg hover:bg-white/5 transition-colors text-left outline-none focus:outline-none",
            !expanded && "justify-center px-0"
          )}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full shrink-0 flex-none"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 flex-none">
              <span className="text-white text-sm font-medium">
                {getInitials()}
              </span>
            </div>
          )}

          <div
            className={cn(
              "flex flex-col items-start text-left overflow-hidden transition-all duration-300",
              expanded ? "opacity-100 flex-1 min-w-0" : "opacity-0 w-0"
            )}
          >
            <span className="text-sm font-medium text-white truncate w-full">
              {user.user_metadata?.full_name || "ユーザー"}
            </span>
            <span className="text-xs text-gray-400 truncate w-full">
              {user.email}
            </span>
          </div>

          {expanded && (
            <ChevronsUpDown className="w-4 h-4 text-gray-500 shrink-0 flex-none" />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">
              {user.user_metadata?.full_name || "ユーザー"}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/settings/profile"
            className="flex items-center gap-2 cursor-pointer"
          >
            <User className="w-4 h-4" />
            プロフィール
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href="/settings/account"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            アカウント設定
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled
          className="flex items-center gap-2 opacity-50"
        >
          <CreditCard className="w-4 h-4" />
          プラン・お支払い
          <span className="ml-auto text-xs bg-gray-200 px-1.5 py-0.5 rounded">
            soon
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
