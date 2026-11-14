-- Encrypted, per-account provider snapshot. The client encrypts the payload
-- before it reaches Supabase; this table intentionally has no server-side key.
create table if not exists public.provider_config_vault (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.provider_config_vault enable row level security;

revoke all on public.provider_config_vault from anon, authenticated;
grant select, insert, update, delete on public.provider_config_vault to authenticated;

drop policy if exists provider_config_vault_account_all on public.provider_config_vault;
create policy provider_config_vault_account_all
  on public.provider_config_vault
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

