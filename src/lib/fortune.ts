// おみくじドメインの型・運勢一覧・スポット参照・重み付き選択・フォールバック生成を集約する。
import spots from "@/data/spots.json";

export type FortuneEntry = { tier: string; name: string; line: string };
export type SpotRecommendation = { spot: string; reason: string };

export type Result = {
  fortune_name: string;
  fortune_tier: string;
  fortune_line: string;
  message: string;
  compatibility_note: string;
  recommendation: SpotRecommendation;
  alternatives: SpotRecommendation[];
  lucky_elements: { color: string; food: string };
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

// 運勢はGoogleネタの固定一覧。AIは運勢を作らず、messageだけ書く。
// 重みは段位ごと（超大吉1% / 大吉30% / 中吉30% / 小吉25% / 末吉14%）。凶は作らない。
export const FORTUNES: FortuneEntry[] = [
  // 超大吉（1%）
  { tier: "超大吉", name: "Googleフル装備 超大吉", line: "全サービス同期完了。今日のあなたは無敵です" },
  // 大吉
  { tier: "大吉", name: "検索1位大吉", line: "何を探しても、一番上にあなたの答えが出てくる日" },
  { tier: "大吉", name: "I'm Feeling Lucky大吉", line: "迷わず押せば当たり。直感で動くと吉" },
  { tier: "大吉", name: "Gemini大吉", line: "頭が冴えわたる。どんな疑問にも答えが見つかる" },
  { tier: "大吉", name: "Doodle大吉", line: "今日のトップページの主役は、あなたです" },
  { tier: "大吉", name: "ストリートビュー大吉", line: "どの角を曲がっても、いい景色に出会える" },
  { tier: "大吉", name: "Nano Banana大吉", line: "思い描いたことが、そのまま形になる日" },
  // 中吉
  { tier: "中吉", name: "マップ中吉", line: "寄り道ルートに当たりあり。迷っても必ずたどり着く" },
  { tier: "中吉", name: "かこって検索中吉", line: "気になったものは、すぐ調べてすぐ行こう" },
  { tier: "中吉", name: "レンズ中吉", line: "目に入ったものの中に、今日のヒントが隠れている" },
  { tier: "中吉", name: "翻訳中吉", line: "初対面の人とも、不思議と話が通じ合う" },
  { tier: "中吉", name: "Pixel中吉", line: "今日の思い出は、全部高画質で残る" },
  { tier: "中吉", name: "消しゴムマジック中吉", line: "小さなモヤモヤは、きれいに消えていく" },
  // 小吉
  { tier: "小吉", name: "Gmail小吉", line: "うれしい知らせが受信トレイに届くかも" },
  { tier: "小吉", name: "カレンダー小吉", line: "予定のすき間に、いい出会いがぴったりハマる" },
  { tier: "小吉", name: "ドライブ小吉", line: "今日の思い出は、容量を気にせず詰め込もう" },
  { tier: "小吉", name: "Chromeタブ小吉", line: "気になる企画は全部開いてOK" },
  { tier: "小吉", name: "YouTubeおすすめ小吉", line: "偶然流れてきたものが、今日の当たり" },
  { tier: "小吉", name: "トレンド急上昇小吉", line: "今いる場所が、これからアツくなる" },
  // 末吉
  { tier: "末吉", name: "もしかして末吉", line: "「もしかして：こっち？」の寄り道に福あり" },
  { tier: "末吉", name: "読み込み中末吉", line: "くるくる…少し待てば、運はちゃんと来る" },
  { tier: "末吉", name: "恐竜ゲーム末吉", line: "オフラインでも、ジャンプし続ければ記録更新" },
  { tier: "末吉", name: "再起動末吉", line: "一回リセットすれば、全部うまくいく" },
  { tier: "末吉", name: "404末吉", line: "探し物はここじゃない。だから別の場所で大当たり" },
];

const TIER_WEIGHTS: Record<string, number> = {
  超大吉: 1,
  大吉: 30,
  中吉: 30,
  小吉: 25,
  末吉: 14,
};

// 段位の重みを同段位の企画数で等分した個別重み（事前計算）。
const FORTUNE_WEIGHTS = (() => {
  const counts: Record<string, number> = {};
  for (const fortune of FORTUNES) counts[fortune.tier] = (counts[fortune.tier] || 0) + 1;
  return FORTUNES.map((fortune) => TIER_WEIGHTS[fortune.tier] / counts[fortune.tier]);
})();

export function pickFortune(): FortuneEntry {
  const total = FORTUNE_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < FORTUNES.length; index += 1) {
    roll -= FORTUNE_WEIGHTS[index];
    if (roll <= 0) return FORTUNES[index];
  }
  return FORTUNES[FORTUNES.length - 1];
}

