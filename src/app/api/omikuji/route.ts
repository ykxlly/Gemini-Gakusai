import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateWithAIFallback } from "@/lib/ai-fallback";
import { getGenAI } from "@/lib/gemini";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_SHORT_TEXT } from "@/lib/validation";
import { getSpotByName, pickFortune, pickRecommendedSpots } from "@/lib/fortune";

type OmikujiRequest = {
  mood?: unknown;
  goal?: unknown;
  companion?: unknown;
  nickname?: unknown;
  mbti?: unknown;
  partnerMood?: unknown;
};

// 出力は「文章」だけ担当。spot はサーバー側で重み付きランダム選択済みの値のみ許可し、
// AIが別の企画名を返した場合はサーバー側の選択で上書きする。
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    message: {
      type: Type.STRING,
      description: "来場者へのポジティブなエンタメメッセージ。80〜120文字。気分・目的・同行者（とニックネームがあればそれ）に必ず触れる。",
    },
    compatibility_note: {
      type: Type.STRING,
      description: "partner_moodが指定されている場合のみ、二人の相性についてのポジティブな一言(40〜70文字)。指定がない場合は空文字。",
    },
    recommendation: {
      type: Type.OBJECT,
      properties: {
        spot: { type: Type.STRING, description: "サーバーが指定したおすすめ企画名。変更しない" },
        reason: { type: Type.STRING, description: "おすすめの理由。60〜100文字。気分・目的・同行者（とニックネーム）の入力内容を必ず引用する。" },
      },
      required: ["spot", "reason"],
    },
    alternatives: {
      type: Type.ARRAY,
      description: "サーバーが指定した2つの代案企画。順序も変更しない",
      items: {
        type: Type.OBJECT,
        properties: {
          spot: { type: Type.STRING, description: "サーバーが指定した代案企画名。変更しない" },
          reason: { type: Type.STRING, description: "代案の理由。30文字以内。" },
        },
        required: ["spot", "reason"],
      },
    },
    lucky_elements: {
      type: Type.OBJECT,
      properties: {
        color: { type: Type.STRING, description: "今日のラッキーカラー（短い日本語表現）" },
        food: { type: Type.STRING, description: "今日のラッキーフード（短い日本語表現）" },
      },
      required: ["color", "food"],
    },
  },
  required: ["message", "compatibility_note", "recommendation", "alternatives", "lucky_elements"],
} as const;

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
    (body.nickname !== undefined && !isText(body.nickname, MAX_SHORT_TEXT)) ||
    (body.mbti !== undefined && !isText(body.mbti, MAX_SHORT_TEXT)) ||
    (body.partnerMood !== undefined && !isText(body.partnerMood, MAX_SHORT_TEXT))
  ) {
    return errorResponse(
      "mood, goal, and companion are required strings. nickname/mbti/partnerMood must be strings when provided.",
      400,
    );
  }

  // サーバー側で重み付きランダム選択: 同じ入力でも毎回違う場所になり、全企画が候補になる。
  const fortune = pickFortune();
  const { recommendation, alternatives } = pickRecommendedSpots(
    body.mood.trim(),
    body.goal.trim(),
    body.companion.trim(),
  );
  const recommendationSpotName = recommendation.name;
  const alternativeSpots = alternatives.map((spot) => getSpotByName(spot.name)).filter((spot) => !!spot);

  const spotBrief = (spotName: string) => {
    const spot = getSpotByName(spotName);
    if (!spot) return spotName;
    const details = [spot.schedule && `時間: ${spot.schedule}`, spot.price && `料金: ${spot.price}`, spot.notice && `注意: ${spot.notice}`].filter(Boolean).join(" / ");
    return `${spot.name}（場所: ${spot.location} / 分類: ${spot.category} / 内容: ${spot.vibe}${details ? ` / 条件: ${details}` : ""}）`;
  };

  const nickname = body.nickname?.trim() || "";
  const call = nickname ? `${nickname}さん` : "あなた";

  const prompt = `あなたは学園祭の「超パーソナルAIおみくじ」です。
これは心理分析や診断ではなく、学園祭を楽しむための明るいエンタメおみくじです。断定的な心理評価、医療的助言、不適切・攻撃的・差別的な表現は絶対に禁止します。

来場者情報:
- ニックネーム: ${nickname || "未入力（「あなた」と呼ぶ）"}
- 気分: ${body.mood.trim()}
- 目的: ${body.goal.trim()}
- 同行者: ${body.companion.trim()}
- MBTI: ${body.mbti?.trim() || "未回答"}
- 同行者の気分: ${body.partnerMood?.trim() || "未回答"}

本日の運勢（固定・変更禁止）:
- 運勢名: ${fortune.name}
- 運勢の一言: ${fortune.line}

おすすめ企画（サーバー選択済み・変更禁止）:
- recommendation.spot は「${recommendationSpotName}」のままにしてください: ${spotBrief(recommendationSpotName)}
- alternatives は順番どおり「${alternativeSpots.map((spot) => spot?.name).join("」「")}」のままにしてください: ${alternativeSpots.map((spot) => spotBrief(spot?.name || "")).join("\n  ")}

指示:
- messageは80〜120文字。${call}の「${body.mood.trim()}」という気分と「${body.goal.trim()}」という目的、${companionBrief(body.companion.trim())}に必ず触れ、運勢「${fortune.name}」に合わせた明るい内容にしてください。
- recommendation.reasonは60〜100文字。${call}の入力（気分・目的・同行者${nickname ? "・ニックネーム" : ""}）を必ず引用した上で、上記企画の情報だけを使って理由を書いてください。
- alternativesの各reasonは30文字以内の短い一言。
- partnerMoodが未回答なら compatibility_note は空文字。ある場合は二人の相性の良さを40〜70文字で。
- 存在しない企画、場所、商品、特典、開催時刻を作らないでください。上記にない企画名・場所名は絶対に書かないでください。
- lucky_elements.color と lucky_elements.food は短い日本語で自由に作ってください。
- responseSchema に完全準拠する JSON のみを返してください。`;

  function companionBrief(value: string) {
    return value === "ひとり" ? "ひとりで巡るシチュエーション" : `「${value}」とのシチュエーション`;
  }

  try {
    const response = await generateWithAIFallback({
      gemini: ai,
      maxOutputTokens: 700,
      groqMessages: [{ role: "user", content: `${prompt}\n次のキーを省略せず、JSONだけを返してください。{ "message":"", "compatibility_note":"", "recommendation":{ "spot":"${recommendation.name}", "reason":"" }, "alternatives":[{ "spot":"${alternativeSpots[0]?.name || ""}", "reason":"" },{ "spot":"${alternativeSpots[1]?.name || ""}", "reason":"" }], "lucky_elements":{ "color":"", "food":"" } }` }],
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
    const rawRecommendation = parsed.recommendation as Record<string, unknown> | undefined;
    const rawAlternatives = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
    const rawLucky = parsed.lucky_elements as Record<string, unknown> | undefined;
    const result = {
      fortune_name: fortune.name,
      fortune_tier: fortune.tier,
      fortune_line: fortune.line,
      message: isText(parsed.message, 500) ? parsed.message : "",
      compatibility_note: typeof parsed.compatibility_note === "string" ? parsed.compatibility_note : "",
      recommendation: {
        spot: recommendation.name,
        reason: rawRecommendation && isText(rawRecommendation.reason, 300) ? rawRecommendation.reason : `気分・目的・同行者に合わせて選びました。${recommendation.vibe}。`,
      },
      alternatives: alternativeSpots.map((spot, index) => {
        const raw = rawAlternatives[index] as Record<string, unknown> | undefined;
        return {
          spot: spot?.name || alternatives[index].name,
          reason: raw && isText(raw.reason, 120) ? raw.reason : `${spot?.category || "企画"}で気分転換に。`,
        };
      }),
      lucky_elements: {
        color: rawLucky && isText(rawLucky.color, 100) ? rawLucky.color : "きらめく黄色",
        food: rawLucky && isText(rawLucky.food, 100) ? rawLucky.food : "会場で気になった一品",
      },
    };
    if (!result.message) throw new Error("AI response did not match the omikuji result format.");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to generate omikuji:", error);
    return errorResponse("Failed to generate omikuji.", 502);
  }
}
