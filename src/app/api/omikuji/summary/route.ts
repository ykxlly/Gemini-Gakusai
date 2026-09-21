import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";

type SummaryRequest = {
  fortunes?: unknown;
};

type FortuneEntry = { fortune_name: string; message: string };

function isValidFortunes(value: unknown): value is FortuneEntry[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.fortune_name === "string" &&
        typeof entry.message === "string",
    )
  );
}

export async function POST(request: Request) {
  const ai = getGenAI();

  let body: SummaryRequest;

  try {
    body = (await request.json()) as SummaryRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isValidFortunes(body.fortunes)) {
    return NextResponse.json({ error: "fortunes must be a non-empty array of { fortune_name, message }." }, { status: 400 });
  }

  const history = body.fortunes.slice(-5)
    .map((entry, index) => `${index + 1}. ${entry.fortune_name} — ${entry.message}`)
    .join("\n");

  const prompt = `来場者が学園祭で今日引いたおみくじの履歴です。\n${history}\n\nこの1日を締めくくる、温かく前向きなまとめコメントを120〜160文字の日本語で書いてください。断定的な性格診断や医療的な内容は禁止です。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 200,
      groqMessages: [{ role: "user", content: prompt }],
      geminiRequest: {
      model: "gemini-3.6-flash",
      contents: prompt,
      },
    });

    return NextResponse.json({ summary: response.text.trim() });
  } catch (error) {
    console.error("Failed to summarize the day:", error);
    return NextResponse.json({ error: "Failed to generate the summary." }, { status: 502 });
  }
}
