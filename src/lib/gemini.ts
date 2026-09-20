import { GoogleGenAI } from "@google/genai";

type GenerateContentRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

function isServiceUnavailable(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 503;
}

export async function generateContentWithFallback(ai: GoogleGenAI, request: GenerateContentRequest) {
  try {
    return await ai.models.generateContent(request);
  } catch (error) {
    if (!isServiceUnavailable(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return ai.models.generateContent({ ...request, model: "gemini-3.5-flash" });
  }
}

// Returns null when the API key is missing so routes can respond with a clear 500 instead of throwing.
export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}
