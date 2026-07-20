-- Hubora 2.0: schema relacional, RLS e contadores seguros.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, entry_id)
);

create table if not exists public.custom_lists (
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, list_id)
);

alter table public.custom_lists add column if not exists deleted_at timestamptz;

create table if not exists public.consumption_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  entry_id text not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table if not exists public.reviews (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  user_avatar text,
  media_id text not null,
  media_title text not null,
  media_poster text,
  media_type text not null,
  rating numeric(2,1) not null check (rating >= 0 and rating <= 5),
  content text not null check (char_length(content) between 1 and 12000),
  has_spoilers boolean not null default false,
  likes_count integer not null default 0 check (likes_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_likes (
  review_id text not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists library_entries_user_updated_idx on public.library_entries(user_id, updated_at desc);
create index if not exists library_entries_payload_gin_idx on public.library_entries using gin(payload);
create index if not exists custom_lists_user_updated_idx on public.custom_lists(user_id, updated_at desc);
create index if not exists consumption_events_user_occurred_idx on public.consumption_events(user_id, occurred_at desc);
create index if not exists consumption_events_entry_idx on public.consumption_events(user_id, entry_id);
create index if not exists reviews_media_created_idx on public.reviews(media_id, created_at desc);
create index if not exists reviews_user_created_idx on public.reviews(user_id, created_at desc);
create index if not exists follows_following_idx on public.follows(following_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
for each row execute function public.set_updated_at();

create or replace function public.refresh_review_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews
  set likes_count = (
    select count(*)::integer
    from public.review_likes
    where review_id = coalesce(new.review_id, old.review_id)
  )
  where id = coalesce(new.review_id, old.review_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists review_likes_refresh_count on public.review_likes;
create trigger review_likes_refresh_count
after insert or delete on public.review_likes
for each row execute function public.refresh_review_likes_count();

alter table public.profiles enable row level security;
alter table public.library_entries enable row level security;
alter table public.custom_lists enable row level security;
alter table public.consumption_events enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.follows enable row level security;

-- Perfis: o dono lê/escreve o perfil completo; perfis sociais públicos devem ser
-- expostos depois por uma view com campos estritamente selecionados.
drop policy if exists profiles_own_select on public.profiles;
create policy profiles_own_select on public.profiles for select using (auth.uid() = id);
drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_own_delete on public.profiles;
create policy profiles_own_delete on public.profiles for delete using (auth.uid() = id);

-- Biblioteca e listas são privadas por padrão.
drop policy if exists library_own_select on public.library_entries;
create policy library_own_select on public.library_entries for select using (auth.uid() = user_id);
drop policy if exists library_own_insert on public.library_entries;
create policy library_own_insert on public.library_entries for insert with check (auth.uid() = user_id);
drop policy if exists library_own_update on public.library_entries;
create policy library_own_update on public.library_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists library_own_delete on public.library_entries;
create policy library_own_delete on public.library_entries for delete using (auth.uid() = user_id);

drop policy if exists lists_own_select on public.custom_lists;
create policy lists_own_select on public.custom_lists for select using (auth.uid() = user_id);
drop policy if exists lists_own_insert on public.custom_lists;
create policy lists_own_insert on public.custom_lists for insert with check (auth.uid() = user_id);
drop policy if exists lists_own_update on public.custom_lists;
create policy lists_own_update on public.custom_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists lists_own_delete on public.custom_lists;
create policy lists_own_delete on public.custom_lists for delete using (auth.uid() = user_id);

drop policy if exists events_own_select on public.consumption_events;
create policy events_own_select on public.consumption_events for select using (auth.uid() = user_id);
drop policy if exists events_own_insert on public.consumption_events;
create policy events_own_insert on public.consumption_events for insert with check (auth.uid() = user_id);
drop policy if exists events_own_update on public.consumption_events;
create policy events_own_update on public.consumption_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists events_own_delete on public.consumption_events;
create policy events_own_delete on public.consumption_events for delete using (auth.uid() = user_id);

-- Resenhas são públicas para leitura, mas conteúdo só pode ser alterado pelo autor.
drop policy if exists reviews_public_select on public.reviews;
create policy reviews_public_select on public.reviews for select using (true);
drop policy if exists reviews_own_insert on public.reviews;
create policy reviews_own_insert on public.reviews for insert with check (auth.uid() = user_id);
drop policy if exists reviews_own_update on public.reviews;
create policy reviews_own_update on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists reviews_own_delete on public.reviews;
create policy reviews_own_delete on public.reviews for delete using (auth.uid() = user_id);

-- Cada usuário pode curtir cada resenha no máximo uma vez (PK composta).
drop policy if exists likes_public_select on public.review_likes;
create policy likes_public_select on public.review_likes for select using (true);
drop policy if exists likes_own_insert on public.review_likes;
create policy likes_own_insert on public.review_likes for insert with check (auth.uid() = user_id);
drop policy if exists likes_own_delete on public.review_likes;
create policy likes_own_delete on public.review_likes for delete using (auth.uid() = user_id);

-- Relações sociais são visíveis; somente o seguidor cria/remove a relação.
drop policy if exists follows_public_select on public.follows;
create policy follows_public_select on public.follows for select using (true);
drop policy if exists follows_own_insert on public.follows;
create policy follows_own_insert on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists follows_own_delete on public.follows;
create policy follows_own_delete on public.follows for delete using (auth.uid() = follower_id);

-- Evita que clientes alterem diretamente o contador derivado.
revoke update on public.reviews from authenticated;
grant update (user_name, user_avatar, media_title, media_poster, rating, content, has_spoilers) on public.reviews to authenticated;

grant select, insert, delete on public.review_likes to authenticated;
grant select, insert, update, delete on public.profiles, public.library_entries, public.custom_lists, public.consumption_events to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.reviews to authenticated;

-- Realtime somente para dados privados que o cliente sincroniza.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'library_entries'
  ) then
    alter publication supabase_realtime add table public.library_entries;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'custom_lists'
  ) then
    alter publication supabase_realtime add table public.custom_lists;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'consumption_events'
  ) then
    alter publication supabase_realtime add table public.consumption_events;
  end if;
end $$;
