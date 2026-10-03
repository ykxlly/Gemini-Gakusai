// Step2-3: Phase管理のみの薄い親。S0→S1の直線フロー + 裏動線(MemoriesSheet)。
// 子へのpropsはuseCallback/useMemoで安定化し、memo化コンポーネントの再描画を抑える。
"use client";

import { useCallback, useEffect, useState } from "react";
import DrawingOverlay from "@/components/shrine/DrawingOverlay";
import MemoriesSheet from "@/components/shrine/MemoriesSheet";
import ResultHero from "@/components/shrine/ResultHero";
import { ConfettiLayer, SiteFooter, SiteHeader, Toast } from "@/components/shrine/SiteChrome";
import TopForm from "@/components/shrine/TopForm";
import { useCelebration } from "@/hooks/useCelebration";
import { useFortune } from "@/hooks/useFortune";
import { useMemories } from "@/hooks/useMemories";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useToast } from "@/hooks/useToast";
import type { Result } from "@/lib/fortune";
import { shareFortune } from "@/lib/share";

type Phase = "top" | "result";

function scrollTop(smooth = true) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
}

// 超大吉は特別演出で紙吹雪たっぷり。
function confettiCountFor(tier: string) {
  if (tier === "超大吉") return 90;
  if (tier === "大吉") return 36;
  return 16;
}

export default function OmikujiExperience() {
  const { toast, showToast } = useToast();
  const { confetti, fireConfetti, clearConfetti } = useCelebration();
  const persist = usePersistentState();
  const [phase, setPhase] = useState<Phase>("top");
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [previousSpot, setPreviousSpot] = useState<string | undefined>(undefined);

  const fortune = useFortune({ previousSpot, notify: showToast, onDrawStart: handleDrawStart, onDrawn: handleDrawn });

  const memoriesStore = useMemories({
    result: fortune.result,
    history: persist.history,
  });

  // 巻き上げ関数宣言: 描画開始・完了時の横断リセット。呼び出し時点では全フック初期化済み。
  function handleDrawStart() {
    memoriesStore.resetMemories();
  }

  function handleDrawn(result: Result, isFallback: boolean) {
    void isFallback;
    persist.appendHistory({ fortune_name: result.fortune_name, message: result.message });
    setPreviousSpot(result.recommendation.spot);
    memoriesStore.resetMemories();
    setPhase("result");
    fireConfetti(confettiCountFor(result.fortune_tier));
  }

  const resetToTop = useCallback(() => {
    setIsResetting(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => {
        fortune.resetFortune();
        memoriesStore.resetMemories();
        setPhase("top");
        setIsResetting(false);
        scrollTop(false);
      },
      reduceMotion ? 0 : 260,
    );
  }, [fortune, memoriesStore]);

  const redraw = useCallback(() => {
    fortune.requestFortune();
  }, [fortune]);

  const handleShare = useCallback(async () => {
    if (fortune.result) await shareFortune(fortune.result, showToast);
  }, [fortune.result, showToast]);

  const openMemories = useCallback(() => setMemoriesOpen(true), []);
  const closeMemories = useCallback(() => setMemoriesOpen(false), []);

  // マウスパララックス（pointer:fine のみ）。
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;
    const root = document.documentElement;
    let frame = 0;
    function handleMove(event: MouseEvent) {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const relX = event.clientX / window.innerWidth - 0.5;
        const relY = event.clientY / window.innerHeight - 0.5;
        root.style.setProperty("--mx", (relX * 10).toFixed(2));
        root.style.setProperty("--my", (relY * 10).toFixed(2));
        root.style.setProperty("--ex", (relX * 7).toFixed(2));
        root.style.setProperty("--ey", (relY * 7).toFixed(2));
        frame = 0;
      });
    }
    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!fortune.result) clearConfetti();
  }, [fortune.result, clearConfetti]);

  return (
    <main className="app-shell">
      <SiteHeader />

      {phase === "top" && (
        <TopForm
          formStep={fortune.formStep}
          setFormStep={fortune.setFormStep}
          mood={fortune.mood}
          goal={fortune.goal}
          companion={fortune.companion}
          nickname={fortune.nickname}
          mbti={fortune.mbti}
          partnerMood={fortune.partnerMood}
          setMbti={fortune.setMbti}
          setPartnerMood={fortune.setPartnerMood}
          setNickname={fortune.setNickname}
          selectionCount={fortune.selectionCount}
          mascotMessage={fortune.mascotMessage}
          selectionReaction={fortune.selectionReaction}
          isSuzuPulling={fortune.isSuzuPulling}
          isPunching={fortune.isPunching}
          isLoading={fortune.isLoading}
          canSubmit={fortune.canSubmit}
          error={fortune.error}
          chooseAndAdvance={fortune.chooseAndAdvance}
          reactToSelection={fortune.reactToSelection}
          setMood={fortune.setMood}
          setGoal={fortune.setGoal}
          setCompanion={fortune.setCompanion}
          draw={fortune.draw}
        />
      )}

      {fortune.result && phase === "result" && (
        <section
          className={`result-view ${isResetting ? "result-leaving" : ""}`}
          aria-live="polite"
        >
          <ResultHero
            result={fortune.result}
            isFallbackResult={fortune.isFallbackResult}
            nickname={fortune.nickname}
            onRedraw={redraw}
            onChangeAnswer={resetToTop}
            onShare={handleShare}
          />
        </section>
      )}

      <MemoriesSheet
        open={memoriesOpen}
        fabHidden={!fortune.result || fortune.isLoading}
        result={fortune.result}
        history={persist.history}
        store={memoriesStore}
        notify={showToast}
        onOpen={openMemories}
        onClose={closeMemories}
      />

      <Toast message={toast} />
      {fortune.isLoading && (
        <DrawingOverlay
          isSuzuPulling={fortune.isSuzuPulling}
          rouletteSpot={fortune.rouletteSpot}
          loadingMessageIndex={fortune.loadingMessageIndex}
        />
      )}
      <ConfettiLayer pieces={confetti} />
      <SiteFooter />
    </main>
  );
}
