# ステップ1: IA / 画面遷移 + 文言定義 v1（承認用）

方向性: おみくじ主役化「おみくじ→ミッション→発見→ノベルティ」1ループ。祭りガイド・思い出は裏動線へ。
現行根拠: `src/app/OmikujiExperience.tsx` 3タブ (`omikuji|discovery|memories`) + `?booth=novelty` 常時 `booth-reward` + `rally-progress 3/3` が `omikuji` タブ内に埋没。これを直線化する。

## 1. 画面遷移図（新IA・4画面のみ）

```
[S0 Top #top] ──鈴を鳴らす──> [S1 おみくじ結果] ──現地のお題を見る──> [S2 ミッション行動] ──印が貯まる──> [S3 報酬・交換]
     │                              │                                    │                              │
     │                              ├─ 同じ条件で別企画 (再引 /api/omikuji)  │                              │
     │                              ├─ 回答を変える (S0へ戻る)              ├─ なぞなぞ (local正規化→/api/omikuji/riddle) │
     │                              └─ [裏] 思い出ボタン (右下常駐) ──> 別シートへ  ├─ 発見カメラ (→/api/omikuji/verify) ─┘
     │                                                                             │
     └─ [裏] はじめての方へ (details)                                               └─ 手動達成 (現地申告ボタン)
```

| ID | 画面名 | URL/状態 | 主目的 | 主CTA（1つのみ） | 副導線 |
|----|--------|----------|--------|------------------|--------|
| S0 | Top | `#top`, `result==null` | 3問で引く | 「鈴緒を引いて授かる」 | ※入力内容と写真はAIによる判定のみに使用され、保存されることはありません、思い出を見る（履歴10件） |
| S1 | おみくじ結果 | `result!=null`, 旧`omikuji`タブ | 行き先を1件だけ決める | 「現地のお題を見る」 | 同じ条件で別企画 / 回答を変える / シェア |
| S2 | ミッション行動 | 旧`discovery`タブを直線化 | 印を2つ集める | 「お題の一枚を奉納する」（写真） | なぞなぞで1印 / 手動達成（現地に着いた） |
| S3 | 報酬・交換 | 旧`booth-reward` + `rally-progress`統合 | 交換条件を明示 | 「交換する（スタッフに見せる）」 | 受付番号表示、`?booth=novelty`ではS3を先頭に |
| 裏 | 思い出 | 旧`memories`タブを分離 | 7機能の待避所 | 「思い出を開く」（FAB） | カード/音声/チャット/まとめ/しおり/発見カード一覧 |

状態機械: `idle(S0) → drawing(overlay) → result(S1) → mission(S2) → reward_ready(S3)`。`missionComplete(bool)` + `discoveryResult?.rally_complete(bool)` + おみくじ授与(true固定) = 3/3でS3解錠。既存 `rally-progress` の `[true, missionComplete, rally_complete]` 計算をそのまま流用。

