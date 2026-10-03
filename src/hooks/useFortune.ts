// S0→S1: 入力3問 + 任意ニックネーム + おみくじ授与（POST /api/omikuji）。
// 成功時は result を保持し、失敗時は公式データのフォールバックで継続する。
// 親は onDrawStart（授与開始時の他フック掃除）と onDrawn（履歴・遷移・演出）を受け持つ。
"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiPost } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { createFallbackResult, festivalSpots, type Result } from "@/lib/fortune";
import { withViewTransition } from "@/lib/view-transition";

export function useFortune(options: {
  previousSpot?: string;
  notify: (message: string) => void;
  onDrawStart: () => void;
  onDrawn: (result: Result, isFallback: boolean) => void;
}) {
  const [formStep, setFormStep] = useState(0);
  const [mood, setMood] = useState("");
  const [goal, setGoal] = useState("");
  const [companion, setCompanion] = useState("");
  const [nickname, setNickname] = useState("");
  const [mbti, setMbti] = useState("");
  const [partnerMood, setPartnerMood] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFallbackResult, setIsFallbackResult] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [isSuzuPulling, setIsSuzuPulling] = useState(false);
  const [rouletteSpot, setRouletteSpot] = useState(festivalSpots[0].name);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [selectionReaction, setSelectionReaction] = useState<{ message: string; motion: string; key: number } | null>(null);

  const reactionTimer = useRef<number | null>(null);
  // 連打ガード: state反映前の同一ティック連打をrefで同期的に遮断する。
  const inFlight = useRef(false);
  const timers = useRef<number[]>([]);
  // 最新コールバック・入力値をref経由で参照し、アクションの再生成を抑える。
  const callbacks = useRef(options);
  callbacks.current = options;

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      fn();
      timers.current = timers.current.filter((t) => t !== id);
    }, ms);
    timers.current.push(id);
  }, []);

  const canSubmit = Boolean(mood && goal && companion && !isLoading);
  const selectionCount = [mood, goal, companion].filter(Boolean).length;
  const mascotMessage =
    selectionReaction?.message ||
    (selectionCount === 3
      ? copy.top.mascotReady
      : selectionCount
        ? copy.top.mascotRemaining(3 - selectionCount)
        : copy.top.mascotIdle);

  const reactToSelection = useCallback(
    (message: string, motion: string) => {
      if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
      setSelectionReaction({ message, motion, key: Date.now() });
      reactionTimer.current = window.setTimeout(() => setSelectionReaction(null), 1100);
    },
    [],
  );

  const chooseAndAdvance = useCallback(
    (
      setter: (value: string) => void,
      value: string,
      message: string,
      motion: string,
      nextStep: number,
    ) => {
      setter(value);
      reactToSelection(message, motion);
      const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
      later(() => setFormStep(nextStep), delay);
    },
    [later, reactToSelection],
  );

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % copy.drawing.messages.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRouletteSpot("あなたに合う企画を選んでいます");
      return;
    }
    let index = Math.floor(Math.random() * festivalSpots.length);
    const timer = window.setInterval(() => {
      index = (index + 1 + Math.floor(Math.random() * 5)) % festivalSpots.length;
      setRouletteSpot(festivalSpots[index].name);
    }, 90);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(
    () => () => {
      if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  const requestFortune = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const { notify: tell, onDrawn: drawn, onDrawStart: start } = callbacks.current;
    const snapshot = {
      mood,
      goal,
      companion,
      nickname,
      mbti,
      partnerMood,
      previousSpot: callbacks.current.previousSpot,
    };
    setError("");
    setIsPunching(true);
    setIsSuzuPulling(true);
    later(() => setIsPunching(false), 380);
    later(() => setIsSuzuPulling(false), 760);
    setIsLoading(true);
    setIsFallbackResult(false);
    start();
    try {
      const [data] = await Promise.all([
        apiPost<Result>("/api/omikuji", {
          mood: snapshot.mood,
          goal: snapshot.goal,
          companion: snapshot.companion,
          nickname: snapshot.nickname || undefined,
          mbti: snapshot.mbti || undefined,
          partnerMood: snapshot.partnerMood || undefined,
        }, { timeoutMs: 30_000, errorMessage: copy.result.error }),
        new Promise((resolve) => window.setTimeout(resolve, 1400)),
      ]);
      setRouletteSpot(data.recommendation.spot);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 620));
      }
      withViewTransition(() => setResult(data));
      drawn(data, false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      const fallback = createFallbackResult(
        snapshot.mood,
        snapshot.goal,
        snapshot.companion,
        snapshot.nickname,
        snapshot.previousSpot,
      );
      setRouletteSpot(fallback.recommendation.spot);
      setIsFallbackResult(true);
      withViewTransition(() => setResult(fallback));
      tell(copy.result.fallbackToast);
      console.warn("Using local festival fallback:", requestError);
      drawn(fallback, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, [later, mood, goal, companion, nickname, mbti, partnerMood]);

  const draw = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await requestFortune();
    },
    [requestFortune],
  );

  const resetFortune = useCallback(() => {
    setResult(null);
    setError("");
    setFormStep(0);
    setIsFallbackResult(false);
  }, []);

  return useMemo(
    () => ({
      formStep, setFormStep,
      mood, setMood, goal, setGoal, companion, setCompanion,
      nickname, setNickname,
      mbti, setMbti, partnerMood, setPartnerMood,
      result, setResult, isLoading, error, isFallbackResult,
      isPunching, isSuzuPulling, rouletteSpot, loadingMessageIndex,
      selectionReaction, selectionCount, mascotMessage, canSubmit,
      reactToSelection, chooseAndAdvance,
      requestFortune, draw, resetFortune,
    }),
    [
      formStep, mood, goal, companion, nickname, mbti, partnerMood,
      result, isLoading, error, isFallbackResult,
      isPunching, isSuzuPulling, rouletteSpot, loadingMessageIndex,
      selectionReaction, selectionCount, mascotMessage, canSubmit,
      reactToSelection, chooseAndAdvance, requestFortune, draw, resetFortune,
    ],
  );
}
