# Step 3 — 完了条件と公開前チェック（2026-10-03 改訂版）

## 当日のフロー完了条件

- [x] `npm run lint` と `npm run build` がエラーなしで通る
- [ ] 360px / 430px 幅で、TOP → 結果 → ミッション → 完了画面を通しで操作し、はみ出し・重なり・小さすぎる文字がない（実機確認）
- [x] 写真・なぞなぞ・スタッフ承認キー・受付番号が UI にどこにも出てこない
- [x] 削除した API や変数への参照が残っていない（grep: `riddle` / `photo` / `staffKey` / `novelty`）
- [x] `README.md` と `IMPLEMENTATION_STATUS.md` を新フローに合わせて更新

## 実装の最終状態

```
src/
  app/
    layout.tsx                # next/font: Dela Gothic One + Zen Maru Gothic（preloadなし・swap）
    OmikujiExperience.tsx     # S0→S1→S2→S3 の薄い親
    api/omikuji/route.ts      # 運勢生成（ミッションは title/target_spot/description のみ）
    api/omikuji/{card,narrate,chat,summary,bookmark}/  # 思い出シート用
  components/shrine/
    TopForm.tsx               # S0
    ResultHero.tsx            # S1
    RallyProgress.tsx         # 今日の三歩（一 運勢 / 二 寄り道 / 三 S103で受け取り）
    MissionPanel.tsx          # S2: 企画・場所・やること +「行きました！」
    RewardPanel.tsx           # S3: S103完了画面
    MemoriesSheet.tsx         # 裏動線（写真なし）
  lib/
    copy.ts                   # 文言一元管理。RECEIVE_SPOT（S103）はここ 1 か所
    fortune.ts                # 型・スポット・フォールバック
```

## 公開前の残タスク

1. 実機での通し操作（iOS Safari / Android Chrome、360px と 430px）。
2. `src/data/spots.json` を直前の公式掲載情報へ同期。
3. Production 環境変数: `GEMINI_API_KEY`（必須）、`GROQ_API_KEY`（任意）。`SUPABASE_*` と `NOVELTY_STAFF_KEY` は不要になった（削除済み）。
4. スタッフへの共有: 完了画面の見せ方（達成企画と達成時刻を確認して特典を渡す）。
5. S103 の会場名が変わる場合は `src/lib/copy.ts` の `RECEIVE_SPOT` だけ直す。
