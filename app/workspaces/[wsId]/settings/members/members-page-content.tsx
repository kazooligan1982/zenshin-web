"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Users, Crown, User, X, Loader2, Shield, Eye, Stethoscope, Mail } from "lucide-react";
import {
  createInvitation,
  getWorkspaceMembers,
  removeMember,
} from "@/lib/workspace";
import { inviteMember, revokeInvitation } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canGenerateInviteLink, canInviteMembers, canRemoveMembers, ROLE_LABELS } from "@/lib/permissions";

interface Member {
  id: string;
  email: string;
  name?: string;
  role: string;
  avatar_url?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface MembersPageContentProps {
  workspaceId: string;
  currentRole: string;
  initialMembers: Member[];
  initialPendingInvitations?: PendingInvitation[];
}

export function MembersPageContent({
  workspaceId,
  currentRole,
  initialMembers,
  initialPendingInvitations = [],
}: MembersPageContentProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>(initialPendingInvitations);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("editor");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const router = useRouter();

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
  const canShowEmailInvite = canInviteMembers(currentRole as "owner" | "consultant" | "editor" | "viewer");
  const canRemove = canRemoveMembers(currentRole as "owner" | "consultant" | "editor" | "viewer");

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsSendingInvite(true);
    try {
      await inviteMember(workspaceId, inviteEmail.trim(), inviteRole);
      toast.success("招待メールを送信しました", { duration: 3000 });
      setInviteEmail("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "招待の送信に失敗しました", { duration: 5000 });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setRevokingId(invitationId);
    try {
      await revokeInvitation(workspaceId, invitationId);
      toast.success("招待を取り消しました", { duration: 3000 });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "取り消しに失敗しました", { duration: 5000 });
    } finally {
      setRevokingId(null);
    }
  };

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

      {/* メールで招待（ownerのみ） */}
      {canShowEmailInvite && (
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zenshin-navy mb-1 flex items-center gap-2">
            <Mail className="h-5 w-5 text-zenshin-navy/40" />
            メールで招待
          </h2>
          <p className="text-sm text-zenshin-navy/40 mb-4">
            メールアドレスを入力して、ワークスペースにメンバーを招待します。
          </p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                type="email"
                placeholder="example@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="border-zenshin-navy/10"
              />
            </div>
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[140px] border-zenshin-navy/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultant">コンサルタント</SelectItem>
                <SelectItem value="editor">編集者</SelectItem>
                <SelectItem value="viewer">閲覧者</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleSendInvite}
              disabled={!inviteEmail.trim() || isSendingInvite}
              className="bg-zenshin-orange hover:bg-zenshin-orange/90 text-white"
            >
              {isSendingInvite ? "送信中..." : "招待を送信"}
            </Button>
          </div>
        </div>
      )}

      {/* 招待リンク */}
      {canShowInviteLink && (
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zenshin-navy mb-1">招待リンク</h2>
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

      {/* 保留中の招待 */}
      {canShowEmailInvite && pendingInvitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-zenshin-navy/8 p-6 mb-6">
          <h2 className="text-lg font-semibold text-zenshin-navy mb-4">保留中の招待</h2>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-zenshin-cream/50"
              >
                <div>
                  <span className="font-medium text-zenshin-navy">{inv.email}</span>
                  <span className="text-sm text-zenshin-navy/40 ml-2">
                    （{ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role}）
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeInvitation(inv.id)}
                  disabled={revokingId === inv.id}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8"
                >
                  {revokingId === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "取り消す"
                  )}
                </Button>
              </div>
            ))}
          </div>
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
