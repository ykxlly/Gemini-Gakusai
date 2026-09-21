import { GoogleGenAI } from "@google/genai";

type GeminiRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

type FallbackRequest = {
  gemini: GoogleGenAI | null;
  geminiRequest: GeminiRequest;
  groqMessages: GroqMessage[];
  json?: boolean;
  maxOutputTokens?: number;
};

export type AIProvider = "gemini" | "groq";

function statusOf(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number" ? error.status : undefined;
}

export function isRecoverableAIError(error: unknown) {
  const status = statusOf(error);
  return status === 429 || status === 503 || error instanceof TypeError || (error instanceof Error && /timeout|network|fetch/i.test(error.message));
}

async function generateWithGroq(messages: GroqMessage[], json: boolean, maxOutputTokens: number) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      messages,
      temperature: 0.7,
      max_completion_tokens: maxOutputTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(9_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Groq request failed (${response.status}): ${detail.slice(0, 300)}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Groq returned an empty response.");
  return text;
}

/** Uses Gemini first, then Groq only for temporary capacity or network failures. */
export async function generateWithAIFallback({ gemini, geminiRequest, groqMessages, json = false, maxOutputTokens = 300 }: FallbackRequest) {
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        ...geminiRequest,
        config: { ...geminiRequest.config, maxOutputTokens },
      });
      if (!response.text) throw new Error("Gemini returned an empty response.");
      return { text: response.text, provider: "gemini" as const };
    } catch (error) {
      if (!isRecoverableAIError(error)) throw error;
      console.warn("Gemini unavailable; trying Groq fallback.", { status: statusOf(error) });
    }
  }

  const text = await generateWithGroq(groqMessages, json, maxOutputTokens);
  return { text, provider: "groq" as const };
}

export function groqImageMessage(prompt: string, base64: string, mimeType: string): GroqMessage {
  return {
    role: "user",
    content: [
      { type: "text", text: prompt },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
    ],
  };
}
