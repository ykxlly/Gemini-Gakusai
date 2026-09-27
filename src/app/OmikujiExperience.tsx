"use client";

import { ArrowLeft, ArrowRight, BookMarked, BookOpen, Camera, Check, CircleCheckBig, Gift, HelpCircle, Images, MapPin, MessageCircle, RefreshCw, Send, Share2, Sparkles, Star, Trophy, Volume2, Wand2 } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import spots from "@/data/spots.json";

type Result = {
  fortune_name: string;
  message: string;
  action_tip: string;
  compatibility_note: string;
  mission: { title: string; target_spot: string; description: string; riddle: string; riddle_answer: string };
  lucky_elements: { color: string; food: string; spot: string };
};

type Choice = { value: string; label: string; note: string };
type DiscoveryResult = { stamp_title: string; comment: string; caption: string; rally_complete: boolean; card_title: string; card_message: string; next_spot: string };
type MemoryEntry = { image: string; caption: string; spot: string; area: string };
type DiscoveryCard = { spot: string; title: string; message: string };
type NoveltyKind = "sticker" | "tote";
type FestivalSpot = {
  id: string;
  name: string;
  category: string;
  location: string;
  vibe: string;
  schedule?: string;
  price?: string;
  capacity?: string;
  notice?: string;
};

const festivalSpots = spots as FestivalSpot[];

const moods: Choice[] = [
  { value: "わくわく", label: "わくわく", note: "勢いのまま楽しみたい" },
  { value: "のんびり", label: "のんびり", note: "自分のペースで巡りたい" },
  { value: "ちょっと緊張", label: "ちょっと緊張", note: "きっかけがほしい" },
  { value: "まだ決めてない", label: "まだ決めてない", note: "偶然に任せたい" },
];

const goals: Choice[] = [
  { value: "新しい発見", label: "新しい発見", note: "知らない世界に出会う" },
  { value: "おいしいもの", label: "おいしいもの", note: "学園祭グルメを満喫" },
  { value: "思い出づくり", label: "思い出づくり", note: "今日だけの一枚を残す" },
  { value: "盛り上がりたい", label: "盛り上がりたい", note: "音と熱気に飛び込む" },
];

const companions = ["ひとり", "友達", "恋人", "家族"];
const mbtiTypes = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

const loadingMessages = [
  "今日の寄り道を選んでいます...",
  "気持ちを読み取っています...",
  "ぴったりのスポットを探しています...",
  "運勢を書き上げています...",
];

const confettiColors = ["#d83a2e", "#f2c84b", "#176b57", "#ffffff"];
const photoRallyPrompts = [
  "赤いものを見つけよう",
  "手作りだと感じるものを見つけよう",
  "音が聞こえてきそうな景色を見つけよう",
  "思わず笑顔になりそうなものを見つけよう",
  "きらきらしたものを見つけよう",
  "今日だけの色を見つけよう",
];

const stampParticles = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * Math.PI * 2;
  return { dx: Math.round(Math.cos(angle) * 34), dy: Math.round(Math.sin(angle) * 34) };
});

const locationPoints: Record<string, { x: number; y: number; zone: string }> = {
  "S102": { x: 73, y: 30, zone: "1階" },
  "S106": { x: 76, y: 62, zone: "1階" },
  "エントランス": { x: 48, y: 82, zone: "1階" },
  "ホール（S201）": { x: 25, y: 26, zone: "2階" },
  "S203": { x: 51, y: 27, zone: "2階" },
  "S204": { x: 73, y: 27, zone: "2階" },
  "2階エレベーター前スペース": { x: 50, y: 51, zone: "2階" },
  "中庭（東側）": { x: 72, y: 74, zone: "屋外" },
  "中庭（西側）": { x: 28, y: 74, zone: "屋外" },
  "グラウンド": { x: 14, y: 48, zone: "屋外" },
  "キャンパス祭入口・食堂": { x: 38, y: 57, zone: "食堂周辺" },
  "食堂": { x: 40, y: 48, zone: "食堂" },
};

function getLocationPoint(location: string | undefined) {
  return (location && locationPoints[location]) || { x: 82, y: 50, zone: "公式案内を確認" };
}

function createFallbackResult(goal: string, companion: string, previousSpot?: string): Result {
  const preferredCategories: Record<string, string[]> = {
    "新しい発見": ["体験・ワークショップ", "マルシェ"],
    "おいしいもの": ["学生模擬店・フード＆ドリンク", "店舗出店・フード＆ドリンク"],
    "思い出づくり": ["体験・ワークショップ", "縁日・キッズゲーム", "マルシェ"],
    "盛り上がりたい": ["ステージ・パフォーマンス", "スポーツ・アクティビティ", "縁日・キッズゲーム"],
  };
  const preferred = preferredCategories[goal] || [];
  const candidates = festivalSpots.filter((spot) => preferred.includes(spot.category) && spot.name !== previousSpot);
  const pool = candidates.length ? candidates : festivalSpots.filter((spot) => spot.name !== previousSpot);
  const selected = pool[Math.floor(Math.random() * pool.length)] || festivalSpots[0];
  const companionText = companion === "ひとり" ? "自分のペースで" : `${companion}と一緒に`;
  return {
    fortune_name: "寄り道発見吉",
    message: "公式企画データから、今の目的に合う寄り道を選びました。現地の案内を確認しながら、気軽に楽しんでみてください。",
    action_tip: `${companionText}、企画の入口で気になったものを一つ見つけよう。`,
    compatibility_note: "",
    mission: {
      title: `${selected.name}へ行ってみよう`,
      target_spot: selected.name,
      description: `${selected.vibe}。会場に着いたら、印象に残ったものを一つ見つけてみよう。`,
      riddle: "会場で新しく見つけるとうれしいものは？",
      riddle_answer: "発見",
    },
    lucky_elements: { color: "きらめく黄色", food: "会場で気になった一品", spot: selected.name },
  };
}

function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}

function getFortuneNameSize(name: string) {
  const length = Array.from(name.replace(/\s/g, "")).length;
  if (length >= 14) return "fortune-name-compact";
  if (length >= 10) return "fortune-name-medium";
  return "fortune-name-short";
}

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

