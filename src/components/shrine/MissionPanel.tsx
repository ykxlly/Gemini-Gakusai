
// S2 ミッション行動: 手動達成・なぞなぞ・発見カメラ。印がそろえば交換へ誘導する。
"use client";

import { ArrowLeft, ArrowRight, BookMarked, Camera, Check, CircleCheckBig, HelpCircle, RefreshCw, Sparkles, Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { memo } from "react";
import { copy } from "@/lib/copy";
import type { DiscoveryResult, Result } from "@/lib/fortune";

const stampParticles = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * Math.PI * 2;
  return { dx: Math.round(Math.cos(angle) * 34), dy: Math.round(Math.sin(angle) * 34) };
});

export type MissionPanelProps = {
  result: Result;
  missionComplete: boolean;
  onToggleMission: () => void;
  riddleAnswer: string;
  setRiddleAnswer: (value: string) => void;
  riddleResult: { correct: boolean; feedback: string } | null;
  isCheckingRiddle: boolean;
  onCheckRiddle: () => void;
  photoRallyPrompt: string;
  photoPreview: string | null;
  onPhotoSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isVerifying: boolean;
  discoveryResult: DiscoveryResult | null;
  rallyComplete: boolean;
  onCreateStamp: () => void;
  onBackToResult: () => void;
  onComplete: () => void;
};

function MissionPanel(props: MissionPanelProps) {
  const {
    result, missionComplete, onToggleMission,
    riddleAnswer, setRiddleAnswer, riddleResult, isCheckingRiddle, onCheckRiddle,
    photoRallyPrompt, photoPreview, onPhotoSelect,
    isVerifying, discoveryResult, rallyComplete, onCreateStamp, onBackToResult, onComplete,
  } = props;
  const stampsComplete = missionComplete && discoveryResult !== null;

  return (
    <>
      <button className="back-button" onClick={onBackToResult} type="button">
        <ArrowLeft size={18} /> おみくじ結果に戻る
      </button>
      <header className="tab-section-heading">
        <span>到着したら</span>
        <h2>企画の中で発見しよう</h2>
        <p>お題、なぞなぞ、発見カメラをここにまとめました。</p>
      </header>
      <div className="result-grid">
        <article className={`mission-block ${missionComplete ? "mission-complete" : ""}`}>
          <div className="block-label">
            <span>{copy.mission.headingPrefix}</span> 到着したら
          </div>
          <h2>{result.mission.title}</h2>
          <p>{result.mission.description}</p>
          <button
            aria-pressed={missionComplete}
            className="mission-button"
            onClick={onToggleMission}
            type="button"
          >
            <CircleCheckBig size={18} /> {missionComplete ? "ミッション達成！" : copy.mission.manualCta}
          </button>
          {missionComplete && (
            <div className="mission-stamp" role="status">
              お題
              <br />
              <strong>達成</strong>
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
            <summary>
              <Camera size={15} /> 発見カメラで遊ぶ <span>写真は任意</span>
            </summary>
            {result.mission.riddle && (
              <form
                className="riddle-box"
                onSubmit={(event) => {
                  event.preventDefault();
                  onCheckRiddle();
                }}
              >
                <div className="block-label">
                  <span>問</span> なぞなぞ
                </div>
                <p>{result.mission.riddle}</p>
                <input
                  onChange={(event) => setRiddleAnswer(event.target.value)}
                  placeholder="答えを入力してEnter"
                  type="text"
                  value={riddleAnswer}
                />
                <button
                  className="ai-button"
                  disabled={!riddleAnswer.trim() || isCheckingRiddle}
                  type="submit"
                >
                  {isCheckingRiddle ? <RefreshCw className="spin" size={14} /> : <HelpCircle size={14} />}{" "}
                  {copy.mission.riddleSubmit}
                </button>
                {riddleResult && (
                  <p
                    aria-live="polite"
                    className={riddleResult.correct ? "riddle-correct" : "riddle-incorrect"}
                  >
                    {riddleResult.feedback}
                  </p>
                )}
              </form>
            )}
            <div className="photo-box">
              <div className="block-label">
                <span>発見</span> 今日の一枚を残す
              </div>
              <div className="photo-rally-task">
                <Trophy size={15} />
                <div>
                  <small>今日のお題フォトラリー</small>
                  <strong>{photoRallyPrompt}</strong>
                </div>
              </div>
              <label className="ai-button">
                <Camera size={14} /> 発見を撮る・選ぶ
                <input accept="image/*" hidden onChange={onPhotoSelect} type="file" />
              </label>
              <p className="privacy-hint">{copy.top.privacyNote}しおり用の写真は、この端末の画面上で最大3枚だけ保持します。</p>
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="今日の発見の写真プレビュー" className="photo-preview" src={photoPreview} />
              )}
              {photoPreview && (
                <button
                  className="discovery-button"
                  disabled={isVerifying}
                  onClick={onCreateStamp}
                  type="button"
                >
                  {isVerifying ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />}{" "}
                  発見スタンプをもらう
                </button>
              )}
              {discoveryResult && (
                <div className="discovery-result" aria-live="polite">
                  <div className="discovery-stamp">
                    <Sparkles size={17} />
                    <strong>{discoveryResult.stamp_title}</strong>
                  </div>
                  <p>{discoveryResult.comment}</p>
                  <div className={discoveryResult.rally_complete ? "rally-result rally-complete" : "rally-result"}>
                    {discoveryResult.rally_complete ? <Check size={14} /> : <Sparkles size={14} />}
                    {discoveryResult.rally_complete ? "お題フォトラリーもクリア！" : "お題とは別の発見も素敵！"}
                  </div>
                  <div className="next-stop">
                    <small>次の寄り道</small>
                    <strong>{discoveryResult.next_spot}</strong>
                    <span>このあと立ち寄るなら</span>
                  </div>
                  <div className="discovery-card-unlock">
                    <BookMarked size={15} />
                    <div>
                      <small>魅力カードを解除</small>
                      <strong>{discoveryResult.card_title}</strong>
                      <p>{discoveryResult.card_message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </details>
        </article>
      </div>
      {stampsComplete && (
        <button className="rally-next-button" onClick={onComplete} type="button">
          <ArrowRight size={16} /> {rallyComplete ? copy.mission.completeCta : copy.mission.checkRewardCta}
        </button>
      )}
    </>
  );
}

export default memo(MissionPanel);
