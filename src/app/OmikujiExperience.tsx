"use client";

import { ArrowLeft, ArrowRight, Check, CircleCheckBig, MapPin, RefreshCw, Sparkles, Star, Utensils } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import spots from "@/data/spots.json";

type Result = {
  fortune_name: string;
  message: string;
  action_tip: string;
  mission: { title: string; target_spot: string; description: string };
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

function getFortuneNameSize(name: string) {
  const length = Array.from(name.replace(/\s/g, "")).length;
  if (length >= 14) return "fortune-name-compact";
  if (length >= 10) return "fortune-name-medium";
  return "fortune-name-short";
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

  const canSubmit = Boolean(mood && goal && companion && !isLoading);
  const selectionCount = [mood, goal, companion].filter(Boolean).length;
  const mascotMessage = selectionCount === 3 ? "準備OK！運勢を引こう" : selectionCount ? `あと${3 - selectionCount}つ教えてね` : "一緒に運勢を探そう";
  const missionSpot = result ? spots.find((spot) => spot.name === result.mission.target_spot) : undefined;

  async function draw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    setMissionComplete(false);
    try {
      const [response] = await Promise.all([
        fetch("/api/omikuji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, goal, companion, mbti: mbti || undefined }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1400)),
      ]);
      if (!response.ok) throw new Error("おみくじを引けませんでした。少し待って、もう一度お試しください。");
      setResult((await response.json()) as Result);
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

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="超パーソナルAIおみくじ トップ">
          <span className="brand-mark"><Image alt="" height={38} priority src="/sparkle-clean.png" unoptimized width={38} /></span>
          <span>超パーソナル<br /><strong>AIおみくじ</strong></span>
        </a>
        <span className="festival-tag">文化祭 2026</span>
      </header>

      {!result ? (
        <div className="input-layout" id="top">
          <section className="intro-panel">
            <div className="eyebrow"><Star size={14} fill="currentColor" /> FESTIVAL FORTUNE</div>
            <h1>今日のあなたに、<br /><em>最高の寄り道</em>を。</h1>
            <p>いまの気分を選ぶだけ。AIが学園祭のスポットから、あなただけの運勢と小さなミッションを届けます。</p>
            <div className={`mascot-stage mascot-progress-${selectionCount}`}>
              <Image
                alt="虹色の瞳を持つAIおみくじの案内キャラクター"
                className="mascot-image"
                height={390}
                priority
                src="/mascot-clean.png"
                unoptimized
                width={760}
              />
              <Image alt="" className="stage-sparkle stage-sparkle-large" height={78} src="/sparkle-clean.png" unoptimized width={78} />
              <Image alt="" className="stage-sparkle stage-sparkle-small" height={38} src="/sparkle-clean.png" unoptimized width={38} />
              <span className="mascot-caption" aria-live="polite">{mascotMessage}</span>
            </div>
            <div className="privacy-note"><Check size={16} /> 入力内容は診断や分析には使用しません</div>
          </section>

          <section className="form-panel" aria-labelledby="form-title">
            <div className="form-heading">
              <span>01</span>
              <div><p>3つ選んで運勢をひらく</p><h2 id="form-title">いまのあなたを教えて</h2></div>
            </div>
            <form onSubmit={draw}>
              <ChoiceField legend="今の気分は？" name="mood" choices={moods} value={mood} onChange={setMood} />
              <ChoiceField legend="今日の目的は？" name="goal" choices={goals} value={goal} onChange={setGoal} />
              <fieldset className="form-section">
                <legend>誰と来た？</legend>
                <div className="segment-control">
                  {companions.map((choice) => (
                    <label key={choice} className={companion === choice ? "segment-selected" : ""}>
                      <input checked={companion === choice} name="companion" onChange={() => setCompanion(choice)} type="radio" />
                      {choice}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="form-section">
                <label className="select-label" htmlFor="mbti">MBTI <span>任意</span></label>
                <select id="mbti" value={mbti} onChange={(event) => setMbti(event.target.value)}>
                  <option value="">選択しない</option>
                  {mbtiTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
              <div className="draw-dock">
                <button className="draw-button" disabled={!canSubmit} type="submit">
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
            <h1 className={getFortuneNameSize(result.fortune_name)}>{result.fortune_name}</h1>
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
                </div>
              </div>
              <button
                aria-pressed={missionComplete}
                className="mission-button"
                onClick={() => setMissionComplete((complete) => !complete)}
                type="button"
              >
                <CircleCheckBig size={18} /> {missionComplete ? "ミッション達成！" : "達成した！"}
              </button>
              {missionComplete && <div className="mission-stamp" role="status">MISSION<br /><strong>達成</strong></div>}
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
          <div className="action-tip"><Sparkles size={20} /><div><small>運をひらくアクション</small><p>{result.action_tip}</p></div></div>
          <button className="redraw-button" onClick={reset} type="button"><RefreshCw size={18} /> もう一度引く</button>
        </section>
      )}
      {isLoading && (
        <div className="drawing-overlay" role="status" aria-live="polite">
          <div className="drawing-scene">
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
          <span>今日の寄り道を選んでいます...</span>
        </div>
      )}
      <footer>超パーソナルAIおみくじ <span>·</span> 学園祭を楽しむためのエンターテインメントです</footer>
    </main>
  );
}
