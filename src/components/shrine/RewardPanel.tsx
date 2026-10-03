
// S3 完了画面: 寄り道達成の御朱印風スタンプ + S103でのノベルティ受け取り案内。
// 件数・条件・交換ボタン・サーバー記録は一切なし。完了＝両方もらえる。
"use client";

import { ArrowLeft, Gift, Sparkles } from "lucide-react";
import { memo } from "react";
import { copy } from "@/lib/copy";

export type RewardPanelProps = {
  achievedSpot: string | null;
  achievedAt: Date | null;
  showBack: boolean;
  onBackToTop: () => void;
};

function RewardPanel({ achievedSpot, achievedAt, showBack, onBackToTop }: RewardPanelProps) {
  const timeLabel = achievedAt
    ? achievedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <section className="booth-reward reward-complete" aria-labelledby="reward-title">
      <div className="reward-stamp" aria-hidden="true">
        <span>{copy.reward.stampTop}</span>
        <strong>{copy.reward.stampMain}</strong>
      </div>
      <div className="reward-kicker">
        <Sparkles size={16} aria-hidden="true" /> {copy.reward.kicker}
      </div>
      <h1 id="reward-title">{copy.reward.bigLine}</h1>
      <p className="reward-gift">
        <Gift size={20} aria-hidden="true" /> {copy.reward.giftLine}
      </p>
      <div className="reward-show">{copy.reward.showStaff}</div>
      {(achievedSpot || timeLabel) && (
        <dl className="reward-record">
          {achievedSpot && (
            <div>
              <dt>{copy.reward.recordSpotLabel}</dt>
              <dd>{achievedSpot}</dd>
            </div>
          )}
          {timeLabel && (
            <div>
              <dt>{copy.reward.recordTimeLabel}</dt>
              <dd>{timeLabel}</dd>
            </div>
          )}
        </dl>
      )}
      {showBack && (
        <button className="booth-reward-back" onClick={onBackToTop} type="button">
          <ArrowLeft size={16} /> {copy.reward.backToTop}
        </button>
      )}
    </section>
  );
}

export default memo(RewardPanel);
