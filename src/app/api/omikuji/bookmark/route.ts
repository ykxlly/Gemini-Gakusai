import { Type } from "@google/genai";
import { NextResponse } from "next/server";
import { generateContentWithFallback, getGenAI } from "@/lib/gemini";

type Memory = { caption: string; spot: string; area: string };
type BookmarkRequest = { fortuneName?: unknown; memories?: unknown };

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "しおりの短いタイトル(10〜22文字)" },
    closing_comment: { type: Type.STRING, description: "一日を結ぶ温かい一言(45〜80文字)" },
  },
  required: ["title", "closing_comment"],
} as const;

function isValidMemories(value: unknown): value is Memory[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 3 && value.every((memory) =>
    memory && typeof memory === "object" && typeof memory.caption === "string" && typeof memory.spot === "string" && typeof memory.area === "string",
  );
}

export async function POST(request: Request) {
  const ai = getGenAI();
  if (!ai) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });

  let body: BookmarkRequest;
  try {
    body = (await request.json()) as BookmarkRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.fortuneName !== "string" || !isValidMemories(body.memories)) {
    return NextResponse.json({ error: "fortuneName and 1 to 3 memories are required." }, { status: 400 });
  }

  const memoryText = body.memories.map((memory, index) => `${index + 1}. ${memory.spot}（${memory.area}）: ${memory.caption}`).join("\n");
  const prompt = `学園祭での写真の発見をまとめた「今日の寄り道しおり」を作ります。
運勢: ${body.fortuneName.trim()}
発見:
${memoryText}

titleにはしおりのタイトル、closing_commentには思い出を優しく結ぶ日本語の一言を書いてください。心理診断や断定はしないでください。`;

  try {
    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema },
    });
    if (!response.text) throw new Error("Gemini returned an empty response.");
    return NextResponse.json(JSON.parse(response.text));
  } catch (error) {
    console.error("Failed to create memory bookmark:", error);
    return NextResponse.json({ error: "Failed to create memory bookmark." }, { status: 502 });
  }
}
