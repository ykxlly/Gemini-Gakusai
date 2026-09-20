import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithFallback, getGenAI } from "@/lib/gemini";

type RiddleRequest = {
  riddle?: unknown;
  expectedAnswer?: unknown;
  userAnswer?: unknown;
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    correct: { type: Type.BOOLEAN, description: "回答が想定解答と意味的に一致していれば true" },
    feedback: { type: Type.STRING, description: "来場者への短くポジティブな一言(30〜60文字)" },
  },
  required: ["correct", "feedback"],
} as const;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const ai = getGenAI();

  if (!ai) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  let body: RiddleRequest;

  try {
    body = (await request.json()) as RiddleRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isText(body.riddle) || !isText(body.expectedAnswer) || !isText(body.userAnswer)) {
    return NextResponse.json({ error: "riddle, expectedAnswer, and userAnswer are required strings." }, { status: 400 });
  }

  const prompt = `なぞなぞ「${body.riddle.trim()}」の想定解答は「${body.expectedAnswer.trim()}」です。
来場者の回答「${body.userAnswer.trim()}」が、表記ゆれ・同義語・多少のタイプミスを許容して意味的に正解と言えるか判定してください。
判定は甘めで構いません。不正解でも来場者を励ますような前向きな feedback にしてください。`;

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
    console.error("Failed to check riddle answer:", error);
    return NextResponse.json({ error: "Failed to check the answer." }, { status: 502 });
  }
}
