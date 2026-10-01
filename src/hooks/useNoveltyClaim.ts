// S3: ノベルティ交換（POST /api/novelty/claim）。
// sticker=1件以上 / tote=3件以上。成功時は claimedNovelties/latestClaim を更新する。
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { apiPost } from "@/lib/api-client";
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
  const { setClaimedNovelties, setLatestClaim, notify } = options;
  const [staffKey, setStaffKey] = useState("");
  const [claimError, setClaimError] = useState("");
  const [isClaiming, setIsClaiming] = useState<NoveltyKind | null>(null);

  const claimingRef = useRef(false);
  const keyRef = useRef(staffKey);
  keyRef.current = staffKey;
  const live = useRef(options);
  live.current = options;

  const claimNovelty = useCallback(
    async (kind: NoveltyKind) => {
      const { visitorId, discoveryCount, claimedNovelties } = live.current;
      const requiredCards = kind === "sticker" ? 1 : 3;
      if (
        claimingRef.current ||
        discoveryCount < requiredCards ||
        claimedNovelties.includes(kind) ||
        !visitorId
      ) {
        return;
      }
      claimingRef.current = true;
      setClaimError("");
      setIsClaiming(kind);
      try {
        await apiPost<{ success: boolean }>(
          "/api/novelty/claim",
          {
            visitorId,
            noveltyKind: kind,
            discoveryCount,
            staffKey: keyRef.current,
          },
          { timeoutMs: 15_000, errorMessage: "交換記録を保存できませんでした。" },
        );
        setClaimedNovelties((current) => [...current, kind]);
        setLatestClaim(kind);
        setStaffKey("");
        notify(kind === "sticker" ? copy.reward.stickerRecorded : copy.reward.toteRecorded);
      } catch (error) {
        setClaimError(error instanceof Error ? error.message : "交換記録を保存できませんでした。");
      } finally {
        claimingRef.current = false;
        setIsClaiming(null);
      }
    },
    [setClaimedNovelties, setLatestClaim, notify],
  );

  return useMemo(
    () => ({ staffKey, setStaffKey, claimError, isClaiming, claimNovelty }),
    [staffKey, claimError, isClaiming, claimNovelty],
  );
}
