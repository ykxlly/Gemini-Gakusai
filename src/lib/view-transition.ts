// View Transition API の存在確認つきラッパー。対応ブラウザでのみ遷移アニメを使う。
import { flushSync } from "react-dom";

export function withViewTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}
