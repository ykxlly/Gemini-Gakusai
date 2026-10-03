
// Moffy（Google公式Geminiキャラクター）: 案内役コンポーネント。
// 吹き出しセリフ + 選択・運勢リアクション + タップでランダムセリフ。
"use client";

import Image from "next/image";
import { KeyboardEvent, useCallback, useRef, useState } from "react";
import { copy } from "@/lib/copy";

export type MoffyMotion = "idle" | "tilt-left" | "tilt-right" | "bounce" | "jump" | "sway" | "nod" | "cry";

export type MoffyProps = {
  message: string;
  motion?: MoffyMotion;
  motionKey?: string | number;
  progress?: number;
  size?: "mini" | "result";
};

function Moffy({ message, motion = "idle", motionKey = "static", progress = 0, size = "mini" }: MoffyProps) {
  const [tapLine, setTapLine] = useState<{ text: string; key: number } | null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<number | null>(null);

  const handleTap = useCallback(() => {
    const lines = copy.moffy.tapLines;
    setTapLine({ text: lines[Math.floor(Math.random() * lines.length)], key: Date.now() });
    tapCount.current += 1;
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setTapLine(null), 2800);
  }, []);

  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleTap();
      }
    },
    [handleTap],
  );

  return (
    <div className={`moffy moffy-${size} moffy-progress-${progress} moffy-motion-${motion} ${tapLine ? "moffy-has-tap" : ""}`}>
      <button
        aria-label={copy.moffy.tapLabel}
        className="moffy-figure"
        onClick={handleTap}
        onKeyDown={handleKey}
        type="button"
      >
        <span className="moffy-motion-wrap" key={`${motionKey}-${motion}-${tapCount.current}`}>
          <Image
            alt=""
            aria-hidden="true"
            className="moffy-img"
            height={390}
            src="/mascot-clean.png"
            unoptimized
            width={768}
          />
          {motion === "cry" && (
            <>
              <span aria-hidden="true" className="moffy-tear moffy-tear-left" />
              <span aria-hidden="true" className="moffy-tear moffy-tear-right" />
            </>
          )}
        </span>
      </button>
      <p aria-live="polite" className="moffy-bubble">
        {tapLine ? tapLine.text : message}
      </p>
    </div>
  );
}

export default Moffy;
