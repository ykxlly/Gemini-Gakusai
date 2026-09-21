import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithFallback, getGenAI } from "@/lib/gemini";
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
    .map((spot) => {
      const details = [spot.schedule && `時間: ${spot.schedule}`, spot.price && `料金: ${spot.price}`, spot.capacity && `定員: ${spot.capacity}`, spot.notice && `注意: ${spot.notice}`].filter(Boolean).join(" / ");
      return `- ${spot.name}\n  分類: ${spot.category}\n  場所: ${spot.location}\n  内容: ${spot.vibe}${details ? `\n  条件: ${details}` : ""}`;
    })
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

BDSF 2026の出店企画（2026年9月21日時点の公式掲載情報）:
${spotContext}

上の企画から来場者の気分・目的・同行者に合う1件を mission.target_spot に選び、その企画で無理なく実行できる楽しいミッションを作成してください。
存在しない企画、場所、商品、特典、開催時刻を作らないでください。時刻が関係する企画や「後日掲載」の場所は、現地の公式案内を確認するよう促してください。
アルコールを飲むミッションは作らないでください。mission.riddle には運勢やミッションに関連した簡単ななぞなぞ（一言で答えられるもの）を、mission.riddle_answer にはその想定解答を入れてください。
lucky_elements.spot も上記企画名から選んでください。responseSchema に完全準拠する JSON のみを返してください。`;

  try {
    const response = await generateContentWithFallback(ai, {
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
