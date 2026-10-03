
// S1 結果: 行き先hero + 運勢本文 + ラッキー要素 + 副導線。
"use client";

import { ArrowLeft, MapPin, RefreshCw, Share2, Star } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { memo, useState } from "react";
import RallyProgress from "@/components/shrine/RallyProgress";
import { copy } from "@/lib/copy";
import { getLocationPoint, type FestivalSpot, type Result } from "@/lib/fortune";

function getFortuneNameSize(name: string) {
  const length = Array.from(name.replace(/\s/g, "")).length;
  if (length >= 14) return "fortune-name-compact";
  if (length >= 10) return "fortune-name-medium";
  return "fortune-name-short";
}

function ResultHero({
  result,
  isFallbackResult,
  missionSpot,
  missionComplete,
  isLoading,
  onGoMission,
  onGoReward,
  onRetrySame,
  onChangeAnswer,
  onShare,
}: {
  result: Result;
  isFallbackResult: boolean;
  missionSpot: FestivalSpot | undefined;
  missionComplete: boolean;
  isLoading: boolean;
  onGoMission: () => void;
  onGoReward: () => void;
  onRetrySame: () => void;
  onChangeAnswer: () => void;
  onShare: () => void;
}) {
  const destinationPoint = getLocationPoint(missionSpot?.location);
  const [isSharing, setIsSharing] = useState(false);

  async function handleShareClick() {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await onShare();
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <button className="back-button" onClick={onChangeAnswer} type="button">
        <ArrowLeft size={18} /> 選び直す
      </button>
      <article className="destination-hero omikuji-reveal-card">
        <div className="destination-kicker">
          <MapPin size={15} /> {copy.result.destinationKicker}{" "}
          {isFallbackResult && <span>{copy.result.fallbackBadge}</span>}
        </div>
        {isFallbackResult && (
          <div className="fallback-notice" role="status">
            <span>{copy.result.fallbackNoticeTitle}</span>
            <p>{copy.result.fallbackNoticeBody}</p>
          </div>
        )}
        <h1>{result.mission.target_spot}</h1>
        <div className="destination-location">
          <strong>{missionSpot?.location || "公式案内で場所を確認"}</strong>
          {missionSpot && <span>{missionSpot.category}</span>}
        </div>
        {missionSpot &&
          (missionSpot.schedule || missionSpot.price || missionSpot.capacity || missionSpot.notice) && (
            <dl className="project-conditions">
              {missionSpot.schedule && (
                <div>
                  <dt>時間</dt>
                  <dd>{missionSpot.schedule}</dd>
                </div>
              )}
              {missionSpot.price && (
                <div>
                  <dt>料金</dt>
                  <dd>{missionSpot.price}</dd>
                </div>
              )}
              {missionSpot.capacity && (
                <div>
                  <dt>定員</dt>
                  <dd>{missionSpot.capacity}</dd>
                </div>
              )}
              {missionSpot.notice && (
                <div>
                  <dt>案内</dt>
                  <dd>{missionSpot.notice}</dd>
                </div>
              )}
            </dl>
          )}
        <div className="destination-mission">
          <small>次にすること</small>
          <strong>目的地へ向かい、入口の案内を確認</strong>
          <p>{result.mission.description}</p>
        </div>
        <div
          className="route-map"
          id="festival-route"
          aria-label={`おみくじブース S103から${missionSpot?.location || "目的地"}までのエリア案内`}
        >
          <div className="route-map-heading">
            <span>会場案内</span>
            <strong>道しるべをたどろう</strong>
          </div>
          <div className="lantern-route">
            <div className="lantern-route-line" aria-hidden="true" />
            <div className="lantern-stop">
              <span className="lantern-mark">一</span>
              <div>
                <small>出発</small>
                <strong>おみくじ受付</strong>
                <span>S103</span>
              </div>
            </div>
            <div className="lantern-stop">
              <span className="lantern-mark">二</span>
              <div>
                <small>目印にするエリア</small>
                <strong>{destinationPoint.zone}</strong>
                <span>案内表示を目印に進む</span>
              </div>
            </div>
            <div className="lantern-stop lantern-stop-goal">
              <span className="lantern-mark">三</span>
              <div>
                <small>目的地</small>
                <strong>{missionSpot?.location || "目的地"}</strong>
                <span>入口の案内を確認</span>
              </div>
            </div>
          </div>
          <small className="map-disclaimer">会場内の通路は、現地の案内表示にしたがってお進みください。</small>
        </div>
        <a className="destination-primary-button" href="#festival-route">
          <MapPin size={18} /> 道しるべを見る
        </a>
        <a
          className="official-project-button"
          href="https://ku-bdsfes.pages.dev/projects"
          rel="noreferrer"
          target="_blank"
        >
          企画の詳細を見る
        </a>
      </article>
      <RallyProgress
        missionComplete={missionComplete}
        onGoMission={onGoMission}
        onGoReward={onGoReward}
      />
      <div className="result-heading">
        <div className="result-paper-kicker">
          <span>奉納</span> 今日の御神籤授与札 <small>{copy.site.shrineName}</small>
        </div>
        <Image alt="" className="result-sparkle" height={80} src="/sparkle-clean.png" unoptimized width={80} />
        <div className="eyebrow">
          <Star size={14} fill="currentColor" /> 今日の御神籤
        </div>
        <p>本日の御神籤です</p>
        <h1 aria-label={result.fortune_name} className={`fortune-vertical ${getFortuneNameSize(result.fortune_name)}`}>
          {Array.from(result.fortune_name).map((char, index) => (
            <span aria-hidden="true" className="fortune-char" key={index} style={{ "--i": index } as CSSProperties}>
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>
        <div className="result-seal">
          <Star size={18} fill="currentColor" /> 授与済
        </div>
      </div>
      <blockquote className="washi-slip">{result.message}</blockquote>
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
      <div className="action-tip">
        <Star size={20} fill="currentColor" />
        <div>
          <small>運をひらく一言</small>
          <p>{result.action_tip}</p>
        </div>
      </div>
      <div className="result-actions">
        <button className="share-fortune-button" disabled={isSharing} onClick={handleShareClick} type="button">
          {isSharing ? <RefreshCw className="spin" size={18} /> : <Share2 size={18} />}{" "}
          {isSharing ? copy.result.sharing : copy.result.share}
        </button>
        <button
          className="same-conditions-button"
          disabled={isLoading}
          onClick={onRetrySame}
          type="button"
        >
          <RefreshCw size={18} /> {copy.result.retrySame}
        </button>
        <button className="redraw-button" onClick={onChangeAnswer} type="button">
          <ArrowLeft size={18} /> {copy.result.changeAnswer}
        </button>
      </div>
    </>
  );
}

export default memo(ResultHero);
