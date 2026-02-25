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

  const { chartData, messages, language } = await req.json();
  if (!chartData) {
    return NextResponse.json({ error: "Chart data is required" }, { status: 400 });
  }

  const systemPrompt = language === "en" ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_JA;
  const chartContext = formatChartContext(chartData, language);

  const aiMessages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${chartContext}\n\n---\n\n${
        messages?.length > 0
          ? messages[messages.length - 1].content
          : language === "en"
            ? "Please analyze this chart and provide coaching."
            : "このチャートを分析してコーチングしてください。"
      }`,
    },
  ];

  // Include conversation history if exists (skip the last one, already included above)
  if (messages?.length > 1) {
    const history: Anthropic.MessageParam[] = [];
    for (let i = 0; i < messages.length - 1; i++) {
      history.push({
        role: messages[i].role as "user" | "assistant",
        content: messages[i].content,
      });
    }
    aiMessages.unshift(...history);
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages: aiMessages,
      });

      const content = message.content[0];
      if (content.type !== "text") {
        return NextResponse.json(
          { error: "Unexpected response type" },
          { status: 500 }
        );
      }

      return NextResponse.json({ response: content.text });
    } catch (error) {
      const err = error as { status?: number; message?: string };
      const status = err?.status || 500;

      // Retry on 529 (overloaded) or 529-like errors
      if (status === 529 && attempt < MAX_RETRIES - 1) {
        console.log(`AI coach: retrying (attempt ${attempt + 2}/${MAX_RETRIES}) after ${RETRY_DELAYS[attempt]}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
        continue;
      }

      console.error("AI coach error:", err?.message || err);
      const errorMessage = err?.message?.includes("credit")
        ? "API credits insufficient"
        : status === 529
          ? "AI service is temporarily busy. Please try again in a moment."
          : "AI coaching failed";
      return NextResponse.json({ error: errorMessage }, { status });
    }
  }

  return NextResponse.json({ error: "AI coaching failed after retries" }, { status: 500 });
}

function formatChartContext(
  chartData: Record<string, unknown>,
  language: string
): string {
  const d = chartData as {
    title?: string;
    dueDate?: string;
    areas?: { name: string; color: string }[];
    visions?: { content: string; area?: string; dueDate?: string }[];
    realities?: { content: string; area?: string; dueDate?: string }[];
    tensions?: {
      title: string;
      status: string;
      area?: string;
      actions?: {
        title: string;
        status: string;
        assignee?: string;
        dueDate?: string;
        blockers?: string;
      }[];
    }[];
    stats?: {
      totalActions: number;
      doneActions: number;
      overdueActions: number;
      unassignedActions: number;
    };
  };

  const isEn = language === "en";

  let ctx = isEn
    ? `## Chart: ${d.title || "Untitled"}\n`
    : `## チャート: ${d.title || "無題"}\n`;

  if (d.dueDate) {
    ctx += isEn ? `Target Date: ${d.dueDate}\n` : `目標期限: ${d.dueDate}\n`;
  }

  // Stats summary
  if (d.stats) {
    ctx += isEn ? `\n### Overview\n` : `\n### 概要\n`;
    ctx += isEn
      ? `- Total Actions: ${d.stats.totalActions}\n- Completed: ${d.stats.doneActions}\n- Overdue: ${d.stats.overdueActions}\n- Unassigned: ${d.stats.unassignedActions}\n`
      : `- アクション総数: ${d.stats.totalActions}\n- 完了: ${d.stats.doneActions}\n- 期限超過: ${d.stats.overdueActions}\n- 担当者未設定: ${d.stats.unassignedActions}\n`;
  }

  // Visions
  if (d.visions?.length) {
    ctx += isEn ? `\n### Visions\n` : `\n### ビジョン（創り出したい状態）\n`;
    for (const v of d.visions) {
      ctx += `- ${v.content}`;
      if (v.area) ctx += ` [${v.area}]`;
      if (v.dueDate) ctx += ` (${isEn ? "due" : "期限"}: ${v.dueDate})`;
      ctx += "\n";
    }
  }

  // Realities
  if (d.realities?.length) {
    ctx += isEn ? `\n### Realities\n` : `\n### リアリティ（ありのままの現状）\n`;
    for (const r of d.realities) {
      ctx += `- ${r.content}`;
      if (r.area) ctx += ` [${r.area}]`;
      if (r.dueDate) ctx += ` (${isEn ? "updated" : "更新日"}: ${r.dueDate})`;
      ctx += "\n";
    }
  }

  // Tensions & Actions
  if (d.tensions?.length) {
    ctx += isEn
      ? `\n### Tensions & Actions\n`
      : `\n### テンション & アクション\n`;
    for (const t of d.tensions) {
      const statusLabel =
        t.status === "resolved"
          ? isEn ? "✅ Resolved" : "✅ 解決済み"
          : isEn ? "🔴 Active" : "🔴 アクティブ";
      ctx += `\n**${t.title}** (${statusLabel})`;
      if (t.area) ctx += ` [${t.area}]`;
      ctx += "\n";
      if (t.actions?.length) {
        for (const a of t.actions) {
          const aStatus =
            a.status === "done" ? "✅" :
            a.status === "in_progress" ? "🔄" :
            a.status === "canceled" ? "❌" : "⬜";
          ctx += `  ${aStatus} ${a.title}`;
          if (a.assignee) ctx += ` (@${a.assignee})`;
          if (a.dueDate) ctx += ` (${isEn ? "due" : "期限"}: ${a.dueDate})`;
          if (a.blockers) ctx += ` [${isEn ? "blocked" : "ブロック"}: ${a.blockers}]`;
          ctx += "\n";
        }
      }
    }
  }

  return ctx;
}

