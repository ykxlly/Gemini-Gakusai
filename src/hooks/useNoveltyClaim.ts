// S3: ノベルティ交換（POST /api/novelty/claim）。
// sticker=1件以上 / tote=3件以上。成功時は claimedNovelties/latestClaim を更新する。
"use client";

import { useState } from "react";
import { copy } from "@/lib/copy";
import type { NoveltyKind } from "@/lib/fortune";

export function useNoveltyClaim(options: {
  visitorId: string;
  discoveryCount: number;
  claimedNovelties: NoveltyKind[];
  setClaimedNovelties: React.Dispatch<React.SetStateAction<NoveltyKind[]>>;
  setLatestClaim: (kind: NoveltyKind) => void;
  notify: (message: string) => void;
}) {
  const { visitorId, discoveryCount, claimedNovelties, setClaimedNovelties, setLatestClaim, notify } = options;
  const [staffKey, setStaffKey] = useState("");
  const [claimError, setClaimError] = useState("");
  const [isClaiming, setIsClaiming] = useState<NoveltyKind | null>(null);

  async function claimNovelty(kind: NoveltyKind) {
    const requiredCards = kind === "sticker" ? 1 : 3;
    if (discoveryCount < requiredCards || claimedNovelties.includes(kind) || !visitorId || isClaiming) return;
    setClaimError("");
    setIsClaiming(kind);
    try {
      const response = await fetch("/api/novelty/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, noveltyKind: kind, discoveryCount, staffKey }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "交換記録を保存できませんでした。");
      setClaimedNovelties((current) => [...current, kind]);
      setLatestClaim(kind);
      setStaffKey("");
      notify(kind === "sticker" ? copy.reward.stickerRecorded : copy.reward.toteRecorded);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "交換記録を保存できませんでした。");
    } finally {
      setIsClaiming(null);
    }
  }

  return { staffKey, setStaffKey, claimError, isClaiming, claimNovelty };
}
