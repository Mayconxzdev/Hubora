-- Hubora 6.0 hardening: adult-community isolation and safer public feeds.

alter table public.reviews
  add column if not exists is_adult boolean not null default false,
  add column if not exists visibility text not null default 'public';

alter table public.reviews
  drop constraint if exists reviews_visibility_check;
alter table public.reviews
  add constraint reviews_visibility_check check (visibility in ('public', 'adult'));

create index if not exists reviews_adult_created_idx
  on public.reviews(is_adult, created_at desc);

-- Public/anonymous readers can only see the regular community. Adult reviews
-- require an authenticated account and are still filtered by the client's
-- locally unlocked vault state.
drop policy if exists reviews_public_select on public.reviews;
drop policy if exists reviews_regular_public_select on public.reviews;
drop policy if exists reviews_adult_authenticated_select on public.reviews;
create policy reviews_regular_public_select
  on public.reviews for select
  to anon, authenticated
  using (is_adult = false and visibility = 'public');

create policy reviews_adult_authenticated_select
  on public.reviews for select
  to authenticated
  using (is_adult = true and visibility = 'adult');

-- Authors can still create and maintain their own review, but cannot publish
-- an adult-marked review into the regular feed.
drop policy if exists reviews_own_insert on public.reviews;
create policy reviews_own_insert
  on public.reviews for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and ((is_adult = false and visibility = 'public') or (is_adult = true and visibility = 'adult'))
  );

drop policy if exists reviews_own_update on public.reviews;
create policy reviews_own_update
  on public.reviews for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and ((is_adult = false and visibility = 'public') or (is_adult = true and visibility = 'adult'))
  );

revoke update on public.reviews from authenticated;
grant update (user_name, user_avatar, media_title, media_poster, rating, content, has_spoilers, is_adult, visibility)
  on public.reviews to authenticated;
