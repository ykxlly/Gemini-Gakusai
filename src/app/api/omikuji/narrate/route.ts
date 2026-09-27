import { Modality } from "@google/genai";
import { NextResponse } from "next/server";
import { getGenAI } from "@/lib/gemini";
import { parseSampleRate, pcmToWav } from "@/lib/audio";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_MEDIUM_TEXT } from "@/lib/validation";

type NarrateRequest = {
  text?: unknown;
};

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:narrate`, 5, 60_000);
  if (limited) return limited;

  const ai = getGenAI();

  if (!ai) {
    return errorResponse("GEMINI_API_KEY is not configured.", 500);
  }

  let body: NarrateRequest;

  try {
    body = (await request.json()) as NarrateRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isText(body.text, MAX_MEDIUM_TEXT)) {
    return errorResponse("text is a required string within limits.", 400);
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
    return errorResponse("Failed to generate narration audio.", 502);
  }
}
