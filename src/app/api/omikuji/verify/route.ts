import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithFallback, getGenAI } from "@/lib/gemini";

type VerifyRequest = {
  spot?: unknown;
  missionDescription?: unknown;
  imageBase64?: unknown;
  mimeType?: unknown;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    verified: { type: Type.BOOLEAN, description: "写真がミッションの内容やスポットと合致していそうか" },
    comment: { type: Type.STRING, description: "来場者への短い実況コメント(30〜60文字)。合致していなくても前向きに。" },
  },
  required: ["verified", "comment"],
} as const;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const ai = getGenAI();

  if (!ai) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  let body: VerifyRequest;

  try {
    body = (await request.json()) as VerifyRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isText(body.spot) || !isText(body.missionDescription) || !isText(body.imageBase64) || !isText(body.mimeType)) {
    return NextResponse.json(
      { error: "spot, missionDescription, imageBase64, and mimeType are required strings." },
      { status: 400 },
    );
  }

  const prompt = `あなたは学園祭「超パーソナルAIおみくじ」のミッション判定係です。
これはエンタメ用の軽い判定で、来場者を責めたり否定的に扱ってはいけません。写真がスポット「${body.spot.trim()}」やミッション内容「${body.missionDescription.trim()}」と関連していそうであれば verified を true にしてください。判断が難しい場合は好意的に true 寄りに解釈してください。comment には実況風の短いポジティブなコメントを日本語で書いてください。`;

  try {
    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, { inlineData: { data: body.imageBase64.trim(), mimeType: body.mimeType.trim() } }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    return NextResponse.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Failed to verify mission photo:", error);
    return NextResponse.json({ error: "Failed to verify the photo." }, { status: 502 });
  }
}
