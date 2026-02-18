import { createNewWorkspace } from "@/lib/workspace";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "ワークスペース名は必須です" },
        { status: 400 }
      );
    }

    const workspace = await createNewWorkspace(name.trim());

    if (!workspace) {
      return NextResponse.json(
        { error: "ワークスペースの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error in POST /api/workspaces:", error);
    return NextResponse.json(
      { error: "内部エラーが発生しました" },
      { status: 500 }
    );
  }
}
