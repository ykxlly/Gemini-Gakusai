import { Modality } from "@google/genai";
import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import { parseSampleRate, pcmToWav } from "@/lib/audio";

type NarrateRequest = {
  text?: unknown;
};

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  const ai = getGenAI();

  if (!ai) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  }

  let body: NarrateRequest;

  try {
    body = (await request.json()) as NarrateRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isText(body.text)) {
    return NextResponse.json({ error: "text is a required string." }, { status: 400 });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: `明るく楽しいおみくじの巫女風ナレーションで読み上げてください: ${body.text.trim()}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
      },
    });

    const audioData = response.data;
    const part = response.candidates?.[0]?.content?.parts?.find((candidate) => candidate.inlineData);

    if (!audioData) {
      throw new Error("Gemini returned no audio data.");
    }

    const sampleRate = parseSampleRate(part?.inlineData?.mimeType);
    const wavBase64 = pcmToWav(audioData, sampleRate);

    return NextResponse.json({ audio: `data:audio/wav;base64,${wavBase64}` });
  } catch (error) {
    console.error("Failed to narrate omikuji result:", error);
    return NextResponse.json({ error: "Failed to generate narration audio." }, { status: 502 });
  }
}