保存（既存キー維持）:
- `omikuji-visitor-id` (UUID、受付番号=末尾6桁)
- `omikuji-history` (最大10件、`fortune_name+message`)
- `omikuji-discovery-cards` (最大24件維持、S3条件は1件/3件）
- `omikuji-novelty-claims` + `omikuji-latest-novelty-claim`
- `memories/photoPreview/narrationUrl` は永続化しない（現行通り・プライバシー）

API対応（Step3最小ループ）:
- S0→S1: `POST /api/omikuji {mood,goal,companion,mbti?,partnerMood?}` → `Result`（`target_spot enum:spots.json 35件`検証済み）
- S2なぞなぞ: ローカル正規化（NFKC/小文字/空白記号除去）一致→即正解、 else `POST /api/omikuji/riddle`
- S2写真: `POST /api/omikuji/verify {spot,missionDescription,imageBase64(≤2MB),mimeType,rallyPrompt}` → `DiscoveryResult{stamp_title,comment,caption,rally_complete,card_title,card_message,next_spot}`
- S3交換: `POST /api/novelty/claim {visitorId,noveltyKind:sticker(≥1)|tote(≥3),discoveryCount,staffKey}` → Supabase `novelty_claims`
- 範囲外（裏へ）: `card/narrate/chat/summary/bookmark` はS1/S2から呼ばない

## 2. 文言定義（トーン: 明るい案内人、断定・医療・心理評価なし、時刻捏造なし）

### S0 Top
- 見出し: 「BDSF 寄り道おみくじ」
- リード: 「今の気分を教えてください。AIがあなたにぴったりの『寄り道』を導き出します。」
- Q1: 「今の気分は？」 わくわく / のんびり / ちょっと緊張 / まだ決めてない
- Q2: 「今日の目的は？」 新しい発見 / おいしいもの / 思い出づくり / 盛り上がりたい
- Q3: 「誰と巡る？」 ひとり / 友達 / 恋人 / 家族
- 任意: 「MBTI（任意）」「同行者の気分（任意）」
- 主CTA: 「鈴緒を引いて授かる」
- 補助: 「※入力内容と写真はAIによる判定のみに使用され、保存されることはありません。」
- ローディング: 「今日の寄り道を選んでいます…」→「ぴったりのスポットを探しています…」
- エラー: 「おみくじを引けませんでした。電波状況を確認の上、もう一度鈴を鳴らしてみてください。（公式企画データから選び直せます）」

### S1 結果
- 見出し: `{fortune_name}` ＋ バッジ「今日の寄り道」
- 目的地hero: 「行き先：{mission.target_spot}（{location}・{category}）」
- 条件注記（ある場合のみ）: 「{schedule/price/capacity/notice} ※現地の公式案内で確認」
- 本文: `{message}` ＋ `ひとこと:{action_tip}` ＋（同行者ありのみ）`{compatibility_note}`
- ラッキー: 「色 {color} / 食べ物 {food} / 立ち寄り {spot}」
- 主CTA: 「現地のお題を見る」
- 副: 「同じ条件で別企画」「回答を変える」「結果をシェア」
- フォールバック時バナー: 「AIが混み合っているため、公式企画データから選びました（寄り道発見吉）」

### S2 ミッション行動
- 見出し: 「現地ミッション：{mission.title}」
- 説明: 「{mission.description}」
- 進捗: 「印 {n}/3（授与・なぞなぞ・フォト）」
- 手段A（なぞなぞ）: 出題「{riddle}」＋入力＋ボタン「答え合わせをする」→正解「正解！一印を授かりました」/不正解「惜しい！もう一度考えてみよう（ヒントは現地にあり）」
- 手段B（写真）: お題「{photoRallyPrompt}」＋ボタン「お題の一枚を奉納する」→成功「見事！『{stamp_title}』の印を授かりました。（{comment}）」/失敗時定型「写真を受け取りました。別の発見も素敵！」
- 手段C（手動）: ボタン「現地に着いた・やってみた」
- 主CTA: 印2/3到達で「印がそろった！交換へ進む」に変化

### S3 報酬・交換
- 見出し: 「集めた印をノベルティに交換」
- カウント: 「現在の発見カード {n}件」
- 受付番号: 「受付番号 {visitorId末尾6桁}（スタッフが確認します）」
- ステッカー: 条件「1件以上」→ 未達「あと1件で交換できます」/可「交換できます」/済「この端末では交換済みです」
- トート: 条件「3件以上」→ 未達「あと{n}件で交換できます」/可・済は同上
- 主CTA: 「交換する」→記録中「記録中…」→成功「記録しました。この画面をスタッフに見せてください。」
- エラー: 未達「交換条件を満たしていません。」/キー誤り「スタッフ確認キーが正しくありません。」/済「このノベルティは交換済みです。」/未設定「交換のサーバー設定が未完了です。スタッフにお声がけください。」
- `?booth=novelty` 時: S3を先頭表示＋「寄り道おみくじへ戻る」リンク

### 裏・思い出（FAB/シート）
- ボタン: 「思い出を開く」
- 空状態: 「発見カメラで写真を1枚撮ると、ここに思い出をまとめられます。」
- 機能名: お守りカード / 音声で聞く / 相談チャット / ふりかえりまとめ / しおりを作る / 発見カード（{n}件）

## 3. Step2への申し送り（分割方針・非機能TODO）

- 分割先: `components/shrine/{TopForm,DrawingOverlay,ResultHero,RallyProgress,MissionPanel,RewardPanel,MemoriesSheet,Toast}.tsx` + `hooks/{useFortune,useDiscovery,useNoveltyClaim,useMemories}.ts` + `lib/fortune.ts(createFallbackResult/categoryPreferences)` + `lib/copy.ts`（本書の文言を定数化）。`page.tsx` は薄く残す。
- 非機能TODO（Step3で対応/明記）: `omikuji.css` 変数3重定義・keyframes重複・`!important`9件の整理、Tailwind v4との二重管理解消、`rate-limit.ts` インメモリ→Vercel分散対策（Upstash等）検討、`validation.ts` 長さのみ→zod+プロンプト注入対策、`novelty_claims.sql` RLSポリシーなし→ポリシー追加+監査列、`manifest.json` theme不一致・maskable欠落・SWなし、`next.config.ts` 空→セキュリティヘッダ。
- 受け入れ目安: S0→S3をスマホ実機で通せ、1件/3件の交換条件が表示通り動き、裏機能なしでもループ完結すること。

---
承認後にStep2（分割+UI整理）へ進む。 opencode実行時は本ファイルをコンテキストに含めること。

## ステップ2-1 整理ログ（2026-10-01実施）

### 削除・整理（全て参照ゼロを確認後に除去）
- `src/app/omikuji.css`: `.phone-*` 一式（モック装飾・tsx参照なし、`display:none`上書き含む）、`.spot-strip`、`.route-canvas`、`.route-point`、`.route-goal`、`.area-route/.area-node/.area-goal/.area-arrow`、`@keyframes area-arrow-move/route-goal-in/route-pulse/dot-pulse`、`.lucky-block` 系（`.mission-block` は使用中のため保持）、`.color-dot`、`.compact-route`、`.result-tabbar-top`。`:root` 三重定義と `seal-stamp` 重複は配色に影響するため保持し、Step2-2の目視確認時に統合する。
- `src/lib/gemini.ts`: 未使用 `generateContentWithFallback`（全ルートは `ai-fallback.ts` 経由のため）を削除。`getGenAI` のみ残す。
- 削除しなかったもの: `public/mascot.png, mascot-cutout.png, sparkle.jpg, sparkle-transparent.png`（tsx参照なしだがPWA/予備用途の可能性あり・無害のため保持）、API `partnerGoal`（フロント未送信だが互換性のため保持・非推奨扱い）、`card/narrate/chat/summary/bookmark` API（裏動線で継続利用）。

### 作成（`tsc --noEmit` / `eslint` いずれも終了コード0）
- `src/lib/copy.ts`: S0〜S3・思い出の修正文言を定数化（直書き禁止の参照先）。
- `src/lib/fortune.ts`: 型（Result/DiscoveryResult/MemoryEntry/DiscoveryCard/NoveltyKind/FestivalSpot）+ 選択肢・マスコット定数 + `createFallbackResult/normalizeAnswer/getMissionSpot/getLocationPoint`。
- `src/lib/view-transition.ts`: `withViewTransition`。
- `src/lib/share.ts`: `shareFortune`（Share→クリップボード）。
- `src/hooks/useToast.ts`, `useCelebration.ts`（紙吹雪）, `usePersistentState.ts`（localStorageキー維持）, `useFortune.ts`（S0→S1）, `useDiscovery.ts`（S2・なぞなぞ/奉納/印）, `useNoveltyClaim.ts`（S3）, `useMemories.ts`（裏動線のみ）。
