"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Crown, User } from "lucide-react";
import {
  createInvitation,
  getWorkspaceMembers,
  getCurrentWorkspaceId,
} from "@/lib/workspace";
import { toast } from "sonner";

interface Member {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar_url?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function loadData() {
      const workspaceId = await getCurrentWorkspaceId();
      if (workspaceId) {
        const memberList = await getWorkspaceMembers(workspaceId);
        setMembers(memberList);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      toast.error("ワークスペースが見つかりません");
      setIsGenerating(false);
      return;
    }

    const result = await createInvitation(workspaceId);
    if (result) {
      setInviteUrl(result.url);
      toast.success("招待リンクを生成しました");
    } else {
      toast.error("招待リンクの生成に失敗しました");
    }
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    toast.success("コピーしました");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-4 w-4 text-yellow-500" />;
    return <User className="h-4 w-4 text-gray-400" />;
  };

  const getRoleLabel = (role: string) => {
    if (role === "owner") return "オーナー";
    if (role === "admin") return "管理者";
    return "メンバー";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">メンバー</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">メンバー</h1>

      {/* 招待リンク */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">メンバーを招待</CardTitle>
          <CardDescription>
            招待リンクを共有して、ワークスペースにメンバーを追加できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteUrl ? (
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly className="font-mono text-sm" />
              <Button onClick={handleCopy} variant="outline" size="icon">
                {isCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerateLink} disabled={isGenerating}>
              {isGenerating ? "生成中..." : "招待リンクを生成"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* メンバー一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            メンバー一覧（{members.length}人）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <div
                key={member.id}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{member.name || member.email}</p>
                    {member.name && (
                      <p className="text-sm text-gray-500">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {getRoleIcon(member.role)}
                  {getRoleLabel(member.role)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
