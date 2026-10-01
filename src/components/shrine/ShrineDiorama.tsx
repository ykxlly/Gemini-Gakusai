// 箱庭ジオラマ: 鳥居・キャラ・鈴緒・きらめきを一つの枠内に接地配置する。
// 地面ストリップを基準線に、鳥居は背景に植え、キャラは手前で接地させる。
// セリフチップは枠の外（下）に配置する。
"use client";

import Image from "next/image";
import { memo } from "react";

export type DioramaProps = {
  isSuzuPulling: boolean;
  selectionCount: number;
  selectionReaction: { message: string; motion: string; key: number } | null;
  mascotMessage: string;
};

function ShrineDiorama({ isSuzuPulling, selectionCount, selectionReaction, mascotMessage }: DioramaProps) {
  return (
    <>
      <div
        className={`mascot-stage shrine-stage diorama ${isSuzuPulling ? "suzu-pulling-stage" : ""} mascot-progress-${selectionCount} ${selectionReaction ? `mascot-${selectionReaction.motion}` : ""}`}
      >
        <Image
          alt=""
          aria-hidden="true"
          className="diorama-bg"
          fill
          priority
          sizes="(max-width: 428px) 100vw, 428px"
          src="/shrine-bg.png"
          unoptimized
        />
        <div className="diorama-veil" aria-hidden="true" />
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
        <span className="suzu-rope" aria-hidden="true">
          <i />
        </span>
        <Image
          alt=""
          className="stage-sparkle stage-sparkle-large"
          height={78}
          src="/sparkle-clean.png"
          unoptimized
          width={78}
        />
        <Image
          alt=""
          className="stage-sparkle stage-sparkle-small"
          height={38}
          src="/sparkle-clean.png"
          unoptimized
          width={38}
        />
        <div className="diorama-ground" aria-hidden="true" />
      </div>
      <span className="mascot-caption" aria-live="polite" key={selectionReaction?.key || "idle"}>
        {mascotMessage}
      </span>
    </>
  );
}

export default memo(ShrineDiorama);
