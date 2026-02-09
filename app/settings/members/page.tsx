"use client";

import { useState, useEffect } from "react";
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
    if (role === "owner") return <Crown className="h-4 w-4 text-amber-500" />;
    return <User className="h-4 w-4 text-zenshin-navy/30" />;
  };

  const getRoleLabel = (role: string) => {
    if (role === "owner") return "オーナー";
    if (role === "admin") return "管理者";
    return "メンバー";
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-6 animate-pulse">
        <div className="h-7 w-32 bg-zenshin-navy/10 rounded-lg mb-8" />
        <div className="space-y-4">
          <div className="h-36 bg-white rounded-2xl border border-zenshin-navy/8" />
          <div className="h-52 bg-white rounded-2xl border border-zenshin-navy/8" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-7 h-7 text-zenshin-navy/40" />
        <h1 className="text-2xl font-bold text-zenshin-navy">メンバー</h1>
      </div>

      {/* 招待リンク */}
      <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6 mb-6">
        <h2 className="text-lg font-semibold text-zenshin-navy mb-1">メンバーを招待</h2>
        <p className="text-sm text-zenshin-navy/40 mb-4">
          招待リンクを共有して、ワークスペースにメンバーを追加できます。
        </p>
        {inviteUrl ? (
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="font-mono text-sm border-zenshin-navy/10" />
            <Button onClick={handleCopy} variant="outline" size="icon" className="border-zenshin-navy/10 hover:bg-zenshin-cream">
              {isCopied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 text-zenshin-navy/40" />
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerateLink}
            disabled={isGenerating}
            className="bg-zenshin-orange hover:bg-zenshin-orange/90 text-white"
          >
            {isGenerating ? "生成中..." : "招待リンクを生成"}
          </Button>
        )}
      </div>

      {/* メンバー一覧 */}
      <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6">
        <h2 className="text-lg font-semibold text-zenshin-navy flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-zenshin-navy/40" />
          メンバー一覧（{members.length}人）
        </h2>
        <div className="divide-y divide-zenshin-navy/8">
          {members.map((member) => (
            <div
              key={member.id}
              className="py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-zenshin-navy/8 flex items-center justify-center">
                    <User className="h-5 w-5 text-zenshin-navy/30" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-zenshin-navy">{member.name || member.email}</p>
                  {member.name && (
                    <p className="text-sm text-zenshin-navy/40">{member.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-zenshin-navy/50">
                {getRoleIcon(member.role)}
                {getRoleLabel(member.role)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
