import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_SHORT_TEXT } from "@/lib/validation";

type CardRequest = {
  fortuneName?: unknown;
  color?: unknown;
  spot?: unknown;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    phrase: { type: Type.STRING, description: "御守り札に刻む短い一言(15〜25文字)。運勢名やスポットを踏まえた縁起の良い言葉。" },
    accent_hex: { type: Type.STRING, description: "ラッキーカラーを表す6桁のHEXカラーコード。例: #d83a2e" },
  },
  required: ["phrase", "accent_hex"],
} as const;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:card`, 10, 60_000);
  if (limited) return limited;

  const ai = getGenAI();

  let body: CardRequest;

  try {
    body = (await request.json()) as CardRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isText(body.fortuneName, MAX_SHORT_TEXT) || !isText(body.color, MAX_SHORT_TEXT) || !isText(body.spot, MAX_SHORT_TEXT)) {
    return errorResponse("fortuneName, color, and spot are required strings within limits.", 400);
  }

  const prompt = `学園祭の御守り札「${body.fortuneName.trim()}」のためのデザイン素材を考えてください。
ラッキーカラーは${body.color.trim()}、モチーフのスポットは「${body.spot.trim()}」です。
phrase には御守りに刻む短く縁起の良い一言を、accent_hex にはラッキーカラーを表すHEXカラーコードを入れてください。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 100,
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
    if (!parsed || typeof parsed.phrase !== "string" || typeof parsed.accent_hex !== "string") {
      throw new Error("Invalid card response format");
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to generate omikuji card:", error);
    return errorResponse("Failed to generate the card.", 502);
  }
}
