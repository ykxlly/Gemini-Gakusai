import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_SHORT_TEXT } from "@/lib/validation";
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
  required: ["fortune_name", "message", "action_tip", "compatibility_note", "mission", "lucky_elements"],
} as const;

function isValidOmikujiResult(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const mission = result.mission as Record<string, unknown> | undefined;
  const lucky = result.lucky_elements as Record<string, unknown> | undefined;
  return isText(result.fortune_name, 200) && isText(result.message, 500) && isText(result.action_tip, 200) && typeof result.compatibility_note === "string"
    && !!mission && isText(mission.title, 200) && isText(mission.target_spot, 200) && spotNames.includes(mission.target_spot) && isText(mission.description, 500)
    && !!lucky && isText(lucky.color, 100) && isText(lucky.food, 100) && isText(lucky.spot, 200);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:omikuji`, 10, 60_000);
  if (limited) return limited;

  const ai = getGenAI();

  let body: OmikujiRequest;

  try {
    body = (await request.json()) as OmikujiRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (
    !isText(body.mood, MAX_SHORT_TEXT) ||
    !isText(body.goal, MAX_SHORT_TEXT) ||
    !isText(body.companion, MAX_SHORT_TEXT) ||
    (body.mbti !== undefined && !isText(body.mbti, MAX_SHORT_TEXT)) ||
    (body.partnerMood !== undefined && !isText(body.partnerMood, MAX_SHORT_TEXT)) ||
    (body.partnerGoal !== undefined && !isText(body.partnerGoal, MAX_SHORT_TEXT))
  ) {
    return errorResponse(
      "mood, goal, and companion are required strings. mbti/partnerMood/partnerGoal must be strings when provided.",
      400,
    );
  }

  const categoryPreferences: Record<string, string[]> = {
    "新しい発見": ["体験・ワークショップ", "マルシェ"],
    "おいしいもの": ["学生模擬店・フード＆ドリンク", "店舗出店・フード＆ドリンク"],
    "思い出づくり": ["体験・ワークショップ", "縁日・キッズゲーム", "マルシェ"],
    "盛り上がりたい": ["ステージ・パフォーマンス", "スポーツ・アクティビティ", "縁日・キッズゲーム"],
  };
  const preferredCategories = categoryPreferences[body.goal.trim()] ?? [];
  const preferredSpots = spots.filter((spot) => preferredCategories.includes(spot.category));
  const candidateSpots = (preferredSpots.length >= 5 ? preferredSpots : spots).slice(0, 10);

  const spotContext = candidateSpots
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
アルコールを飲むミッションは作らないでください。
lucky_elements.spot も上記企画名から選んでください。responseSchema に完全準拠する JSON のみを返してください。`;

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 700,
      groqMessages: [{ role: "user", content: `${prompt}\n次のキーを省略せず、JSONだけを返してください。{ "fortune_name":"", "message":"", "action_tip":"", "compatibility_note":"", "mission":{ "title":"", "target_spot":"", "description":"" }, "lucky_elements":{ "color":"", "food":"", "spot":"" } }` }],
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

    const result = JSON.parse(response.text) as unknown;
    if (!isValidOmikujiResult(result)) throw new Error("AI response did not match the omikuji result format.");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to generate omikuji:", error);
    return errorResponse("Failed to generate omikuji.", 502);
  }
}
