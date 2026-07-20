-- Hubora 7.0 Personal Edition
-- Execute 001, 002 and then this migration. After running it, insert the email
-- that may access this private installation:
-- insert into private.allowed_emails(email) values ('SEU_EMAIL@gmail.com');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.allowed_emails (
  email text primary key check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);
revoke all on private.allowed_emails from public, anon, authenticated;
grant all on private.allowed_emails to service_role;

create or replace function public.is_hubora_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from private.allowed_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_hubora_allowed_user() from public;
grant execute on function public.is_hubora_allowed_user() to authenticated;

-- Personal data only. Social tables remain for migration compatibility but are
-- inaccessible to browser roles.
revoke all on public.reviews, public.review_likes, public.follows from anon, authenticated;
drop policy if exists reviews_regular_public_select on public.reviews;
drop policy if exists reviews_adult_authenticated_select on public.reviews;
drop policy if exists reviews_own_insert on public.reviews;
drop policy if exists reviews_own_update on public.reviews;
drop policy if exists reviews_own_delete on public.reviews;
drop policy if exists likes_public_select on public.review_likes;
drop policy if exists likes_own_insert on public.review_likes;
drop policy if exists likes_own_delete on public.review_likes;
drop policy if exists follows_public_select on public.follows;
drop policy if exists follows_own_insert on public.follows;
drop policy if exists follows_own_delete on public.follows;

-- Recreate personal policies with the private allowlist as a second barrier.
DO $$
DECLARE policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('profiles','library_entries','custom_lists','consumption_events')
  LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

create policy profiles_personal_select on public.profiles for select to authenticated using (public.is_hubora_allowed_user() and auth.uid() = id);
create policy profiles_personal_insert on public.profiles for insert to authenticated with check (public.is_hubora_allowed_user() and auth.uid() = id);
create policy profiles_personal_update on public.profiles for update to authenticated using (public.is_hubora_allowed_user() and auth.uid() = id) with check (public.is_hubora_allowed_user() and auth.uid() = id);
create policy profiles_personal_delete on public.profiles for delete to authenticated using (public.is_hubora_allowed_user() and auth.uid() = id);

create policy library_personal_select on public.library_entries for select to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy library_personal_insert on public.library_entries for insert to authenticated with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy library_personal_update on public.library_entries for update to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id) with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy library_personal_delete on public.library_entries for delete to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);

create policy lists_personal_select on public.custom_lists for select to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy lists_personal_insert on public.custom_lists for insert to authenticated with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy lists_personal_update on public.custom_lists for update to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id) with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy lists_personal_delete on public.custom_lists for delete to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);

create policy events_personal_select on public.consumption_events for select to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy events_personal_insert on public.consumption_events for insert to authenticated with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy events_personal_update on public.consumption_events for update to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id) with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy events_personal_delete on public.consumption_events for delete to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);

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

alter table public.release_subscriptions enable row level security;
alter table public.notifications enable row level security;

create policy subscriptions_personal_select on public.release_subscriptions for select to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy subscriptions_personal_insert on public.release_subscriptions for insert to authenticated with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy subscriptions_personal_update on public.release_subscriptions for update to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id) with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy subscriptions_personal_delete on public.release_subscriptions for delete to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);

create policy notifications_personal_select on public.notifications for select to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy notifications_personal_update on public.notifications for update to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id) with check (public.is_hubora_allowed_user() and auth.uid() = user_id);
create policy notifications_personal_delete on public.notifications for delete to authenticated using (public.is_hubora_allowed_user() and auth.uid() = user_id);

revoke all on public.release_subscriptions, public.notifications from anon;
grant select, insert, update, delete on public.release_subscriptions to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant all on public.release_subscriptions, public.notifications to service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
