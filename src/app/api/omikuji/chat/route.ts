import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";

type ChatTurn = { role: "user" | "model"; text: string };

type ChatRequest = {
  message?: unknown;
  history?: unknown;
  fortuneName?: unknown;
  missionTitle?: unknown;
};

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidHistory(value: unknown): value is ChatTurn[] {
  return (
    Array.isArray(value) &&
    value.every(
      (turn) =>
        turn &&
        typeof turn === "object" &&
        (turn.role === "user" || turn.role === "model") &&
        typeof turn.text === "string",
    )
  );
}

export async function POST(request: Request) {
  const ai = getGenAI();

  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isText(body.message) || (body.history !== undefined && !isValidHistory(body.history))) {
    return NextResponse.json({ error: "message is a required string. history must be a valid turn array." }, { status: 400 });
  }

  const history = (body.history as ChatTurn[] | undefined) ?? [];

  const systemInstruction = `あなたは学園祭「超パーソナルAIおみくじ」の案内キャラクターです。来場者が引いた運勢「${
    isText(body.fortuneName) ? body.fortuneName.trim() : "不明"
  }」とミッション「${
    isText(body.missionTitle) ? body.missionTitle.trim() : "不明"
  }」を踏まえて、明るく親しみやすい口調で短く(80文字以内)答えてください。医療・断定的な心理診断・不適切な内容は禁止です。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      geminiRequest: {
        model: "gemini-3.6-flash",
        config: { systemInstruction },
        contents: [
          ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
          { role: "user", parts: [{ text: body.message.trim() }] },
        ],
      },
      groqMessages: [
        { role: "system", content: systemInstruction },
        ...history.map((turn) => ({ role: turn.role === "model" ? "assistant" as const : "user" as const, content: turn.text })),
        { role: "user", content: body.message.trim() },
      ],
    });

    return NextResponse.json({ reply: response.text });
  } catch (error) {
    console.error("Failed to continue omikuji chat:", error);
    return NextResponse.json({ error: "Failed to get a reply." }, { status: 502 });
  }
}
