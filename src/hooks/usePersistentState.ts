// 永続化層。キー名は現行維持（移行不要にするため変更禁止）。
// omikuji-history(10件) のみ。破損データはキー単位で破棄する。
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

export function usePersistentState() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(asHistory(readKey("omikuji-history")));
  }, []);

  const appendHistory = useCallback((entry: HistoryEntry) => {
    setHistory((previous) => {
      const next = [...previous, entry].slice(-10);
      writeKey("omikuji-history", next);
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      history,
      appendHistory,
    }),
    [history, appendHistory],
  );
}
