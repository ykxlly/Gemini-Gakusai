// Step2-3: Phase管理のみの薄い親。S0→S1→S2→S3の直線フロー + 裏動線(MemoriesSheet)。
// 子へのpropsはuseCallback/useMemoで安定化し、memo化コンポーネントの再描画を抑える。
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DrawingOverlay from "@/components/shrine/DrawingOverlay";
import MemoriesSheet from "@/components/shrine/MemoriesSheet";
import MissionPanel from "@/components/shrine/MissionPanel";
import ResultHero from "@/components/shrine/ResultHero";
import RewardPanel from "@/components/shrine/RewardPanel";
import { ConfettiLayer, SiteFooter, SiteHeader, Toast } from "@/components/shrine/SiteChrome";
import TopForm from "@/components/shrine/TopForm";
import { useCelebration } from "@/hooks/useCelebration";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useFortune } from "@/hooks/useFortune";
import { useMemories } from "@/hooks/useMemories";
import { useNoveltyClaim } from "@/hooks/useNoveltyClaim";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useToast } from "@/hooks/useToast";
import { getMissionSpot, type Result } from "@/lib/fortune";
import { shareFortune } from "@/lib/share";

type Phase = "top" | "result" | "mission" | "reward";

function scrollTop(smooth = true) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
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

  const missionSpot = useMemo(
    () => getMissionSpot(fortune.result?.mission.target_spot),
    [fortune.result],
  );

  const discovery = useDiscovery({
    result: fortune.result,
    missionLocation: missionSpot?.location || "会場",
    setDiscoveryCards: persist.setDiscoveryCards,
    notify: showToast,
    onStampAcquired: handleStampAcquired,
  });

  const claim = useNoveltyClaim({
    visitorId: persist.visitorId,
    discoveryCount: persist.discoveryCards.length,
    claimedNovelties: persist.claimedNovelties,
    setClaimedNovelties: persist.setClaimedNovelties,
    setLatestClaim: persist.setLatestClaim,
    notify: showToast,
  });

  const memoriesStore = useMemories({
    result: fortune.result,
    memories: discovery.memories,
    history: persist.history,
  });

  // 巻き上げ関数宣言: 描画開始・完了時の横断リセット。呼び出し時点では全フック初期化済み。
  function handleDrawStart() {
    discovery.resetDiscovery();
    memoriesStore.resetMemories();
  }

  function handleDrawn(result: Result, isFallback: boolean) {
    void isFallback;
    persist.appendHistory({ fortune_name: result.fortune_name, message: result.message });
    setPreviousSpot(result.mission.target_spot);
    discovery.resetDiscovery();
    memoriesStore.resetMemories();
    setPhase("result");
    fireConfetti(result.fortune_name.includes("大吉") ? 36 : 16);
  }

  function handleStampAcquired() {
    fireConfetti(28);
  }

  const goReward = useCallback(() => {
    setPhase("reward");
    scrollTop();
  }, []);

  const goResult = useCallback(() => {
    setPhase("result");
    scrollTop();
  }, []);

  // 印3/3なら交換所へ、未完ならミッションへ（旧実装では常にdiscovery遷移だった不具合を修正）。
  const rallyAdvance = useCallback(() => {
    if (discovery.missionComplete && discovery.discoveryResult?.rally_complete) {
      setPhase("reward");
    } else {
      setPhase("mission");
    }
    scrollTop();
  }, [discovery.missionComplete, discovery.discoveryResult]);

  const backFromReward = useCallback(() => {
    setPhase(fortune.result ? "result" : "top");
    scrollTop();
  }, [fortune.result]);

  const toggleMission = useCallback(() => {
    if (!discovery.missionComplete) fireConfetti(28);
    discovery.celebrateMission();
  }, [discovery, fireConfetti]);

  const resetToTop = useCallback(() => {
    setIsResetting(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => {
        fortune.resetFortune();
        discovery.resetDiscovery();
        memoriesStore.resetMemories();
        setPhase("top");
        setIsResetting(false);
        scrollTop(false);
      },
      reduceMotion ? 0 : 260,
    );
  }, [fortune, discovery, memoriesStore]);

  const retrySame = useCallback(() => {
    fortune.requestFortune();
  }, [fortune]);

  const handleShare = useCallback(() => {
    if (fortune.result) shareFortune(fortune.result, showToast);
  }, [fortune.result, showToast]);

  const openMemories = useCallback(() => setMemoriesOpen(true), []);
  const closeMemories = useCallback(() => setMemoriesOpen(false), []);

  const missionComplete = discovery.missionComplete;
  const rallyComplete = Boolean(discovery.discoveryResult?.rally_complete);

  // ?booth=novelty では交換所（S3）を先頭に表示する。
  useEffect(() => {
    if (persist.isBoothMode) setPhase((current) => (current === "top" ? "reward" : current));
  }, [persist.isBoothMode]);

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
          mbti={fortune.mbti}
          partnerMood={fortune.partnerMood}
          setMbti={fortune.setMbti}
          setPartnerMood={fortune.setPartnerMood}
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

      {fortune.result && (phase === "result" || phase === "mission") && (
        <section
          className={`result-view ${isResetting ? "result-leaving" : ""}`}
          aria-live="polite"
        >
          {phase === "result" && (
            <ResultHero
              result={fortune.result}
              isFallbackResult={fortune.isFallbackResult}
              missionSpot={missionSpot}
              missionComplete={missionComplete}
              rallyComplete={rallyComplete}
              isLoading={fortune.isLoading}
              onGoMission={rallyAdvance}
              onRetrySame={retrySame}
              onChangeAnswer={resetToTop}
              onShare={handleShare}
            />
          )}
          {phase === "mission" && (
            <MissionPanel
              result={fortune.result}
              missionComplete={missionComplete}
              onToggleMission={toggleMission}
              riddleAnswer={discovery.riddleAnswer}
              setRiddleAnswer={discovery.setRiddleAnswer}
              riddleResult={discovery.riddleResult}
              isCheckingRiddle={discovery.isCheckingRiddle}
              onCheckRiddle={discovery.checkRiddle}
              photoRallyPrompt={discovery.photoRallyPrompt}
              photoPreview={discovery.photoPreview}
              onPhotoSelect={discovery.handlePhotoSelect}
              isVerifying={discovery.isVerifying}
              discoveryResult={discovery.discoveryResult}
              rallyComplete={rallyComplete}
              onCreateStamp={discovery.createDiscoveryStamp}
              onBackToResult={goResult}
              onComplete={goReward}
            />
          )}
        </section>
      )}

      {phase === "reward" && (
        <RewardPanel
          discoveryCount={persist.discoveryCards.length}
          claimedNovelties={persist.claimedNovelties}
          latestClaim={persist.latestClaim}
          visitorId={persist.visitorId}
          staffKey={claim.staffKey}
          setStaffKey={claim.setStaffKey}
          claimError={claim.claimError}
          isClaiming={claim.isClaiming}
          onClaim={claim.claimNovelty}
          showBack
          onBackToTop={backFromReward}
        />
      )}

      <MemoriesSheet
        open={memoriesOpen}
        fabHidden={fortune.isLoading}
        result={fortune.result}
        memories={discovery.memories}
        discoveryCards={persist.discoveryCards}
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
