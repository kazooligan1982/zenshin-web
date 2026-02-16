import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvitationByCode, joinWorkspaceByInvite } from "@/lib/workspace";
import { acceptInvitation } from "@/app/workspaces/[wsId]/settings/members/actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ROLE_LABELS } from "@/lib/permissions";
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Try workspace_invitation_requests (new email invite flow)
  const { data: requestInvitation } = await supabase
    .from("workspace_invitation_requests")
    .select("id, workspace_id, email, role, expires_at, invited_by, workspaces(name)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (requestInvitation) {
    const isExpired = new Date(requestInvitation.expires_at) < new Date();
    let workspaceName =
      (Array.isArray(requestInvitation.workspaces)
        ? requestInvitation.workspaces[0]
        : requestInvitation.workspaces
      )?.name;
    if (!workspaceName && requestInvitation.workspace_id) {
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", requestInvitation.workspace_id)
        .single();
      workspaceName = ws?.name;
    }
    workspaceName = workspaceName || "ワークスペース";
    let inviterName = "メンバー";
    if (requestInvitation.invited_by) {
      const { data: inviterProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", requestInvitation.invited_by)
        .single();
      inviterName = inviterProfile?.name || "メンバー";
    }
    const roleLabel =
      ROLE_LABELS[requestInvitation.role as keyof typeof ROLE_LABELS] ||
      requestInvitation.role;

    if (isExpired) {
      return (
        <Card className="w-full rounded-2xl border-zenshin-navy/10 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 text-zenshin-navy">
              招待の有効期限が切れています
            </CardTitle>
            <CardDescription className="text-zenshin-navy/60">
              この招待リンクは7日間で失効しています。招待者に再度招待を依頼してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button
                variant="outline"
                className="w-full rounded-lg border-zenshin-navy/20 text-zenshin-navy hover:bg-zenshin-cream"
              >
                ホームに戻る
              </Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (!user) {
      return (
        <Card className="w-full rounded-2xl border-zenshin-navy/10 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-zenshin-navy text-xl">
              「{workspaceName}」への招待
            </CardTitle>
            <CardDescription className="mt-2 text-zenshin-navy/60">
              ロール: {roleLabel}
              <br />
              招待者: {inviterName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/login?redirect=/invite/${token}`}>
              <Button className="w-full rounded-lg bg-zenshin-orange hover:bg-zenshin-orange/90 text-white">
                ログインして招待を受ける
              </Button>
            </Link>
            <Link href={`/signup?redirect=/invite/${token}`}>
              <Button
                variant="outline"
                className="w-full rounded-lg border-zenshin-navy/20 text-zenshin-navy hover:bg-zenshin-cream"
              >
                アカウントを作成
              </Button>
            </Link>
            <Link
              href="/"
              className="block text-center text-sm text-zenshin-navy/40 hover:text-zenshin-navy/60"
            >
              招待を辞退する
            </Link>
          </CardContent>
        </Card>
      );
    }

    let redirectUrl: string | null = null;
    let errorMessage: string | null = null;

    try {
      const result = await acceptInvitation(token);
      redirectUrl = `/workspaces/${result.workspaceId}/charts`;
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "参加できませんでした";
    }

    // redirect は try/catch の完全に外（Next.js の redirect() は内部で throw するため）
    if (redirectUrl) {
      redirect(redirectUrl);
    }

    return (
      <Card className="w-full rounded-2xl border-zenshin-navy/10 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-600 text-zenshin-navy">
            参加できませんでした
          </CardTitle>
          <CardDescription className="text-zenshin-navy/60">
            {errorMessage ?? "エラーが発生しました"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button
              variant="outline"
              className="w-full rounded-lg border-zenshin-navy/20 text-zenshin-navy hover:bg-zenshin-cream"
            >
              ホームに戻る
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // 2. Fallback: workspace_invitations (old invite_code flow)
  const invitation = await getInvitationByCode(token);

  if (!invitation) {
    return (
      <Card className="w-full rounded-2xl border-zenshin-navy/10 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-red-600 text-zenshin-navy">
            招待が見つかりません
          </CardTitle>
          <CardDescription className="text-zenshin-navy/60">
            このリンクは無効か、期限切れの可能性があります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button
              variant="outline"
              className="w-full rounded-lg border-zenshin-navy/20 text-zenshin-navy hover:bg-zenshin-cream"
            >
              ホームに戻る
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="w-full rounded-2xl border-zenshin-navy/10 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-zenshin-navy">
            ワークスペースへの招待
          </CardTitle>
          <CardDescription className="text-zenshin-navy/60">
            「{invitation.workspaceName}」に招待されています。
            参加するにはログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href={`/login?redirect=/invite/${token}`}>
            <Button className="w-full rounded-lg bg-zenshin-orange hover:bg-zenshin-orange/90 text-white">
              ログインして参加
            </Button>
          </Link>
          <Link href={`/signup?redirect=/invite/${token}`}>
            <Button
              variant="outline"
              className="w-full rounded-lg border-zenshin-navy/20 text-zenshin-navy hover:bg-zenshin-cream"
            >
              アカウントを作成
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const result = await joinWorkspaceByInvite(token);

  if (result.success) {
    redirect(`/workspaces/${invitation.workspaceId}/charts`);
  }

  return (
    <Card className="w-full rounded-2xl border-zenshin-navy/10 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-red-600 text-zenshin-navy">
          参加できませんでした
        </CardTitle>
        <CardDescription className="text-zenshin-navy/60">
          {result.error}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/">
          <Button
            variant="outline"
            className="w-full rounded-lg border-zenshin-navy/20 text-zenshin-navy hover:bg-zenshin-cream"
          >
            ホームに戻る
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
