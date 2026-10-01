// 紙吹雪演出。prefers-reduced-motion 配慮つき。SiteChrome の confetti-layer が描画する。
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { confettiColors } from "@/lib/fortune";

export type ConfettiPiece = { id: number; left: number; color: string; delay: number; duration: number };

export function useCelebration() {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const timer = useRef<number | null>(null);
  const serial = useRef(0);

  const clear = useCallback(() => {
    setConfetti([]);
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const fireConfetti = useCallback(
    (count: number) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clear();
      const base = (serial.current += count);
      setConfetti(
        Array.from({ length: count }, (_, index) => ({
          id: base + index,
          left: 18 + Math.random() * 64,
          color: confettiColors[index % confettiColors.length],
          delay: Math.random() * 0.3,
          duration: 1.4 + Math.random() * 0.8,
        })),
      );
      timer.current = window.setTimeout(() => setConfetti([]), 3200);
    },
    [clear],
  );

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return useMemo(
    () => ({ confetti, setConfetti, fireConfetti, clearConfetti: clear }),
    [confetti, fireConfetti, clear],
  );
}
