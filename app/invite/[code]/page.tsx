import { redirect } from "next/navigation";
import { getInvitationByCode, joinWorkspaceByInvite } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 招待情報を取得
  const invitation = await getInvitationByCode(code);

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">招待が見つかりません</CardTitle>
            <CardDescription>
              このリンクは無効か、期限切れの可能性があります。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/charts">
              <Button variant="outline" className="w-full">
                ホームに戻る
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 未ログインの場合
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>ワークスペースへの招待</CardTitle>
            <CardDescription>
              「{invitation.workspaceName}」に招待されています。
              参加するにはログインしてください。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/login?redirect=/invite/${code}`}>
              <Button className="w-full">ログインして参加</Button>
            </Link>
            <Link href={`/signup?redirect=/invite/${code}`}>
              <Button variant="outline" className="w-full">
                アカウントを作成
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ログイン済みの場合、自動参加
  const result = await joinWorkspaceByInvite(code);

  if (result.success) {
    redirect("/charts");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">参加できませんでした</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/charts">
            <Button variant="outline" className="w-full">
              ホームに戻る
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
