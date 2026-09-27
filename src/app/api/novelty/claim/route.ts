import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { errorResponse, isText, MAX_SHORT_TEXT } from "@/lib/validation";

type NoveltyKind = "sticker" | "tote";
type ClaimRequest = {
  visitorId?: unknown;
  noveltyKind?: unknown;
  discoveryCount?: unknown;
  staffKey?: unknown;
};

function isNoveltyKind(value: unknown): value is NoveltyKind {
  return value === "sticker" || value === "tote";
}

function isSupabaseConfigured() {
  return isText(process.env.SUPABASE_URL, 500) && isText(process.env.SUPABASE_SERVICE_ROLE_KEY, 500) && isText(process.env.NOVELTY_STAFF_KEY, 500);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`${ip}:claim`, 5, 60_000);
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return errorResponse("ノベルティ交換のサーバー設定が未完了です。", 503);
  }

  let body: ClaimRequest;
  try {
    body = (await request.json()) as ClaimRequest;
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const visitorId = isText(body.visitorId, MAX_SHORT_TEXT) ? body.visitorId.trim() : "";
  const noveltyKind = body.noveltyKind;
  const discoveryCount = typeof body.discoveryCount === "number" ? body.discoveryCount : -1;
  const staffKey = isText(body.staffKey, MAX_SHORT_TEXT) ? body.staffKey.trim() : "";
  const requiredCount = noveltyKind === "sticker" ? 1 : 3;

  if (!visitorId || !isNoveltyKind(noveltyKind) || !Number.isInteger(discoveryCount) || discoveryCount < requiredCount) {
    return errorResponse("交換条件を満たしていません。", 400);
  }

  const expectedKey = process.env.NOVELTY_STAFF_KEY as string;
  const keyMatches = staffKey.length === expectedKey.length
    && timingSafeEqual(Buffer.from(staffKey), Buffer.from(expectedKey));

  if (!keyMatches) {
    return errorResponse("スタッフ確認キーが正しくありません。", 403);
  }

  const supabaseUrl = process.env.SUPABASE_URL as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  const query = `${supabaseUrl}/rest/v1/novelty_claims?visitor_id=eq.${encodeURIComponent(visitorId)}&novelty_kind=eq.${noveltyKind}&select=id`;

  try {
    const existing = await fetch(query, { headers, cache: "no-store" });
    if (!existing.ok) throw new Error(`Supabase lookup failed with ${existing.status}`);
    const existingClaims = (await existing.json()) as { id: string }[];
    if (existingClaims.length > 0) {
      return errorResponse("このノベルティは交換済みです。", 409);
    }

    const insert = await fetch(`${supabaseUrl}/rest/v1/novelty_claims`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ visitor_id: visitorId, novelty_kind: noveltyKind, discovery_count: discoveryCount }),
    });
    if (insert.status === 409) return errorResponse("このノベルティは交換済みです。", 409);
    if (!insert.ok) throw new Error(`Supabase insert failed with ${insert.status}`);

    return NextResponse.json({ success: true, noveltyKind });
  } catch (error) {
    console.error("Failed to record novelty claim:", error);
    return errorResponse("交換記録を保存できませんでした。通信状況を確認してください。", 502);
  }
}
