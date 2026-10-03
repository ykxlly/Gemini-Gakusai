
// 進捗は3ステップだけ: 一 運勢 / 二 寄り道 / 三 S103で受け取り。
// 「次にやること」は常に1つだけ大きく見せる。
"use client";

import { ArrowRight, Gift, Sparkles } from "lucide-react";
import { memo } from "react";
import { copy } from "@/lib/copy";

function RallyProgress({
  missionComplete,
  onGoMission,
  onGoReward,
}: {
  missionComplete: boolean;
  onGoMission: () => void;
  onGoReward: () => void;
}) {
  const doneCount = missionComplete ? 2 : 1;
  const steps = [
    { mark: "一", name: copy.progress.step1Name, note: copy.progress.step1Note, done: true },
    { mark: "二", name: copy.progress.step2Name, note: copy.progress.step2Note, done: missionComplete },
    {
      mark: "三",
      name: copy.progress.step3Name(copy.site.receiveSpot),
      note: copy.progress.step3Note,
      done: false,
    },
  ];

  return (
    <section className="rally-progress" aria-labelledby="rally-title">
      <div className="rally-progress-heading">
        <div>
          <span>{copy.progress.kicker}</span>
          <h2 id="rally-title">{copy.progress.title}</h2>
        </div>
        <strong aria-label={`3歩中${doneCount}歩達成`}>{doneCount}/3</strong>
      </div>
      <div
        aria-label="寄り道の進捗"
        aria-valuemax={3}
        aria-valuemin={0}
        aria-valuenow={doneCount}
        className="rally-progress-bar"
        role="progressbar"
      >
        <span style={{ width: `${(doneCount / 3) * 100}%` }} />
      </div>
      <ol className="rally-steps">
        {steps.map((step) => (
          <li
            className={`rally-step ${step.done ? "rally-step-done" : ""} ${
              !step.done && step.mark === "二" ? "rally-step-current" : ""
            } ${step.mark === "三" && missionComplete ? "rally-step-current" : ""}`}
            key={step.mark}
          >
            <span className="rally-step-mark" aria-hidden="true">
              {step.mark}
            </span>
            <div>
              <strong>{step.name}</strong>
              <small>{step.done ? copy.progress.doneLabel : step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className="rally-next">
        <p className="rally-next-label">
          <Sparkles size={15} aria-hidden="true" />
          {copy.progress.nextLabel}
        </p>
        <button
          className="rally-next-button"
          onClick={missionComplete ? onGoReward : onGoMission}
          type="button"
        >
          {missionComplete ? (
            <>
              <Gift size={18} /> {copy.progress.goRewardCta}
            </>
          ) : (
            <>
              <ArrowRight size={18} /> {copy.progress.goMissionCta}
            </>
          )}
        </button>
      </div>
    </section>
  );
}

export default memo(RallyProgress);
