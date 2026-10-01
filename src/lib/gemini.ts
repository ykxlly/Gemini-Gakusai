import { GoogleGenAI } from "@google/genai";

// Returns null when the API key is missing so routes can respond with a clear 500 instead of throwing.
export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}
