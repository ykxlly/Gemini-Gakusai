
// S1 結果: 運勢（筆文字・大きく）＋「おすすめの場所はここ！」が主役。
// 代案2件・ラッキー要素・相性コメント・「もう一回引く」「シェア」で完結する。
"use client";

import { ArrowLeft, MapPin, RefreshCw, Share2, Star } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { memo, useState } from "react";
import { copy } from "@/lib/copy";
import { getSpotByName, type Result } from "@/lib/fortune";

function getFortuneNameSize(name: string) {
  const length = Array.from(name.replace(/\s/g, "")).length;
  if (length >= 14) return "fortune-name-compact";
  if (length >= 10) return "fortune-name-medium";
  return "fortune-name-short";
}

function ResultHero({
  result,
  isFallbackResult,
  nickname,
  onRedraw,
  onChangeAnswer,
  onShare,
}: {
  result: Result;
  isFallbackResult: boolean;
  nickname: string;
  onRedraw: () => void;
  onChangeAnswer: () => void;
  onShare: () => void;
}) {
  const recommendationSpot = getSpotByName(result.recommendation.spot);
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
        <ArrowLeft size={18} /> {copy.result.changeAnswer}
      </button>

      {/* 1. 運勢（大きく・筆文字）＋一言 */}
      <article className="result-heading omikuji-reveal-card">
        <div className="result-paper-kicker">
          <span>奉納</span> 今日の御神籤授与札 <small>{copy.site.shrineName}</small>
        </div>
        <Image alt="" className="result-sparkle" height={80} src="/sparkle-clean.png" unoptimized width={80} />
        <div className="eyebrow">
          <Star size={14} fill="currentColor" /> 今日の御神籤
        </div>
        <p>{copy.result.fortuneLineLabel}</p>
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
      </article>
      <p className="fortune-line">{result.fortune_line}</p>
      <blockquote className="washi-slip">{result.message}</blockquote>

      {/* 2. おすすめの場所（ここが主役） */}
      <article className="destination-hero omikuji-reveal-card">
        <div className="destination-kicker">
          <MapPin size={15} />
          {isFallbackResult ? copy.result.recommendHeadingPlain : copy.result.recommendHeading(nickname)}
          {isFallbackResult && <span>{copy.result.fallbackBadge}</span>}
        </div>
        {isFallbackResult && (
          <div className="fallback-notice" role="status">
            <span>{copy.result.fallbackNoticeTitle}</span>
            <p>{copy.result.fallbackNoticeBody}</p>
          </div>
        )}
        <h1>{result.recommendation.spot}</h1>
        <div className="destination-location">
          <strong>
            <MapPin size={17} aria-hidden="true" /> {recommendationSpot?.location || copy.result.placeLabel}
          </strong>
          {recommendationSpot && <span>{recommendationSpot.category}</span>}
        </div>
        <div className="recommend-reason">
          <small>{copy.result.reasonLabel}</small>
          <p>{result.recommendation.reason}</p>
        </div>
        {recommendationSpot &&
          (recommendationSpot.schedule || recommendationSpot.price || recommendationSpot.capacity || recommendationSpot.notice) && (
            <dl className="project-conditions">
              {recommendationSpot.schedule && (
                <div>
                  <dt>時間</dt>
                  <dd>{recommendationSpot.schedule}</dd>
                </div>
              )}
              {recommendationSpot.price && (
                <div>
                  <dt>料金</dt>
                  <dd>{recommendationSpot.price}</dd>
                </div>
              )}
              {recommendationSpot.capacity && (
                <div>
                  <dt>定員</dt>
                  <dd>{recommendationSpot.capacity}</dd>
                </div>
              )}
              {recommendationSpot.notice && (
                <div>
                  <dt>案内</dt>
                  <dd>{recommendationSpot.notice}</dd>
                </div>
              )}
            </dl>
          )}
        <a
          className="official-project-button"
          href="https://ku-bdsfes.pages.dev/projects"
          rel="noreferrer"
          target="_blank"
        >
          企画の詳細を見る
        </a>
      </article>

      {/* 3. ほかにもおすすめ（2件・小さめ） */}
      <section className="alternatives" aria-label={copy.result.alternativesHeading}>
        <h2>{copy.result.alternativesHeading}</h2>
        <div className="alternatives-list">
          {result.alternatives.map((alternative) => {
            const spot = getSpotByName(alternative.spot);
            return (
              <article className="alternative-item" key={alternative.spot}>
                <strong>{alternative.spot}</strong>
                <span>
                  <MapPin size={13} aria-hidden="true" /> {spot?.location || "会場内"}
                </span>
                <p>{alternative.reason}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. ラッキー要素 */}
      <aside className="lucky-summary">
        <span>{copy.result.luckyHeading}</span>
        <strong>{result.lucky_elements.color}</strong>
        <strong>{result.lucky_elements.food}</strong>
      </aside>

      {/* 同行者の気分があれば相性コメント */}
      {result.compatibility_note && (
        <div aria-live="polite" className="ai-panel">
          <h3>同行の相性</h3>
          <p>{result.compatibility_note}</p>
        </div>
      )}

      {/* 5. アクション */}
      <div className="result-actions">
        <button className="same-conditions-button" onClick={onRedraw} type="button">
          <RefreshCw size={18} /> {copy.result.redrawCta}
        </button>
        <button className="share-fortune-button" disabled={isSharing} onClick={handleShareClick} type="button">
          {isSharing ? <RefreshCw className="spin" size={18} /> : <Share2 size={18} />}{" "}
          {isSharing ? copy.result.sharing : copy.result.share}
        </button>
      </div>
    </>
  );
}

export default memo(ResultHero);
