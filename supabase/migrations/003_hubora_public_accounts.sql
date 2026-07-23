-- Hubora 9: contas públicas com dados pessoais isolados.
-- Execute depois de 001_hubora_core.sql e 002_hubora_v6_hardening.sql.
--
-- O aplicativo pode ser acessado por qualquer visitante. Uma conta Supabase
-- autenticada só lê e escreve linhas cujo usuário é auth.uid(); não existe
-- allowlist por e-mail no frontend, RPC administrativa ou schema privado.

create table if not exists public.release_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id text not null,
  provider text not null,
  provider_id text not null,
  media_type text not null,
  title text not null,
  preferences jsonb not null default '{"new_episode":true,"new_season":true,"new_volume":true,"release":true,"availability":true,"price":true}'::jsonb,
  last_checked_at timestamptz,
  next_check_at timestamptz not null default now(),
  last_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id text,
  kind text not null check (kind in ('release','availability','price','reminder','system')),
  title text not null,
  body text not null,
  url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists release_subscriptions_due_idx on public.release_subscriptions(next_check_at, user_id);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.library_entries enable row level security;
alter table public.custom_lists enable row level security;
alter table public.consumption_events enable row level security;
alter table public.release_subscriptions enable row level security;
alter table public.notifications enable row level security;

-- A migration pode seguir versões antigas que tinham policies de instalação
-- pessoal. Remove somente as policies desses seis recursos privados antes de
-- recriar a regra definitiva por dono.
do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'library_entries', 'custom_lists', 'consumption_events',
        'release_subscriptions', 'notifications'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy profiles_account_select on public.profiles for select to authenticated using (auth.uid() = id);
create policy profiles_account_insert on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy profiles_account_update on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_account_delete on public.profiles for delete to authenticated using (auth.uid() = id);

create policy library_account_select on public.library_entries for select to authenticated using (auth.uid() = user_id);
create policy library_account_insert on public.library_entries for insert to authenticated with check (auth.uid() = user_id);
create policy library_account_update on public.library_entries for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy library_account_delete on public.library_entries for delete to authenticated using (auth.uid() = user_id);

create policy lists_account_select on public.custom_lists for select to authenticated using (auth.uid() = user_id);
create policy lists_account_insert on public.custom_lists for insert to authenticated with check (auth.uid() = user_id);
create policy lists_account_update on public.custom_lists for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy lists_account_delete on public.custom_lists for delete to authenticated using (auth.uid() = user_id);

create policy events_account_select on public.consumption_events for select to authenticated using (auth.uid() = user_id);
create policy events_account_insert on public.consumption_events for insert to authenticated with check (auth.uid() = user_id);
create policy events_account_update on public.consumption_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy events_account_delete on public.consumption_events for delete to authenticated using (auth.uid() = user_id);

create policy subscriptions_account_select on public.release_subscriptions for select to authenticated using (auth.uid() = user_id);
create policy subscriptions_account_insert on public.release_subscriptions for insert to authenticated with check (auth.uid() = user_id);
create policy subscriptions_account_update on public.release_subscriptions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy subscriptions_account_delete on public.release_subscriptions for delete to authenticated using (auth.uid() = user_id);

-- Notificações são inseridas exclusivamente por Functions com chave secreta;
-- o usuário apenas lê, atualiza e remove as próprias linhas.
create policy notifications_account_select on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy notifications_account_update on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notifications_account_delete on public.notifications for delete to authenticated using (auth.uid() = user_id);

revoke all on public.profiles, public.library_entries, public.custom_lists, public.consumption_events, public.release_subscriptions, public.notifications from anon;
grant select, insert, update, delete on public.profiles, public.library_entries, public.custom_lists, public.consumption_events, public.release_subscriptions to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant all on public.profiles, public.library_entries, public.custom_lists, public.consumption_events, public.release_subscriptions, public.notifications to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
