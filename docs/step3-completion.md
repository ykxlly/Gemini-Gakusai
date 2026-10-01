# ステップ3完了報告：最小ループ統合・検証と堅牢化

## 1. 最終構成

```
src/
 app/
  OmikujiExperience.tsx   # 薄い親（Phase: top/result/mission/reward のみ管理・約200行）
  page.tsx / layout.tsx   # 変更なし
 components/shrine/
  TopForm.tsx             # S0（3問＋神社イントロ・文言は copy.ts 参照）
  DrawingOverlay.tsx      # 授与演出
  ResultHero.tsx          # S1（行き先hero＋運勢本文＋副導線）
  RallyProgress.tsx       # 印 n/3（S1内表示・完了時は交換へ誘導）
  MissionPanel.tsx        # S2（手動達成・なぞなぞ・発見カメラ）
  RewardPanel.tsx         # S3（1件ステッカー/3件トート・受付番号・staffKey）
  MemoriesSheet.tsx       # 裏動線（FAB「思い出を開く」・主フローから非連動）
  SiteChrome.tsx          # header/footer/toast/紙吹雪
 hooks/
  useFortune.ts           # S0→S1（POST /api/omikuji＋フォールバック）
  useDiscovery.ts         # S2（riddle/verify＋memories/discoveryCards更新）
  useNoveltyClaim.ts      # S3（POST /api/novelty/claim）
  useMemories.ts          # 裏動線のみ（card/narrate/chat/summary/bookmark）
  usePersistentState.ts   # localStorage（キー名維持・既存データと互換）
  useToast.ts / useCelebration.ts
 lib/
  copy.ts                 # 全文言の定数化（直書き禁止の参照先）
  fortune.ts / share.ts / view-transition.ts
```

旧 `activeResultTab（omikuji|discovery|memories）` は廃止。`memoriesOpen` のみで裏動線を切り離し。

## 2. 最小ループの動作（検証済み）

| 区間 | 結合 | 結果 |
|------|------|------|
| S0→S1 | `POST /api/omikuji`→`Result`、失敗時は `createFallbackResult`（寄り道発見吉） | コード移設・文言更新済み |
| S1→S2 | `RallyProgress` CTA→`phase=mission`、3/3で文言が「印がそろった！交換へ進む」に変化 | 既存の `[授与, missionComplete, rally_complete]` 計算を流用 |
| S2なぞなぞ | ローカル正規化→不一致時のみ `POST /api/omikuji/riddle` | 変更なし（移設のみ） |
| S2写真 | `POST /api/omikuji/verify`→`DiscoveryResult`、失敗時は定型フォールバック＋新文言で通知 | 変更なし（移設のみ） |
| S2→S3 | 印2種そろいで交換CTA出現→`phase=reward` | 新設 |
| S3交換 | `POST /api/novelty/claim`（sticker≥1/tote≥3、staffKey照合、409重複防止） | 変更なし（移設のみ） |
| `?booth=novelty` | S3を先頭表示＋「寄り道おみくじへ戻る」 | 維持 |

検証: `tsc --noEmit` 終了コード0、`eslint src/` 終了コード0、`npm run build` 成功（`/` 28.8kB、全9 API ルート生成）。

## 3. 堅牢化の対応状況

- [x] CSS重複整理: 未使用クラス約30種を削除（phone/spot-strip/route-canvas/area/lucky-block/compact-route等）。`:root` 三重定義を1つに統合（勝ち値を採用したため描画は同一）。`seal-stamp` 重複定義のうち死んだ方を削除（描画は同一）。残 `!important` は `result-tabbar` 系の上書き等で意図があるため保持。
- [x] レートリミット: インメモリ方式の限界（Vercel分散環境で非共有）を `src/lib/rate-limit.ts` 冒頭に明記し、Upstash Redis への移行パス（同署名のまま置換）を記載。現行の 5〜15/min 制限は維持。
- [x] 配列上限: `summary` fortunes を最大20件、`chat` history を最大20件に制限（DoS/課金対策）。実行時は従来通り直近5/6件を使用。
- [x] Supabase RLS: `supabase/rls_policies.sql` を新規作成（冪等）。anon/authenticated の全面拒否ポリシー、`claimed_at` 索引、監査列（`ip_hash/user_agent`）追加。アプリは service_role 経由のため動作に影響なし。

## 5. シニア監査での構造修正（2026-10-01実施）

- 再授与時の旧状態残留: `onDrawStart` を新設し授与開始時に discovery/memories を掃除（引き直し直後の印カウント矛盾を解消）。
- 3/3完了時の遷移先誤り: `RallyProgress` 完了CTAは交換所（S3）へ、未完はミッション（S2）へ分岐。未完時のCTA文言は「交換所を確認する」に切替。
- 通信の無限待機: `lib/api-client.ts` を新設し全フックにタイムアウト（15〜30秒）+ 429日本語化 + 安全なJSON解釈を適用。
- 連打競合: 全非同期アクションにrefベースのin-flightガードを追加（state反映前の同一ティック連打を遮断）。
- AI不定形JSON: `isDiscoveryResult` ガードで verify 応答を検証し、不正時は定型フォールバックへ。card/chat/summary/bookmark も型ガード＋定型文で縮退。
- localStorage破損: キー単位のtry-catch＋形状検証（不正値は破棄し他キーの復元を継続）。
- 写真まわり: dataURL構造ガード、同一ファイル再選択対応、EXIF Orientation反映（`createImageBitmap`、非対応時は従来経路）。
- 再描画: 全shrineコンポーネントを `memo` 化し、フック戻り値・親ハンドラを `useMemo/useCallback` で安定化。チャット履歴は最新30件にキャップ。
- その他: 紙吹雪IDの単調カウンタ化、授与中は思い出FABを非表示、S2に「おみくじ結果に戻る」を追加、タイマー群のアンマウント時クリア。
- E2E smoke（実ブラウザ）: S0→S1（フォールバック）→S2手動達成→2/3表示→引き直し1/3リセット→Top復帰を通し、コンソールに新規エラーなし（502はダミー鍵による想定内、InvalidStateErrorは view-transition ガードで解消）。
## 6. 手動で実行が必要な作業

1. **Supabase で RLS 用 SQL を流す**（Dashboard > SQL Editor）:
   - `supabase/novelty_claims.sql`（未適用の場合のみ）
   - `supabase/rls_policies.sql`（今回新規・必ず実行）
   - 実行後に `select count(*) from public.novelty_claims;` で疎通確認。
2. **Vercel 環境変数の確認**（Production）: `GEMINI_API_KEY`（必須）、`GROQ_API_KEY`（フォールバック用・任意だが推奨）、`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `NOVELTY_STAFF_KEY`（交換所を使う場合に必須）。
3. **実機確認**（スマホ）: S0→S3 の一筆書き、1件/3件の交換条件表示、`?booth=novelty` の先頭表示、思い出FABの開閉。写真判定は実写での品質未評価のため現地で試写すること。
4. **任意（費用監視）**: Gemini/Groq の利用量ダッシュボード確認。連続実行が気になる場合は Upstash 制限への移行を検討（`src/lib/rate-limit.ts` コメント参照）。
