"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("有効なメールアドレスを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (resetError) {
        console.error("Password reset error:", resetError);
        toast.error("メール送信に失敗しました: " + resetError.message, { duration: 5000 });
        setError(resetError.message);
        return;
      }

      setIsSent(true);
      toast.success("パスワードリセットのメールを送信しました", { duration: 3000 });
    } catch (err) {
      console.error("Password reset error:", err);
      const message = err instanceof Error ? err.message : "メール送信に失敗しました";
      toast.error(message, { duration: 5000 });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <img src="/zenshin-icon.svg" alt="ZENSHIN CHART" className="w-12 h-12 mx-auto mb-4" />
          <div className="flex items-start justify-center gap-1.5">
            <h1 className="text-2xl font-bold">ZENSHIN CHART</h1>
            <span className="text-[10px] font-light tracking-wider uppercase text-amber-400/70 pt-1">
              beta
            </span>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            パスワードリセットのメールを送信しました。
            <br />
            メール内のリンクからパスワードを再設定してください。
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-zenshin-teal hover:text-zenshin-teal/80 hover:underline font-medium"
          >
            ログインに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <img src="/zenshin-icon.svg" alt="ZENSHIN CHART" className="w-12 h-12 mx-auto mb-4" />
        <div className="flex items-start justify-center gap-1.5">
          <h1 className="text-2xl font-bold">ZENSHIN CHART</h1>
          <span className="text-[10px] font-light tracking-wider uppercase text-amber-400/70 pt-1">
            beta
          </span>
        </div>
        <p className="text-muted-foreground mt-2">パスワードをリセット</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button
          type="submit"
          className="w-full bg-zenshin-orange hover:bg-zenshin-orange/90 text-white shadow-sm"
          disabled={isLoading}
        >
          {isLoading ? "送信中..." : "リセットメールを送信"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-zenshin-teal hover:text-zenshin-teal/80 hover:underline font-medium">
          ログインに戻る
        </Link>
      </p>
    </div>
  );
}
