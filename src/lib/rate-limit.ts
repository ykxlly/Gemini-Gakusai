// Best-effort per-instance in-memory rate limiter.
// NOTE: Vercel serverless runs multiple isolated instances, so this Map is NOT
// shared across instances/regions. It still blocks naive rapid-fire abuse from a
// single instance, but a strict global limit requires an external store.
// Migration path: replace this module with Upstash Redis (@upstash/redis +
// @upstash/ratelimit, sliding-window per key, e.g. `omikuji:{ip}`) and keep the
// same `rateLimit(ip, limit, windowMs)` signature. See docs/step3-completion.md.
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
