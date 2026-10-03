import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_MEDIUM_TEXT, MAX_SHORT_TEXT } from "@/lib/validation";

type Visit = { spot: string; note: string };
type BookmarkRequest = { fortuneName?: unknown; visits?: unknown };

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "しおりの短いタイトル(10〜22文字)" },
    closing_comment: { type: Type.STRING, description: "一日を結ぶ温かい一言(45〜80文字)" },
  },
  required: ["title", "closing_comment"],
} as const;

function isValidVisits(value: unknown): value is Visit[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 3 && value.every((visit) =>
    visit && typeof visit === "object"
    && isText(visit.note, MAX_MEDIUM_TEXT)
    && isText(visit.spot, MAX_SHORT_TEXT),
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:bookmark`, 10, 60_000);
  if (limited) return limited;

  const ai = getGenAI();

  let body: BookmarkRequest;
  try {
    body = (await request.json()) as BookmarkRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isText(body.fortuneName, MAX_SHORT_TEXT) || !isValidVisits(body.visits)) {
    return errorResponse("fortuneName and 1 to 3 valid visits are required.", 400);
  }

  const visitText = body.visits.map((visit, index) => `${index + 1}. ${visit.spot}: ${visit.note}`).join("\n");
  const prompt = `学園祭での寄り道の記録をまとめた「今日の寄り道しおり」を作ります。
運勢: ${body.fortuneName.trim()}
今日の足取り:
${visitText}

titleにはしおりのタイトル、closing_commentには思い出を優しく結ぶ日本語の一言を書いてください。心理診断や断定はしないでください。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 160,
      groqMessages: [{ role: "user", content: `${prompt}\nJSONだけを返してください。` }],
      json: true,
      geminiRequest: {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema },
      },
    });
    return NextResponse.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Failed to create memory bookmark:", error);
    return errorResponse("Failed to create memory bookmark.", 502);
  }
}
