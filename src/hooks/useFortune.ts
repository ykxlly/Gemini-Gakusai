// S0→S1: 入力3問 + おみくじ授与（POST /api/omikuji）。
// 成功時は result を保持し、失敗時は公式データのフォールバックで継続する。
// 親は onDrawn(result, isFallback) で履歴追加・画面遷移・演出を行う。
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { createFallbackResult, festivalSpots, type Result } from "@/lib/fortune";
import { withViewTransition } from "@/lib/view-transition";

export function useFortune(options: {
  previousSpot?: string;
  notify: (message: string) => void;
  onDrawn: (result: Result, isFallback: boolean) => void;
}) {
  const { notify, onDrawn } = options;
  const [formStep, setFormStep] = useState(0);
  const [mood, setMood] = useState("");
  const [goal, setGoal] = useState("");
  const [companion, setCompanion] = useState("");
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
  // onDrawn/notify を ref 経由で参照し、再生成なしで最新コールバックを使う。
  const callbacks = useRef({ notify, onDrawn });
  callbacks.current = { notify, onDrawn };
  const previousSpotRef = useRef(options.previousSpot);
  previousSpotRef.current = options.previousSpot;

  const canSubmit = Boolean(mood && goal && companion && !isLoading);
  const selectionCount = [mood, goal, companion].filter(Boolean).length;
  const mascotMessage =
    selectionReaction?.message ||
    (selectionCount === 3
      ? copy.top.mascotReady
      : selectionCount
        ? copy.top.mascotRemaining(3 - selectionCount)
        : copy.top.mascotIdle);

  function reactToSelection(message: string, motion: string) {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setSelectionReaction({ message, motion, key: Date.now() });
    reactionTimer.current = window.setTimeout(() => setSelectionReaction(null), 1100);
  }

  function chooseAndAdvance(
    setter: (value: string) => void,
    value: string,
    message: string,
    motion: string,
    nextStep: number,
  ) {
    setter(value);
    reactToSelection(message, motion);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
    window.setTimeout(() => setFormStep(nextStep), delay);
  }

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
    },
    [],
  );

  async function requestFortune() {
    const { notify: tell, onDrawn: drawn } = callbacks.current;
    const previousSpot = previousSpotRef.current;
    setError("");
    setIsPunching(true);
    setIsSuzuPulling(true);
    window.setTimeout(() => setIsPunching(false), 380);
    window.setTimeout(() => setIsSuzuPulling(false), 760);
    setIsLoading(true);
    setIsFallbackResult(false);
    try {
      const [response] = await Promise.all([
        fetch("/api/omikuji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mood,
            goal,
            companion,
            mbti: mbti || undefined,
            partnerMood: partnerMood || undefined,
          }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1400)),
      ]);
      if (!response.ok) throw new Error(copy.result.error);
      const data = (await response.json()) as Result;
      setRouletteSpot(data.mission.target_spot);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 620));
      }
      withViewTransition(() => setResult(data));
      drawn(data, false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      const fallback = createFallbackResult(goal, companion, previousSpot);
      setRouletteSpot(fallback.mission.target_spot);
      setIsFallbackResult(true);
      withViewTransition(() => setResult(fallback));
      tell(copy.result.fallbackToast);
      console.warn("Using local festival fallback:", requestError);
      drawn(fallback, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  }

  async function draw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestFortune();
  }

  function resetFortune() {
    setResult(null);
    setError("");
    setFormStep(0);
    setIsFallbackResult(false);
  }

  function clearResultOnly() {
    setResult(null);
    setIsFallbackResult(false);
  }

  return {
    formStep, setFormStep,
    mood, setMood, goal, setGoal, companion, setCompanion,
    mbti, setMbti, partnerMood, setPartnerMood,
    result, setResult, isLoading, error, isFallbackResult,
    isPunching, isSuzuPulling, rouletteSpot, loadingMessageIndex,
    selectionReaction, selectionCount, mascotMessage, canSubmit,
    reactToSelection, chooseAndAdvance,
    requestFortune, draw, resetFortune, clearResultOnly,
  };
}
