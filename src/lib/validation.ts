export const MAX_SHORT_TEXT = 100;
export const MAX_MEDIUM_TEXT = 500;
export const MAX_LONG_TEXT = 1000;
export const MAX_CHAT_HISTORY = 6;
export const MAX_SUMMARY_FORTUNES = 5;

export function isText(value: unknown, maxLength = MAX_SHORT_TEXT): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function errorResponse(
  message: string,
  status: number,
  code?: string,
): Response {
  return new Response(
    JSON.stringify({ error: message, ...(code ? { code } : {}) }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}
