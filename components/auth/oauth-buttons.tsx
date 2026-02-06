"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";

type OAuthButtonsProps = {
  redirectTo?: string;
};

function OAuthButtonsInner({ redirectTo: propRedirectTo }: OAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const redirectTo = searchParams.get("redirect") || propRedirectTo || "/charts";

    const supabase = createClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

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

export function OAuthButtons(props: OAuthButtonsProps) {
  return (
    <Suspense
      fallback={
        <Button variant="outline" className="w-full" disabled>
          <Chrome className="w-5 h-5 mr-2" />
          読み込み中...
        </Button>
      }
    >
      <OAuthButtonsInner {...props} />
    </Suspense>
  );
}
