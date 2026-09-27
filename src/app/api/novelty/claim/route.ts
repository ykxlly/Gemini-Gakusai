import { NextResponse } from "next/server";

type NoveltyKind = "sticker" | "tote";
type ClaimRequest = {
  visitorId?: unknown;
  noveltyKind?: unknown;
  discoveryCount?: unknown;
  staffKey?: unknown;
};

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNoveltyKind(value: unknown): value is NoveltyKind {
  return value === "sticker" || value === "tote";
}

function isSupabaseConfigured() {
  return isText(process.env.SUPABASE_URL) && isText(process.env.SUPABASE_SERVICE_ROLE_KEY) && isText(process.env.NOVELTY_STAFF_KEY);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "ノベルティ交換のサーバー設定が未完了です。" }, { status: 503 });
  }

  let body: ClaimRequest;
  try {
    body = (await request.json()) as ClaimRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const visitorId = isText(body.visitorId) ? body.visitorId.trim() : "";
  const noveltyKind = body.noveltyKind;
  const discoveryCount = typeof body.discoveryCount === "number" ? body.discoveryCount : -1;
  const staffKey = isText(body.staffKey) ? body.staffKey.trim() : "";
  const requiredCount = noveltyKind === "sticker" ? 1 : 3;

  if (!visitorId || !isNoveltyKind(noveltyKind) || !Number.isInteger(discoveryCount) || discoveryCount < requiredCount) {
    return NextResponse.json({ error: "交換条件を満たしていません。" }, { status: 400 });
  }
  if (staffKey !== process.env.NOVELTY_STAFF_KEY) {
    return NextResponse.json({ error: "スタッフ確認キーが正しくありません。" }, { status: 403 });
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
      return NextResponse.json({ error: "このノベルティは交換済みです。" }, { status: 409 });
    }

    const insert = await fetch(`${supabaseUrl}/rest/v1/novelty_claims`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ visitor_id: visitorId, novelty_kind: noveltyKind, discovery_count: discoveryCount }),
    });
    if (insert.status === 409) return NextResponse.json({ error: "このノベルティは交換済みです。" }, { status: 409 });
    if (!insert.ok) throw new Error(`Supabase insert failed with ${insert.status}`);

    return NextResponse.json({ success: true, noveltyKind });
  } catch (error) {
    console.error("Failed to record novelty claim:", error);
    return NextResponse.json({ error: "交換記録を保存できませんでした。通信状況を確認してください。" }, { status: 502 });
  }
}
