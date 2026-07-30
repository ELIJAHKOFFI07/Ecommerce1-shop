-- ============================================================
-- DreamTeamShop — installation complete de la base Supabase.
--
-- Genere automatiquement a partir de supabase/schema.sql,
-- supabase/migrations/*.sql et supabase/seed.sql.
-- NE PAS EDITER A LA MAIN : modifier les fichiers sources.
--
-- Utilisation : copier tout ce fichier dans
-- Supabase > SQL Editor > New query, puis Run.
--
-- Ce script est reexecutable sans perte de donnees.
-- ============================================================


-- ============================================================
-- SCHEMA DE BASE
-- source : supabase/schema.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — schéma Postgres (Supabase)
-- Exécuté par SETUP_SERVICES.ps1 via `supabase db push` ou psql.
-- Anti-triche : tout ce qui a de la valeur (stock, prix, totaux,
-- portefeuille, points, statuts) est calculé par des fonctions
-- SECURITY DEFINER ; le client n'a jamais d'écriture directe.
-- ============================================================

create extension if not exists "uuid-ossp";
-- pgcrypto : gen_random_bytes(), utilisé pour générer les codes de parrainage.
create extension if not exists pgcrypto;

-- ---------- PROFILS ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default '',
  full_name text,
  avatar_url text,
  phone text,
  city text,
  bio text,
  is_admin boolean not null default false,
  is_seller boolean not null default false,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  loyalty_points integer not null default 0,
  fcm_token text,
  created_at timestamptz not null default now()
);

-- ---------- BOUTIQUES ----------
create table if not exists public.shops (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  city text,
  phone text,
  identity_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- CATALOGUE ----------
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  icon text not null default '🛍️',
  parent_id uuid references public.categories(id),
  position integer not null default 0
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  title text not null,
  description text not null default '',
  price integer not null check (price >= 100),
  compare_at_price integer,
  stock integer not null default 0 check (stock >= 0),
  condition text not null default 'neuf'
    check (condition in ('neuf','occasion','reconditionne')),
  city text,
  status text not null default 'active'
    check (status in ('active','paused','sold','removed','pending_review')),
  is_flash boolean not null default false,
  flash_ends_at timestamptz,
  favorites_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists products_shop_idx on public.products(shop_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_status_created_idx on public.products(status, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position integer not null default 0
);

create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price integer,
  stock integer not null default 0 check (stock >= 0)
);

-- ---------- SOCIAL ----------
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, shop_id)
);

create table if not exists public.shop_posts (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.recently_viewed (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- LIVRAISON ----------
create table if not exists public.delivery_zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  base_fee integer not null default 0,
  free_above integer not null default 0
);

create table if not exists public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  label text not null default 'Adresse',
  full_name text not null,
  phone text not null,
  city text not null,
  zone_id uuid references public.delivery_zones(id),
  details text not null default '',
  is_default boolean not null default false
);

-- ---------- COUPONS ----------
create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,
  type text not null default 'percent' check (type in ('percent','fixed')),
  value integer not null check (value > 0),
  min_order_amount integer not null default 0,
  expires_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  active boolean not null default true,
  shop_id uuid references public.shops(id) on delete cascade
);

-- ---------- COMMANDES ----------
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id),
  shop_id uuid not null references public.shops(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','shipped','delivered','cancelled','refunded')),
  subtotal integer not null,
  discount integer not null default 0,
  delivery_fee integer not null default 0,
  total integer not null,
  payment_method text not null default 'cod',
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  address_snapshot jsonb not null default '{}',
  coupon_code text,
  created_at timestamptz not null default now()
);
create index if not exists orders_buyer_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_shop_idx on public.orders(shop_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  title text not null,
  variant_name text,
  unit_price integer not null,
  quantity integer not null check (quantity > 0),
  image_url text
);

create table if not exists public.order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- AVIS ----------
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (order_id, product_id, author_id)
);

-- ---------- CHAT ----------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  last_message text,
  last_message_at timestamptz,
  unique (buyer_id, seller_id, product_id)
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  content text not null,
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages(conversation_id, created_at);

-- ---------- OFFRES ----------
create table if not exists public.offers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  amount integer not null check (amount > 0),
  counter_amount integer,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','countered','expired')),
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text not null default '',
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------- PORTEFEUILLE ----------
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  wallet_user_id uuid not null references public.wallets(user_id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('sale_credit','withdrawal','refund','referral_bonus')),
  order_id uuid references public.orders(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- MODÉRATION / PARRAINAGE ----------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  target_type text not null check (target_type in ('product','user','shop')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null,
  reward_points integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- VUE : fil des boutiques suivies ----------
create or replace view public.followed_shop_posts
with (security_invoker = true) as
  select sp.*, to_jsonb(s.*) as shops
  from public.shop_posts sp
  join public.shops s on s.id = sp.shop_id
  join public.follows f on f.shop_id = sp.shop_id
  where f.follower_id = auth.uid();

-- ============================================================
-- FONCTIONS & TRIGGERS
-- ============================================================

-- Nouveau compte : profil + code parrainage + wallet.
-- search_path inclut `extensions` : gen_random_bytes vient de pgcrypto, que
-- Supabase installe dans le schéma `extensions`. Avec un search_path limité
-- à `public`, la fonction serait introuvable et TOUTE inscription échouerait.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(translate(encode(gen_random_bytes(8), 'base64'),
      '0OIl1+/=', 'ABCDEFGH'), 1, 8));
    exit when not exists (select 1 from profiles where referral_code = v_code);
  end loop;

  insert into profiles (id, username, referral_code)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), v_code);

  insert into wallets (user_id) values (new.id);

  -- Parrainage saisi à l'inscription : lien + bonus filleul (100 pts).
  if coalesce(new.raw_user_meta_data->>'referral_code_used', '') <> '' then
    perform public.link_referral(new.id, new.raw_user_meta_data->>'referral_code_used');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.link_referral(p_referred uuid, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
begin
  select id into v_referrer from profiles
    where referral_code = upper(trim(p_code)) and id <> p_referred;
  if v_referrer is null then return; end if;
  if exists (select 1 from referrals where referred_id = p_referred) then return; end if;

  insert into referrals (referrer_id, referred_id, code)
    values (v_referrer, p_referred, upper(trim(p_code)));
  update profiles set loyalty_points = loyalty_points + 100, referred_by = v_referrer
    where id = p_referred;
end $$;

-- RPC : rattacher un parrain après coup.
create or replace function public.redeem_referral(p_code text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.link_referral(auth.uid(), p_code);
end $$;

-- Marquer vendeur à la création de boutique + renseigner seller_id produit.
create or replace function public.handle_new_shop()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set is_seller = true where id = new.owner_id;
  return new;
end $$;

drop trigger if exists on_shop_created on public.shops;
create trigger on_shop_created
  after insert on public.shops
  for each row execute function public.handle_new_shop();

create or replace function public.set_product_seller()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select owner_id into new.seller_id from shops where id = new.shop_id;
  return new;
end $$;

drop trigger if exists before_product_insert on public.products;
create trigger before_product_insert
  before insert on public.products
  for each row execute function public.set_product_seller();

-- Compteur de favoris (dénormalisé, maintenu serveur).
create or replace function public.sync_favorites_count()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update products set favorites_count = favorites_count + 1 where id = new.product_id;
  else
    update products set favorites_count = greatest(favorites_count - 1, 0) where id = old.product_id;
  end if;
  return null;
end $$;

drop trigger if exists on_favorite_change on public.favorites;
create trigger on_favorite_change
  after insert or delete on public.favorites
  for each row execute function public.sync_favorites_count();

-- Vues produit + "récemment consultés".
create or replace function public.register_product_view(p_product_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update products set views_count = views_count + 1 where id = p_product_id;
  if auth.uid() is not null then
    insert into recently_viewed (user_id, product_id)
      values (auth.uid(), p_product_id)
      on conflict (user_id, product_id) do update set viewed_at = now();
  end if;
end $$;

-- Dernier message dénormalisé sur la conversation + notification.
create or replace function public.handle_new_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_conv conversations%rowtype;
  v_recipient uuid;
begin
  select * into v_conv from conversations where id = new.conversation_id;
  update conversations
    set last_message = left(new.content, 120), last_message_at = new.created_at
    where id = new.conversation_id;
  v_recipient := case when new.sender_id = v_conv.buyer_id
    then v_conv.seller_id else v_conv.buyer_id end;
  insert into notifications (user_id, type, title, body, data)
    values (v_recipient, 'message', 'Nouveau message',
            left(new.content, 120),
            jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end $$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- RPC : ouvrir/récupérer une conversation.
create or replace function public.open_conversation(p_seller_id uuid, p_product_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if auth.uid() = p_seller_id then raise exception 'Impossible de discuter avec soi-même'; end if;
  select id into v_id from conversations
    where buyer_id = auth.uid() and seller_id = p_seller_id
      and product_id is not distinct from p_product_id;
  if v_id is null then
    insert into conversations (buyer_id, seller_id, product_id)
      values (auth.uid(), p_seller_id, p_product_id)
      returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update messages set read_at = now()
    where conversation_id = p_conversation_id
      and sender_id <> auth.uid() and read_at is null;
end $$;

-- ---------- OFFRES : bornes + limite, validées serveur ----------
create or replace function public.make_offer(p_product_id uuid, p_amount integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_product products%rowtype;
  v_count integer;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select * into v_product from products where id = p_product_id and status = 'active';
  if v_product.id is null then raise exception 'Produit indisponible'; end if;
  if v_product.seller_id = auth.uid() then raise exception 'Vous êtes le vendeur'; end if;
  if p_amount < ceil(v_product.price * 0.5) or p_amount > v_product.price then
    raise exception 'Offre hors bornes (50%% à 100%% du prix)';
  end if;
  select count(*) into v_count from offers
    where product_id = p_product_id and buyer_id = auth.uid();
  if v_count >= 3 then raise exception 'Limite de 3 offres atteinte'; end if;

  insert into offers (product_id, buyer_id, shop_id, amount)
    values (p_product_id, auth.uid(), v_product.shop_id, p_amount)
    returning id into v_id;
  insert into notifications (user_id, type, title, body, data)
    values (v_product.seller_id, 'offer', 'Nouvelle offre',
            'Offre de ' || p_amount || ' FCFA sur « ' || v_product.title || ' »',
            jsonb_build_object('product_id', p_product_id));
  return v_id;
end $$;

create or replace function public.respond_to_offer(p_offer_id uuid, p_action text, p_counter_amount integer default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_offer offers%rowtype;
  v_product products%rowtype;
begin
  select o.* into v_offer from offers o
    join shops s on s.id = o.shop_id
    where o.id = p_offer_id and s.owner_id = auth.uid();
  if v_offer.id is null then raise exception 'Offre introuvable'; end if;
  if v_offer.status <> 'pending' then raise exception 'Offre déjà traitée'; end if;
  select * into v_product from products where id = v_offer.product_id;

  if p_action = 'accepted' then
    update offers set status = 'accepted' where id = p_offer_id;
    -- Prix négocié appliqué au produit pour cet acheteur : simplification MVP,
    -- le vendeur ajuste le prix ou convient du montant en chat.
  elsif p_action = 'declined' then
    update offers set status = 'declined' where id = p_offer_id;
  elsif p_action = 'countered' then
    if p_counter_amount is null or p_counter_amount <= v_offer.amount
       or p_counter_amount > v_product.price then
      raise exception 'Contre-offre invalide';
    end if;
    update offers set status = 'countered', counter_amount = p_counter_amount
      where id = p_offer_id;
  else
    raise exception 'Action inconnue';
  end if;

  insert into notifications (user_id, type, title, body, data)
    values (v_offer.buyer_id, 'offer', 'Réponse à votre offre',
            'Votre offre sur « ' || v_product.title || ' » : ' || p_action,
            jsonb_build_object('product_id', v_offer.product_id));
end $$;

-- ---------- COMMANDES : création atomique côté serveur ----------
create or replace function public.place_order(
  p_items jsonb,
  p_address jsonb,
  p_zone_id uuid,
  p_delivery_method text,
  p_payment_method text,
  p_coupon_code text default null
) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_unit integer;
  v_qty integer;
  v_shop uuid;
  v_order_ids uuid[] := '{}';
  v_order_id uuid;
  v_subtotal integer;
  v_discount integer;
  v_fee integer;
  v_zone delivery_zones%rowtype;
  v_coupon coupons%rowtype;
  v_shops uuid[];
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Panier vide'; end if;

  if p_zone_id is not null then
    select * into v_zone from delivery_zones where id = p_zone_id;
  end if;
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(trim(p_coupon_code)) and active
        and (expires_at is null or expires_at > now())
        and (max_uses is null or used_count < max_uses);
  end if;

  -- Une commande par boutique.
  select array_agg(distinct p.shop_id) into v_shops
    from jsonb_array_elements(p_items) i
    join products p on p.id = (i->>'product_id')::uuid;

  foreach v_shop in array v_shops loop
    v_subtotal := 0;
    insert into orders (buyer_id, shop_id, subtotal, total, payment_method,
                        payment_status, address_snapshot, coupon_code)
      values (auth.uid(), v_shop, 0, 0, p_payment_method,
              case when p_payment_method = 'cod' then 'pending' else 'pending' end,
              coalesce(p_address, '{}'::jsonb),
              case when v_coupon.id is not null then v_coupon.code end)
      returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_product from products
        where id = (v_item->>'product_id')::uuid and shop_id = v_shop
        for update;
      continue when v_product.id is null;
      if v_product.status <> 'active' then
        raise exception 'Produit « % » indisponible', v_product.title;
      end if;
      v_qty := greatest((v_item->>'quantity')::integer, 1);

      if v_item->>'variant_id' is not null then
        select * into v_variant from product_variants
          where id = (v_item->>'variant_id')::uuid and product_id = v_product.id
          for update;
        if v_variant.id is null then raise exception 'Variante introuvable'; end if;
        if v_variant.stock < v_qty then
          raise exception 'Stock insuffisant pour %', v_product.title;
        end if;
        v_unit := coalesce(v_variant.price, v_product.price);
        update product_variants set stock = stock - v_qty where id = v_variant.id;
      else
        if v_product.stock < v_qty then
          raise exception 'Stock insuffisant pour %', v_product.title;
        end if;
        v_unit := v_product.price;
        update products set stock = stock - v_qty where id = v_product.id;
      end if;

      insert into order_items (order_id, product_id, variant_id, title,
                               variant_name, unit_price, quantity, image_url)
        values (v_order_id, v_product.id,
                (v_item->>'variant_id')::uuid, v_product.title,
                v_variant.name, v_unit, v_qty,
                (select url from product_images
                   where product_id = v_product.id order by position limit 1));
      v_subtotal := v_subtotal + v_unit * v_qty;
      v_variant := null;
    end loop;

    -- Remise coupon (répartie : appliquée à chaque commande éligible).
    v_discount := 0;
    if v_coupon.id is not null
       and (v_coupon.shop_id is null or v_coupon.shop_id = v_shop)
       and v_subtotal >= v_coupon.min_order_amount then
      v_discount := case v_coupon.type
        when 'percent' then (v_subtotal * v_coupon.value) / 100
        else least(v_coupon.value, v_subtotal) end;
    end if;

    v_fee := 0;
    if p_delivery_method <> 'pickup' and v_zone.id is not null then
      if v_zone.free_above = 0 or v_subtotal < v_zone.free_above then
        v_fee := case when p_delivery_method = 'express'
          then v_zone.base_fee + v_zone.base_fee / 2
          else v_zone.base_fee end;
      end if;
    end if;

    update orders set subtotal = v_subtotal, discount = v_discount,
        delivery_fee = v_fee, total = v_subtotal - v_discount + v_fee
      where id = v_order_id;
    insert into order_events (order_id, status) values (v_order_id, 'pending');
    insert into notifications (user_id, type, title, body, data)
      select s.owner_id, 'order', 'Nouvelle commande',
             'Commande de ' || (v_subtotal - v_discount + v_fee) || ' FCFA reçue',
             jsonb_build_object('order_id', v_order_id)
      from shops s where s.id = v_shop;

    v_order_ids := v_order_ids || v_order_id;
  end loop;

  if v_coupon.id is not null then
    update coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;
  return v_order_ids;
end $$;

-- ---------- STATUTS : machine à états serveur ----------
create or replace function public.advance_order_status(
  p_order_id uuid, p_new_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_is_seller boolean;
  v_allowed boolean;
  v_item order_items%rowtype;
begin
  select o.* into v_order from orders o where o.id = p_order_id;
  if v_order.id is null then raise exception 'Commande introuvable'; end if;

  select exists (select 1 from shops where id = v_order.shop_id and owner_id = auth.uid())
    into v_is_seller;

  if not v_is_seller and v_order.buyer_id <> auth.uid() then
    raise exception 'Accès refusé';
  end if;
  -- L'acheteur ne peut qu'annuler, et seulement avant expédition.
  if not v_is_seller and (p_new_status <> 'cancelled'
      or v_order.status not in ('pending','confirmed')) then
    raise exception 'Action non autorisée';
  end if;

  v_allowed := case v_order.status
    when 'pending' then p_new_status in ('confirmed','cancelled')
    when 'confirmed' then p_new_status in ('preparing','cancelled')
    when 'preparing' then p_new_status in ('shipped','cancelled')
    when 'shipped' then p_new_status = 'delivered'
    when 'delivered' then p_new_status = 'refunded'
    else false end;
  if not v_allowed then
    raise exception 'Transition % -> % interdite', v_order.status, p_new_status;
  end if;

  update orders set status = p_new_status,
    payment_status = case when p_new_status = 'delivered' and payment_method = 'cod'
      then 'paid' else payment_status end
    where id = p_order_id;
  insert into order_events (order_id, status, note) values (p_order_id, p_new_status, p_note);

  -- Annulation : on restitue le stock.
  if p_new_status = 'cancelled' then
    for v_item in select * from order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update products set stock = stock + v_item.quantity where id = v_item.product_id;
      end if;
    end loop;
  end if;

  -- Livraison : crédit vendeur (moins 5 % de commission) + points fidélité.
  if p_new_status = 'delivered' then
    update wallets set balance = balance + (v_order.total - (v_order.total * 5) / 100)
      where user_id = (select owner_id from shops where id = v_order.shop_id);
    insert into wallet_transactions (wallet_user_id, amount, kind, order_id)
      values ((select owner_id from shops where id = v_order.shop_id),
              v_order.total - (v_order.total * 5) / 100, 'sale_credit', p_order_id);
    update profiles set loyalty_points = loyalty_points + (v_order.total / 1000)
      where id = v_order.buyer_id;
    -- Bonus parrain (200 pts) à la première commande livrée du filleul.
    update profiles p set loyalty_points = loyalty_points + 200
      from referrals r
      where r.referred_id = v_order.buyer_id and r.referrer_id = p.id
        and r.reward_points = 0;
    update referrals set reward_points = 200
      where referred_id = v_order.buyer_id and reward_points = 0;
  end if;

  insert into notifications (user_id, type, title, body, data)
    values (case when v_is_seller then v_order.buyer_id
                 else (select owner_id from shops where id = v_order.shop_id) end,
            'order', 'Commande mise à jour',
            'Commande #' || left(p_order_id::text, 8) || ' : ' || p_new_status,
            jsonb_build_object('order_id', p_order_id));
end $$;

-- ---------- RETRAIT ----------
create or replace function public.request_withdrawal(p_amount integer, p_phone text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
begin
  if p_amount < 5000 then raise exception 'Retrait minimum : 5000 FCFA'; end if;
  select balance into v_balance from wallets where user_id = auth.uid() for update;
  if v_balance is null or v_balance < p_amount then
    raise exception 'Solde insuffisant';
  end if;
  update wallets set balance = balance - p_amount where user_id = auth.uid();
  insert into wallet_transactions (wallet_user_id, amount, kind, note)
    values (auth.uid(), -p_amount, 'withdrawal', 'Vers ' || p_phone);
end $$;

-- ---------- STATS BOUTIQUE ----------
create or replace function public.shop_stats(p_shop_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total_sales', coalesce((select sum(total) from orders
        where shop_id = p_shop_id and status = 'delivered'), 0),
    'delivered_orders', (select count(*) from orders
        where shop_id = p_shop_id and status = 'delivered'),
    'pending_orders', (select count(*) from orders
        where shop_id = p_shop_id and status in ('pending','confirmed','preparing','shipped')),
    'active_products', (select count(*) from products
        where shop_id = p_shop_id and status = 'active'),
    'average_rating', coalesce((select round(avg(rating)::numeric, 1) from reviews
        where shop_id = p_shop_id), 0),
    'rating_count', (select count(*) from reviews where shop_id = p_shop_id),
    'followers_count', (select count(*) from follows where shop_id = p_shop_id)
  );
$$;

-- ---------- STATS ADMIN ----------
create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin) then
    raise exception 'Réservé aux administrateurs';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from profiles),
    'shops', (select count(*) from shops),
    'products', (select count(*) from products where status = 'active'),
    'orders', (select count(*) from orders),
    'gmv', coalesce((select sum(total) from orders where status = 'delivered'), 0),
    'open_reports', (select count(*) from reports where status = 'open')
  );
end $$;

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.favorites enable row level security;
alter table public.follows enable row level security;
alter table public.shop_posts enable row level security;
alter table public.blocks enable row level security;
alter table public.recently_viewed enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;
alter table public.notifications enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.reports enable row level security;
alter table public.referrals enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and is_admin) $$;

-- Profils : lecture publique, écriture sur soi (colonnes sensibles protégées
-- par REVOKE ci-dessous), admin peut tout modifier.
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- Le client ne peut JAMAIS écrire les colonnes de valeur.
revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url, phone, city, bio, fcm_token)
  on public.profiles to authenticated;
grant update (is_admin, is_seller, loyalty_points)
  on public.profiles to service_role;

drop policy if exists "shops_read" on public.shops;
create policy "shops_read" on public.shops for select using (true);
drop policy if exists "shops_insert" on public.shops;
create policy "shops_insert" on public.shops for insert
  with check (owner_id = auth.uid());
drop policy if exists "shops_update" on public.shops;
create policy "shops_update" on public.shops for update
  using (owner_id = auth.uid() or public.is_admin());
alter table public.shops alter column owner_id set default auth.uid();
revoke update on public.shops from anon, authenticated;
grant update (name, slug, description, logo_url, banner_url, city, phone)
  on public.shops to authenticated;

drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories for select using (true);
drop policy if exists "categories_admin" on public.categories;
create policy "categories_admin" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select using (true);
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products for insert
  with check (exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products for update
  using (seller_id = auth.uid() or public.is_admin());
drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products for delete
  using (seller_id = auth.uid() or public.is_admin());
-- Stock/compteurs modifiés uniquement par les fonctions SECURITY DEFINER.
revoke update on public.products from anon, authenticated;
grant update (title, description, price, compare_at_price, stock, category_id,
              condition, city, status, is_flash, flash_ends_at)
  on public.products to authenticated;

drop policy if exists "product_images_read" on public.product_images;
create policy "product_images_read" on public.product_images for select using (true);
drop policy if exists "product_images_write" on public.product_images;
create policy "product_images_write" on public.product_images for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

drop policy if exists "variants_read" on public.product_variants;
create policy "variants_read" on public.product_variants for select using (true);
drop policy if exists "variants_write" on public.product_variants;
create policy "variants_write" on public.product_variants for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "follows_own" on public.follows;
create policy "follows_own" on public.follows for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());
drop policy if exists "follows_count_read" on public.follows;
create policy "follows_count_read" on public.follows for select using (true);

drop policy if exists "posts_read" on public.shop_posts;
create policy "posts_read" on public.shop_posts for select using (true);
drop policy if exists "posts_write" on public.shop_posts;
create policy "posts_write" on public.shop_posts for all
  using (exists (select 1 from shops where id = shop_id and owner_id = auth.uid()))
  with check (exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));

drop policy if exists "blocks_own" on public.blocks;
create policy "blocks_own" on public.blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

drop policy if exists "recently_viewed_own" on public.recently_viewed;
create policy "recently_viewed_own" on public.recently_viewed for select
  using (user_id = auth.uid());

drop policy if exists "zones_read" on public.delivery_zones;
create policy "zones_read" on public.delivery_zones for select using (true);
drop policy if exists "zones_admin" on public.delivery_zones;
create policy "zones_admin" on public.delivery_zones for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "addresses_own" on public.addresses;
create policy "addresses_own" on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "coupons_read" on public.coupons;
create policy "coupons_read" on public.coupons for select using (true);
drop policy if exists "coupons_admin" on public.coupons;
create policy "coupons_admin" on public.coupons for insert
  with check (public.is_admin()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
drop policy if exists "coupons_manage" on public.coupons;
create policy "coupons_manage" on public.coupons for update
  using (public.is_admin()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
drop policy if exists "coupons_delete" on public.coupons;
create policy "coupons_delete" on public.coupons for delete
  using (public.is_admin()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
revoke update on public.coupons from anon, authenticated;
grant update (code, type, value, min_order_amount, expires_at, max_uses, active)
  on public.coupons to authenticated;

-- Commandes : lecture acheteur/vendeur/admin. Écriture UNIQUEMENT via RPC.
drop policy if exists "orders_read" on public.orders;
create policy "orders_read" on public.orders for select
  using (buyer_id = auth.uid()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid())
    or public.is_admin());
drop policy if exists "order_items_read" on public.order_items;
create policy "order_items_read" on public.order_items for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.buyer_id = auth.uid()
      or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid())
      or public.is_admin())));
drop policy if exists "order_events_read" on public.order_events;
create policy "order_events_read" on public.order_events for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.buyer_id = auth.uid()
      or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid())
      or public.is_admin())));

-- Avis : lecture publique ; création réservée à l'acheteur d'une commande livrée.
drop policy if exists "reviews_read" on public.reviews;
create policy "reviews_read" on public.reviews for select using (true);
drop policy if exists "reviews_insert" on public.reviews;
create policy "reviews_insert" on public.reviews for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from orders o
      where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'delivered')
  );

drop policy if exists "conversations_own" on public.conversations;
create policy "conversations_own" on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());
drop policy if exists "messages_own" on public.messages;
create policy "messages_own" on public.messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert
  with check (sender_id = auth.uid()
    and exists (select 1 from conversations c where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
    and not exists (select 1 from blocks b
      join conversations c on c.id = conversation_id
      where (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
         or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)));

drop policy if exists "offers_read" on public.offers;
create policy "offers_read" on public.offers for select
  using (buyer_id = auth.uid()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));

drop policy if exists "notifications_own_read" on public.notifications;
create policy "notifications_own_read" on public.notifications for select
  using (user_id = auth.uid());
drop policy if exists "notifications_own_update" on public.notifications;
create policy "notifications_own_update" on public.notifications for update
  using (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "wallets_own_read" on public.wallets;
create policy "wallets_own_read" on public.wallets for select
  using (user_id = auth.uid());
drop policy if exists "wallet_tx_own_read" on public.wallet_transactions;
create policy "wallet_tx_own_read" on public.wallet_transactions for select
  using (wallet_user_id = auth.uid());

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports for insert
  with check (reporter_id = auth.uid());
drop policy if exists "reports_admin" on public.reports;
create policy "reports_admin" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports for update
  using (public.is_admin());

drop policy if exists "referrals_read" on public.referrals;
create policy "referrals_read" on public.referrals for select
  using (referrer_id = auth.uid() or referred_id = auth.uid());

-- Realtime sur messages + notifications.
do $$ begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null; end;
end $$;

-- ---------- STORAGE : buckets publics, écriture sous son uid ----------
insert into storage.buckets (id, name, public)
  values ('product-images','product-images', true),
         ('shop-images','shop-images', true),
         ('avatars','avatars', true)
  on conflict (id) do nothing;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects for select
  using (bucket_id in ('product-images','shop-images','avatars'));
drop policy if exists "storage_own_write" on storage.objects;
create policy "storage_own_write" on storage.objects for insert
  with check (bucket_id in ('product-images','shop-images','avatars')
    and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "storage_own_delete" on storage.objects;
create policy "storage_own_delete" on storage.objects for delete
  using (bucket_id in ('product-images','shop-images','avatars')
    and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- MIGRATION 001 — croissance / engagement
-- source : supabase/migrations/001_growth_features.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — fonctionnalités de croissance / engagement
-- Appliqué après schema.sql. Même règle anti-triche : toute
-- récompense (points, wallet, coupon) est calculée par des
-- fonctions SECURITY DEFINER, jamais écrite directement par le client.
-- ============================================================

-- ---------- ROUE DE LA CHANCE QUOTIDIENNE ----------
create table if not exists public.spin_rewards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prize_kind text not null check (prize_kind in ('points','coupon','nothing')),
  prize_value integer not null default 0,
  coupon_code text,
  created_at timestamptz not null default now()
);
-- Note : pas d'index sur (created_at::date) — le cast timestamptz -> date
-- dépend du fuseau de la session, il est STABLE et non IMMUTABLE, donc
-- interdit dans une expression d'index. L'index (user_id, created_at)
-- couvre la recherche « a-t-il déjà joué aujourd'hui ? » de spin_wheel.
create index if not exists idx_spin_rewards_user_day
  on public.spin_rewards (user_id, created_at desc);

alter table public.spin_rewards enable row level security;
drop policy if exists "spin_rewards_own_read" on public.spin_rewards;
create policy "spin_rewards_own_read" on public.spin_rewards for select
  using (user_id = auth.uid());

-- Segments de la roue (probabilité relative = weight). Alignés avec
-- lib/domain/spin_wheel_logic.dart — modifier les deux en même temps.
create or replace function public.spin_wheel()
returns public.spin_rewards
language plpgsql security definer set search_path = public as $$
declare
  v_already integer;
  v_roll numeric;
  v_kind text;
  v_value integer;
  v_code text;
  v_row public.spin_rewards;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select count(*) into v_already from spin_rewards
    where user_id = auth.uid() and created_at::date = now()::date;
  if v_already > 0 then raise exception 'Déjà joué aujourd''hui'; end if;

  v_roll := random() * 100;
  if v_roll < 40 then
    v_kind := 'nothing'; v_value := 0;
  elsif v_roll < 70 then
    v_kind := 'points'; v_value := 10;
  elsif v_roll < 90 then
    v_kind := 'points'; v_value := 50;
  elsif v_roll < 98 then
    v_kind := 'coupon'; v_value := 5;
    v_code := 'SPIN' || upper(substr(md5(random()::text), 1, 6));
  else
    v_kind := 'coupon'; v_value := 15;
    v_code := 'SPIN' || upper(substr(md5(random()::text), 1, 6));
  end if;

  if v_kind = 'points' then
    update profiles set loyalty_points = loyalty_points + v_value where id = auth.uid();
  elsif v_kind = 'coupon' then
    insert into coupons (code, type, value, min_order_amount, max_uses, active)
      values (v_code, 'percent', v_value, 0, 1, true);
  end if;

  insert into spin_rewards (user_id, prize_kind, prize_value, coupon_code)
    values (auth.uid(), v_kind, v_value, v_code)
    returning * into v_row;
  return v_row;
end $$;

-- ---------- ALERTES DE BAISSE DE PRIX ----------
create table if not exists public.price_alerts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price_at_creation integer not null,
  notified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.price_alerts enable row level security;
drop policy if exists "price_alerts_own" on public.price_alerts;
create policy "price_alerts_own" on public.price_alerts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notifie les abonnés quand le prix baisse (déclenché à la mise à jour produit).
create or replace function public.notify_price_drop()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.price < old.price then
    insert into notifications (user_id, type, title, body, data)
      select pa.user_id, 'price_drop', 'Baisse de prix !',
             '« ' || new.title || ' » est passé à ' || new.price || ' FCFA',
             jsonb_build_object('product_id', new.id)
      from price_alerts pa
      where pa.product_id = new.id and pa.notified = false and pa.price_at_creation > new.price;
    update price_alerts set notified = true
      where product_id = new.id and notified = false and price_at_creation > new.price;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_price_drop on public.products;
create trigger trg_notify_price_drop
  after update of price on public.products
  for each row execute function public.notify_price_drop();

-- ---------- MISE EN AVANT PRODUIT (BOOST PAYANT) ----------
create table if not exists public.product_boosts (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  cost integer not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
-- Note : pas de prédicat `where ends_at > now()` — now() n'est pas IMMUTABLE
-- et un index partiel l'exige. L'index simple sert les mêmes requêtes.
create index if not exists idx_product_boosts_active
  on public.product_boosts (ends_at);

alter table public.product_boosts enable row level security;
drop policy if exists "product_boosts_read" on public.product_boosts;
create policy "product_boosts_read" on public.product_boosts for select using (true);

-- Tarifs de mise en avant (FCFA) par durée — alignés avec
-- lib/domain/boost_logic.dart.
create or replace function public.boost_product(p_product_id uuid, p_hours integer)
returns public.product_boosts
language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid;
  v_cost integer;
  v_balance integer;
  v_row public.product_boosts;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select shop_id into v_shop_id from products p
    join shops s on s.id = p.shop_id
    where p.id = p_product_id and s.owner_id = auth.uid();
  if v_shop_id is null then raise exception 'Produit introuvable'; end if;

  v_cost := case p_hours
    when 24 then 500
    when 72 then 1200
    when 168 then 2500
    else null
  end;
  if v_cost is null then raise exception 'Durée invalide (24, 72 ou 168 h)'; end if;

  select balance into v_balance from wallets where user_id = auth.uid() for update;
  if v_balance is null or v_balance < v_cost then
    raise exception 'Solde insuffisant (portefeuille)';
  end if;

  update wallets set balance = balance - v_cost where user_id = auth.uid();
  insert into wallet_transactions (wallet_user_id, amount, kind, note)
    values (auth.uid(), -v_cost, 'withdrawal', 'Mise en avant produit');

  insert into product_boosts (product_id, shop_id, cost, ends_at)
    values (p_product_id, v_shop_id, v_cost, now() + make_interval(hours => p_hours))
    returning * into v_row;
  return v_row;
end $$;

-- ---------- QUESTIONS & RÉPONSES PUBLIQUES ----------
create table if not exists public.product_questions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  question text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.product_questions enable row level security;
drop policy if exists "product_questions_read" on public.product_questions;
create policy "product_questions_read" on public.product_questions for select using (true);
drop policy if exists "product_questions_insert" on public.product_questions;
create policy "product_questions_insert" on public.product_questions for insert
  with check (author_id = auth.uid());

create or replace function public.answer_question(p_question_id uuid, p_answer text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_seller_ok boolean;
begin
  select exists(
    select 1 from product_questions q
    join products p on p.id = q.product_id
    join shops s on s.id = p.shop_id
    where q.id = p_question_id and s.owner_id = auth.uid()
  ) into v_seller_ok;
  if not v_seller_ok then raise exception 'Non autorisé'; end if;
  update product_questions set answer = p_answer, answered_at = now()
    where id = p_question_id;
end $$;

-- ---------- PREUVE SOCIALE : compteur de vues live ----------
-- "X personnes regardent" s'appuie sur recently_viewed existant (fenêtre 10 min).
create or replace function public.active_viewers(p_product_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select count(distinct user_id)::integer from recently_viewed
    where product_id = p_product_id and viewed_at > now() - interval '10 minutes';
$$;

-- Realtime pour les Q&A (mises à jour de réponse en direct).
do $$ begin
  begin
    alter publication supabase_realtime add table public.product_questions;
  exception when duplicate_object then null; end;
end $$;


-- ============================================================
-- MIGRATION 002 — listes, parrainage, stories
-- source : supabase/migrations/002_growth_features_2.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — croissance / engagement (vague 2)
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

drop policy if exists "wishlists_own" on public.wishlists;
create policy "wishlists_own" on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "wishlist_items_own" on public.wishlist_items;
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
-- Note : pas de prédicat `where expires_at > now()` — now() n'est pas
-- IMMUTABLE et un index partiel l'exige. L'index simple sert les mêmes
-- requêtes (stories actives = expires_at > now()).
create index if not exists idx_shop_stories_active
  on public.shop_stories (expires_at);

create table if not exists public.shop_story_views (
  story_id uuid not null references public.shop_stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.shop_stories enable row level security;
alter table public.shop_story_views enable row level security;

drop policy if exists "shop_stories_read_active" on public.shop_stories;
create policy "shop_stories_read_active" on public.shop_stories for select
  using (expires_at > now());
drop policy if exists "shop_stories_insert_own" on public.shop_stories;
create policy "shop_stories_insert_own" on public.shop_stories for insert
  with check (exists(select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));
drop policy if exists "shop_stories_delete_own" on public.shop_stories;
create policy "shop_stories_delete_own" on public.shop_stories for delete
  using (exists(select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid()));

drop policy if exists "shop_story_views_own" on public.shop_story_views;
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


-- ============================================================
-- MIGRATION 003 — encheres, prix, points, retrait
-- source : supabase/migrations/003_growth_features_3.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — croissance / engagement (vague 3)
-- Enchères, historique des prix, conversion de points fidélité,
-- code de retrait sécurisé. Toujours la même règle : la valeur
-- (enchères, points, statuts) est validée par des fonctions
-- SECURITY DEFINER, jamais écrite directement par le client.
-- ============================================================

-- ---------- ENCHÈRES ----------
create table if not exists public.auctions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  starting_price integer not null check (starting_price > 0),
  current_bid integer,
  current_bidder uuid references public.profiles(id),
  bids_count integer not null default 0,
  status text not null default 'active' check (status in ('active','ended','cancelled')),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_bids_auction on public.bids (auction_id, amount desc);

alter table public.auctions enable row level security;
alter table public.bids enable row level security;

drop policy if exists "auctions_read" on public.auctions;
create policy "auctions_read" on public.auctions for select using (true);
drop policy if exists "bids_read" on public.bids;
create policy "bids_read" on public.bids for select using (true);

create or replace function public.create_auction(
  p_product_id uuid,
  p_starting_price integer,
  p_duration_hours integer
) returns public.auctions
language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid;
  v_row public.auctions;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_starting_price < 100 then raise exception 'Prix de départ minimum : 100 FCFA'; end if;
  if p_duration_hours not in (24, 72, 168) then
    raise exception 'Durée invalide (24, 72 ou 168 h)';
  end if;
  select p.shop_id into v_shop_id from products p
    join shops s on s.id = p.shop_id
    where p.id = p_product_id and s.owner_id = auth.uid() and p.status = 'active';
  if v_shop_id is null then raise exception 'Produit introuvable'; end if;
  if exists(select 1 from auctions where product_id = p_product_id and status = 'active') then
    raise exception 'Une enchère est déjà en cours sur ce produit';
  end if;

  insert into auctions (product_id, shop_id, starting_price, ends_at)
    values (p_product_id, v_shop_id, p_starting_price,
            now() + make_interval(hours => p_duration_hours))
    returning * into v_row;
  return v_row;
end $$;

-- Surenchère : minimum +5 % au-dessus de l'offre courante (ou du prix de
-- départ). Anti-sniping : une enchère dans les 2 dernières minutes prolonge
-- la fin de 2 minutes. Miroir de lib/domain/auction_rules.dart.
create or replace function public.place_bid(p_auction_id uuid, p_amount integer)
returns public.auctions
language plpgsql security definer set search_path = public as $$
declare
  v_auction auctions%rowtype;
  v_min integer;
  v_previous uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select * into v_auction from auctions where id = p_auction_id for update;
  if v_auction.id is null then raise exception 'Enchère introuvable'; end if;
  if v_auction.status <> 'active' or v_auction.ends_at <= now() then
    raise exception 'Enchère terminée';
  end if;
  if exists(select 1 from shops where id = v_auction.shop_id and owner_id = auth.uid()) then
    raise exception 'Vous êtes le vendeur';
  end if;

  v_min := coalesce(ceil(v_auction.current_bid * 1.05)::integer, v_auction.starting_price);
  if p_amount < v_min then
    raise exception 'Enchère minimum : % FCFA', v_min;
  end if;

  v_previous := v_auction.current_bidder;
  insert into bids (auction_id, bidder_id, amount)
    values (p_auction_id, auth.uid(), p_amount);
  update auctions set
      current_bid = p_amount,
      current_bidder = auth.uid(),
      bids_count = bids_count + 1,
      ends_at = case when ends_at - now() < interval '2 minutes'
                     then now() + interval '2 minutes' else ends_at end
    where id = p_auction_id
    returning * into v_auction;

  if v_previous is not null and v_previous <> auth.uid() then
    insert into notifications (user_id, type, title, body, data)
      values (v_previous, 'auction', 'Vous avez été surenchéri !',
              'Nouvelle offre de ' || p_amount || ' FCFA — réagissez vite.',
              jsonb_build_object('auction_id', p_auction_id,
                                 'product_id', v_auction.product_id));
  end if;
  return v_auction;
end $$;

-- Clôture paresseuse : appelée à l'affichage, elle marque les enchères échues
-- et notifie le gagnant + le vendeur (pas besoin de cron pour le MVP).
create or replace function public.settle_expired_auctions()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_a record;
begin
  for v_a in
    select a.*, p.title from auctions a
      join products p on p.id = a.product_id
      where a.status = 'active' and a.ends_at <= now()
      for update of a
  loop
    update auctions set status = 'ended' where id = v_a.id;
    if v_a.current_bidder is not null then
      insert into notifications (user_id, type, title, body, data)
        values (v_a.current_bidder, 'auction', 'Enchère remportée ! 🎉',
                'Vous remportez « ' || v_a.title || ' » pour ' || v_a.current_bid ||
                ' FCFA. Contactez le vendeur pour finaliser.',
                jsonb_build_object('auction_id', v_a.id, 'product_id', v_a.product_id));
      insert into notifications (user_id, type, title, body, data)
        select s.owner_id, 'auction', 'Votre enchère est terminée',
               '« ' || v_a.title || ' » part à ' || v_a.current_bid || ' FCFA.',
               jsonb_build_object('auction_id', v_a.id, 'product_id', v_a.product_id)
        from shops s where s.id = v_a.shop_id;
    end if;
  end loop;
end $$;

-- ---------- HISTORIQUE DES PRIX ----------
create table if not exists public.price_history (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  price integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_price_history_product
  on public.price_history (product_id, created_at);

alter table public.price_history enable row level security;
drop policy if exists "price_history_read" on public.price_history;
create policy "price_history_read" on public.price_history for select using (true);

create or replace function public.track_price()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.price <> old.price then
    insert into price_history (product_id, price) values (new.id, new.price);
  end if;
  return new;
end $$;

drop trigger if exists trg_track_price_insert on public.products;
create trigger trg_track_price_insert
  after insert on public.products
  for each row execute function public.track_price();
drop trigger if exists trg_track_price_update on public.products;
create trigger trg_track_price_update
  after update of price on public.products
  for each row execute function public.track_price();

-- ---------- CONVERSION DES POINTS FIDÉLITÉ ----------
-- 1 point = 10 FCFA, minimum 50 points. Produit un coupon personnel à usage
-- unique (montant fixe) utilisable au checkout via le flux coupon existant.
-- Barème miroir de lib/domain/points_redemption.dart.
create or replace function public.redeem_points(p_points integer)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_points < 50 then raise exception 'Minimum 50 points'; end if;
  select loyalty_points into v_balance from profiles
    where id = auth.uid() for update;
  if v_balance < p_points then raise exception 'Points insuffisants'; end if;

  v_code := 'PTS' || upper(substr(md5(random()::text), 1, 7));
  update profiles set loyalty_points = loyalty_points - p_points
    where id = auth.uid();
  insert into coupons (code, type, value, min_order_amount, max_uses, active)
    values (v_code, 'fixed', p_points * 10, 0, 1, true);
  return v_code;
end $$;

-- ---------- CODE DE RETRAIT SÉCURISÉ ----------
-- Le code n'est lisible que par l'acheteur (table séparée + RLS) ; le vendeur
-- doit le saisir pour passer la commande en "delivered".
create table if not exists public.order_pickup_codes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);
alter table public.order_pickup_codes enable row level security;
drop policy if exists "pickup_codes_buyer_read" on public.order_pickup_codes;
create policy "pickup_codes_buyer_read" on public.order_pickup_codes for select
  using (exists(select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid()));

create or replace function public.gen_pickup_code()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into order_pickup_codes (order_id, code)
    values (new.id, lpad((floor(random() * 1000000))::integer::text, 6, '0'));
  return new;
end $$;

drop trigger if exists trg_gen_pickup_code on public.orders;
create trigger trg_gen_pickup_code
  after insert on public.orders
  for each row execute function public.gen_pickup_code();

create or replace function public.confirm_delivery(p_order_id uuid, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
begin
  select o.* into v_order from orders o
    join shops s on s.id = o.shop_id
    where o.id = p_order_id and s.owner_id = auth.uid()
    for update of o;
  if v_order.id is null then raise exception 'Commande introuvable'; end if;
  if v_order.status <> 'shipped' then
    raise exception 'La commande doit être expédiée d''abord';
  end if;
  if not exists(select 1 from order_pickup_codes
                where order_id = p_order_id and code = p_code) then
    raise exception 'Code de retrait incorrect';
  end if;

  -- La transition + effets (événement, crédit portefeuille, points) passent
  -- par la fonction existante pour garder une seule machine à états.
  perform advance_order_status(p_order_id, 'delivered',
                               'Livraison confirmée par code de retrait');
end $$;


-- ============================================================
-- MIGRATION 004 — back-office admin
-- source : supabase/migrations/004_admin_backoffice.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — back-office : stock audité, comptabilité, factures,
-- paramètres plateforme. Toujours la même règle anti-triche : le
-- stock et la commission ne sont jamais modifiés directement par le
-- client, uniquement via des RPC SECURITY DEFINER réservées aux admins.
-- ============================================================

-- ---------- PARAMÈTRES PLATEFORME (ligne unique) ----------
create table if not exists public.platform_settings (
  id boolean primary key default true,
  commission_percent integer not null default 5
    check (commission_percent between 0 and 100),
  min_withdrawal integer not null default 5000 check (min_withdrawal >= 0),
  support_phone text,
  support_email text,
  updated_at timestamptz not null default now(),
  constraint platform_settings_singleton check (id)
);
insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
drop policy if exists "platform_settings_read" on public.platform_settings;
create policy "platform_settings_read" on public.platform_settings for select using (true);

create or replace function public.admin_update_settings(
  p_commission_percent integer,
  p_min_withdrawal integer,
  p_support_phone text default null,
  p_support_email text default null
) returns public.platform_settings
language plpgsql security definer set search_path = public as $$
declare
  v_row public.platform_settings;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  update platform_settings set
    commission_percent = p_commission_percent,
    min_withdrawal = p_min_withdrawal,
    support_phone = p_support_phone,
    support_email = p_support_email,
    updated_at = now()
    where id = true
    returning * into v_row;
  return v_row;
end $$;

-- ---------- STOCK AUDITÉ ----------
create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_movements_product
  on public.stock_movements (product_id, created_at desc);

alter table public.stock_movements enable row level security;
drop policy if exists "stock_movements_read" on public.stock_movements;
create policy "stock_movements_read" on public.stock_movements for select
  using (public.is_admin()
    or exists (select 1 from products p join shops s on s.id = p.shop_id
               where p.id = product_id and s.owner_id = auth.uid()));

-- Ajustement de stock par un admin, avec motif obligatoire et traçabilité.
create or replace function public.admin_adjust_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_delta integer,
  p_reason text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_new_stock integer;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  if p_delta = 0 then raise exception 'Ajustement nul'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Motif requis'; end if;

  if p_variant_id is not null then
    update product_variants set stock = greatest(0, stock + p_delta)
      where id = p_variant_id and product_id = p_product_id
      returning stock into v_new_stock;
  else
    update products set stock = greatest(0, stock + p_delta)
      where id = p_product_id
      returning stock into v_new_stock;
  end if;
  if v_new_stock is null then raise exception 'Produit ou variante introuvable'; end if;

  insert into stock_movements (product_id, variant_id, delta, reason, created_by)
    values (p_product_id, p_variant_id, p_delta, p_reason, auth.uid());
  return v_new_stock;
end $$;

-- ---------- COMPTABILITÉ ----------
-- Chiffre d'affaires et commission par jour sur la période demandée.
create or replace function public.admin_revenue_report(p_from date, p_to date)
returns table (day date, orders_count bigint, gmv bigint, commission bigint)
language sql stable security definer set search_path = public as $$
  select o.created_at::date as day,
         count(*)::bigint as orders_count,
         coalesce(sum(o.total), 0)::bigint as gmv,
         coalesce(sum(o.total * (select commission_percent from platform_settings) / 100), 0)::bigint as commission
  from public.orders o
  where public.is_admin()
    and o.status = 'delivered'
    and o.created_at::date between p_from and p_to
  group by o.created_at::date
  order by o.created_at::date;
$$;

-- Répartition du chiffre d'affaires par boutique (période demandée).
create or replace function public.admin_shop_revenue(p_from date, p_to date)
returns table (
  shop_id uuid, shop_name text, orders_count bigint,
  gmv bigint, commission bigint, payout bigint
)
language sql stable security definer set search_path = public as $$
  select s.id, s.name,
         count(o.id)::bigint as orders_count,
         coalesce(sum(o.total), 0)::bigint as gmv,
         coalesce(sum(o.total * (select commission_percent from platform_settings) / 100), 0)::bigint as commission,
         coalesce(sum(o.total - o.total * (select commission_percent from platform_settings) / 100), 0)::bigint as payout
  from public.shops s
  join public.orders o on o.shop_id = s.id
    and o.status = 'delivered'
    and o.created_at::date between p_from and p_to
  where public.is_admin()
  group by s.id, s.name
  order by gmv desc;
$$;

-- Portefeuilles vendeurs : vue d'ensemble des soldes et retraits en attente.
create or replace function public.admin_wallets_overview()
returns table (
  user_id uuid, username text, shop_name text,
  balance integer, lifetime_credit bigint, lifetime_withdrawn bigint
)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, s.name, w.balance,
         coalesce(sum(t.amount) filter (where t.amount > 0), 0)::bigint,
         coalesce(abs(sum(t.amount) filter (where t.amount < 0)), 0)::bigint
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  left join public.shops s on s.owner_id = p.id
  left join public.wallet_transactions t on t.wallet_user_id = w.user_id
  where public.is_admin()
  group by p.id, p.username, s.name, w.balance
  order by w.balance desc;
$$;

-- ---------- RETRAIT MINIMUM DYNAMIQUE ----------
-- Redéfinit request_withdrawal pour lire min_withdrawal dans
-- platform_settings au lieu du 5000 en dur.
create or replace function public.request_withdrawal(p_amount integer, p_phone text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_balance integer;
  v_min integer;
begin
  select min_withdrawal into v_min from platform_settings where id = true;
  v_min := coalesce(v_min, 5000);
  if p_amount < v_min then raise exception 'Retrait minimum : % FCFA', v_min; end if;
  select balance into v_balance from wallets where user_id = auth.uid() for update;
  if v_balance is null or v_balance < p_amount then
    raise exception 'Solde insuffisant';
  end if;
  update wallets set balance = balance - p_amount where user_id = auth.uid();
  insert into wallet_transactions (wallet_user_id, amount, kind, note)
    values (auth.uid(), -p_amount, 'withdrawal', 'Vers ' || p_phone);
end $$;

-- ---------- COMMISSION DYNAMIQUE ----------
-- Redéfinit advance_order_status pour lire le taux dans platform_settings
-- au lieu du 5 % en dur (comportement identique sinon).
create or replace function public.advance_order_status(
  p_order_id uuid, p_new_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_is_seller boolean;
  v_allowed boolean;
  v_item order_items%rowtype;
  v_commission_percent integer;
begin
  select o.* into v_order from orders o where o.id = p_order_id;
  if v_order.id is null then raise exception 'Commande introuvable'; end if;

  select exists (select 1 from shops where id = v_order.shop_id and owner_id = auth.uid())
    into v_is_seller;

  if not v_is_seller and v_order.buyer_id <> auth.uid() then
    raise exception 'Accès refusé';
  end if;
  if not v_is_seller and (p_new_status <> 'cancelled'
      or v_order.status not in ('pending','confirmed')) then
    raise exception 'Action non autorisée';
  end if;

  v_allowed := case v_order.status
    when 'pending' then p_new_status in ('confirmed','cancelled')
    when 'confirmed' then p_new_status in ('preparing','cancelled')
    when 'preparing' then p_new_status in ('shipped','cancelled')
    when 'shipped' then p_new_status = 'delivered'
    when 'delivered' then p_new_status = 'refunded'
    else false end;
  if not v_allowed then
    raise exception 'Transition % -> % interdite', v_order.status, p_new_status;
  end if;

  update orders set status = p_new_status,
    payment_status = case when p_new_status = 'delivered' and payment_method = 'cod'
      then 'paid' else payment_status end
    where id = p_order_id;
  insert into order_events (order_id, status, note) values (p_order_id, p_new_status, p_note);

  if p_new_status = 'cancelled' then
    for v_item in select * from order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        update product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update products set stock = stock + v_item.quantity where id = v_item.product_id;
      end if;
    end loop;
  end if;

  if p_new_status = 'delivered' then
    select commission_percent into v_commission_percent from platform_settings where id = true;
    v_commission_percent := coalesce(v_commission_percent, 5);
    update wallets set balance = balance + (v_order.total - (v_order.total * v_commission_percent) / 100)
      where user_id = (select owner_id from shops where id = v_order.shop_id);
    insert into wallet_transactions (wallet_user_id, amount, kind, order_id)
      values ((select owner_id from shops where id = v_order.shop_id),
              v_order.total - (v_order.total * v_commission_percent) / 100, 'sale_credit', p_order_id);
    update profiles set loyalty_points = loyalty_points + (v_order.total / 1000)
      where id = v_order.buyer_id;
    update profiles p set loyalty_points = loyalty_points + 200
      from referrals r
      where r.referred_id = v_order.buyer_id and r.referrer_id = p.id
        and r.reward_points = 0;
    update referrals set reward_points = 200
      where referred_id = v_order.buyer_id and reward_points = 0;
  end if;

  insert into notifications (user_id, type, title, body, data)
    values (case when v_is_seller then v_order.buyer_id
                 else (select owner_id from shops where id = v_order.shop_id) end,
            'order', 'Commande mise à jour',
            'Commande #' || left(p_order_id::text, 8) || ' : ' || p_new_status,
            jsonb_build_object('order_id', p_order_id));
end $$;


-- ============================================================
-- MIGRATION 005 — roles a 3 niveaux
-- source : supabase/migrations/005_user_roles.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — trois niveaux de comptes
--
--   user    : consulte, met au panier, achète. Ne peut pas vendre.
--   vendeur : tout ce qui précède + ouvre sa boutique et publie des produits.
--   admin   : back-office.
--
-- Le rôle se lit sur profiles : is_admin > is_seller > (aucun) = user.
-- Ces deux colonnes sont déjà interdites en écriture au client
-- (revoke/grant dans schema.sql) : seul un admin les modifie, via
-- admin_set_user_role ci-dessous.
-- ============================================================

-- ---------- 1. Reprise de l'existant ----------
-- Tout compte possédant déjà une boutique reste vendeur.
update public.profiles p set is_seller = true
  where exists (select 1 from public.shops s where s.owner_id = p.id)
    and p.is_seller = false;

-- ---------- 2. Fin de la promotion automatique ----------
-- Auparavant, créer une boutique passait le compte en vendeur : n'importe
-- quel utilisateur pouvait donc devenir vendeur seul. Désormais le statut
-- est accordé uniquement par un administrateur.
drop trigger if exists on_shop_created on public.shops;
drop function if exists public.handle_new_shop();

-- ---------- 3. Test de rôle réutilisable ----------
create or replace function public.is_seller()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (
     select 1 from profiles
     where id = auth.uid() and (is_seller or is_admin)
   ) $$;

-- ---------- 4. Verrouillage côté base ----------
-- Ouvrir une boutique exige le statut vendeur.
drop policy if exists "shops_insert" on public.shops;
drop policy if exists "shops_insert" on public.shops;
create policy "shops_insert" on public.shops for insert
  with check (owner_id = auth.uid() and public.is_seller());

-- Publier un produit aussi (en plus d'être propriétaire de la boutique).
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products for insert
  with check (
    public.is_seller()
    and exists (select 1 from shops where id = shop_id and owner_id = auth.uid())
  );

-- ---------- 5. Attribution des rôles (admin uniquement) ----------
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if p_role not in ('user', 'seller', 'admin') then
    raise exception 'Rôle inconnu : %', p_role;
  end if;
  -- Un admin ne peut pas se retirer son propre statut : sans ce garde-fou,
  -- le dernier administrateur pourrait se verrouiller hors du back-office.
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Vous ne pouvez pas retirer votre propre statut administrateur';
  end if;

  update profiles set
    is_admin  = (p_role = 'admin'),
    is_seller = (p_role = 'seller')
    where id = p_user_id;

  if not found then raise exception 'Utilisateur introuvable'; end if;
end $$;

-- ---------- 6. Retrait du statut vendeur : mise en pause de la boutique ----
-- Un vendeur rétrogradé ne doit plus vendre : ses produits actifs passent en
-- "paused" plutôt que d'être supprimés (les commandes passées restent
-- intactes, et le statut est réversible si l'admin le repromeut).
create or replace function public.pause_products_when_seller_revoked()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.is_seller and not new.is_seller and not new.is_admin then
    update products set status = 'paused'
      where seller_id = new.id and status = 'active';
  end if;
  return new;
end $$;

drop trigger if exists on_seller_revoked on public.profiles;
create trigger on_seller_revoked
  after update of is_seller on public.profiles
  for each row execute function public.pause_products_when_seller_revoked();


-- ============================================================
-- MIGRATION 006 — pas d achat de sa propre marchandise
-- source : supabase/migrations/006_no_self_purchase.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — un vendeur ne peut pas acheter sa propre marchandise.
--
-- Le contrôle est fait dans place_order, pas seulement dans l'interface :
-- le panier vit côté navigateur et l'appel RPC peut être rejoué à la main.
-- Seule cette version fait foi.
--
-- Redéfinit place_order à l'identique de schema.sql, à l'exception du
-- garde-fou ajouté au début.
-- ============================================================

create or replace function public.place_order(
  p_items jsonb,
  p_address jsonb,
  p_zone_id uuid,
  p_delivery_method text,
  p_payment_method text,
  p_coupon_code text default null
) returns uuid[]
language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_unit integer;
  v_qty integer;
  v_shop uuid;
  v_order_ids uuid[] := '{}';
  v_order_id uuid;
  v_subtotal integer;
  v_discount integer;
  v_fee integer;
  v_zone delivery_zones%rowtype;
  v_coupon coupons%rowtype;
  v_shops uuid[];
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'Panier vide'; end if;

  -- Garde-fou : aucun article ne doit appartenir à une boutique dont
  -- l'acheteur est propriétaire.
  if exists (
    select 1
    from jsonb_array_elements(p_items) i
    join products p on p.id = (i->>'product_id')::uuid
    join shops s on s.id = p.shop_id
    where s.owner_id = auth.uid()
  ) then
    raise exception 'Vous ne pouvez pas commander vos propres produits';
  end if;

  if p_zone_id is not null then
    select * into v_zone from delivery_zones where id = p_zone_id;
  end if;
  if p_coupon_code is not null then
    select * into v_coupon from coupons
      where code = upper(trim(p_coupon_code)) and active
        and (expires_at is null or expires_at > now())
        and (max_uses is null or used_count < max_uses);
  end if;

  -- Une commande par boutique.
  select array_agg(distinct p.shop_id) into v_shops
    from jsonb_array_elements(p_items) i
    join products p on p.id = (i->>'product_id')::uuid;

  if v_shops is null then raise exception 'Aucun produit valide dans le panier'; end if;

  foreach v_shop in array v_shops loop
    v_subtotal := 0;
    insert into orders (buyer_id, shop_id, subtotal, total, payment_method,
                        payment_status, address_snapshot, coupon_code)
      values (auth.uid(), v_shop, 0, 0, p_payment_method,
              'pending',
              coalesce(p_address, '{}'::jsonb),
              case when v_coupon.id is not null then v_coupon.code end)
      returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_product from products
        where id = (v_item->>'product_id')::uuid and shop_id = v_shop
        for update;
      continue when v_product.id is null;
      if v_product.status <> 'active' then
        raise exception 'Produit « % » indisponible', v_product.title;
      end if;
      v_qty := greatest((v_item->>'quantity')::integer, 1);

      if v_item->>'variant_id' is not null then
        select * into v_variant from product_variants
          where id = (v_item->>'variant_id')::uuid and product_id = v_product.id
          for update;
        if v_variant.id is null then raise exception 'Variante introuvable'; end if;
        if v_variant.stock < v_qty then
          raise exception 'Stock insuffisant pour %', v_product.title;
        end if;
        v_unit := coalesce(v_variant.price, v_product.price);
        update product_variants set stock = stock - v_qty where id = v_variant.id;
      else
        if v_product.stock < v_qty then
          raise exception 'Stock insuffisant pour %', v_product.title;
        end if;
        v_unit := v_product.price;
        update products set stock = stock - v_qty where id = v_product.id;
      end if;

      insert into order_items (order_id, product_id, variant_id, title,
                               variant_name, unit_price, quantity, image_url)
        values (v_order_id, v_product.id,
                (v_item->>'variant_id')::uuid, v_product.title,
                v_variant.name, v_unit, v_qty,
                (select url from product_images
                   where product_id = v_product.id order by position limit 1));
      v_subtotal := v_subtotal + v_unit * v_qty;
      v_variant := null;
    end loop;

    -- Remise coupon (répartie : appliquée à chaque commande éligible).
    v_discount := 0;
    if v_coupon.id is not null
       and (v_coupon.shop_id is null or v_coupon.shop_id = v_shop)
       and v_subtotal >= v_coupon.min_order_amount then
      v_discount := case v_coupon.type
        when 'percent' then (v_subtotal * v_coupon.value) / 100
        else least(v_coupon.value, v_subtotal) end;
    end if;

    v_fee := 0;
    if p_delivery_method <> 'pickup' and v_zone.id is not null then
      if v_zone.free_above = 0 or v_subtotal < v_zone.free_above then
        v_fee := case when p_delivery_method = 'express'
          then v_zone.base_fee + v_zone.base_fee / 2
          else v_zone.base_fee end;
      end if;
    end if;

    update orders set subtotal = v_subtotal, discount = v_discount,
        delivery_fee = v_fee, total = v_subtotal - v_discount + v_fee
      where id = v_order_id;
    insert into order_events (order_id, status) values (v_order_id, 'pending');
    insert into notifications (user_id, type, title, body, data)
      select s.owner_id, 'order', 'Nouvelle commande',
             'Commande de ' || (v_subtotal - v_discount + v_fee) || ' FCFA reçue',
             jsonb_build_object('order_id', v_order_id)
      from shops s where s.id = v_shop;

    v_order_ids := v_order_ids || v_order_id;
  end loop;

  if v_coupon.id is not null then
    update coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;
  return v_order_ids;
end $$;


-- ============================================================
-- MIGRATION 007 — whatsapp, annonce, notif acheteur
-- source : supabase/migrations/007_announcements_whatsapp_notifs.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — numéro WhatsApp, message à la une, et accusé de
-- commande côté acheteur.
-- ============================================================

-- ---------- 1. Numéro WhatsApp ----------
alter table public.profiles add column if not exists whatsapp text;

-- Le client peut renseigner son propre numéro (les colonnes de valeur
-- restent hors de portée : voir le revoke/grant de schema.sql).
grant update (whatsapp) on public.profiles to authenticated;

-- Numéro WhatsApp de la boutique, pour être contacté sur une commande.
alter table public.shops add column if not exists whatsapp text;
grant update (whatsapp) on public.shops to authenticated;

-- Le numéro saisi à l'inscription arrive dans raw_user_meta_data : on
-- redéfinit handle_new_user pour l'enregistrer. Identique à schema.sql par
-- ailleurs (search_path inclut `extensions` pour gen_random_bytes/pgcrypto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(translate(encode(gen_random_bytes(8), 'base64'),
      '0OIl1+/=', 'ABCDEFGH'), 1, 8));
    exit when not exists (select 1 from profiles where referral_code = v_code);
  end loop;

  insert into profiles (id, username, referral_code, whatsapp)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
          v_code,
          nullif(trim(coalesce(new.raw_user_meta_data->>'whatsapp', '')), ''));

  insert into wallets (user_id) values (new.id);

  if coalesce(new.raw_user_meta_data->>'referral_code_used', '') <> '' then
    perform public.link_referral(new.id, new.raw_user_meta_data->>'referral_code_used');
  end if;
  return new;
end $$;

-- ---------- 2. Message à la une ----------
alter table public.platform_settings
  add column if not exists announcement text,
  add column if not exists announcement_active boolean not null default false;

-- La signature change : on supprime l'ancienne version pour éviter de créer
-- une surcharge ambiguë (create or replace ne remplace pas une fonction dont
-- la liste de paramètres diffère).
drop function if exists public.admin_update_settings(integer, integer, text, text);

create or replace function public.admin_update_settings(
  p_commission_percent integer,
  p_min_withdrawal integer,
  p_support_phone text default null,
  p_support_email text default null,
  p_announcement text default null,
  p_announcement_active boolean default false
) returns public.platform_settings
language plpgsql security definer set search_path = public as $$
declare
  v_row public.platform_settings;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  update platform_settings set
    commission_percent = p_commission_percent,
    min_withdrawal = p_min_withdrawal,
    support_phone = p_support_phone,
    support_email = p_support_email,
    announcement = nullif(trim(coalesce(p_announcement, '')), ''),
    announcement_active = p_announcement_active,
    updated_at = now()
    where id = true
    returning * into v_row;
  return v_row;
end $$;

-- ---------- 3. Accusé de commande pour l'acheteur ----------
-- place_order notifiait uniquement le vendeur. L'acheteur reçoit désormais
-- sa propre notification : elle sert d'historique dans /play/notifications
-- et de source pour l'e-mail de confirmation (voir NOTIFICATIONS_SETUP.md).
--
-- Implémenté en trigger plutôt qu'en modifiant place_order : la fonction est
-- déjà redéfinie par les migrations 004 et 006, la dupliquer une fois de plus
-- multiplierait les risques de divergence.
create or replace function public.notify_buyer_on_order()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_shop_name text;
begin
  select name into v_shop_name from shops where id = new.shop_id;
  insert into notifications (user_id, type, title, body, data)
    values (new.buyer_id, 'order', 'Commande prise en compte',
            'Votre commande #' || upper(left(new.id::text, 8)) ||
            ' chez ' || coalesce(v_shop_name, 'la boutique') ||
            ' a bien été enregistrée.',
            jsonb_build_object('order_id', new.id, 'email', true));
  return new;
end $$;

drop trigger if exists on_order_created_notify_buyer on public.orders;
create trigger on_order_created_notify_buyer
  after insert on public.orders
  for each row execute function public.notify_buyer_on_order();

-- ---------- 4. Jeton de notification push ----------
-- profiles.fcm_token existe déjà (schema.sql) et est déjà accessible en
-- écriture au client. On indexe pour l'envoi en masse côté serveur.
create index if not exists idx_profiles_fcm_token
  on public.profiles (fcm_token)
  where fcm_token is not null;


-- ============================================================
-- MIGRATION 008 — gestion des comptes par l admin
-- source : supabase/migrations/008_admin_user_management.sql
-- ============================================================

-- ============================================================
-- DreamTeamShop — gestion des comptes par l'administrateur.
--
-- L'admin peut réinitialiser un mot de passe : l'utilisateur reçoit un mot
-- de passe temporaire et doit en choisir un nouveau à sa prochaine
-- connexion. Le drapeau ci-dessous porte cette obligation.
-- ============================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- Le client ne peut pas se retirer l'obligation lui-même : la colonne n'est
-- pas dans le `grant update (...)` de schema.sql. Elle est levée uniquement
-- par la RPC ci-dessous, après un vrai changement de mot de passe.
create or replace function public.clear_password_change_flag()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  update profiles set must_change_password = false where id = auth.uid();
end $$;

-- Marque un compte comme devant changer son mot de passe. Réservé aux
-- admins ; appelée par la route serveur après réinitialisation.
create or replace function public.admin_require_password_change(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update profiles set must_change_password = true where id = p_user_id;
  if not found then raise exception 'Utilisateur introuvable'; end if;
end $$;

-- ---------- Mise à jour d'un profil par un admin ----------
-- Les colonnes d'identité sont modifiables par leur propriétaire, mais un
-- admin doit pouvoir corriger n'importe quel compte (support client).
create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_full_name text default null,
  p_username text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_city text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if coalesce(trim(p_username), '') = '' then
    raise exception 'Le pseudo est obligatoire';
  end if;

  update profiles set
    full_name = nullif(trim(coalesce(p_full_name, '')), ''),
    username  = trim(p_username),
    phone     = nullif(trim(coalesce(p_phone, '')), ''),
    whatsapp  = nullif(trim(coalesce(p_whatsapp, '')), ''),
    city      = nullif(trim(coalesce(p_city, '')), '')
    where id = p_user_id;

  if not found then raise exception 'Utilisateur introuvable'; end if;
end $$;


-- ============================================================
-- DONNEES DE DEPART
-- source : supabase/seed.sql
-- ============================================================

-- Données de départ : catégories + zones de livraison + coupon de bienvenue.
insert into public.categories (name, slug, icon, position) values
  ('Mode & Vêtements', 'mode', '👗', 1),
  ('Téléphones & Tablettes', 'telephones', '📱', 2),
  ('Électronique', 'electronique', '💻', 3),
  ('Maison & Déco', 'maison', '🛋️', 4),
  ('Beauté & Soins', 'beaute', '💄', 5),
  ('Chaussures', 'chaussures', '👟', 6),
  ('Sacs & Accessoires', 'accessoires', '👜', 7),
  ('Alimentation', 'alimentation', '🍯', 8),
  ('Bébés & Enfants', 'enfants', '🧸', 9),
  ('Sport & Loisirs', 'sport', '⚽', 10),
  ('Véhicules & Pièces', 'vehicules', '🚗', 11),
  ('Immobilier', 'immobilier', '🏠', 12)
on conflict (slug) do nothing;

insert into public.delivery_zones (name, base_fee, free_above) values
  ('Abidjan — Cocody / Plateau', 1500, 50000),
  ('Abidjan — Yopougon / Abobo', 2000, 50000),
  ('Abidjan — Autres communes', 2500, 75000),
  ('Grand Bassam / Bingerville', 3000, 100000),
  ('Intérieur du pays', 5000, 0)
on conflict do nothing;

insert into public.coupons (code, type, value, min_order_amount, max_uses) values
  ('BIENVENUE10', 'percent', 10, 5000, 1000),
  ('DREAMTEAM2000', 'fixed', 2000, 20000, 500)
on conflict (code) do nothing;

