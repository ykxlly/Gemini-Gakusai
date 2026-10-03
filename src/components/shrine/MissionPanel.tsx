
// S2 ミッション: 企画に着いたら「行きました！」を押すだけの自己申告制。
// お題フォト・なぞなぞ・発見カメラは撤去。主役は大きい達成ボタン1つ。
"use client";

import { ArrowLeft, CircleCheckBig, MapPin } from "lucide-react";
import { memo } from "react";
import { copy } from "@/lib/copy";
import type { FestivalSpot, Result } from "@/lib/fortune";

export type MissionPanelProps = {
  result: Result;
  missionSpot: FestivalSpot | undefined;
  onArrived: () => void;
  onBackToResult: () => void;
};

function MissionPanel({ result, missionSpot, onArrived, onBackToResult }: MissionPanelProps) {
  return (
    <>
      <button className="back-button" onClick={onBackToResult} type="button">
        <ArrowLeft size={18} /> おみくじ結果に戻る
      </button>
      <header className="tab-section-heading">
        <span>{copy.mission.headingPrefix}</span>
        <h2>{copy.mission.arrivedHeading}</h2>
        <p>{copy.mission.arrivedLead}</p>
      </header>
      <article className="mission-block">
        <div className="block-label">
          <span>{copy.mission.headingPrefix}</span> 今日の寄り道先
        </div>
        <h2>{result.mission.title}</h2>
        <div className="mission-place">
          <MapPin size={17} aria-hidden="true" />
          <div>
            <small>{copy.mission.placeLabel}</small>
            <strong>{missionSpot?.location || result.mission.target_spot}</strong>
          </div>
        </div>
        <div className="mission-task">
          <small>{copy.mission.taskLabel}</small>
          <p>{result.mission.description}</p>
        </div>
        <button className="arrived-button" onClick={onArrived} type="button">
          <CircleCheckBig size={22} /> {copy.mission.arrivedCta}
        </button>
        <p className="arrived-note">{copy.mission.arrivedNote}</p>
      </article>
    </>
  );
}

export default memo(MissionPanel);
