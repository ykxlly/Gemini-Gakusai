-- novelty_claims 堅牢化SQL（Supabase Dashboard > SQL Editor で実行）
-- 前提: supabase/novelty_claims.sql でテーブル作成済み。すべて冪等（IF NOT EXISTS）です。
-- アプリは SUPABASE_SERVICE_ROLE_KEY で REST アクセスするため RLS をバイパスします。
-- anon/authenticated ロールにはポリシーを付与せず、デフォルト拒否のままにします。

-- 1. RLS が有効であることを保証
alter table public.novelty_claims enable row level security;

-- 2. 参照系の索引（unique(visitor_id, novelty_kind) は既に索引を持つため、運用ソート用のみ追加）
create index if not exists novelty_claims_claimed_at_idx
  on public.novelty_claims (claimed_at desc);

-- 3. 監査列の追加（既存行に影響なし・NULL許可）
alter table public.novelty_claims
  add column if not exists ip_hash text,
  add column if not exists user_agent text;

-- 4. 念のための明示ポリシー：service_role 以外からの一切の操作を拒否
--    （RLS有効＋ポリシーなしでも拒否されるが、意図をコード化して将来の誤付与を防ぐ）
drop policy if exists novelty_claims_no_direct_access on public.novelty_claims;
create policy novelty_claims_no_direct_access
  on public.novelty_claims
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- 5. 動作確認（Dashboard で実行し、0件または想定件数であること）
-- select count(*) from public.novelty_claims;
-- select novelty_kind, count(*) from public.novelty_claims group by novelty_kind;
