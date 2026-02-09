"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
 
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Shield, Mail, Key, Loader2 } from "lucide-react";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setIsFetching(false);
    };
    fetchUser();
  }, []);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("パスワードが一致しません");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("パスワードは6文字以上で入力してください");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error("パスワードの変更に失敗しました: " + error.message);
    } else {
      toast.success("パスワードを変更しました");
      setNewPassword("");
      setConfirmPassword("");
    }

    setIsLoading(false);
  };

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-zenshin-navy/30" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6">
        <p className="text-zenshin-navy/40">ユーザー情報を取得できませんでした</p>
      </div>
    );
  }

  const providers = user.app_metadata?.providers || [];
  const hasGoogleAuth = providers.includes("google");
  const hasEmailAuth = providers.includes("email") || user.email;

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-7 h-7 text-zenshin-navy/40" />
        <div>
          <h1 className="text-2xl font-bold text-zenshin-navy">アカウント</h1>
          <p className="text-sm text-zenshin-navy/40">アカウントのセキュリティ設定を管理します</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 認証方法 */}
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6">
          <h2 className="text-lg font-semibold text-zenshin-navy flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-zenshin-navy/40" />
            認証方法
          </h2>
          <p className="text-sm text-zenshin-navy/40 mb-4">このアカウントに紐付けられた認証方法</p>
          <div className="space-y-3">
            {hasGoogleAuth && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zenshin-cream/50 border border-zenshin-navy/5">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <div>
                  <p className="font-medium text-zenshin-navy">Google</p>
                  <p className="text-sm text-zenshin-navy/40">Google アカウントで認証済み</p>
                </div>
              </div>
            )}

            {hasEmailAuth && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zenshin-cream/50 border border-zenshin-navy/5">
                <Mail className="w-5 h-5 text-zenshin-navy/30" />
                <div>
                  <p className="font-medium text-zenshin-navy">メールアドレス</p>
                  <p className="text-sm text-zenshin-navy/40">{user.email}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6">
          <h2 className="text-lg font-semibold text-zenshin-navy flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-zenshin-navy/40" />
            パスワード変更
          </h2>
          <p className="text-sm text-zenshin-navy/40 mb-4">アカウントのパスワードを変更します</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-zenshin-navy/70">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6文字以上"
                className="border-zenshin-navy/10 focus-visible:ring-zenshin-orange/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zenshin-navy/70">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                className="border-zenshin-navy/10 focus-visible:ring-zenshin-orange/30"
              />
            </div>
            <div className="pt-2">
              <Button
                onClick={handlePasswordChange}
                disabled={isLoading}
                className="bg-zenshin-orange hover:bg-zenshin-orange/90 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    変更中...
                  </>
                ) : (
                  "パスワードを変更"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* 危険な操作 */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-1">危険な操作</h2>
          <p className="text-sm text-zenshin-navy/40 mb-4">これらの操作は取り消せません</p>
          <Button variant="destructive" disabled>
            アカウントを削除（準備中）
          </Button>
        </div>
      </div>
    </div>
  );
}
