"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOrCreateWorkspace(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("認証が必要です");

  const { data: members, error: memberLookupError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (members && members.length > 0) return members[0].workspace_id;

  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({
      name: "マイワークスペース",
      owner_id: user.id,
    })
    .select()
    .single();

  if (wsError) throw wsError;

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) throw memberError;

  await supabase
    .from("charts")
    .update({ workspace_id: workspace.id })
    .eq("user_id", user.id)
    .is("workspace_id", null);

  return workspace.id;
}

// 招待コードを生成（ランダムな8文字）
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 招待リンクを作成
export async function createInvitation(
  workspaceId: string
): Promise<{ code: string; url: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 既存の有効な招待があれば返す
  const { data: existing } = await supabase
    .from("workspace_invitations")
    .select("invite_code")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .single();

  if (existing) {
    return {
      code: existing.invite_code,
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${existing.invite_code}`,
    };
  }

  // 新規作成
  const code = generateInviteCode();
  const { error } = await supabase
    .from("workspace_invitations")
    .insert({
      workspace_id: workspaceId,
      invite_code: code,
      created_by: user.id,
    });

  if (error) {
    console.error("Failed to create invitation:", error);
    return null;
  }

  return {
    code,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${code}`,
  };
}

// 招待コードからワークスペース情報を取得
export async function getInvitationByCode(code: string): Promise<{
  workspaceId: string;
  workspaceName: string;
} | null> {
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("workspace_invitations")
    .select("workspace_id, workspaces(name)")
    .eq("invite_code", code)
    .eq("is_active", true)
    .single();

  if (!invitation) return null;

  return {
    workspaceId: invitation.workspace_id,
    workspaceName: (invitation.workspaces as any)?.name || "ワークスペース",
  };
}

// 招待を受けてワークスペースに参加
export async function joinWorkspaceByInvite(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // 招待を取得
  const { data: invitation } = await supabase
    .from("workspace_invitations")
    .select("workspace_id")
    .eq("invite_code", code)
    .eq("is_active", true)
    .single();

  if (!invitation) return { success: false, error: "無効な招待リンクです" };

  // 既にメンバーか確認
  const { data: existingMember } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", invitation.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    return { success: true }; // 既にメンバー
  }

  // メンバーとして追加
  const { error } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      role: "editor",
    });

  if (error) {
    // 既に参加済みの場合は成功として扱う
    if (error.code === "23505") {
      return { success: true };
    }
    console.error("[joinWorkspaceByInvite] Failed to join workspace:", error);
    return { success: false, error: "参加に失敗しました" };
  }

  return { success: true };
}

// ワークスペースのメンバー一覧を取得
export async function getWorkspaceMembers(workspaceId: string): Promise<
  {
    id: string;
    email: string;
    name?: string;
    role: string;
    avatar_url?: string;
  }[]
> {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("workspace_members")
    .select(
      `
      user_id,
      role,
      profiles(email, name, avatar_url)
    `
    )
    .eq("workspace_id", workspaceId);

  if (!members) return [];

  return members.map((m: any) => ({
    id: m.user_id,
    email: m.profiles?.email || "",
    name: m.profiles?.name,
    role: m.role,
    avatar_url: m.profiles?.avatar_url,
  }));
}

// 現在のワークスペースIDを取得
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  return member?.workspace_id || null;
}

// 現在のワークスペース情報を取得
export async function getCurrentWorkspace(): Promise<{
  id: string;
  name: string;
  role: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user.id)
    .single();

  if (!member) return null;

  return {
    id: member.workspace_id,
    name: (member.workspaces as any)?.name || "マイワークスペース",
    role: member.role,
  };
}

// ユーザーが所属する全ワークスペースを取得
export async function getUserWorkspaces(): Promise<
  {
    id: string;
    name: string;
    role: string;
  }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: members } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", user.id);

  if (!members) return [];

  return members.map((m: any) => ({
    id: m.workspace_id,
    name: m.workspaces?.name || "ワークスペース",
    role: m.role,
  }));
}
