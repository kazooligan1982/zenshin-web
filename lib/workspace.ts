"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOrCreateWorkspace(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("認証が必要です");

  const { data: member } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .single();

  if (member) return member.workspace_id;

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
