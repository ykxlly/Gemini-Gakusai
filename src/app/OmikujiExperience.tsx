// Step2-3: Phase管理のみの薄い親。S0→S1→S2→S3の直線フロー + 裏動線(MemoriesSheet)。
"use client";

import { useEffect, useState } from "react";
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

  function handleDrawn(result: Result, isFallback: boolean) {
    void isFallback;
    persist.appendHistory({ fortune_name: result.fortune_name, message: result.message });
    setPreviousSpot(result.mission.target_spot);
    setPhase("result");
    fireConfetti(result.fortune_name.includes("大吉") ? 36 : 16);
  }

  const fortune = useFortune({ previousSpot, notify: showToast, onDrawn: handleDrawn });

  const missionSpot = getMissionSpot(fortune.result?.mission.target_spot);

  const discovery = useDiscovery({
    result: fortune.result,
    missionLocation: missionSpot?.location || "会場",
    setDiscoveryCards: persist.setDiscoveryCards,
    notify: showToast,
    onStampAcquired: () => fireConfetti(28),
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

  function goMission() {
    setPhase("mission");
    scrollTop();
  }

  function goReward() {
    setPhase("reward");
    scrollTop();
  }

  function backFromReward() {
    setPhase(fortune.result ? "result" : "top");
    scrollTop();
  }

  function toggleMission() {
    if (!discovery.missionComplete) fireConfetti(28);
    discovery.celebrateMission();
  }

  function resetToTop() {
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
  }

  const phaseIndex = phase === "top" ? 0 : phase === "result" ? 1 : phase === "mission" ? 2 : 3;

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

      {phase !== "top" && (
        <div className="phase-progress" aria-hidden="true">
          {[1, 2, 3].map((step) => (
            <i key={step} className={phaseIndex >= step ? "phase-progress-done" : ""} />
          ))}
        </div>
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
              missionComplete={discovery.missionComplete}
              rallyComplete={Boolean(discovery.discoveryResult?.rally_complete)}
              isLoading={fortune.isLoading}
              onGoMission={goMission}
              onRetrySame={() => fortune.requestFortune()}
              onChangeAnswer={resetToTop}
              onShare={() => shareFortune(fortune.result!, showToast)}
            />
          )}
          {phase === "mission" && (
            <MissionPanel
              result={fortune.result}
              missionComplete={discovery.missionComplete}
              onToggleMission={toggleMission}
              riddleAnswer={discovery.riddleAnswer}
              setRiddleAnswer={discovery.setRiddleAnswer}
              riddleResult={discovery.riddleResult}
              isCheckingRiddle={discovery.isCheckingRiddle}
              onCheckRiddle={() => discovery.checkRiddle()}
              photoRallyPrompt={discovery.photoRallyPrompt}
              photoPreview={discovery.photoPreview}
              onPhotoSelect={discovery.handlePhotoSelect}
              isVerifying={discovery.isVerifying}
              discoveryResult={discovery.discoveryResult}
              onCreateStamp={() => discovery.createDiscoveryStamp()}
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
          onClaim={(kind) => claim.claimNovelty(kind)}
          showBack
          onBackToTop={backFromReward}
        />
      )}

      <MemoriesSheet
        open={memoriesOpen}
        result={fortune.result}
        memories={discovery.memories}
        discoveryCards={persist.discoveryCards}
        history={persist.history}
        store={memoriesStore}
        notify={showToast}
        onOpen={() => setMemoriesOpen(true)}
        onClose={() => setMemoriesOpen(false)}
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