const SYSTEM_PROMPT_JA = `あなたはZENSHIN CHARTのAIコーチです。ロバート・フリッツの「構造的テンション（Structural Tension）」理論に基づき、ユーザーのチャートを分析し、コーチングを行います。

## あなたの役割
答えを出すのではなく、**問いを投げる**コーチです。ユーザー自身が気づき、判断し、行動することを支援します。

## 分析の基盤: フリッツの緊張構造チェックリスト

### ビジョン（創り出したい状態）のチェックポイント
- 本当に創り出したい状態を記述しているか。絵が浮かぶようにする
- 数値化できている目標は数値化しているか
- 相対的な表現（より、もっと）を避け、定量的な表現を心がけているか
- 問題解決（なくしたいこと）ではなく、創り出したいこと（生み出すもの）を書いているか
- 単なるプロセスではなく、実際の成果を記述しているか
- 数値化しにくいものは、できる限り具体的に記述しているか

### リアリティ（ありのままの現状）のチェックポイント
- 全ての最終成果の目標に対して、現実をもれなく記載できているか
- 的確に、定量的に表現できているか
- 全体像を描けているか
- 想定や論評になっていないか。客観的に記述しているか
- 誇張なしに記述しているか
- 経緯ではなく、現在の現実そのものを記述しているか
- 全ての必要な事実を含めているか

### アクション（行動計画）のチェックポイント
- 全ての目標に対して該当部門を巻き込むアクションステップがあるか
- 全ての行動ステップを実行したら、目標に到達するか
- 行動ステップは正確で簡潔に記述されているか
- 行動ステップの全てに責任者がいるか

## 分析の観点

1. **テンション診断**: Vision↔Realityのギャップは明確か。緊張構造がしっかり張れているか
2. **モメンタム診断**: アクションの完了率・進捗速度。チームとして前進できているか
3. **停滞検知**: 期限超過のアクション、長期間更新のない項目
4. **リソース偏り**: 特定の担当者にタスクが集中していないか
5. **達成予測**: 現在のペースでビジョンの期限に間に合うか

## 返答のルール
- 簡潔に、要点を絞って伝える（長文にしない）
- 最初に全体診断（2-3文）、次に具体的な指摘と問いかけ
- 批判ではなく、建設的な問いを投げる
- ユーザーの言語に合わせて返答する（日本語のチャートには日本語で）
- 絵文字は控えめに使う（セクション区切り程度）
- 問いかけは一度に最大3つまでにする`;

const SYSTEM_PROMPT_EN = `You are the AI Coach of ZENSHIN CHART. You analyze users' charts and provide coaching based on Robert Fritz's "Structural Tension" theory.

## Your Role
You are a coach who **asks questions**, not one who gives answers. You help users notice, judge, and act on their own.

## Analysis Foundation: Fritz's Structural Tension Checklist

### Vision (Desired State) Checkpoints
- Does it describe the state you truly want to create? Make it vivid and visual
- Are quantifiable goals expressed with numbers?
- Are relative expressions (more, better) avoided in favor of quantitative ones?
- Is it about what you want to create (outcomes), not problems to eliminate?
- Does it describe actual results, not just processes?
- Are non-quantifiable items described as concretely as possible?

### Reality (Current State) Checkpoints
- Is reality documented for every final outcome goal?
- Is it expressed accurately and quantitatively?
- Does it paint the complete picture?
- Is it objective, not assumptions or commentary?
- Is it described without exaggeration?
- Does it describe the current reality, not history?
- Does it include all necessary facts?

### Action (Action Plan) Checkpoints
- Is there an action step involving relevant departments for every goal?
- Will completing all action steps achieve the goal?
- Are action steps described accurately and concisely?
- Does every action step have an owner?

## Analysis Perspectives

1. **Tension Diagnosis**: Is the Vision↔Reality gap clear? Is structural tension properly maintained?
2. **Momentum Diagnosis**: Action completion rate and velocity. Is the team making progress?
3. **Stagnation Detection**: Overdue actions, items not updated for a long time
4. **Resource Balance**: Is work concentrated on specific people?
5. **Achievement Forecast**: At the current pace, will the vision deadline be met?

## Response Rules
- Be concise and focused (avoid long responses)
- Start with an overall diagnosis (2-3 sentences), then specific observations and questions
- Ask constructive questions, not criticisms
- Respond in the user's language (English for English charts)
- Use emojis sparingly (section dividers at most)
- Maximum 3 questions at a time`;
