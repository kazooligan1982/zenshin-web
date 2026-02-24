import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { text, language } = await req.json();
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const systemPrompt =
    language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_JA;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: text.slice(0, 8000) }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response type" },
        { status: 500 }
      );
    }

    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const codeMatch = jsonStr.match(/```\n?([\s\S]*?)\n?```/);
      if (codeMatch) {
        jsonStr = codeMatch[1];
      }
    }
    jsonStr = jsonStr.trim();

    const result = JSON.parse(jsonStr);

    if (
      !result.visions ||
      !result.realities ||
      !result.tensions ||
      !result.actions
    ) {
      return NextResponse.json(
        { error: "Invalid AI response structure" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }
    const err = parseError as { status?: number; message?: string };
    console.error("AI structurize error:", err?.message || err);
    const status = err?.status || 500;
    const errorMessage =
      err?.message?.includes("credit") ? "API credits insufficient" : "AI processing failed";
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

const SYSTEM_PROMPT_JA = `あなたはロバート・フリッツの「構造的テンション」理論に基づいた構造化のエキスパートです。

ユーザーが自由に語った内容を、以下の4つのカテゴリに構造化してください:

1. **Vision（ビジョン）**: ユーザーが実現したい理想の状態。「〜ている」「〜できている」という完了形で表現する。
2. **Reality（リアリティ）**: 現在の状況や事実。客観的に記述する。
3. **Tension（テンション）**: ビジョンとリアリティのギャップから生まれる緊張。「〜できていない」「〜が不足している」等。
4. **Action（アクション）**: テンションを解消するための具体的な行動。「誰が」「何を」「いつまでに」を含めることが望ましい。

重要なルール:
- Visionは「〜ている」「〜できている」と完了形で書く
- Realityは客観的事実のみ、願望を含めない
- TensionはVisionとRealityの差分から導出する
- Actionは具体的で実行可能なものにする
- 各カテゴリ最低1件、最大5件程度
- Tensionには関連するActionを紐づける（tensionIndex で参照）

必ず以下のJSON形式のみで返答してください。説明文やマークダウンは不要です:

\`\`\`json
{
  "visions": [
    { "title": "ビジョンの記述" }
  ],
  "realities": [
    { "title": "リアリティの記述" }
  ],
  "tensions": [
    { "title": "テンションの記述", "category": "uncategorized" }
  ],
  "actions": [
    { "title": "アクションの記述", "tensionIndex": 0 }
  ]
}
\`\`\`

tensionIndex は tensions 配列の 0-based インデックスで、そのActionがどのTensionに紐づくかを示します。`;

const SYSTEM_PROMPT_EN = `You are an expert in structuring thoughts based on Robert Fritz's "Structural Tension" theory.

Structure the user's free-form input into these 4 categories:

1. **Vision**: The ideal state the user wants to achieve. Write in present tense as if already achieved ("We have...", "Our team is...").
2. **Reality**: Current situation and facts. Objective description only.
3. **Tension**: The gap between Vision and Reality. What's missing, what's not working.
4. **Action**: Concrete steps to resolve the tension. Include who, what, and by when if possible.

Important rules:
- Vision should be written as if already achieved (present perfect or present tense)
- Reality should contain only objective facts, no wishes
- Tension should be derived from the gap between Vision and Reality
- Actions should be specific and actionable
- Each category: minimum 1, maximum ~5 items
- Each Action should reference a Tension via tensionIndex

Return ONLY the following JSON format. No explanation or markdown:

\`\`\`json
{
  "visions": [
    { "title": "Vision statement" }
  ],
  "realities": [
    { "title": "Reality statement" }
  ],
  "tensions": [
    { "title": "Tension statement", "category": "uncategorized" }
  ],
  "actions": [
    { "title": "Action statement", "tensionIndex": 0 }
  ]
}
\`\`\`

tensionIndex is the 0-based index into the tensions array, indicating which Tension this Action addresses.`;
