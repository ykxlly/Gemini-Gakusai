import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";

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

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const ai = getGenAI();

  let body: CardRequest;

  try {
    body = (await request.json()) as CardRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isText(body.fortuneName) || !isText(body.color) || !isText(body.spot)) {
    return NextResponse.json({ error: "fortuneName, color, and spot are required strings." }, { status: 400 });
  }

  // Uses the same free-tier text model as the main route; the card visual is rendered client-side
  // so no paid image-generation model (and its quota) is required.
  const prompt = `学園祭の御守り札「${body.fortuneName.trim()}」のためのデザイン素材を考えてください。
ラッキーカラーは${body.color.trim()}、モチーフのスポットは「${body.spot.trim()}」です。
phrase には御守りに刻む短く縁起の良い一言を、accent_hex にはラッキーカラーを表すHEXカラーコードを入れてください。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
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

    return NextResponse.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Failed to generate omikuji card:", error);
    return NextResponse.json({ error: "Failed to generate the card." }, { status: 502 });
  }
}
