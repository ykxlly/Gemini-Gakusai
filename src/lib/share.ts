// S1「結果をシェア」用。Web Share API → クリップボードの二段フォールバック。
import { copy } from "@/lib/copy";
import type { Result } from "@/lib/fortune";

export async function shareFortune(
  result: Result,
  notify: (message: string) => void,
): Promise<void> {
  const shareText = `【BDSF 寄り道おみくじ】今日の運勢は「${result.fortune_name}」！最初に向かう企画は「${result.mission.target_spot}」。\n#BDSF2026 #寄り道おみくじ`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: `BDSF 寄り道おみくじ - ${result.fortune_name}`,
        text: shareText,
        url: window.location.href,
      });
      return;
    } catch (shareErr) {
      if (shareErr instanceof DOMException && shareErr.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
    notify(copy.result.shareCopied);
  } catch {
    notify(copy.result.shareCopyFailed);
  }
}
