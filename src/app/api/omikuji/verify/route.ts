import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithFallback, getGenAI } from "@/lib/gemini";
import spots from "@/data/spots.json";

type VerifyRequest = {
  spot?: unknown;
  missionDescription?: unknown;
  imageBase64?: unknown;
  mimeType?: unknown;
  rallyPrompt?: unknown;
};

const spotNames = spots.map((spot) => spot.name);

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    stamp_title: { type: Type.STRING, description: "写真から見つけた魅力を表す、短い発見スタンプ名。例：熱気を発見！" },
    comment: { type: Type.STRING, description: "マスコット視点の前向きな実況コメント(30〜60文字)" },
    caption: { type: Type.STRING, description: "思い出しおり用の短い写真キャプション(15〜30文字)" },
    rally_complete: { type: Type.BOOLEAN, description: "写真がフォトラリーのお題を満たしていそうならtrue。曖昧ならtrue寄り" },
    card_title: { type: Type.STRING, description: "この企画の魅力カード名。例：未知の世界カード" },
    card_message: { type: Type.STRING, description: "魅力カードの短い説明(20〜40文字)" },
    next_spot: { type: Type.STRING, enum: spotNames, description: "次に立ち寄ると楽しめそうな公式掲載企画を1つ。現在のspotとは異なる名前" },
  },
  required: ["stamp_title", "comment", "caption", "rally_complete", "card_title", "card_message", "next_spot"],
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

  if (!isText(body.spot) || !isText(body.missionDescription) || !isText(body.imageBase64) || !isText(body.mimeType) || !isText(body.rallyPrompt)) {
    return NextResponse.json(
      { error: "spot, missionDescription, imageBase64, mimeType, and rallyPrompt are required strings." },
      { status: 400 },
    );
  }

  const prompt = `あなたは学園祭「超パーソナルAIおみくじ」の発見スタンプカメラです。
これは写真の正誤や本人確認をする機能ではありません。写真に写った色・音・手作り感・にぎわい・遊び心などの魅力を見つけ、明るく褒めてください。人物の属性・年齢・容姿・感情を推測しないでください。

来場者が向かった企画: 「${body.spot.trim()}」
その企画でのミッション: 「${body.missionDescription.trim()}」
今回のフォトラリーお題: 「${body.rallyPrompt.trim()}」

stamp_titleは「〜を発見！」の形にしてください。commentは案内キャラクターの短い実況にしてください。captionは思い出しおりに載せる一文です。
rally_completeはお題と少しでも関連していればtrueにしてください。card_titleとcard_messageは、この企画で撮影したことで解除される魅力カードです。
next_spotは、上記の企画とは異なる公式掲載企画から選び、写真の雰囲気に合う次の寄り道を提案してください。responseSchemaに完全準拠したJSONのみを返してください。`;

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
    console.error("Failed to create discovery stamp:", error);
    return NextResponse.json({ error: "Failed to create discovery stamp." }, { status: 502 });
  }
}