export const confettiColors = ["#d83a2e", "#f2c84b", "#176b57", "#ffffff"];

// 入力（目的・気分・同行者）→ カテゴリ重み。複数条件が当たった企画ほど上位になる。
const GOAL_CATEGORY_WEIGHTS: Record<string, string[]> = {
  "新しい発見": ["体験・ワークショップ", "マルシェ"],
  "おいしいもの": ["学生模擬店・フード＆ドリンク", "店舗出店・フード＆ドリンク"],
  "思い出づくり": ["体験・ワークショップ", "縁日・キッズゲーム", "マルシェ"],
  "盛り上がりたい": ["ステージ・パフォーマンス", "スポーツ・アクティビティ", "縁日・キッズゲーム"],
};

const MOOD_CATEGORY_WEIGHTS: Record<string, string[]> = {
  わくわく: ["ステージ・パフォーマンス", "縁日・キッズゲーム", "スポーツ・アクティビティ"],
  のんびり: ["体験・ワークショップ", "マルシェ"],
  "ちょっと緊張": ["体験・ワークショップ", "マルシェ"],
  "まだ決めてない": [],
};

const COMPANION_CATEGORY_WEIGHTS: Record<string, string[]> = {
  ひとり: ["体験・ワークショップ", "マルシェ"],
  友達: ["ステージ・パフォーマンス", "スポーツ・アクティビティ", "学生模擬店・フード＆ドリンク"],
  恋人: ["体験・ワークショップ", "学生模擬店・フード＆ドリンク", "店舗出店・フード＆ドリンク"],
  家族: ["縁日・キッズゲーム", "マルシェ"],
};

function scoreSpot(spot: FestivalSpot, mood: string, goal: string, companion: string): number {
  let score = 1;
  if ((GOAL_CATEGORY_WEIGHTS[goal] || []).includes(spot.category)) score += 3;
  if ((MOOD_CATEGORY_WEIGHTS[mood] || []).includes(spot.category)) score += 2;
  if ((COMPANION_CATEGORY_WEIGHTS[companion] || []).includes(spot.category)) score += 2;
  return score;
}

// 重み付きでおすすめ1件＋代案2件を選ぶ。上位候補の中からランダムなので、
// 同じ入力でも毎回違う場所が出る。直前のスポットは除外して単調さを防ぐ。
export function pickRecommendedSpots(
  mood: string,
  goal: string,
  companion: string,
  previousSpot?: string,
): { recommendation: FestivalSpot; alternatives: FestivalSpot[] } {
  const ranked = festivalSpots
    .filter((spot) => spot.name !== previousSpot)
    .map((spot) => ({ spot, score: scoreSpot(spot, mood, goal, companion) }))
    .sort((a, b) => b.score - a.score);

  const topPool = ranked.slice(0, Math.min(6, ranked.length)).map((entry) => entry.spot);
  const shuffled = [...topPool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }

  const recommendation = shuffled[0] || festivalSpots[0];
  const alternatives = shuffled.slice(1, 3);
  while (alternatives.length < 2) {
    const filler = ranked.find((entry) => entry.spot.name !== recommendation.name && !alternatives.some((alt) => alt.name === entry.spot.name));
    if (!filler) break;
    alternatives.push(filler.spot);
  }
  return { recommendation, alternatives };
}

export function getSpotByName(name: string | undefined): FestivalSpot | undefined {
  if (!name) return undefined;
  return festivalSpots.find((spot) => spot.name === name);
}

// API失敗時に公式企画データから選び直すフォールバック。運勢は固定一覧から選ぶ。
export function createFallbackResult(
  mood: string,
  goal: string,
  companion: string,
  nickname: string,
  previousSpot?: string,
): Result {
  const fortune = pickFortune();
  const { recommendation, alternatives } = pickRecommendedSpots(mood, goal, companion, previousSpot);
  const call = nickname ? `${nickname}さん` : "あなた";
  const companionText = companion === "ひとり" ? "自分のペースで" : `${companion}と一緒に`;
  return {
    fortune_name: fortune.name,
    fortune_tier: fortune.tier,
    fortune_line: fortune.line,
    message: `${call}の「${mood}」×「${goal}」。${companionText}、今日は気になった企画に足を向けてみよう。小さな寄り道が、きっといい発見になる。`,
    compatibility_note: "",
    recommendation: {
      spot: recommendation.name,
      reason: `${call}の「${mood}」×「${goal}」×「${companion}」に合わせて選びました。${recommendation.vibe}。`,
    },
    alternatives: alternatives.map((spot) => ({
      spot: spot.name,
      reason: `${spot.category}なら${mood}な時間になりそう。`,
    })),
    lucky_elements: { color: "きらめく黄色", food: "会場で気になった一品" },
  };
}

export function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}
