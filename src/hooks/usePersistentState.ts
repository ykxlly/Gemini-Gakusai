// 永続化層。キー名は現行維持（移行不要にするため変更禁止）。
// omikuji-visitor-id / omikuji-history(10件) / omikuji-discovery-cards(24件)
// omikuji-novelty-claims / omikuji-latest-novelty-claim / ?booth=novelty 判定
"use client";

import { useEffect, useState } from "react";
import type { DiscoveryCard, NoveltyKind } from "@/lib/fortune";

export type HistoryEntry = { fortune_name: string; message: string };

export function usePersistentState() {
  const [visitorId, setVisitorId] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [discoveryCards, setDiscoveryCards] = useState<DiscoveryCard[]>([]);
  const [claimedNovelties, setClaimedNovelties] = useState<NoveltyKind[]>([]);
  const [latestClaim, setLatestClaim] = useState<NoveltyKind | null>(null);
  const [isBoothMode, setIsBoothMode] = useState(false);

  useEffect(() => {
    try {
      setIsBoothMode(new URLSearchParams(window.location.search).get("booth") === "novelty");
      const storedVisitorId = window.localStorage.getItem("omikuji-visitor-id");
      const nextVisitorId =
        storedVisitorId ||
        (window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (!storedVisitorId) window.localStorage.setItem("omikuji-visitor-id", nextVisitorId);
      setVisitorId(nextVisitorId);
      const stored = window.localStorage.getItem("omikuji-history");
      if (stored) setHistory(JSON.parse(stored));
      const storedCards = window.localStorage.getItem("omikuji-discovery-cards");
      if (storedCards) setDiscoveryCards(JSON.parse(storedCards));
      const storedClaims = window.localStorage.getItem("omikuji-novelty-claims");
      if (storedClaims) setClaimedNovelties(JSON.parse(storedClaims));
      const storedLatestClaim = window.localStorage.getItem("omikuji-latest-novelty-claim");
      if (storedLatestClaim === "sticker" || storedLatestClaim === "tote") setLatestClaim(storedLatestClaim);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("omikuji-discovery-cards", JSON.stringify(discoveryCards.slice(-24)));
    } catch {
      /* ignore storage errors */
    }
  }, [discoveryCards]);

  useEffect(() => {
    try {
      window.localStorage.setItem("omikuji-novelty-claims", JSON.stringify(claimedNovelties));
      if (latestClaim) window.localStorage.setItem("omikuji-latest-novelty-claim", latestClaim);
    } catch {
      /* ignore storage errors */
    }
  }, [claimedNovelties, latestClaim]);

  function appendHistory(entry: HistoryEntry) {
    setHistory((previous) => {
      const next = [...previous, entry].slice(-10);
      try {
        window.localStorage.setItem("omikuji-history", JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }

  return {
    visitorId,
    history,
    appendHistory,
    discoveryCards,
    setDiscoveryCards,
    claimedNovelties,
    setClaimedNovelties,
    latestClaim,
    setLatestClaim,
    isBoothMode,
  };
}
