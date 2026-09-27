type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();

let lastPrune = Date.now();
const PRUNE_INTERVAL_MS = 60_000;

function pruneExpired() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
}

export function rateLimit(
  ip: string,
  limit: number,
  windowMs: number,
): Response | null {
  pruneExpired();

  const now = Date.now();
  const entry = windows.get(ip);

  if (!entry || entry.resetAt <= now) {
    windows.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;

  if (entry.count > limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({
        error: "リクエスト回数の上限に達しました。しばらく待ってからお試しください。",
        code: "RATE_LIMITED",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  return null;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
