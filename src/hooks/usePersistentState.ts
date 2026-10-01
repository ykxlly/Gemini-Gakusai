// 永続化層。キー名は現行維持（移行不要にするため変更禁止）。
// omikuji-visitor-id / omikuji-history(10件) / omikuji-discovery-cards(24件)
// omikuji-novelty-claims / omikuji-latest-novelty-claim / ?booth=novelty 判定
// 破損データはキー単位で破棄し、他キーの復元を妨げない。
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DiscoveryCard, NoveltyKind } from "@/lib/fortune";

export type HistoryEntry = { fortune_name: string; message: string };

function readKey(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeKey(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

function asHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as HistoryEntry).fortune_name === "string" &&
        typeof (entry as HistoryEntry).message === "string",
    )
    .slice(-10);
}

function asDiscoveryCards(value: unknown): DiscoveryCard[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is DiscoveryCard =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as DiscoveryCard).spot === "string" &&
        typeof (entry as DiscoveryCard).title === "string" &&
        typeof (entry as DiscoveryCard).message === "string",
    )
    .slice(-24);
}

function asClaimedNovelties(value: unknown): NoveltyKind[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is NoveltyKind => entry === "sticker" || entry === "tote");
}

export function usePersistentState() {
  const [visitorId, setVisitorId] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [discoveryCards, setDiscoveryCards] = useState<DiscoveryCard[]>([]);
  const [claimedNovelties, setClaimedNovelties] = useState<NoveltyKind[]>([]);
  const [latestClaim, setLatestClaim] = useState<NoveltyKind | null>(null);
  const [isBoothMode, setIsBoothMode] = useState(false);

  useEffect(() => {
    setIsBoothMode(new URLSearchParams(window.location.search).get("booth") === "novelty");
    try {
      const storedVisitorId = window.localStorage.getItem("omikuji-visitor-id");
      const nextVisitorId =
        storedVisitorId && storedVisitorId.trim()
          ? storedVisitorId
          : window.crypto.randomUUID
            ? window.crypto.randomUUID()
            : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!storedVisitorId) writeKey("omikuji-visitor-id", nextVisitorId);
      setVisitorId(nextVisitorId);
    } catch {
      setVisitorId(`visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
    setHistory(asHistory(readKey("omikuji-history")));
    setDiscoveryCards(asDiscoveryCards(readKey("omikuji-discovery-cards")));
    setClaimedNovelties(asClaimedNovelties(readKey("omikuji-novelty-claims")));
    const storedLatest = readKey("omikuji-latest-novelty-claim");
    setLatestClaim(storedLatest === "sticker" || storedLatest === "tote" ? storedLatest : null);
  }, []);

  useEffect(() => {
    writeKey("omikuji-discovery-cards", discoveryCards.slice(-24));
  }, [discoveryCards]);

  useEffect(() => {
    writeKey("omikuji-novelty-claims", claimedNovelties);
    if (latestClaim) writeKey("omikuji-latest-novelty-claim", latestClaim);
  }, [claimedNovelties, latestClaim]);

  const appendHistory = useCallback((entry: HistoryEntry) => {
    setHistory((previous) => {
      const next = [...previous, entry].slice(-10);
      writeKey("omikuji-history", next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
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
    }),
    [visitorId, history, appendHistory, discoveryCards, claimedNovelties, latestClaim, isBoothMode],
  );
}
