// おみくじドメインの型・スポット参照・フォールバック生成を集約する。
// OmikujiExperience.tsx からの移設元: 9-56行（型・選択肢・マスコット定数）、79-124行（位置・フォールバック）。
import spots from "@/data/spots.json";

export type Result = {
  fortune_name: string;
  message: string;
  action_tip: string;
  compatibility_note: string;
  mission: {
    title: string;
    target_spot: string;
    description: string;
  };
  lucky_elements: { color: string; food: string; spot: string };
};

export type Choice = { value: string; label: string; note: string };
export type FestivalSpot = {
  id: string;
  name: string;
  category: string;
  location: string;
  vibe: string;
  schedule?: string;
  price?: string;
  capacity?: string;
  notice?: string;
};

export const festivalSpots = spots as FestivalSpot[];

export const moods: Choice[] = [
  { value: "わくわく", label: "わくわく", note: "勢いのまま楽しみたい" },
  { value: "のんびり", label: "のんびり", note: "自分のペースで巡りたい" },
  { value: "ちょっと緊張", label: "ちょっと緊張", note: "きっかけがほしい" },
  { value: "まだ決めてない", label: "まだ決めてない", note: "偶然に任せたい" },
];

export const goals: Choice[] = [
  { value: "新しい発見", label: "新しい発見", note: "知らない世界に出会う" },
  { value: "おいしいもの", label: "おいしいもの", note: "学園祭グルメを満喫" },
  { value: "思い出づくり", label: "思い出づくり", note: "今日だけの一枚を残す" },
  { value: "盛り上がりたい", label: "盛り上がりたい", note: "音と熱気に飛び込む" },
];

export const companions = ["ひとり", "友達", "恋人", "家族"];

export const mbtiTypes = [
  "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
];

export const confettiColors = ["#d83a2e", "#f2c84b", "#176b57", "#ffffff"];

const locationPoints: Record<string, { x: number; y: number; zone: string }> = {
  "S102": { x: 73, y: 30, zone: "1階" },
  "S106": { x: 76, y: 62, zone: "1階" },
  "エントランス": { x: 48, y: 82, zone: "1階" },
  "ホール（S201）": { x: 25, y: 26, zone: "2階" },
  "S203": { x: 51, y: 27, zone: "2階" },
  "S204": { x: 73, y: 27, zone: "2階" },
  "2階エレベーター前スペース": { x: 50, y: 51, zone: "2階" },
  "中庭（東側）": { x: 72, y: 74, zone: "屋外" },
  "中庭（西側）": { x: 28, y: 74, zone: "屋外" },
  "グラウンド": { x: 14, y: 48, zone: "屋外" },
  "キャンパス祭入口・食堂": { x: 38, y: 57, zone: "食堂周辺" },
  "食堂": { x: 40, y: 48, zone: "食堂" },
};

export function getLocationPoint(location: string | undefined) {
  return (location && locationPoints[location]) || { x: 82, y: 50, zone: "公式案内を確認" };
}

export function getMissionSpot(targetSpot: string | undefined): FestivalSpot | undefined {
  if (!targetSpot) return undefined;
  return festivalSpots.find((spot) => spot.name === targetSpot);
}

export const categoryPreferences: Record<string, string[]> = {
  "新しい発見": ["体験・ワークショップ", "マルシェ"],
  "おいしいもの": ["学生模擬店・フード＆ドリンク", "店舗出店・フード＆ドリンク"],
  "思い出づくり": ["体験・ワークショップ", "縁日・キッズゲーム", "マルシェ"],
  "盛り上がりたい": ["ステージ・パフォーマンス", "スポーツ・アクティビティ", "縁日・キッズゲーム"],
};

// API失敗時に公式企画データから選び直すフォールバック。運勢名は固定「寄り道発見吉」。
export function createFallbackResult(goal: string, companion: string, previousSpot?: string): Result {
  const preferred = categoryPreferences[goal] || [];
  const candidates = festivalSpots.filter((spot) => preferred.includes(spot.category) && spot.name !== previousSpot);
  const pool = candidates.length ? candidates : festivalSpots.filter((spot) => spot.name !== previousSpot);
  const selected = pool[Math.floor(Math.random() * pool.length)] || festivalSpots[0];
  const companionText = companion === "ひとり" ? "自分のペースで" : `${companion}と一緒に`;
  return {
    fortune_name: "寄り道発見吉",
    message: "公式企画データから、今の目的に合う寄り道を選びました。現地の案内を確認しながら、気軽に楽しんでみてください。",
    action_tip: `${companionText}、企画の入口で気になったものを一つ見つけよう。`,
    compatibility_note: "",
    mission: {
      title: `${selected.name}へ行ってみよう`,
      target_spot: selected.name,
      description: `${selected.vibe}。会場に着いたら、印象に残ったものを一つ見つけてみよう。`,
    },
    lucky_elements: { color: "きらめく黄色", food: "会場で気になった一品", spot: selected.name },
  };
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}
