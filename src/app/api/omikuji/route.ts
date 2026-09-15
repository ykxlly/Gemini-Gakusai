import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import spots from "@/data/spots.json";

type OmikujiRequest = {
  mood?: unknown;
  goal?: unknown;
  companion?: unknown;
  mbti?: unknown;
};

const spotNames = spots.map((spot) => spot.name);

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    fortune_name: { type: Type.STRING, description: "ユニークな運勢名" },
    message: {
      type: Type.STRING,
      description: "来場者へのポジティブなエンタメメッセージ。80〜120文字。",
    },
    action_tip: { type: Type.STRING, description: "今日意識すると良い小さなアクション" },
    mission: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        target_spot: { type: Type.STRING, enum: spotNames },
        description: { type: Type.STRING },
      },
      required: ["title", "target_spot", "description"],
    },
    lucky_elements: {
      type: Type.OBJECT,
      properties: {
        color: { type: Type.STRING },
        food: { type: Type.STRING },
        spot: { type: Type.STRING, enum: spotNames },
      },
      required: ["color", "food", "spot"],
    },
  },
  required: ["fortune_name", "message", "action_tip", "mission", "lucky_elements"],
} as const;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  let body: OmikujiRequest;

  try {
    body = (await request.json()) as OmikujiRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    !isText(body.mood) ||
    !isText(body.goal) ||
    !isText(body.companion) ||
    (body.mbti !== undefined && !isText(body.mbti))
  ) {
    return NextResponse.json(
      { error: "mood, goal, and companion are required strings. mbti must be a string when provided." },
      { status: 400 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const spotContext = spots
    .map((spot) => `- ${spot.name} (${spot.category} / ${spot.location}): ${spot.vibe}`)
    .join("\n");

  const prompt = `あなたは学園祭の「超パーソナルAIおみくじ」です。
これは心理分析や診断ではなく、学園祭を楽しむための明るいエンタメおみくじです。断定的な心理評価、医療的助言、不適切・攻撃的・差別的な表現は絶対に禁止します。

来場者情報:
- 気分: ${body.mood.trim()}
- 目的: ${body.goal.trim()}
- 同行者: ${body.companion.trim()}
- MBTI: ${body.mbti?.trim() || "未回答"}

学園祭スポット:
${spotContext}

上のスポットから最適な1件を mission.target_spot に選び、楽しいミッションを作成してください。lucky_elements.spot も上記スポット名から選んでください。responseSchema に完全準拠する JSON のみを返してください。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
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
    console.error("Failed to generate omikuji:", error);
    return NextResponse.json({ error: "Failed to generate omikuji." }, { status: 502 });
  }
}