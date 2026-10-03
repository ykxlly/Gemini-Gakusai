// S1「結果をシェア」用。Web Share API → Clipboard API → execCommand の三段フォールバック。
// どの経路でも必ずトースト通知し、「押しても何も起きない」をなくす。
import { copy } from "@/lib/copy";
import type { Result } from "@/lib/fortune";

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

export async function shareFortune(
  result: Result,
  notify: (message: string) => void,
): Promise<void> {
  const shareText = `【BDSF 寄り道おみくじ】今日の運勢は「${result.fortune_name}」！おすすめの場所は「${result.recommendation.spot}」。\n#BDSF2026 #寄り道おみくじ`;
  const fullText = `${shareText}\n${window.location.href}`;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: `BDSF 寄り道おみくじ - ${result.fortune_name}`,
        text: shareText,
        url: window.location.href,
      });
      notify(copy.result.shareOpened);
      return;
    } catch (shareErr) {
      // キャンセルは沈黙し、それ以外の失敗はクリップボードへフォールバックする。
      if (shareErr instanceof DOMException && shareErr.name === "AbortError") return;
    }
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(fullText);
      notify(copy.result.shareCopied);
      return;
    } catch {
      /* 権限拒否等はレガシー手段へフォールバックする */
    }
  }

  if (legacyCopy(fullText)) {
    notify(copy.result.shareCopied);
  } else {
    notify(copy.result.shareCopyFailed);
  }
}
