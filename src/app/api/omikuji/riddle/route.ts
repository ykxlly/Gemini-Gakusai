import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_MEDIUM_TEXT } from "@/lib/validation";

type RiddleRequest = {
  riddle?: unknown;
  expectedAnswer?: unknown;
  userAnswer?: unknown;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    correct: { type: Type.BOOLEAN, description: "回答が想定解答と意味的に一致していれば true" },
    feedback: { type: Type.STRING, description: "来場者への短くポジティブな一言(30〜60文字)" },
  },
  required: ["correct", "feedback"],
} as const;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:riddle`, 15, 60_000);
  if (limited) return limited;

  const ai = getGenAI();

  let body: RiddleRequest;

  try {
    body = (await request.json()) as RiddleRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isText(body.riddle, MAX_MEDIUM_TEXT) || !isText(body.expectedAnswer, MAX_MEDIUM_TEXT) || !isText(body.userAnswer, MAX_MEDIUM_TEXT)) {
    return errorResponse("riddle, expectedAnswer, and userAnswer are required strings within limits.", 400);
  }

  const prompt = `なぞなぞ「${body.riddle.trim()}」の想定解答は「${body.expectedAnswer.trim()}」です。
来場者の回答「${body.userAnswer.trim()}」が、表記ゆれ・同義語・多少のタイプミスを許容して意味的に正解と言えるか判定してください。
判定は甘めで構いません。不正解でも来場者を励ますような前向きな feedback にしてください。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 120,
      groqMessages: [{ role: "user", content: `${prompt}\nJSONだけを返してください。` }],
      json: true,
      geminiRequest: {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
      },
    });

    const parsed = JSON.parse(response.text) as Record<string, unknown>;
    if (!parsed || typeof parsed.correct !== "boolean" || typeof parsed.feedback !== "string") {
      throw new Error("Invalid riddle response format");
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to check riddle answer:", error);
    return errorResponse("Failed to check the answer.", 502);
  }
}
