// View Transition API の存在確認つきラッパー。対応ブラウザでのみ遷移アニメを使う。
// 多重起動・abort時（非表示タブ等）は通常更新にフォールバックし、状態更新の欠落を防ぐ。
import { flushSync } from "react-dom";

let transitionActive = false;

export function withViewTransition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  };
  if (transitionActive || typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  try {
    transitionActive = true;
    const transition = doc.startViewTransition(() => {
      flushSync(update);
    });
    transition.finished
      .catch(() => {
        /* aborted (background tab etc.): flushSync callback already ran */
      })
      .finally(() => {
        transitionActive = false;
      });
  } catch {
    transitionActive = false;
    update();
  }
}
