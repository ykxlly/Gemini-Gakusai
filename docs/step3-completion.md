# Step 3 — 完了条件と公開前チェック（2026-10-03 方針変更後）

## 完了条件

- [x] `npm run lint` と `npm run build` がエラーなしで通る
- [ ] 360px / 430px 幅で、TOP → 結果を通しで操作し、はみ出し・重なり・小さすぎる文字がない（実機確認）
- [ ] 10回引いて、運勢とおすすめの場所が偏っていない（実機確認。サーバー側は重み付きランダム実装済み）
- [x] `mission` / `riddle` / `novelty` / `staffKey` / `S103` / `rally` が `src` に残っていない（grep 済み）
- [x] `README.md` と `IMPLEMENTATION_STATUS.md` を新フローに更新

## 実装の最終状態

```
src/
  app/
    layout.tsx                # next/font: Dela Gothic One + Zen Maru Gothic（preloadなし・swap）
    OmikujiExperience.tsx     # S0→S1 の薄い親
    api/omikuji/route.ts      # 運勢抽選（サーバー）+ 重み付きランダム選定（サーバー）+ AIは文章のみ
    api/omikuji/{card,narrate,chat,summary,bookmark}/  # 思い出シート用
  components/shrine/
    TopForm.tsx               # S0（ニックネーム任意）
    ResultHero.tsx            # S1（おすすめの場所が主役）
    MemoriesSheet.tsx         # 裏動線（写真なし）
  lib/
    copy.ts                   # 文言一元管理
    fortune.ts                # FORTUNES一覧・重み付き抽選・pickRecommendedSpots
```

## 公開前の残タスク

1. 実機での通し操作（iOS Safari / Android Chrome、360px と 430px）と10回引きの偏り確認。
2. `src/data/spots.json` を直前の公式掲載情報へ同期。
3. Production 環境変数: `GEMINI_API_KEY`（必須）、`GROQ_API_KEY`（任意）。`NOVELTY_STAFF_KEY` / `SUPABASE_*` は不要（Vercel 側に残っていても無害）。
4. `main` に push して Vercel の自動デプロイを確認 → 本番URL（gemini-gakusai.vercel.app）で TOP → 結果まで動作確認。
