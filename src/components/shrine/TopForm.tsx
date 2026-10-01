
// S0 Top: 神社イントロ + 3ステップ回答フォーム。
"use client";

import { ArrowLeft, ArrowRight, Bell, Check, RefreshCw, Star } from "lucide-react";
import Image from "next/image";
import type { FormEvent } from "react";
import { memo } from "react";
import { copy } from "@/lib/copy";
import { companions, goals, mbtiTypes, moods, type Choice } from "@/lib/fortune";

function ChoiceField({
  legend,
  name,
  choices,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="form-section">
      <legend>{legend}</legend>
      <div className="choice-grid">
        {choices.map((choice) => (
          <label className={`choice ${value === choice.value ? "choice-selected" : ""}`} key={choice.value}>
            <input
              checked={value === choice.value}
              name={name}
              onChange={() => onChange(choice.value)}
              type="radio"
            />
            <span className="choice-check" aria-hidden="true">
              {value === choice.value && <Check size={14} strokeWidth={3} />}
            </span>
            <span>
              <strong>{choice.label}</strong>
              <small>{choice.note}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type TopFormProps = {
  formStep: number;
  setFormStep: (step: number | ((step: number) => number)) => void;
  mood: string;
  goal: string;
  companion: string;
  mbti: string;
  partnerMood: string;
  setMbti: (value: string) => void;
  setPartnerMood: (value: string) => void;
  selectionCount: number;
  mascotMessage: string;
  selectionReaction: { message: string; motion: string; key: number } | null;
  isSuzuPulling: boolean;
  isPunching: boolean;
  isLoading: boolean;
  canSubmit: boolean;
  error: string;
  chooseAndAdvance: (
    setter: (value: string) => void,
    value: string,
    message: string,
    motion: string,
    nextStep: number,
  ) => void;
  reactToSelection: (message: string, motion: string) => void;
  setMood: (value: string) => void;
  setGoal: (value: string) => void;
  setCompanion: (value: string) => void;
  draw: (event: FormEvent<HTMLFormElement>) => void;
};

function TopForm(props: TopFormProps) {
  const {
    formStep, setFormStep, mood, goal, companion, mbti, partnerMood,
    setMbti, setPartnerMood, selectionCount, mascotMessage, selectionReaction,
    isSuzuPulling, isPunching, isLoading, canSubmit, error,
    chooseAndAdvance, reactToSelection, setMood, setGoal, setCompanion, draw,
  } = props;

  return (
    <div className="input-layout" id="top">
      <section className="intro-panel">
        <div className="shrine-counter-intro">
          <Bell aria-hidden="true" className="shrine-counter-icon" size={24} />
          <div>
            <strong>{copy.site.shrineName}</strong>
            <small>今日の運勢を授かる場所</small>
          </div>
        </div>
        <div className="eyebrow">
          <Star size={14} fill="currentColor" /> {copy.site.boothLabel}
        </div>
        <h1>
          今日の<em>寄り道</em>を<br />
          授かろう
        </h1>
        <p>{copy.top.lead}</p>
        <div
          className={`mascot-stage shrine-stage ${isSuzuPulling ? "suzu-pulling-stage" : ""} mascot-progress-${selectionCount} ${selectionReaction ? `mascot-${selectionReaction.motion}` : ""}`}
        >
          <div className="torii-mark" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>
          <div className="booth-sign" aria-hidden="true">
            {copy.site.shrineName} {copy.site.boothLabel} <span>一</span>
          </div>
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
          <span className="suzu-rope" aria-hidden="true">
            <i />
          </span>
          <span className="mascot-caption" aria-live="polite" key={selectionReaction?.key || "idle"}>
            {mascotMessage}
          </span>
        </div>
        <div className="privacy-note">
          <Check size={16} /> {copy.top.privacyNote}
        </div>
        <div
          className={`draw-progress ${selectionCount === 3 ? "draw-progress-complete" : ""}`}
          aria-label={`${copy.top.drawProgressLabel} ${selectionCount} / 3`}
        >
          <div className="draw-progress-heading">
            <span>{copy.top.drawProgressLabel}</span>
            <strong>{selectionCount}/3</strong>
          </div>
          <div className="draw-progress-marks" aria-hidden="true">
            {[copy.top.questions.mood, copy.top.questions.goal, copy.top.questions.companion].map(
              (label, index) => (
                <span className={selectionCount > index ? "draw-progress-mark-filled" : ""} key={label}>
                  <i>{selectionCount > index ? "印" : index + 1}</i>
                  <small>{label}</small>
                </span>
              ),
            )}
          </div>
          <p>{selectionCount === 3 ? copy.top.drawReady : copy.top.drawRemaining(3 - selectionCount)}</p>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="form-title">
        <div className="form-kicker">
          <span>{copy.site.boothLabel}</span>
          <strong>まずは一枚、授かろう</strong>
        </div>
        <div className="form-heading">
          <span>{["一", "二", "三"][formStep]}</span>
          <div>
            <p>
              {formStep < 2 ? `あと${2 - formStep}つ` : "最後のひとつ"} · ひとつ選ぶだけ
            </p>
            <h2 id="form-title">
              {formStep === 0
                ? copy.top.questions.mood
                : formStep === 1
                  ? copy.top.questions.goal
                  : copy.top.questions.companion}
            </h2>
          </div>
        </div>
        <p className="form-guidance">{copy.top.guidance}</p>
        <div className="form-step-tabs" aria-label="回答の進み具合">
          {[copy.top.questions.mood, copy.top.questions.goal, copy.top.questions.companion].map(
            (label, index) => (
              <button
                className={formStep === index ? "form-step-current" : ""}
                disabled={index > formStep && ![mood, goal, companion][index - 1]}
                key={label}
                onClick={() => setFormStep(index)}
                type="button"
              >
                <span>{index + 1}</span>
                {label}
              </button>
            ),
          )}
        </div>
        <div className="form-progress" aria-hidden="true">
          <div className="form-progress-fill" style={{ width: `${((formStep + 1) / 3) * 100}%` }} />
        </div>
        <form onSubmit={draw}>
          <div className="form-step-panel" key={formStep}>
            {formStep === 0 && (
              <ChoiceField
                legend="気分に近いものを選んでください"
                name="mood"
                choices={moods}
                value={mood}
                onChange={(value) =>
                  chooseAndAdvance(setMood, value, `${value}な気分、受け取ったよ！`, "tilt-left", 1)
                }
              />
            )}
            {formStep === 1 && (
              <ChoiceField
                legend="一番楽しみにしていることは？"
                name="goal"
                choices={goals}
                value={goal}
                onChange={(value) =>
                  chooseAndAdvance(setGoal, value, `${value}にぴったりの企画を探すね`, "tilt-right", 2)
                }
              />
            )}
            {formStep === 2 && (
              <>
                <fieldset className="form-section">
                  <legend>一緒に巡る人を選んでください</legend>
                  <div className="segment-control">
                    {companions.map((choice) => (
                      <label key={choice} className={companion === choice ? "segment-selected" : ""}>
                        <input
                          checked={companion === choice}
                          name="companion"
                          onChange={() => {
                            setCompanion(choice);
                            reactToSelection(`${choice}で楽しめる寄り道にしよう！`, "bounce");
                          }}
                          type="radio"
                        />
                        {choice}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <details className="advanced-options">
                  <summary>
                    おすすめを詳しく調整する <span>任意</span>
                  </summary>
                  {companion && companion !== "ひとり" && (
                    <div className="form-section">
                      <label className="select-label" htmlFor="partnerMood">
                        同行者の気分 <span>任意・相性コメントに使用</span>
                      </label>
                      <select
                        id="partnerMood"
                        value={partnerMood}
                        onChange={(event) => setPartnerMood(event.target.value)}
                      >
                        <option value="">選択しない</option>
                        {moods.map((choice) => (
                          <option key={choice.value} value={choice.value}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-section">
                    <label className="select-label" htmlFor="mbti">
                      MBTI <span>任意</span>
                    </label>
                    <select id="mbti" value={mbti} onChange={(event) => setMbti(event.target.value)}>
                      <option value="">選択しない</option>
                      {mbtiTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </details>
              </>
            )}
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="draw-dock">
            {formStep > 0 && (
              <button
                className="step-back-button"
                onClick={() => setFormStep((step) => step - 1)}
                type="button"
              >
                <ArrowLeft size={17} /> 前へ
              </button>
            )}
            {formStep < 2 ? (
              <button
                className="draw-button"
                disabled={formStep === 0 ? !mood : !goal}
                onClick={() => setFormStep((step) => step + 1)}
                type="button"
              >
                次へ <ArrowRight size={20} />
              </button>
            ) : (
              <button
                className={`draw-button ${isPunching ? "button-punch" : ""} ${isSuzuPulling ? "suzu-pull-button" : ""}`}
                disabled={!canSubmit}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="spin" size={20} /> {copy.top.submitBusy}
                  </>
                ) : companion ? (
                  <>
                    {copy.top.submit} <ArrowRight size={20} />
                  </>
                ) : (
                  <>
                    同行者を選ぶ <ArrowRight size={20} />
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

export default memo(TopForm);
