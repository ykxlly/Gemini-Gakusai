
// S1直前の演出オーバーレイ: 鈴引き→授与札→ルーレット表示。
"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { copy } from "@/lib/copy";

export default function DrawingOverlay({
  isSuzuPulling,
  rouletteSpot,
  loadingMessageIndex,
}: {
  isSuzuPulling: boolean;
  rouletteSpot: string;
  loadingMessageIndex: number;
}) {
  return (
    <div
      className={`drawing-overlay ${isSuzuPulling ? "drawing-pulling" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="drawing-scene">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            aria-hidden="true"
            className="float-particle"
            key={index}
            style={{ left: `${8 + index * 15}%`, "--i": index } as CSSProperties}
          />
        ))}
        <Image
          alt=""
          className="drawing-sparkle drawing-sparkle-one"
          height={72}
          src="/sparkle-clean.png"
          unoptimized
          width={72}
        />
        <Image
          alt=""
          className="drawing-sparkle drawing-sparkle-two"
          height={46}
          src="/sparkle-clean.png"
          unoptimized
          width={46}
        />
        <Image
          alt="運勢を読み解く寄り道おみくじの案内キャラクター"
          className="drawing-mascot"
          height={205}
          src="/mascot-clean.png"
          unoptimized
          width={400}
        />
        <div
          className={`drawing-omikuji-slip ${isSuzuPulling ? "" : "drawing-omikuji-slip-visible"}`}
          aria-hidden="true"
        >
          <span>今日の御神籤</span>
          <strong>授与札</strong>
          <small>{copy.site.shrineName}</small>
        </div>
      </div>
      <strong>{isSuzuPulling ? "鈴緒を引いています" : "御神籤を整えています"}</strong>
      <span className="drawing-prayer">鈴緒を引いて、今日の運を授かります</span>
      <div className="project-roulette" aria-hidden="true">
        <small>次の企画候補</small>
        <span key={rouletteSpot}>{rouletteSpot}</span>
      </div>
      <span className="loading-message" key={loadingMessageIndex}>
        {copy.drawing.messages[loadingMessageIndex % copy.drawing.messages.length]}
      </span>
    </div>
  );
}
