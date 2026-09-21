"use client";

import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, CircleCheckBig, HelpCircle, MapPin, MessageCircle, RefreshCw, Send, Sparkles, Star, Utensils, Volume2, Wand2 } from "lucide-react";
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
  const [mood, setMood] = useState("");
  const [goal, setGoal] = useState("");
  const [companion, setCompanion] = useState("");
  const [mbti, setMbti] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const [error, setError] = useState("");
  const [isPunching, setIsPunching] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; delay: number; duration: number }[]>([]);
  const [partnerMood, setPartnerMood] = useState("");
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleResult, setRiddleResult] = useState<{ correct: boolean; feedback: string } | null>(null);
  const [isCheckingRiddle, setIsCheckingRiddle] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; comment: string } | null>(null);
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
  const [rouletteSpot, setRouletteSpot] = useState(spots[0].name);
  const [selectionReaction, setSelectionReaction] = useState<{ message: string; motion: string; key: number } | null>(null);
  const reactionTimer = useRef<number | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 3600);
  }

  const canSubmit = Boolean(mood && goal && companion && !isLoading);
  const selectionCount = [mood, goal, companion].filter(Boolean).length;
  const mascotMessage = selectionReaction?.message || (selectionCount === 3 ? "準備OK！運勢を引こう" : selectionCount ? `あと${3 - selectionCount}つ教えてね` : "一緒に運勢を探そう");
  const missionSpot = result ? spots.find((spot) => spot.name === result.mission.target_spot) : undefined;
  const destinationPoint = getLocationPoint(missionSpot?.location);

  function reactToSelection(message: string, motion: string) {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setSelectionReaction({ message, motion, key: Date.now() });
    reactionTimer.current = window.setTimeout(() => setSelectionReaction(null), 1100);
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
    let index = Math.floor(Math.random() * spots.length);
    const timer = window.setInterval(() => {
      index = (index + 1 + Math.floor(Math.random() * 5)) % spots.length;
      setRouletteSpot(spots[index].name);
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
      const stored = window.localStorage.getItem("omikuji-history");
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

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

  async function draw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPunching(true);
    window.setTimeout(() => setIsPunching(false), 380);
    setIsLoading(true);
    setMissionComplete(false);
    setRiddleAnswer("");
    setRiddleResult(null);
    setPhotoPreview(null);
    setVerifyResult(null);
    setCard(null);
    setNarrationUrl(null);
    setChatMessages([]);
    setChatInput("");
    setSummaryText("");
    try {
      const [response] = await Promise.all([
        fetch("/api/omikuji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, goal, companion, mbti: mbti || undefined, partnerMood: partnerMood || undefined }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1400)),
      ]);
      if (!response.ok) throw new Error("おみくじを引けませんでした。少し待って、もう一度お試しください。");
      const data = (await response.json()) as Result;
      setRouletteSpot(data.mission.target_spot);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 620));
      }
      withViewTransition(() => setResult(data));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setIsResetting(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      setResult(null);
      setError("");
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
    } catch (cardRequestError) {
      showToast(cardRequestError instanceof Error ? cardRequestError.message : "通信エラーが発生しました。");
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
    } catch (riddleRequestError) {
      showToast(riddleRequestError instanceof Error ? riddleRequestError.message : "通信エラーが発生しました。");
    } finally {
      setIsCheckingRiddle(false);
    }
  }

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setVerifyResult(null);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function verifyPhoto() {
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
        }),
      });
      if (!response.ok) throw new Error("写真の確認に失敗しました。");
      const data = (await response.json()) as { verified: boolean; comment: string };
      setVerifyResult(data);
      if (data.verified && !missionComplete) celebrateMission();
    } catch (verifyRequestError) {
      showToast(verifyRequestError instanceof Error ? verifyRequestError.message : "通信エラーが発生しました。");
    } finally {
      setIsVerifying(false);
    }
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
    } catch (chatRequestError) {
      showToast(chatRequestError instanceof Error ? chatRequestError.message : "通信エラーが発生しました。");
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
    } catch (summaryRequestError) {
      showToast(summaryRequestError instanceof Error ? summaryRequestError.message : "通信エラーが発生しました。");
    } finally {
      setIsSummarizing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="超パーソナルAIおみくじ トップ">
          <span className="brand-mark"><Image alt="" height={38} priority src="/sparkle-clean.png" unoptimized width={38} /></span>
          <span>超パーソナル<br /><strong>AIおみくじ</strong></span>
        </a>
        <span className="festival-tag">BDSF 2026</span>
      </header>

      {!result ? (
        <div className="input-layout" id="top">
          <section className="intro-panel">
            <div className="eyebrow"><Star size={14} fill="currentColor" /> FESTIVAL FORTUNE</div>
            <h1>今日のあなたに、<br /><em>最高の寄り道</em>を。</h1>
            <p>いまの気分を選ぶだけ。AIがBDSF 2026の出店企画から、あなただけの運勢と小さなミッションを届けます。</p>
            <div className={`mascot-stage mascot-progress-${selectionCount} ${selectionReaction ? `mascot-${selectionReaction.motion}` : ""}`}>
              <div className="booth-sign" aria-hidden="true">AI FORTUNE BOOTH <span>01</span></div>
              <div className="mascot-visual">
                <Image
                  alt="虹色の瞳を持つAIおみくじの案内キャラクター"
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
              <div className="phone-prop" aria-hidden="true">
                <div className="phone-speaker" />
                <div className="phone-screen">
                  <span className="phone-orb">✦</span>
                  <small>AIおみくじ</small>
                  <strong>今日の<br />寄り道</strong>
                </div>
                <span className="phone-button" />
              </div>
              <Image alt="" className="stage-sparkle stage-sparkle-large" height={78} src="/sparkle-clean.png" unoptimized width={78} />
              <Image alt="" className="stage-sparkle stage-sparkle-small" height={38} src="/sparkle-clean.png" unoptimized width={38} />
              <span className="mascot-caption" aria-live="polite" key={selectionReaction?.key || "idle"}>{mascotMessage}</span>
            </div>
            <div className="privacy-note"><Check size={16} /> 入力内容は AI おみくじの生成に使用されます</div>
          </section>

          <section className="form-panel" aria-labelledby="form-title">
            <div className="form-heading">
              <span>01</span>
              <div><p>3つ選んで運勢をひらく</p><h2 id="form-title">いまのあなたを教えて</h2></div>
            </div>
            <div className="form-progress" aria-hidden="true">
              <div className="form-progress-fill" style={{ width: `${(selectionCount / 3) * 100}%` }} />
            </div>
            <form onSubmit={draw}>
              <ChoiceField legend="今の気分は？" name="mood" choices={moods} value={mood} onChange={(value) => { setMood(value); reactToSelection(`${value}な気分、受け取ったよ！`, "tilt-left"); }} />
              <ChoiceField legend="今日の目的は？" name="goal" choices={goals} value={goal} onChange={(value) => { setGoal(value); reactToSelection(`${value}にぴったりの企画を探すね`, "tilt-right"); }} />
              <fieldset className="form-section">
                <legend>誰と来た？</legend>
                <div className="segment-control">
                  {companions.map((choice) => (
                    <label key={choice} className={companion === choice ? "segment-selected" : ""}>
                      <input checked={companion === choice} name="companion" onChange={() => { setCompanion(choice); reactToSelection(`${choice}で楽しめる寄り道にしよう！`, "bounce"); }} type="radio" />
                      {choice}
                    </label>
                  ))}
                </div>
              </fieldset>
              {companion && companion !== "ひとり" && (
                <div className="form-section">
                  <label className="select-label" htmlFor="partnerMood">同行者の気分は？ <span>任意・相性診断</span></label>
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
              {error && <p className="error-message" role="alert">{error}</p>}
              <div className="draw-dock">
                <button className={`draw-button ${isPunching ? "button-punch" : ""}`} disabled={!canSubmit} type="submit">
                  {isLoading ? (
                    <><RefreshCw className="spin" size={20} /> 運勢を読み解いています...</>
                  ) : canSubmit ? (
                    <>おみくじを引く <ArrowRight size={20} /></>
                  ) : (
                    <>あと{3 - selectionCount}つ選ぶ <ArrowRight size={20} /></>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : (
        <section className={`result-view ${isResetting ? "result-leaving" : ""}`} aria-live="polite">
          <button className="back-button" onClick={reset} type="button"><ArrowLeft size={18} /> 選び直す</button>
          <div className="result-heading">
            <Image alt="" className="result-sparkle" height={80} src="/sparkle-clean.png" unoptimized width={80} />
            <div className="eyebrow"><Sparkles size={14} /> YOUR FESTIVAL FORTUNE</div>
            <p>今日のあなたの運勢は</p>
            <h1 aria-label={result.fortune_name} className={getFortuneNameSize(result.fortune_name)}>
              {Array.from(result.fortune_name).map((char, index) => (
                <span aria-hidden="true" className="fortune-char" key={index} style={{ "--i": index } as CSSProperties}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </h1>
            <div className="result-seal"><Star size={18} fill="currentColor" /> AI御籤</div>
          </div>
          <blockquote>{result.message}</blockquote>
          <div className="result-grid">
            <article className={`mission-block ${missionComplete ? "mission-complete" : ""}`}>
              <div className="block-label"><span>MISSION</span> 今日の小さな冒険</div>
              <h2>{result.mission.title}</h2>
              <p>{result.mission.description}</p>
              <div className="spot-strip">
                <MapPin size={22} />
                <div>
                  <small>おすすめスポット</small><strong>{result.mission.target_spot}</strong>
                  {missionSpot && <span>{missionSpot.location} · {missionSpot.category}</span>}
                  <a href="https://ku-bdsfes.pages.dev/projects" rel="noreferrer" target="_blank">公式の企画・模擬店一覧を確認</a>
                </div>
              </div>
              <div className="route-map" aria-label={`AIおみくじブース S103から${missionSpot?.location || "目的地"}までの簡易案内`}>
                <div className="route-map-heading"><span>ROUTE</span><strong>会場を巡ろう</strong></div>
                <div className="route-canvas">
                  <span className="map-grid-line map-grid-line-one" />
                  <span className="map-grid-line map-grid-line-two" />
                  <svg aria-hidden="true" className="route-line" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d={`M 50 66 Q 50 42 ${destinationPoint.x} ${destinationPoint.y}`} pathLength="1" />
                  </svg>
                  <span className="route-point route-start" style={{ left: "50%", top: "66%" }}><i />AIおみくじ<br />S103</span>
                  <span className="route-point route-goal" style={{ left: `${destinationPoint.x}%`, top: `${destinationPoint.y}%` }}><i />目的地<br />{destinationPoint.zone}</span>
                </div>
                <p><MapPin size={13} /> {missionSpot?.location || "公式案内で場所を確認してください"}</p>
              </div>
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
                  MISSION<br /><strong>達成</strong>
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
                <summary>他の方法で達成を証明する <span>任意</span></summary>
                {result.mission.riddle && (
                  <form
                    className="riddle-box"
                    onSubmit={(event) => {
                      event.preventDefault();
                      checkRiddle();
                    }}
                  >
                    <div className="block-label"><span>QUIZ</span> なぞなぞ</div>
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
                  <div className="block-label"><span>PHOTO</span> 写真でミッション達成を証明</div>
                  <label className="ai-button">
                    <Camera size={14} /> 写真を選ぶ
                    <input accept="image/*" hidden onChange={handlePhotoSelect} type="file" />
                  </label>
                  <p className="privacy-hint">写真は AI に送信して判定します。このアプリには保存しません</p>
                  {photoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="ミッションの証拠写真プレビュー" className="photo-preview" src={photoPreview} />
                  )}
                  {photoPreview && (
                    <button className="ai-button" disabled={isVerifying} onClick={verifyPhoto} type="button">
                      {isVerifying ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />} AIに確認してもらう
                    </button>
                  )}
                  {verifyResult && (
                    <p aria-live="polite" className={verifyResult.verified ? "riddle-correct" : "riddle-incorrect"}>
                      {verifyResult.comment}
                    </p>
                  )}
                </div>
              </details>
            </article>
            <aside className="lucky-block">
              <div className="block-label"><span>LUCKY</span> 今日の引き寄せ</div>
              <dl>
                <div><dt><span className="color-dot" /> COLOR</dt><dd>{result.lucky_elements.color}</dd></div>
                <div><dt><Utensils size={15} /> FOOD</dt><dd>{result.lucky_elements.food}</dd></div>
                <div><dt><MapPin size={15} /> SPOT</dt><dd>{result.lucky_elements.spot}</dd></div>
              </dl>
            </aside>
          </div>
          {result.compatibility_note && (
            <div aria-live="polite" className="ai-panel">
              <h3>相性診断</h3>
              <p>{result.compatibility_note}</p>
            </div>
          )}
          <div className="action-tip"><Sparkles size={20} /><div><small>運をひらくアクション</small><p>{result.action_tip}</p></div></div>
          <details className="extras-accordion">
            <summary><Sparkles size={14} /> もっと楽しむ</summary>
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
              <h3><MessageCircle size={14} /> AIにもっと聞いてみる</h3>
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
          </details>
          <button className="redraw-button" onClick={reset} type="button"><RefreshCw size={18} /> もう一度引く</button>
        </section>
      )}
      {toast && <div aria-live="polite" className="toast" role="status">{toast}</div>}
      {isLoading && (
        <div className="drawing-overlay" role="status" aria-live="polite">
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
              alt="運勢を読み解くAIおみくじの案内キャラクター"
              className="drawing-mascot"
              height={205}
              src="/mascot-clean.png"
              unoptimized
              width={400}
            />
          </div>
          <strong>運勢を読み解いています</strong>
          <div className="project-roulette" aria-hidden="true">
            <small>NEXT PROJECT</small>
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
      <footer>超パーソナルAIおみくじ <span>·</span> 学園祭を楽しむためのエンターテインメントです</footer>
    </main>
  );
}
