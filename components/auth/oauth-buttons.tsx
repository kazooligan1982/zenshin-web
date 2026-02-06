"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

type OAuthButtonsProps = {
  redirectTo?: string;
};

export function OAuthButtons({ redirectTo: propRedirectTo }: OAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // URL の redirect パラメータを優先、なければ props、最後に /charts
    const redirectTo = searchParams.get("redirect") || propRedirectTo || "/charts";
    console.log("[OAuthButtons] redirectTo:", redirectTo);

    const supabase = createClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    console.log("[OAuthButtons] callbackUrl:", callbackUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      console.error("Google login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleGoogleLogin}
      disabled={isLoading}
    >
      <Chrome className="w-5 h-5 mr-2" />
      {isLoading ? "接続中..." : "Google でログイン"}
    </Button>
  );
}
