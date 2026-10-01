
// S3 報酬・交換: 発見カード数に応じたノベルティ交換。boothモードでは先頭表示する。
"use client";

import { Check, Gift, RefreshCw } from "lucide-react";
import { memo } from "react";
import { copy } from "@/lib/copy";
import type { NoveltyKind } from "@/lib/fortune";

function RewardPanel({
  discoveryCount,
  claimedNovelties,
  latestClaim,
  visitorId,
  staffKey,
  setStaffKey,
  claimError,
  isClaiming,
  onClaim,
  showBack,
  onBackToTop,
}: {
  discoveryCount: number;
  claimedNovelties: NoveltyKind[];
  latestClaim: NoveltyKind | null;
  visitorId: string;
  staffKey: string;
  setStaffKey: (value: string) => void;
  claimError: string;
  isClaiming: NoveltyKind | null;
  onClaim: (kind: NoveltyKind) => void;
  showBack: boolean;
  onBackToTop: () => void;
}) {
  function optionState(kind: NoveltyKind, required: number) {
    const claimed = claimedNovelties.includes(kind);
    const available = discoveryCount >= required && !claimed;
    return { claimed, available };
  }

  function renderOption(kind: NoveltyKind, required: number, name: string, seal: string, condition: string, remaining: string) {
    const { claimed, available } = optionState(kind, required);
    return (
      <article
        className={`booth-reward-option ${available ? "booth-reward-available" : ""} ${claimed ? "booth-reward-claimed" : ""}`}
      >
        <span className="booth-reward-seal">{seal}</span>
        <div>
          <small>{condition}</small>
          <h2>{name}</h2>
          <p>{claimed ? copy.reward.claimedOnDevice : available ? copy.reward.available : remaining}</p>
        </div>
        <button
          disabled={!available || isClaiming !== null}
          onClick={() => onClaim(kind)}
          type="button"
        >
          {claimed ? (
            <>
              <Check size={16} /> {copy.reward.exchanged}
            </>
          ) : isClaiming === kind ? (
            <>
              <RefreshCw className="spin" size={14} /> {copy.reward.recording}
            </>
          ) : available ? (
            copy.reward.exchange
          ) : (
            copy.reward.conditionUnmet
          )}
        </button>
      </article>
    );
  }

  return (
    <section className="booth-reward" aria-labelledby="booth-reward-title">
      <div className="booth-reward-kicker">
        <Gift size={16} /> ブース来訪特典
      </div>
      <h1 id="booth-reward-title">
        集めた印を<br />
        <em>ノベルティ</em>に交換
      </h1>
      <p className="booth-reward-lead">{copy.reward.lead}</p>
      <div className="booth-reward-count">
        <span>{copy.reward.countLabel}</span>
        <strong>
          {discoveryCount}
          <small>件</small>
        </strong>
      </div>
      {latestClaim && (
        <div className="staff-confirmation" role="status" aria-live="polite">
          <div className="staff-confirmation-status">
            <Check size={22} strokeWidth={3} />
            <span>交換済み</span>
          </div>
          <div className="staff-confirmation-main">
            <small>スタッフ確認用</small>
            <strong>{latestClaim === "sticker" ? copy.reward.stickerName : copy.reward.toteName}</strong>
            <p>この画面をスタッフに見せて、ノベルティをお受け取りください。</p>
          </div>
          <div className="staff-confirmation-meta">
            <span>
              発見カード {discoveryCount}件
            </span>
            <span>{copy.site.festival}</span>
          </div>
        </div>
      )}
      <div className="claim-ticket" aria-label="スタッフに見せる受付番号">
        <span>{copy.reward.ticketLabel}</span>
        <strong>
          {visitorId ? visitorId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase() : "------"}
        </strong>
        <p>{copy.reward.ticketHint}</p>
      </div>
      <div className="staff-key-panel">
        <label htmlFor="novelty-staff-key">{copy.reward.staffKeyLabel}</label>
        <input
          id="novelty-staff-key"
          inputMode="text"
          onChange={(event) => setStaffKey(event.target.value)}
          placeholder={copy.reward.staffKeyPlaceholder}
          type="password"
          value={staffKey}
        />
        <p>{copy.reward.staffKeyHint}</p>
      </div>
      {claimError && (
        <p className="claim-error" role="alert">
          {copy.reward.boothBusy}
          <br />
          {claimError}
        </p>
      )}
      <div className="booth-reward-options">
        {renderOption("sticker", 1, copy.reward.stickerName, "一印", copy.reward.stickerCondition, copy.reward.stickerRemaining)}
        {renderOption("tote", 3, copy.reward.toteName, "三印", copy.reward.toteCondition, copy.reward.toteRemaining(Math.max(0, 3 - discoveryCount)))}
      </div>
      <p className="booth-reward-note">{copy.reward.showToStaff}</p>
      {showBack && (
        <button className="booth-reward-back" onClick={onBackToTop} type="button">
          {copy.reward.backToTop}
        </button>
      )}
    </section>
  );
}

export default memo(RewardPanel);