function ChoiceField({ legend, name, choices, value, onChange }: {
  legend: string;
  name: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="form-section">
      <legend>{legend}</legend>
      <div className="choice-grid">
        {choices.map((choice) => (
          <label className={`choice ${value === choice.value ? "choice-selected" : ""}`} key={choice.value}>
            <input checked={value === choice.value} name={name} onChange={() => onChange(choice.value)} type="radio" />
            <span className="choice-check" aria-hidden="true">
              {value === choice.value && <Check size={14} strokeWidth={3} />}
            </span>
            <span><strong>{choice.label}</strong><small>{choice.note}</small></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function OmikujiExperience() {
  const [formStep, setFormStep] = useState(0);
  const [mood, setMood] = useState("");
  const [goal, setGoal] = useState("");
  const [companion, setCompanion] = useState("");
  const [mbti, setMbti] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBoothMode, setIsBoothMode] = useState(false);
  const [claimedNovelties, setClaimedNovelties] = useState<NoveltyKind[]>([]);
  const [latestClaim, setLatestClaim] = useState<NoveltyKind | null>(null);
  const [visitorId, setVisitorId] = useState("");
  const [staffKey, setStaffKey] = useState("");
  const [claimError, setClaimError] = useState("");
  const [isClaiming, setIsClaiming] = useState<NoveltyKind | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const [error, setError] = useState("");
  const [isPunching, setIsPunching] = useState(false);
  const [isSuzuPulling, setIsSuzuPulling] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; delay: number; duration: number }[]>([]);
  const [partnerMood, setPartnerMood] = useState("");
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleResult, setRiddleResult] = useState<{ correct: boolean; feedback: string } | null>(null);
  const [isCheckingRiddle, setIsCheckingRiddle] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [photoRallyPrompt, setPhotoRallyPrompt] = useState(photoRallyPrompts[0]);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [discoveryCards, setDiscoveryCards] = useState<DiscoveryCard[]>([]);
  const [bookmark, setBookmark] = useState<{ title: string; closingComment: string } | null>(null);
  const [isCreatingBookmark, setIsCreatingBookmark] = useState(false);
  const [card, setCard] = useState<{ phrase: string; accentHex: string } | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [narrationUrl, setNarrationUrl] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [history, setHistory] = useState<{ fortune_name: string; message: string }[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [toast, setToast] = useState("");
  const [isFallbackResult, setIsFallbackResult] = useState(false);
  const [rouletteSpot, setRouletteSpot] = useState(festivalSpots[0].name);
  const [selectionReaction, setSelectionReaction] = useState<{ message: string; motion: string; key: number } | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<"omikuji" | "discovery" | "memories">("omikuji");
  const reactionTimer = useRef<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 3600);
  }

  const canSubmit = Boolean(mood && goal && companion && !isLoading);
  const selectionCount = [mood, goal, companion].filter(Boolean).length;
  const mascotMessage = selectionReaction?.message || (selectionCount === 3 ? "準備OK！運勢を引こう" : selectionCount ? `あと${3 - selectionCount}つ教えてね` : "一緒に運勢を探そう");
  const missionSpot = result ? festivalSpots.find((spot) => spot.name === result.mission.target_spot) : undefined;
  const destinationPoint = getLocationPoint(missionSpot?.location);

  function reactToSelection(message: string, motion: string) {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setSelectionReaction({ message, motion, key: Date.now() });
    reactionTimer.current = window.setTimeout(() => setSelectionReaction(null), 1100);
  }

  function chooseAndAdvance(setter: (value: string) => void, value: string, message: string, motion: string, nextStep: number) {
    setter(value);
    reactToSelection(message, motion);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
    window.setTimeout(() => setFormStep(nextStep), delay);
  }

  function celebrateMission() {
    if (missionComplete) {
      setMissionComplete(false);
      return;
    }
    setMissionComplete(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setConfetti(Array.from({ length: 28 }, (_, index) => ({
      id: Date.now() + index,
      left: 18 + Math.random() * 64,
      color: confettiColors[index % confettiColors.length],
      delay: Math.random() * 0.3,
      duration: 1.4 + Math.random() * 0.8,
    })));
    window.setTimeout(() => setConfetti([]), 2600);
  }

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }
    const timer = window.setInterval(() => {
      setLoadingMessageIndex((index) => (index + 1) % loadingMessages.length);
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

  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
  }, []);

  useEffect(() => {
    if (!result) {
      setConfetti([]);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const isBigLuck = result.fortune_name.includes("大吉");
    const count = isBigLuck ? 36 : 16;
    setConfetti(
      Array.from({ length: count }, (_, index) => ({
        id: index,
        left: Math.random() * 100,
        color: confettiColors[index % confettiColors.length],
        delay: Math.random() * 0.5,
        duration: 1.8 + Math.random() * 1,
      })),
    );
    const timer = window.setTimeout(() => setConfetti([]), 3200);
    return () => window.clearTimeout(timer);
  }, [result]);

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
    if (typeof window === "undefined") return;
    try {
      setIsBoothMode(new URLSearchParams(window.location.search).get("booth") === "novelty");
      const storedVisitorId = window.localStorage.getItem("omikuji-visitor-id");
      const nextVisitorId = storedVisitorId || (window.crypto.randomUUID ? window.crypto.randomUUID() : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    if (!result) return;
    setPhotoRallyPrompt(photoRallyPrompts[Math.floor(Math.random() * photoRallyPrompts.length)]);
    setDiscoveryResult(null);
    setPhotoPreview(null);
  }, [result]);

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

  useEffect(() => {
    if (!result) return;
    setHistory((previous) => {
      const next = [...previous, { fortune_name: result.fortune_name, message: result.message }].slice(-10);
      try {
        window.localStorage.setItem("omikuji-history", JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, [result]);

  async function requestFortune() {
    setError("");
    setIsPunching(true);
    setIsSuzuPulling(true);
    window.setTimeout(() => setIsPunching(false), 380);
    window.setTimeout(() => setIsSuzuPulling(false), 760);
    setIsLoading(true);
    setMissionComplete(false);
    setRiddleAnswer("");
    setRiddleResult(null);
    setPhotoPreview(null);
    setDiscoveryResult(null);
    setCard(null);
    setNarrationUrl(null);
    setChatMessages([]);
    setChatInput("");
    setSummaryText("");
    setBookmark(null);
    setIsFallbackResult(false);
    try {
      const [response] = await Promise.all([
        fetch("/api/omikuji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, goal, companion, mbti: mbti || undefined, partnerMood: partnerMood || undefined }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1400)),
      ]);
      if (!response.ok) throw new Error("おすすめ案内を一時的に利用できません。");
      const data = (await response.json()) as Result;
      setRouletteSpot(data.mission.target_spot);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 620));
      }
      withViewTransition(() => setResult(data));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      const fallback = createFallbackResult(goal, companion, result?.mission.target_spot);
      setRouletteSpot(fallback.mission.target_spot);
      setIsFallbackResult(true);
      withViewTransition(() => setResult(fallback));
      showToast("公式企画データからおすすめを選びました");
      console.warn("Using local festival fallback:", requestError);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsLoading(false);
    }
  }

  async function draw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestFortune();
  }

  async function claimNovelty(kind: NoveltyKind) {
    const requiredCards = kind === "sticker" ? 1 : 3;
    if (discoveryCards.length < requiredCards || claimedNovelties.includes(kind) || !visitorId || isClaiming) return;
    setClaimError("");
    setIsClaiming(kind);
    try {
      const response = await fetch("/api/novelty/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, noveltyKind: kind, discoveryCount: discoveryCards.length, staffKey }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "交換記録を保存できませんでした。");
      setClaimedNovelties((current) => [...current, kind]);
      setLatestClaim(kind);
      setStaffKey("");
      showToast(kind === "sticker" ? "ステッカーの交換を記録しました" : "トートバッグの交換を記録しました");
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : "交換記録を保存できませんでした。");
    } finally {
      setIsClaiming(null);
    }
  }

  function reset() {
    setIsResetting(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setResult(null);
      setError("");
      setFormStep(0);
      setActiveResultTab("omikuji");
      setMissionComplete(false);
      setIsResetting(false);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }, reduceMotion ? 0 : 260);
  }

  async function generateCard() {
    if (!result) return;
    setIsGeneratingCard(true);
    try {
      const response = await fetch("/api/omikuji/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fortuneName: result.fortune_name,
          color: result.lucky_elements.color,
          spot: result.mission.target_spot,
        }),
      });
      if (!response.ok) throw new Error("お守りカードの生成に失敗しました。");
      const data = (await response.json()) as { phrase: string; accent_hex: string };
      setCard({ phrase: data.phrase, accentHex: data.accent_hex });
    } catch {
      setCard({ phrase: `${result.mission.target_spot}で、今日だけの発見を。`, accentHex: "#d83a2e" });
      showToast("お守りカードを作りました");
    } finally {
      setIsGeneratingCard(false);
    }
  }

  async function playNarration() {
    if (!result) return;
    setIsNarrating(true);
    try {
      const response = await fetch("/api/omikuji/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.message }),
      });
      if (!response.ok) throw new Error("音声の生成に失敗しました。");
      const data = (await response.json()) as { audio: string };
      setNarrationUrl(data.audio);
    } catch (narrationRequestError) {
      showToast(narrationRequestError instanceof Error ? narrationRequestError.message : "通信エラーが発生しました。");
    } finally {
      setIsNarrating(false);
    }
  }

  async function checkRiddle() {
    if (!result || !riddleAnswer.trim()) return;
    const normalizeAnswer = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s、。,.!！?？・()（）]/g, "");
    const answer = normalizeAnswer(riddleAnswer);
    const expected = normalizeAnswer(result.mission.riddle_answer || "");
    if (expected && (answer === expected || (expected.length >= 2 && answer.includes(expected)))) {
      setRiddleResult({ correct: true, feedback: "いい発見！その調子で会場を巡ってみよう。" });
      return;
    }
    setIsCheckingRiddle(true);
    try {
      const response = await fetch("/api/omikuji/riddle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riddle: result.mission.riddle,
          expectedAnswer: result.mission.riddle_answer,
          userAnswer: riddleAnswer,
        }),
      });
      if (!response.ok) throw new Error("答え合わせに失敗しました。");
      setRiddleResult((await response.json()) as { correct: boolean; feedback: string });
    } catch {
      const correct = Boolean(expected && answer.includes(expected));
      setRiddleResult({ correct, feedback: correct ? "いい発見！その調子で会場を巡ってみよう。" : "答えは現地で探してみよう。見つけた瞬間がミッション達成！" });
      showToast("やさしい答え合わせに切り替えました");
    } finally {
      setIsCheckingRiddle(false);
    }
  }

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setDiscoveryResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new window.Image();
      image.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) return setPhotoPreview(reader.result as string);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPhotoPreview(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => setPhotoPreview(reader.result as string);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function createDiscoveryStamp() {
    if (!result || !photoPreview) return;
    const [meta, base64] = photoPreview.split(",");
    const mimeType = meta.match(/data:(.*);base64/)?.[1] || "image/jpeg";
    setIsVerifying(true);
    try {
      const response = await fetch("/api/omikuji/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot: result.mission.target_spot,
          missionDescription: result.mission.description,
          imageBase64: base64,
          mimeType,
          rallyPrompt: photoRallyPrompt,
        }),
      });
      if (!response.ok) throw new Error("発見スタンプを作れませんでした。");
      saveDiscovery((await response.json()) as DiscoveryResult);
    } catch (verifyRequestError) {
      const nextSpot = festivalSpots.find((spot) => spot.name !== result.mission.target_spot && spot.category !== missionSpot?.category) || festivalSpots[0];
      saveDiscovery({
        stamp_title: "今日のきらめきを発見！",
        comment: "いい発見だね！写真に残したその瞬間が、今日の学園祭をもっと特別にしてくれるよ。",
        caption: `${result.mission.target_spot}で見つけた今日の一枚`,
        rally_complete: false,
        card_title: "寄り道の記憶カード",
        card_message: "立ち止まって見つけた一枚が、今日だけの思い出になる。",
        next_spot: nextSpot.name,
      });
      showToast("発見スタンプを作りました");
      console.warn("Using local discovery fallback:", verifyRequestError);
    } finally {
      setIsVerifying(false);
    }
  }

  function saveDiscovery(data: DiscoveryResult) {
    if (!result || !photoPreview) return;
    setDiscoveryResult(data);
    setMemories((current) => [...current.filter((entry) => entry.image !== photoPreview), {
      image: photoPreview,
      caption: data.caption,
      spot: result.mission.target_spot,
      area: missionSpot?.location || "会場",
    }].slice(-3));
    setDiscoveryCards((current) => [...current.filter((card) => card.spot !== result.mission.target_spot), {
      spot: result.mission.target_spot,
      title: data.card_title,
      message: data.card_message,
    }].slice(-24));
    if (!missionComplete) celebrateMission();
  }

  async function createBookmark() {
    if (!result || memories.length === 0 || isCreatingBookmark) return;
    setIsCreatingBookmark(true);
    try {
      const response = await fetch("/api/omikuji/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fortuneName: result.fortune_name, memories: memories.map(({ caption, spot, area }) => ({ caption, spot, area })) }),
      });
      if (!response.ok) throw new Error("しおりを作れませんでした。");
      const data = (await response.json()) as { title: string; closing_comment: string };
      setBookmark({ title: data.title, closingComment: data.closing_comment });
    } catch {
      setBookmark({ title: "今日の寄り道しおり", closingComment: "今日見つけた小さな発見が、きっと次の楽しい寄り道につながります。" });
      showToast("思い出しおりを作りました");
    } finally {
      setIsCreatingBookmark(false);
    }
  }

  async function exportBookmark() {
    if (!bookmark || !result) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#f7f4eb";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#d83a2e";
    context.fillRect(0, 0, canvas.width, 30);
    context.fillStyle = "#171714";
    context.font = "700 34px sans-serif";
    context.fillText("BDSF 2026 · 寄り道おみくじ", 70, 105);
    context.font = "700 62px serif";
    context.fillText(bookmark.title, 70, 205);
    context.font = "32px sans-serif";
    context.fillStyle = "#5f5b51";
    context.fillText(`運勢：${result.fortune_name}`, 70, 270);
    let y = 340;
    for (const [index, memory] of memories.entries()) {
      const image = new window.Image();
      image.src = memory.image;
      await new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve(); });
      if (image.complete && image.naturalWidth) {
        const ratio = Math.min(940 / image.naturalWidth, 360 / image.naturalHeight);
        const width = image.naturalWidth * ratio;
        const height = image.naturalHeight * ratio;
        context.drawImage(image, 70, y, width, height);
        y += height + 26;
      }
      context.fillStyle = "#176b57";
      context.font = "700 25px sans-serif";
      context.fillText(`${index + 1}. ${memory.spot}`, 70, y);
      context.fillStyle = "#171714";
      context.font = "31px sans-serif";
      context.fillText(memory.caption, 70, y + 47);
      y += 105;
    }
    context.fillStyle = "#f2c84b";
    context.fillRect(55, Math.min(y + 15, 1660), 970, 3);
    context.fillStyle = "#5f5b51";
    context.font = "30px sans-serif";
    const words = Array.from(bookmark.closingComment);
    let line = "";
    let lineY = Math.min(y + 80, 1730);
    for (const word of words) {
      if (context.measureText(line + word).width > 900) { context.fillText(line, 70, lineY); line = word; lineY += 45; } else line += word;
    }
    if (line) context.fillText(line, 70, lineY);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], "bdsf-omide-shiori.png", { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: bookmark.title, files: [file] });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || !chatInput.trim() || isChatting) return;
    const outgoing = chatInput.trim();
    const previousHistory = chatMessages;
    setChatMessages((current) => [...current, { role: "user", text: outgoing }]);
    setChatInput("");
    setIsChatting(true);
    try {
      const response = await fetch("/api/omikuji/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: outgoing,
          history: previousHistory,
          fortuneName: result.fortune_name,
          missionTitle: result.mission.title,
        }),
      });
      if (!response.ok) throw new Error("返信の取得に失敗しました。");
      const data = (await response.json()) as { reply: string };
      setChatMessages((current) => [...current, { role: "model", text: data.reply }]);
    } catch {
      setChatMessages((current) => [...current, { role: "model", text: `「${result.mission.target_spot}」を目指してみよう！会場案内や企画の詳細は現地表示も確認してね。` }]);
      showToast("案内モードで返信しました");
    } finally {
      setIsChatting(false);
    }
  }

  async function fetchSummary() {
    if (history.length < 2 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const response = await fetch("/api/omikuji/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fortunes: history }),
      });
      if (!response.ok) throw new Error("まとめの生成に失敗しました。");
      const data = (await response.json()) as { summary: string };
      setSummaryText(data.summary);
    } catch {
      setSummaryText(`今日は${history.length}回の寄り道を楽しみました。気になった企画へ向かった一歩が、今日だけの思い出になっています。`);
      showToast("今日のまとめを作りました");
    } finally {
      setIsSummarizing(false);
    }
  }

  return (
    <main className="app-shell">
      {isBoothMode && (
        <section className="booth-reward" aria-labelledby="booth-reward-title">
          <div className="booth-reward-kicker"><Gift size={16} /> ブース来訪特典</div>
          <h1 id="booth-reward-title">集めた印を<br /><em>ノベルティ</em>に交換</h1>
          <p className="booth-reward-lead">寄り道御朱印帳の記録数に応じて、好きな特典を選べます。</p>
          <div className="booth-reward-count"><span>現在の発見カード</span><strong>{discoveryCards.length}<small>件</small></strong></div>
          {latestClaim && (
            <div className="staff-confirmation" role="status" aria-live="polite">
              <div className="staff-confirmation-status"><Check size={22} strokeWidth={3} /><span>交換済み</span></div>
              <div className="staff-confirmation-main">
                <small>スタッフ確認用</small>
                <strong>{latestClaim === "sticker" ? "ステッカー" : "トートバッグ"}</strong>
                <p>この画面をスタッフに見せて、ノベルティをお受け取りください。</p>
              </div>
              <div className="staff-confirmation-meta"><span>発見カード {discoveryCards.length}件</span><span>BDSF 2026</span></div>
            </div>
          )}
          <div className="claim-ticket" aria-label="スタッフに見せる受付番号">
            <span>授与所 受付番号</span>
            <strong>{visitorId ? visitorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() : "------"}</strong>
            <p>交換を申し込むとき、この番号をスタッフにお見せください。</p>
          </div>
          <div className="staff-key-panel">
            <label htmlFor="novelty-staff-key">スタッフ承認キー</label>
            <input id="novelty-staff-key" inputMode="text" onChange={(event) => setStaffKey(event.target.value)} placeholder="スタッフが入力してください" type="password" value={staffKey} />
            <p>スタッフ端末で承認キーを入力してから、授与を確定します。</p>
          </div>
          {claimError && <p className="claim-error" role="alert">授与所が混み合っています。画面を閉じずにスタッフへお声がけください。<br />{claimError}</p>}
          <div className="booth-reward-options">
            <article className={`booth-reward-option ${discoveryCards.length >= 1 ? "booth-reward-available" : ""} ${claimedNovelties.includes("sticker") ? "booth-reward-claimed" : ""}`}>
              <span className="booth-reward-seal">一印</span>
              <div><small>1件以上</small><h2>ステッカー</h2><p>{claimedNovelties.includes("sticker") ? "この端末では交換済みです" : discoveryCards.length >= 1 ? "交換できます" : "あと1件で交換できます"}</p></div>
              <button disabled={discoveryCards.length < 1 || claimedNovelties.includes("sticker") || isClaiming !== null} onClick={() => claimNovelty("sticker")} type="button">{claimedNovelties.includes("sticker") ? <><Check size={16} /> 交換済み</> : isClaiming === "sticker" ? <><RefreshCw className="spin" size={14} /> 記録中</> : discoveryCards.length >= 1 ? "交換する" : "条件未達成"}</button>
            </article>
            <article className={`booth-reward-option ${discoveryCards.length >= 3 ? "booth-reward-available" : ""} ${claimedNovelties.includes("tote") ? "booth-reward-claimed" : ""}`}>
              <span className="booth-reward-seal">三印</span>
              <div><small>3件以上</small><h2>トートバッグ</h2><p>{claimedNovelties.includes("tote") ? "この端末では交換済みです" : discoveryCards.length >= 3 ? "交換できます" : `あと${Math.max(0, 3 - discoveryCards.length)}件で交換できます`}</p></div>
              <button disabled={discoveryCards.length < 3 || claimedNovelties.includes("tote") || isClaiming !== null} onClick={() => claimNovelty("tote")} type="button">{claimedNovelties.includes("tote") ? <><Check size={16} /> 交換済み</> : isClaiming === "tote" ? <><RefreshCw className="spin" size={14} /> 記録中</> : discoveryCards.length >= 3 ? "交換する" : "条件未達成"}</button>
            </article>
          </div>
          <p className="booth-reward-note">交換ボタンを押したら、この画面をブーススタッフに見せてください。</p>
          <a className="booth-reward-back" href="#top">寄り道おみくじへ戻る</a>
        </section>
      )}
      <header className="site-header">
        <a className="brand" href="#top" aria-label="BDSF 寄り道おみくじ トップ">
          <span className="brand-mark"><Image alt="" height={38} priority src="/sparkle-clean.png" unoptimized width={38} /></span>
          <span>BDSF 2026<br /><strong>寄り道おみくじ</strong></span>
        </a>
        <span className="festival-tag">御神籤授与所</span>
      </header>

      {!result ? (
        <div className="input-layout" id="top">
          <section className="intro-panel">
            <div className="shrine-counter-intro"><span className="shrine-counter-rope" aria-hidden="true" /><div><strong>寄り道神社</strong><small>今日の運勢を授かる場所</small></div></div>
            <div className="eyebrow"><Star size={14} fill="currentColor" /> 御神籤授与所</div>
            <h1>今日の<em>寄り道</em>を<br />授かろう</h1>
            <p>BDSF 2026の公式企画から、今のあなたに似合う行き先を一枚の御神籤にしてお渡しします。</p>
            <div className={`mascot-stage shrine-stage ${isSuzuPulling ? "suzu-pulling-stage" : ""} mascot-progress-${selectionCount} ${selectionReaction ? `mascot-${selectionReaction.motion}` : ""}`}>
              <div className="torii-mark" aria-hidden="true"><span /><i /><b /></div>
              <div className="booth-sign" aria-hidden="true">寄り道神社 御神籤授与所 <span>一</span></div>
              <div className="mascot-visual">
                <Image
                  alt="寄り道おみくじの案内キャラクター"
                  className="mascot-image"
                  height={390}
                  priority
                  src="/mascot-clean.png"
                  unoptimized
                  width={760}
                />
                <span aria-hidden="true" className="eye-glint eye-glint-left" />
                <span aria-hidden="true" className="eye-glint eye-glint-right" />
              </div>
              <div className="guidebook-prop omikuji-box-prop" aria-hidden="true">
                <small>BDSF 2026</small>
                <strong>御神籤<br />授与札</strong>
                <span>一枚どうぞ</span>
              </div>
              <Image alt="" className="stage-sparkle stage-sparkle-large" height={78} src="/sparkle-clean.png" unoptimized width={78} />
              <Image alt="" className="stage-sparkle stage-sparkle-small" height={38} src="/sparkle-clean.png" unoptimized width={38} />
              <span className="suzu-rope" aria-hidden="true"><i /></span>
              <span className="mascot-caption" aria-live="polite" key={selectionReaction?.key || "idle"}>{mascotMessage}</span>
            </div>
            <div className="privacy-note"><Check size={16} /> 三つの印を奉納すると、御神籤を授かれます</div>
            <div className={`draw-progress ${selectionCount === 3 ? "draw-progress-complete" : ""}`} aria-label={`御神籤の準備 ${selectionCount} / 3`}>
              <div className="draw-progress-heading">
                <span>今日の寄り道印</span>
                <strong>{selectionCount}/3</strong>
              </div>
              <div className="draw-progress-marks" aria-hidden="true">
                {["気分", "目的", "同行者"].map((label, index) => (
                  <span className={selectionCount > index ? "draw-progress-mark-filled" : ""} key={label}>
                    <i>{selectionCount > index ? "印" : index + 1}</i>
                    <small>{label}</small>
                  </span>
                ))}
              </div>
              <p>{selectionCount === 3 ? "準備が整いました。今日の運勢を引いてみよう！" : `あと${3 - selectionCount}つ選ぶと、おみくじを引けます`}</p>
            </div>
          </section>

          <section className="form-panel" aria-labelledby="form-title">
            <div className="form-kicker"><span>御神籤授与所</span><strong>まずは一枚、授かろう</strong></div>
            <div className="form-heading">
              <span>{["一", "二", "三"][formStep]}</span>
              <div><p>{formStep < 2 ? `あと${2 - formStep}つ` : "最後のひとつ"} · ひとつ選ぶだけ</p><h2 id="form-title">{formStep === 0 ? "気分" : formStep === 1 ? "目的" : "同行者"}</h2></div>
            </div>
            <div className="form-step-tabs" aria-label="回答の進み具合">
              {["気分", "目的", "同行者"].map((label, index) => (
                <button className={formStep === index ? "form-step-current" : ""} disabled={index > formStep && ![mood, goal, companion][index - 1]} key={label} onClick={() => setFormStep(index)} type="button">
                  <span>{index + 1}</span>{label}
                </button>
              ))}
            </div>
            <div className="form-progress" aria-hidden="true">
              <div className="form-progress-fill" style={{ width: `${((formStep + 1) / 3) * 100}%` }} />
            </div>
            <form onSubmit={draw}>
              <div className="form-step-panel" key={formStep}>
                {formStep === 0 && <ChoiceField legend="気分に近いものを選んでください" name="mood" choices={moods} value={mood} onChange={(value) => chooseAndAdvance(setMood, value, `${value}な気分、受け取ったよ！`, "tilt-left", 1)} />}
                {formStep === 1 && <ChoiceField legend="一番楽しみにしていることは？" name="goal" choices={goals} value={goal} onChange={(value) => chooseAndAdvance(setGoal, value, `${value}にぴったりの企画を探すね`, "tilt-right", 2)} />}
                {formStep === 2 && (
                  <>
                    <fieldset className="form-section">
                      <legend>一緒に巡る人を選んでください</legend>
                      <div className="segment-control">
                        {companions.map((choice) => (
                          <label key={choice} className={companion === choice ? "segment-selected" : ""}>
                            <input checked={companion === choice} name="companion" onChange={() => { setCompanion(choice); reactToSelection(`${choice}で楽しめる寄り道にしよう！`, "bounce"); }} type="radio" />
                            {choice}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <details className="advanced-options">
                      <summary>おすすめを詳しく調整する <span>任意</span></summary>
                      {companion && companion !== "ひとり" && (
                        <div className="form-section">
                          <label className="select-label" htmlFor="partnerMood">同行者の気分 <span>任意・相性コメントに使用</span></label>
                          <select id="partnerMood" value={partnerMood} onChange={(event) => setPartnerMood(event.target.value)}>
                            <option value="">選択しない</option>
                            {moods.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="form-section">
                        <label className="select-label" htmlFor="mbti">MBTI <span>任意</span></label>
                        <select id="mbti" value={mbti} onChange={(event) => setMbti(event.target.value)}>
                          <option value="">選択しない</option>
                          {mbtiTypes.map((type) => <option key={type}>{type}</option>)}
                        </select>
                      </div>
                    </details>
                  </>
                )}
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
              <div className="draw-dock">
                {formStep > 0 && <button className="step-back-button" onClick={() => setFormStep((step) => step - 1)} type="button"><ArrowLeft size={17} /> 前へ</button>}
                {formStep < 2 ? (
                  <button className="draw-button" disabled={formStep === 0 ? !mood : !goal} onClick={() => setFormStep((step) => step + 1)} type="button">次へ <ArrowRight size={20} /></button>
                ) : (
                  <button className={`draw-button ${isPunching ? "button-punch" : ""} ${isSuzuPulling ? "suzu-pull-button" : ""}`} disabled={!canSubmit} type="submit">
                    {isLoading ? <><RefreshCw className="spin" size={20} /> 御神籤を整えています...</> : companion ? <>鈴緒を引いて授かる <ArrowRight size={20} /></> : <>同行者を選ぶ <ArrowRight size={20} /></>}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      ) : (
        <section className={`result-view ${isResetting ? "result-leaving" : ""}`} aria-live="polite">
          <button className="back-button" onClick={reset} type="button"><ArrowLeft size={18} /> 選び直す</button>
          <nav className="result-tabbar result-tabbar-top" aria-label="結果画面のメニュー">
            <button aria-current={activeResultTab === "omikuji" ? "page" : undefined} onClick={() => setActiveResultTab("omikuji")} type="button"><Star size={17} /> おみくじ</button>
            <button aria-current={activeResultTab === "discovery" ? "page" : undefined} onClick={() => setActiveResultTab("discovery")} type="button"><Trophy size={17} /> 発見</button>
            <button aria-current={activeResultTab === "memories" ? "page" : undefined} onClick={() => setActiveResultTab("memories")} type="button"><Images size={17} /> 思い出</button>
          </nav>
          {activeResultTab === "omikuji" && <>
          <article className="destination-hero omikuji-reveal-card">
            <div className="destination-kicker"><MapPin size={15} /> 最初に向かう企画 {isFallbackResult && <span>公式データから提案</span>}</div>
            {isFallbackResult && (
              <div className="fallback-notice" role="status">
                <span>案内係からのお知らせ</span>
                <p>案内所が混み合っているため、公式企画から一枚を選びました。</p>
              </div>
            )}
            <h1>{result.mission.target_spot}</h1>
            <div className="destination-location">
              <strong>{missionSpot?.location || "公式案内で場所を確認"}</strong>
              {missionSpot && <span>{missionSpot.category}</span>}
            </div>
            {missionSpot && (missionSpot.schedule || missionSpot.price || missionSpot.capacity || missionSpot.notice) && (
              <dl className="project-conditions">
                {missionSpot.schedule && <div><dt>時間</dt><dd>{missionSpot.schedule}</dd></div>}
                {missionSpot.price && <div><dt>料金</dt><dd>{missionSpot.price}</dd></div>}
                {missionSpot.capacity && <div><dt>定員</dt><dd>{missionSpot.capacity}</dd></div>}
                {missionSpot.notice && <div><dt>案内</dt><dd>{missionSpot.notice}</dd></div>}
              </dl>
            )}
            <div className="destination-mission"><small>次にすること</small><strong>目的地へ向かい、入口の案内を確認</strong><p>{result.mission.description}</p></div>
            <div className="route-map" id="festival-route" aria-label={`おみくじブース S103から${missionSpot?.location || "目的地"}までのエリア案内`}>
              <div className="route-map-heading"><span>会場案内</span><strong>道しるべをたどろう</strong></div>
              <div className="lantern-route">
                <div className="lantern-route-line" aria-hidden="true" />
                <div className="lantern-stop">
                  <span className="lantern-mark">一</span>
                  <div><small>出発</small><strong>おみくじ受付</strong><span>S103</span></div>
                </div>
                <div className="lantern-stop">
                  <span className="lantern-mark">二</span>
                  <div><small>目印にするエリア</small><strong>{destinationPoint.zone}</strong><span>案内表示を目印に進む</span></div>
                </div>
                <div className="lantern-stop lantern-stop-goal">
                  <span className="lantern-mark">三</span>
                  <div><small>目的地</small><strong>{missionSpot?.location || "目的地"}</strong><span>入口の案内を確認</span></div>
                </div>
              </div>
              <small className="map-disclaimer">会場内の通路は、現地の案内表示にしたがってお進みください。</small>
            </div>
            <a className="destination-primary-button" href="#festival-route"><MapPin size={18} /> 道しるべを見る</a>
            <a className="official-project-button" href="https://ku-bdsfes.pages.dev/projects" rel="noreferrer" target="_blank">企画の詳細を見る</a>
          </article>
          <section className="rally-progress" aria-labelledby="rally-title">
            <div className="rally-progress-heading">
              <div><span>寄り道御朱印帳</span><h2 id="rally-title">三つの印を集めよう</h2></div>
              <strong aria-label={`3つ中${[true, missionComplete, Boolean(discoveryResult?.rally_complete)].filter(Boolean).length}つ達成`}>{[true, missionComplete, Boolean(discoveryResult?.rally_complete)].filter(Boolean).length}/3</strong>
            </div>
            <div
              aria-label="寄り道あそびの進捗"
              aria-valuemax={3}
              aria-valuemin={0}
              aria-valuenow={[true, missionComplete, Boolean(discoveryResult?.rally_complete)].filter(Boolean).length}
              className="rally-progress-bar"
              role="progressbar"
            >
              <span style={{ width: `${([true, missionComplete, Boolean(discoveryResult?.rally_complete)].filter(Boolean).length / 3) * 100}%` }} />
            </div>
            <div className="rally-stamps">
              <div className="rally-stamp rally-stamp-complete"><span>一</span><small>運勢</small><strong>出発</strong></div>
              <div className={`rally-stamp ${missionComplete ? "rally-stamp-complete" : ""}`}><span>二</span><small>現地ミッション</small><strong>{missionComplete ? "達成" : "未達成"}</strong></div>
              <div className={`rally-stamp ${discoveryResult?.rally_complete ? "rally-stamp-complete" : ""}`}><span>三</span><small>お題フォト</small><strong>{discoveryResult?.rally_complete ? "達成" : "未達成"}</strong></div>
            </div>
            <p className="rally-next-label">
              <Sparkles size={14} />
              {missionComplete && discoveryResult?.rally_complete ? "三つの印がそろいました" : missionComplete ? "次は、お題の一枚を奉納しよう" : "まずは目的地で、お題を達成しよう"}
            </p>
            <button className="rally-next-button" onClick={() => setActiveResultTab("discovery")} type="button">
              {missionComplete && discoveryResult?.rally_complete ? <><Trophy size={16} /> 三つの印を集めた！</> : <><ArrowRight size={16} /> {missionComplete ? "お題の一枚を奉納する" : "現地のお題を見る"}</>}
            </button>
          </section>
          <div className="result-heading">
            <div className="result-paper-kicker"><span>奉納</span> 今日の御神籤授与札 <small>寄り道神社</small></div>
            <Image alt="" className="result-sparkle" height={80} src="/sparkle-clean.png" unoptimized width={80} />
            <div className="eyebrow"><Star size={14} fill="currentColor" /> 今日の御神籤</div>
            <p>三つの印を納めたあなたへ</p>
            <h1 aria-label={result.fortune_name} className={getFortuneNameSize(result.fortune_name)}>
              {Array.from(result.fortune_name).map((char, index) => (
                <span aria-hidden="true" className="fortune-char" key={index} style={{ "--i": index } as CSSProperties}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </h1>
            <div className="result-seal"><Star size={18} fill="currentColor" /> 授与済</div>
          </div>
          <blockquote>{result.message}</blockquote>
          <aside className="lucky-summary">
            <span>今日のラッキー</span>
            <strong>{result.lucky_elements.color}</strong>
            <strong>{result.lucky_elements.food}</strong>
            <strong>{result.lucky_elements.spot}</strong>
          </aside>
          {result.compatibility_note && (
            <div aria-live="polite" className="ai-panel">
              <h3>同行の相性</h3>
              <p>{result.compatibility_note}</p>
            </div>
          )}
          <div className="action-tip"><Star size={20} fill="currentColor" /><div><small>運をひらく一言</small><p>{result.action_tip}</p></div></div>
          <div className="result-actions">
            <button className="same-conditions-button" disabled={isLoading} onClick={requestFortune} type="button"><RefreshCw size={18} /> 同じ条件で別の企画</button>
            <button className="redraw-button" onClick={reset} type="button"><ArrowLeft size={18} /> 回答を変更する</button>
          </div>
          </>}
          {activeResultTab === "discovery" && <>
          <header className="tab-section-heading"><span>到着したら</span><h2>企画の中で発見しよう</h2><p>お題、なぞなぞ、発見カメラをここにまとめました。</p></header>
          <div className="result-grid">
            <article className={`mission-block ${missionComplete ? "mission-complete" : ""}`}>
              <div className="block-label"><span>お題</span> 到着したら</div>
              <h2>{result.mission.title}</h2>
              <p>{result.mission.description}</p>
              <button
                aria-pressed={missionComplete}
                className="mission-button"
                onClick={celebrateMission}
                type="button"
              >
                <CircleCheckBig size={18} /> {missionComplete ? "ミッション達成！" : "達成した！"}
              </button>
              {missionComplete && (
                <div className="mission-stamp" role="status">
                  お題<br /><strong>達成</strong>
                  {stampParticles.map((particle, index) => (
                    <span
                      aria-hidden="true"
                      className="stamp-particle"
                      key={index}
                      style={{ "--dx": `${particle.dx}px`, "--dy": `${particle.dy}px` } as CSSProperties}
                    />
                  ))}
                </div>
              )}
              <details className="proof-accordion">
                <summary><Camera size={15} /> 発見カメラで遊ぶ <span>写真は任意</span></summary>
                {result.mission.riddle && (
                  <form
                    className="riddle-box"
                    onSubmit={(event) => {
                      event.preventDefault();
                      checkRiddle();
                    }}
                  >
                    <div className="block-label"><span>問</span> なぞなぞ</div>
                    <p>{result.mission.riddle}</p>
                    <input
                      onChange={(event) => setRiddleAnswer(event.target.value)}
                      placeholder="答えを入力してEnter"
                      type="text"
                      value={riddleAnswer}
                    />
                    <button className="ai-button" disabled={!riddleAnswer.trim() || isCheckingRiddle} type="submit">
                      {isCheckingRiddle ? <RefreshCw className="spin" size={14} /> : <HelpCircle size={14} />} 答え合わせ
                    </button>
                    {riddleResult && (
                      <p aria-live="polite" className={riddleResult.correct ? "riddle-correct" : "riddle-incorrect"}>
                        {riddleResult.feedback}
                      </p>
                    )}
                  </form>
                )}
                <div className="photo-box">
                  <div className="block-label"><span>発見</span> 今日の一枚を残す</div>
                  <div className="photo-rally-task"><Trophy size={15} /><div><small>今日のお題フォトラリー</small><strong>{photoRallyPrompt}</strong></div></div>
                  <label className="ai-button">
                    <Camera size={14} /> 発見を撮る・選ぶ
                    <input accept="image/*" hidden onChange={handlePhotoSelect} type="file" />
                  </label>
                  <p className="privacy-hint">写真は発見コメントを作るために送信し、このアプリには保存しません。しおり用の写真は、この端末の画面上で最大3枚だけ保持します。</p>
                  {photoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="今日の発見の写真プレビュー" className="photo-preview" src={photoPreview} />
                  )}
                  {photoPreview && (
                    <button className="discovery-button" disabled={isVerifying} onClick={createDiscoveryStamp} type="button">
                      {isVerifying ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />} 発見スタンプをもらう
                    </button>
                  )}
                  {discoveryResult && (
                    <div className="discovery-result" aria-live="polite">
                      <div className="discovery-stamp"><Sparkles size={17} /><strong>{discoveryResult.stamp_title}</strong></div>
                      <p>{discoveryResult.comment}</p>
                      <div className={discoveryResult.rally_complete ? "rally-result rally-complete" : "rally-result"}>{discoveryResult.rally_complete ? <Check size={14} /> : <Sparkles size={14} />}{discoveryResult.rally_complete ? "お題フォトラリーもクリア！" : "お題とは別の発見も素敵！"}</div>
                      <div className="next-stop"><small>次の寄り道</small><strong>{discoveryResult.next_spot}</strong><span>このあと立ち寄るなら</span></div>
                      <div className="discovery-card-unlock"><BookMarked size={15} /><div><small>魅力カードを解除</small><strong>{discoveryResult.card_title}</strong><p>{discoveryResult.card_message}</p></div></div>
                    </div>
                  )}
                </div>
              </details>
            </article>
          </div>
          </>}
          {activeResultTab === "memories" && <>
          <header className="tab-section-heading"><span>今日の記録</span><h2>思い出を持ち帰ろう</h2><p>しおり、お守りカード、今日のまとめを作れます。</p></header>
          <details className="extras-accordion">
            <summary><BookMarked size={14} /> 思い出を残す</summary>
            <div className="ai-tools">
              <button className="ai-button" disabled={isNarrating} onClick={playNarration} type="button">
                {isNarrating ? <RefreshCw className="spin" size={14} /> : <Volume2 size={14} />} 音声で聞く
              </button>
              <button className="ai-button" disabled={isGeneratingCard} onClick={generateCard} type="button">
                {isGeneratingCard ? <RefreshCw className="spin" size={14} /> : <Wand2 size={14} />} お守りカードを作る
              </button>
            </div>
            {narrationUrl && <audio autoPlay className="narration-player" controls src={narrationUrl} />}
            {card && (
              <div className="card-opening" aria-live="polite">
                <div className="card-envelope" aria-hidden="true"><span className="envelope-back" /><span className="envelope-flap" /></div>
                <div
                  className="omamori-card"
                  style={isValidHex(card.accentHex) ? ({ "--accent": card.accentHex } as CSSProperties) : undefined}
                >
                  <span className="omamori-seal">御守</span>
                  <strong>{result.fortune_name}</strong>
                  <p>{card.phrase}</p>
                  <small>{result.mission.target_spot}</small>
                </div>
              </div>
            )}
            <div aria-live="polite" className="ai-panel chat-panel">
              <h3><MessageCircle size={14} /> 巫女さんに聞いてみる</h3>
              {chatMessages.length === 0 && <p className="chat-hint">運勢やミッションについて気になることを聞いてみましょう</p>}
              <div className="chat-log">
                {chatMessages.map((entry, index) => (
                  <p className={`chat-bubble ${entry.role === "user" ? "chat-bubble-user" : "chat-bubble-model"}`} key={index}>
                    {entry.text}
                  </p>
                ))}
              </div>
              <form className="chat-form" onSubmit={sendChatMessage}>
                <input
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="例：一人でもできる？(Enterで送信)"
                  type="text"
                  value={chatInput}
                />
                <button className="ai-button" disabled={!chatInput.trim() || isChatting} type="submit">
                  {isChatting ? <RefreshCw className="spin" size={14} /> : <Send size={14} />}
                </button>
              </form>
            </div>
            <div aria-live="polite" className="ai-panel">
              <h3><BookOpen size={14} /> 今日のまとめ</h3>
              {history.length >= 2 ? (
                summaryText ? (
                  <p>{summaryText}</p>
                ) : (
                  <button className="ai-button" disabled={isSummarizing} onClick={fetchSummary} type="button">
                    {isSummarizing ? <RefreshCw className="spin" size={14} /> : <BookOpen size={14} />} 今日のまとめを聞く
                  </button>
                )
              ) : (
                <p className="chat-hint">あと{2 - history.length}回引くと「今日のまとめ」を聞けます</p>
              )}
            </div>
            <div className="memory-bookmark-panel" aria-live="polite">
              <h3><Images size={15} /> 今日の思い出しおり</h3>
              {memories.length === 0 ? <p>発見カメラで写真を1枚撮ると、ここに思い出をまとめられます。</p> : (
                <>
                  <div className="memory-strip">
                    {memories.map((memory) => (
                      <figure key={memory.image}>
                        {/* Photos are local data URLs chosen by the visitor, so Next.js image optimization cannot process them. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt={`${memory.spot}での発見`} src={memory.image} />
                        <figcaption>{memory.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                  {!bookmark ? <button className="ai-button" disabled={isCreatingBookmark} onClick={createBookmark} type="button">{isCreatingBookmark ? <RefreshCw className="spin" size={14} /> : <Images size={14} />} しおりを作る（最大3枚）</button> : (
                    <div className="bookmark-preview"><small>BDSF 2026 · 寄り道おみくじ</small><strong>{bookmark.title}</strong><p>{bookmark.closingComment}</p><button className="ai-button" onClick={exportBookmark} type="button"><Share2 size={14} /> 画像を保存・共有</button></div>
                  )}
                </>
              )}
            </div>
            {discoveryCards.length > 0 && (
              <div className="discovery-collection">
                <h3><BookMarked size={15} /> BDSF発見カード {discoveryCards.length}</h3>
                <div>{discoveryCards.slice(-6).reverse().map((card) => <article key={card.spot}><small>{card.spot}</small><strong>{card.title}</strong><p>{card.message}</p></article>)}</div>
              </div>
            )}
          </details>
          </>}
          <nav className="result-tabbar result-tabbar-bottom" aria-label="結果画面のメニュー">
            <button aria-current={activeResultTab === "omikuji" ? "page" : undefined} onClick={() => setActiveResultTab("omikuji")} type="button"><Star size={18} /> おみくじ</button>
            <button aria-current={activeResultTab === "discovery" ? "page" : undefined} onClick={() => setActiveResultTab("discovery")} type="button"><Trophy size={18} /> 発見</button>
            <button aria-current={activeResultTab === "memories" ? "page" : undefined} onClick={() => setActiveResultTab("memories")} type="button"><Images size={18} /> 思い出</button>
          </nav>
        </section>
      )}
      {toast && <div aria-live="polite" className="toast" role="status">{toast}</div>}
      {isLoading && (
        <div className={`drawing-overlay ${isSuzuPulling ? "drawing-pulling" : ""}`} role="status" aria-live="polite">
          <div className="drawing-scene">
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                aria-hidden="true"
                className="float-particle"
                key={index}
                style={{ left: `${8 + index * 15}%`, "--i": index } as CSSProperties}
              />
            ))}
            <Image alt="" className="drawing-sparkle drawing-sparkle-one" height={72} src="/sparkle-clean.png" unoptimized width={72} />
            <Image alt="" className="drawing-sparkle drawing-sparkle-two" height={46} src="/sparkle-clean.png" unoptimized width={46} />
            <Image
              alt="運勢を読み解く寄り道おみくじの案内キャラクター"
              className="drawing-mascot"
              height={205}
              src="/mascot-clean.png"
              unoptimized
              width={400}
            />
            <div className={`drawing-omikuji-slip ${isSuzuPulling ? "" : "drawing-omikuji-slip-visible"}`} aria-hidden="true">
              <span>今日の御神籤</span>
              <strong>授与札</strong>
              <small>寄り道神社</small>
            </div>
          </div>
          <strong>{isSuzuPulling ? "鈴緒を引いています" : "御神籤を整えています"}</strong>
          <span className="drawing-prayer">鈴緒を引いて、今日の運を授かります</span>
          <div className="project-roulette" aria-hidden="true">
            <small>次の企画候補</small>
            <span key={rouletteSpot}>{rouletteSpot}</span>
          </div>
          <span className="loading-message" key={loadingMessageIndex}>{loadingMessages[loadingMessageIndex]}</span>
        </div>
      )}
      {confetti.length > 0 && (
        <div className="confetti-layer" aria-hidden="true">
          {confetti.map((piece) => (
            <span
              className="confetti-piece"
              key={piece.id}
              style={{
                left: `${piece.left}%`,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            />
          ))}
        </div>
      )}
      <footer>BDSF 寄り道おみくじ <span>·</span> 学園祭を楽しむためのエンターテインメントです</footer>
    </main>
  );
}
