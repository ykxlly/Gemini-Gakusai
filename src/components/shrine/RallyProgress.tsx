
// 印の進捗（授与・ミッション・フォトの3印）。S1に表示し、次行動へ誘導する。
"use client";

import { ArrowRight, Sparkles, Trophy } from "lucide-react";
import { copy } from "@/lib/copy";

export default function RallyProgress({
  missionComplete,
  rallyComplete,
  onAdvance,
}: {
  missionComplete: boolean;
  rallyComplete: boolean;
  onAdvance: () => void;
}) {
  const doneCount = [true, missionComplete, rallyComplete].filter(Boolean).length;
  const complete = missionComplete && rallyComplete;

  return (
    <section className="rally-progress" aria-labelledby="rally-title">
      <div className="rally-progress-heading">
        <div>
          <span>寄り道御朱印帳</span>
          <h2 id="rally-title">三つの印を集めよう</h2>
        </div>
        <strong aria-label={`3つ中${doneCount}つ達成`}>{doneCount}/3</strong>
      </div>
      <div
        aria-label="寄り道あそびの進捗"
        aria-valuemax={3}
        aria-valuemin={0}
        aria-valuenow={doneCount}
        className="rally-progress-bar"
        role="progressbar"
      >
        <span style={{ width: `${(doneCount / 3) * 100}%` }} />
      </div>
      <div className="rally-stamps">
        <div className="rally-stamp rally-stamp-complete">
          <span>一</span>
          <small>運勢</small>
          <strong>出発</strong>
        </div>
        <div className={`rally-stamp ${missionComplete ? "rally-stamp-complete" : ""}`}>
          <span>二</span>
          <small>現地ミッション</small>
          <strong>{missionComplete ? "達成" : "未達成"}</strong>
        </div>
        <div className={`rally-stamp ${rallyComplete ? "rally-stamp-complete" : ""}`}>
          <span>三</span>
          <small>お題フォト</small>
          <strong>{rallyComplete ? "達成" : "未達成"}</strong>
        </div>
      </div>
      <p className="rally-next-label">
        <Sparkles size={14} />
        {complete
          ? "三つの印がそろいました"
          : missionComplete
            ? "次は、お題の一枚を奉納しよう"
            : "まずは目的地で、お題を達成しよう"}
      </p>
      <button className="rally-next-button" onClick={onAdvance} type="button">
        {complete ? (
          <>
            <Trophy size={16} /> {copy.mission.completeCta}
          </>
        ) : (
          <>
            <ArrowRight size={16} /> {missionComplete ? copy.mission.photoCta : copy.result.nextAction}
          </>
        )}
      </button>
    </section>
  );
}
