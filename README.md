# 超パーソナル AI おみくじ

学園祭の来場者向けに運勢とおすすめスポットを生成する Next.js アプリです。

## ローカルで起動

1. `npm ci`
2. `.env.example` を `.env.local` にコピーし、`GEMINI_API_KEY` を設定
3. `npm run dev`

`npm run lint` と `npm run build` で静的検査と本番ビルドを確認できます。

## Vercel へのデプロイ

このリポジトリを Vercel の新規プロジェクトとして取り込み、Production 環境変数 `GEMINI_API_KEY` を設定してください。フレームワークは Next.js、ルートディレクトリはリポジトリのルートです。

公開後は、トップ画面の表示に加え、おみくじを引いて結果が出ることを確認してください。API キーが未設定の場合、画面は表示されますがおみくじ生成 API はエラーになります。追加機能（写真判定、音声、チャットなど）も公開 URL で順に確認してください。

現在の実装状況と公開前の課題は [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) を参照してください。
