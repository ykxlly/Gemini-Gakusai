
// S1 結果: 運勢（筆文字・大きく）＋「おすすめの場所はここ！」が主役。
// 代案2件・ラッキー要素・相性コメント・「もう一回引く」「シェア」で完結する。
"use client";

import { ArrowLeft, MapPin, RefreshCw, Share2, Star } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { memo, useState } from "react";
import Moffy, { type MoffyMotion } from "@/components/shrine/Moffy";
import { copy } from "@/lib/copy";
import { getSpotByName, type Result } from "@/lib/fortune";

// 運勢名を「サービス名」と「吉の部分」に分ける。横書きで1行に収まらない長い名前は2行にする。
const FORTUNE_TIER_SUFFIXES = ["超大吉", "大吉", "中吉", "小吉", "末吉"] as const;

// 英単語はひとかたまり（inline-block）にして、単語途中の改行を防ぐ。
// CJKは1文字ずつ。空白は文字にせず、マージンとして表現する。
function FortuneChars({ text, offset }: { text: string; offset: number }) {
  const parts = text.split(/(\s+)/).filter(Boolean);
  const nodes: React.ReactNode[] = [];
  let index = offset;
  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const part = parts[partIndex];
    if (/^\s+$/.test(part)) continue;
    const hasTrailingSpace = partIndex + 1 < parts.length && /^\s+$/.test(parts[partIndex + 1]);
    const gapClass = hasTrailingSpace ? " fortune-word-gap" : "";
    if (/^[A-Za-z0-9'’!.]+$/.test(part)) {
      nodes.push(
        <span aria-hidden="true" className={`fortune-char fortune-word${gapClass}`} key={index} style={{ "--i": index } as CSSProperties}>
          {part}
        </span>,
      );
      index += 1;
    } else {
      for (const char of Array.from(part)) {
        nodes.push(
          <span aria-hidden="true" className={`fortune-char${gapClass}`} key={index} style={{ "--i": index } as CSSProperties}>
            {char}
          </span>,
        );
        index += 1;
      }
    }
  }
  return <>{nodes}</>;
}

function splitFortuneName(name: string): { service: string; tier: string; isLong: boolean } {
  const tier = FORTUNE_TIER_SUFFIXES.find((suffix) => name.endsWith(suffix)) ?? "";
  const service = tier ? name.slice(0, name.length - tier.length).trimEnd() : name;
  const estimatedWidth = (text: string) =>
    Array.from(text).reduce((width, char) => width + (char.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0) * 44;
  const isLong = estimatedWidth(service) + estimatedWidth(tier) > 280;
  return { service, tier, isLong };
}

// 運勢の段位でMoffyのリアクションを変える。
function moffyMotionFor(tier: string): MoffyMotion {
  if (tier === "超大吉") return "cry";
  if (tier === "大吉") return "jump";
  if (tier === "末吉") return "nod";
  return "sway";
}

function FortuneName({ name }: { name: string }) {
  const { service, tier, isLong } = splitFortuneName(name);
  const serviceText = service || name;
  return (
    <h1 aria-label={name} className={`fortune-name ${isLong ? "fortune-name-long" : ""}`}>
      <span className="fortune-service">
        <FortuneChars text={serviceText} offset={0} />
      </span>
      {tier && (
        <span className="fortune-tier">
          <FortuneChars text={tier} offset={Array.from(serviceText).length} />
        </span>
      )}
    </h1>
  );
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
        <FortuneName name={result.fortune_name} />
        <div className="result-seal">
          <Star size={18} fill="currentColor" /> 授与済
        </div>
      </article>
      <p className="fortune-line">{result.fortune_line}</p>
      <Moffy
        message={
          result.fortune_tier === "末吉"
            ? `${copy.moffy.nodLead}${result.message}`
            : result.message
        }
        motion={moffyMotionFor(result.fortune_tier)}
        motionKey={result.fortune_name}
        size="result"
      />

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
        <div className="place-band">
          <small>{copy.result.placeLabel}</small>
          <strong>
            <MapPin size={19} aria-hidden="true" /> {recommendationSpot?.location || "会場の案内図を確認"}
          </strong>
        </div>
        {recommendationSpot && <span className="destination-category">{recommendationSpot.category}</span>}
        {recommendationSpot && <p className="spot-vibe">{recommendationSpot.vibe}</p>}
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
                <span className="alternative-place">
                  <MapPin size={15} aria-hidden="true" /> {spot?.location || "会場内"}
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
