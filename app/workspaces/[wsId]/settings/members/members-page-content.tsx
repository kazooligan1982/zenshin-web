"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Crown, User, X, Loader2, Shield, Eye, Stethoscope } from "lucide-react";
import {
  createInvitation,
  getWorkspaceMembers,
  removeMember,
} from "@/lib/workspace";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { canGenerateInviteLink, canRemoveMembers, ROLE_LABELS } from "@/lib/permissions";

interface Member {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar_url?: string;
}

interface MembersPageContentProps {
  workspaceId: string;
  currentRole: string;
  initialMembers: Member[];
}

export function MembersPageContent({
  workspaceId,
  currentRole,
  initialMembers,
}: MembersPageContentProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const handleGenerateLink = async () => {
    setIsGenerating(true);

    const result = await createInvitation(workspaceId);
    if (result) {
      setInviteUrl(result.url);
      toast.success("招待リンクを生成しました", { duration: 3000 });
    } else {
      toast.error("招待リンクの生成に失敗しました", { duration: 5000 });
    }
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    toast.success("コピーしました", { duration: 3000 });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRemoveMember = async () => {
    const member = memberToRemove;
    if (!workspaceId || !member) return;
    setMemberToRemove(null);
    setRemovingId(member.id);
    const result = await removeMember(workspaceId, member.id);

    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success("メンバーを削除しました", { duration: 3000 });
    } else {
      toast.error(result.error || "削除に失敗しました", { duration: 5000 });
    }
    setRemovingId(null);
  };

  const canShowInviteLink = canGenerateInviteLink(currentRole as "owner" | "consultant" | "editor" | "viewer");
  const canRemove = canRemoveMembers(currentRole as "owner" | "consultant" | "editor" | "viewer");

  const getRoleIcon = (role: string) => {
    if (role === "owner") return <Crown className="h-4 w-4 text-amber-500" />;
    if (role === "consultant") return <Stethoscope className="h-4 w-4 text-violet-500" />;
    if (role === "editor") return <Shield className="h-4 w-4 text-zenshin-teal" />;
    if (role === "viewer") return <Eye className="h-4 w-4 text-zenshin-navy/30" />;
    return <User className="h-4 w-4 text-zenshin-navy/30" />;
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? "メンバー";
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-7 h-7 text-zenshin-navy/40" />
        <h1 className="text-2xl font-bold text-zenshin-navy">メンバー</h1>
      </div>

      {/* 招待リンク */}
      {canShowInviteLink && (
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
      )}

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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-zenshin-navy/50">
                  {getRoleIcon(member.role)}
                  {getRoleLabel(member.role)}
                </div>
                {canRemove && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMemberToRemove(member)}
                    disabled={removingId === member.id}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    {removingId === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* メンバー削除確認ダイアログ */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent className="rounded-2xl border-gray-200 shadow-xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-zenshin-navy">
              メンバーを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {memberToRemove?.name || memberToRemove?.email}
              をワークスペースから削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-lg px-4 py-2 text-sm">
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600"
              onClick={handleRemoveMember}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
