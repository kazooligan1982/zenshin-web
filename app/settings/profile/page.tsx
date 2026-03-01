"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
      setDisplayName(currentUser?.user_metadata?.full_name || "");
      setIsFetching(false);
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    });

    if (error) {
      toast.error(t("profileSaveFailed") + ": " + error.message, { duration: 5000 });
    } else {
      toast.success(t("profileUpdated"), { duration: 3000 });
    }

    setIsLoading(false);
  };

  if (isFetching) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-10 px-6">
        <p className="text-muted-foreground">
          {t("fetchUserFailed")}
        </p>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="container max-w-4xl mx-auto py-10 px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("profileTitle")}</h1>
        <p className="text-muted-foreground">
          {t("profileDescription")}
        </p>
      </div>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>{t("basicInfo")}</CardTitle>
          <CardDescription>{t("basicInfoDesc")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              <p>{t("avatarFromGoogle")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t("displayName")}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("displayNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <Input value={user.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              {t("emailChangeNote")}
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              tCommon("save")
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
