import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_MEDIUM_TEXT, MAX_SHORT_TEXT } from "@/lib/validation";

type ChatTurn = { role: "user" | "model"; text: string };

type ChatRequest = {
  message?: unknown;
  history?: unknown;
  fortuneName?: unknown;
  missionTitle?: unknown;
};

function isValidHistory(value: unknown): value is ChatTurn[] {
  return (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every(
      (turn) =>
        turn &&
        typeof turn === "object" &&
        (turn.role === "user" || turn.role === "model") &&
        isText(turn.text, MAX_MEDIUM_TEXT),
    )
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:chat`, 15, 60_000);
  if (limited) return limited;

  const ai = getGenAI();

  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isText(body.message, MAX_MEDIUM_TEXT) || (body.history !== undefined && !isValidHistory(body.history))) {
    return errorResponse("message is a required string. history must be a valid turn array.", 400);
  }

  const history = ((body.history as ChatTurn[] | undefined) ?? []).slice(-6);

  const fortuneName = isText(body.fortuneName, MAX_SHORT_TEXT) ? body.fortuneName.trim() : "不明";
  const missionTitle = isText(body.missionTitle, MAX_SHORT_TEXT) ? body.missionTitle.trim() : "不明";

  const systemInstruction = `あなたは学園祭「超パーソナルAIおみくじ」の案内キャラクターです。来場者が引いた運勢「${fortuneName}」とミッション「${missionTitle}」を踏まえて、明るく親しみやすい口調で短く(80文字以内)答えてください。医療・断定的な心理診断・不適切な内容は禁止です。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 120,
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
    return errorResponse("Failed to get a reply.", 502);
  }
}
