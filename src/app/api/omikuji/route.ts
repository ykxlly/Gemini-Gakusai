import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import spots from "@/data/spots.json";

type OmikujiRequest = {
  mood?: unknown;
  goal?: unknown;
  companion?: unknown;
  mbti?: unknown;
  partnerMood?: unknown;
  partnerGoal?: unknown;
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
    compatibility_note: {
      type: Type.STRING,
      description: "partner_mood/partner_goalが指定されている場合のみ、二人の相性についてのポジティブな一言(40〜70文字)。指定がない場合は空文字。",
    },
    mission: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        target_spot: { type: Type.STRING, enum: spotNames },
        description: { type: Type.STRING },
        riddle: {
          type: Type.STRING,
          description: "運勢やスポットに絡めた、一言で答えられる優しいなぞなぞ(クイズ)。",
        },
        riddle_answer: {
          type: Type.STRING,
          description: "riddleの想定解答(短い単語または短文)。",
        },
      },
      required: ["title", "target_spot", "description", "riddle", "riddle_answer"],
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
  required: ["fortune_name", "message", "action_tip", "compatibility_note", "mission", "lucky_elements"],
} as const;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const ai = getGenAI();

  if (!ai) {
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
    (body.mbti !== undefined && !isText(body.mbti)) ||
    (body.partnerMood !== undefined && !isText(body.partnerMood)) ||
    (body.partnerGoal !== undefined && !isText(body.partnerGoal))
  ) {
    return NextResponse.json(
      { error: "mood, goal, and companion are required strings. mbti/partnerMood/partnerGoal must be strings when provided." },
      { status: 400 },
    );
  }

  const spotContext = spots
    .map((spot) => `- ${spot.name} (${spot.category} / ${spot.location}): ${spot.vibe}`)
    .join("\n");

  const partnerContext =
    body.partnerMood || body.partnerGoal
      ? `同行者の情報:\n- 同行者の気分: ${body.partnerMood?.trim() || "未回答"}\n- 同行者の目的: ${body.partnerGoal?.trim() || "未回答"}\n上記を踏まえて compatibility_note に二人の相性の良さを書いてください。`
      : "同行者の情報は未入力です。compatibility_note は空文字にしてください。";

  const prompt = `あなたは学園祭の「超パーソナルAIおみくじ」です。
これは心理分析や診断ではなく、学園祭を楽しむための明るいエンタメおみくじです。断定的な心理評価、医療的助言、不適切・攻撃的・差別的な表現は絶対に禁止します。

来場者情報:
- 気分: ${body.mood.trim()}
- 目的: ${body.goal.trim()}
- 同行者: ${body.companion.trim()}
- MBTI: ${body.mbti?.trim() || "未回答"}

${partnerContext}

学園祭スポット:
${spotContext}

上のスポットから最適な1件を mission.target_spot に選び、楽しいミッションを作成してください。mission.riddle には運勢やミッションに関連した簡単ななぞなぞ（一言で答えられるもの）を、mission.riddle_answer にはその想定解答を入れてください。lucky_elements.spot も上記スポット名から選んでください。responseSchema に完全準拠する JSON のみを返してください。`;

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