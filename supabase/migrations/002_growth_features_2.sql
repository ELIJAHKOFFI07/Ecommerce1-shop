-- ============================================================
-- ElijahShop — croissance / engagement (vague 2)
-- Listes de souhaits nommées, classement des parrainages, stories
-- vendeur éphémères (24h).
-- ============================================================

-- ---------- LISTES DE SOUHAITS NOMMÉES ----------
create table if not exists public.wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;

create policy "wishlists_own" on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "wishlist_items_own" on public.wishlist_items for all
  using (exists(select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists(select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- ---------- CLASSEMENT DES PARRAINAGES ----------
-- Lecture publique agrégée (pseudo + nombre de filleuls) : pas de données
-- personnelles exposées au-delà du username déjà public sur les boutiques.
create or replace function public.referral_leaderboard(p_limit integer default 20)
returns table (user_id uuid, username text, avatar_url text, referrals_count bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.avatar_url, count(r.id) as referrals_count
  from public.referrals r
  join public.profiles p on p.id = r.referrer_id
  group by p.id, p.username, p.avatar_url
  order by referrals_count desc, p.username
  limit p_limit;
$$;

create or replace function public.my_referral_rank()
returns integer
language sql stable security definer set search_path = public as $$
  select rank::integer from (
    select referrer_id, rank() over (order by count(*) desc) as rank
    from public.referrals
    group by referrer_id
  ) ranked
  where referrer_id = auth.uid();
$$;

-- ---------- STORIES VENDEUR ÉPHÉMÈRES (24H) ----------
create table if not exists public.shop_stories (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  image_url text not null,
  caption text,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists idx_shop_stories_active
  on public.shop_stories (expires_at) where expires_at > now();

create table if not exists public.shop_story_views (
  story_id uuid not null references public.shop_stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.shop_stories enable row level security;
alter table public.shop_story_views enable row level security;

create policy "shop_stories_read_active" on public.shop_stories for select
  using (expires_at > now());
create policy "shop_stories_insert_own" on public.shop_stories for insert
  with check (exists(select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "shop_stories_delete_own" on public.shop_stories for delete
  using (exists(select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

create policy "shop_story_views_own" on public.shop_story_views for all
  using (viewer_id = auth.uid()) with check (viewer_id = auth.uid());

-- Vue: boutiques avec au moins une story active, la plus récente en premier.
create or replace view public.shops_with_active_stories
with (security_invoker = true) as
  select s.id as shop_id, s.name, s.logo_url,
         max(st.created_at) as last_story_at,
         count(st.id) as active_stories_count
  from public.shops s
  join public.shop_stories st on st.shop_id = s.id and st.expires_at > now()
  group by s.id, s.name, s.logo_url
  order by max(st.created_at) desc;

create or replace function public.mark_story_viewed(p_story_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into shop_story_views (story_id, viewer_id)
    values (p_story_id, auth.uid())
    on conflict (story_id, viewer_id) do nothing;
end $$;
