# 超パーソナル AI おみくじ（BDSF 寄り道おみくじ）

学園祭の来場者向けに、気分から「寄り道先」の企画とミッションを生成する Next.js アプリです。

## 当日のフロー（これが正）

1. **TOP**：気分 → 目的 → 同行者を選ぶ
2. **おみくじ結果**：寄り道先の企画とミッションが決まる
3. **現地ミッション**：企画に着いたら「行きました！」ボタンを押す（自己申告・条件なし）
4. **完了画面**：S103 に来てね！ステッカーとトートバッグをプレゼント。この画面をスタッフに見せる

交換条件・件数カウント・スタッフ承認キー・サーバー記録はありません。完了＝両方もらえる、です。

## ローカルで起動

1. `npm ci`
2. `.env.example` を `.env.local` にコピーし、`GEMINI_API_KEY`（と任意で `GROQ_API_KEY`）を設定
3. `npm run dev`

`npm run lint` と `npm run build` で静的検査と本番ビルドを確認できます。

## Vercel へのデプロイ

このリポジトリを Vercel の新規プロジェクトとして取り込み、Production 環境変数 `GEMINI_API_KEY` を設定してください（Groq フォールバックを使うなら `GROQ_API_KEY` も）。フレームワークは Next.js、ルートディレクトリはリポジトリのルートです。

## 実装メモ

- フォントは `next/font/google` で自己ホスト：見出し・ボタン・数字は **Dela Gothic One**（祭りポスター系）、本文は **Zen Maru Gothic**（丸ゴシック）。日本語フォントのため `preload: false`・`display: swap`。Web フォントはこの 2 種類のみ。
- 会場名「S103」は `src/lib/copy.ts` の `RECEIVE_SPOT` 定数 1 か所で管理。会場変更時はここだけ直す。
- 写真アップロード・なぞなぞ・スタッフ承認キー・受付番号・Supabase 記録は撤去済み。残る API は `/api/omikuji`（生成）と `/api/omikuji/{card,narrate,chat,summary,bookmark}`（思い出シート用）の 6 本。

現在の実装状況と公開前の課題は [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) を参照してください。
