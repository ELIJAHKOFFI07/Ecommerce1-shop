-- ============================================================
-- ElijahShop — schéma Postgres (Supabase)
-- Exécuté par SETUP_SERVICES.ps1 via `supabase db push` ou psql.
-- Anti-triche : tout ce qui a de la valeur (stock, prix, totaux,
-- portefeuille, points, statuts) est calculé par des fonctions
-- SECURITY DEFINER ; le client n'a jamais d'écriture directe.
-- ============================================================

create extension if not exists "uuid-ossp";

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
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
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
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- Le client ne peut JAMAIS écrire les colonnes de valeur.
revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url, phone, city, bio, fcm_token)
  on public.profiles to authenticated;
grant update (is_admin, is_seller, loyalty_points)
  on public.profiles to service_role;

create policy "shops_read" on public.shops for select using (true);
create policy "shops_insert" on public.shops for insert
  with check (owner_id = auth.uid());
create policy "shops_update" on public.shops for update
  using (owner_id = auth.uid() or public.is_admin());
alter table public.shops alter column owner_id set default auth.uid();
revoke update on public.shops from anon, authenticated;
grant update (name, slug, description, logo_url, banner_url, city, phone)
  on public.shops to authenticated;

create policy "categories_read" on public.categories for select using (true);
create policy "categories_admin" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "products_read" on public.products for select using (true);
create policy "products_insert" on public.products for insert
  with check (exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
create policy "products_update" on public.products for update
  using (seller_id = auth.uid() or public.is_admin());
create policy "products_delete" on public.products for delete
  using (seller_id = auth.uid() or public.is_admin());
-- Stock/compteurs modifiés uniquement par les fonctions SECURITY DEFINER.
revoke update on public.products from anon, authenticated;
grant update (title, description, price, compare_at_price, stock, category_id,
              condition, city, status, is_flash, flash_ends_at)
  on public.products to authenticated;

create policy "product_images_read" on public.product_images for select using (true);
create policy "product_images_write" on public.product_images for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

create policy "variants_read" on public.product_variants for select using (true);
create policy "variants_write" on public.product_variants for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

create policy "favorites_own" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "follows_own" on public.follows for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy "follows_count_read" on public.follows for select using (true);

create policy "posts_read" on public.shop_posts for select using (true);
create policy "posts_write" on public.shop_posts for all
  using (exists (select 1 from shops where id = shop_id and owner_id = auth.uid()))
  with check (exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));

create policy "blocks_own" on public.blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy "recently_viewed_own" on public.recently_viewed for select
  using (user_id = auth.uid());

create policy "zones_read" on public.delivery_zones for select using (true);
create policy "zones_admin" on public.delivery_zones for all
  using (public.is_admin()) with check (public.is_admin());

create policy "addresses_own" on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "coupons_read" on public.coupons for select using (true);
create policy "coupons_admin" on public.coupons for insert
  with check (public.is_admin()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
create policy "coupons_manage" on public.coupons for update
  using (public.is_admin()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
create policy "coupons_delete" on public.coupons for delete
  using (public.is_admin()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));
revoke update on public.coupons from anon, authenticated;
grant update (code, type, value, min_order_amount, expires_at, max_uses, active)
  on public.coupons to authenticated;

-- Commandes : lecture acheteur/vendeur/admin. Écriture UNIQUEMENT via RPC.
create policy "orders_read" on public.orders for select
  using (buyer_id = auth.uid()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid())
    or public.is_admin());
create policy "order_items_read" on public.order_items for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.buyer_id = auth.uid()
      or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid())
      or public.is_admin())));
create policy "order_events_read" on public.order_events for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.buyer_id = auth.uid()
      or exists (select 1 from shops s where s.id = o.shop_id and s.owner_id = auth.uid())
      or public.is_admin())));

-- Avis : lecture publique ; création réservée à l'acheteur d'une commande livrée.
create policy "reviews_read" on public.reviews for select using (true);
create policy "reviews_insert" on public.reviews for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from orders o
      where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'delivered')
  );

create policy "conversations_own" on public.conversations for select
  using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "messages_own" on public.messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())));
create policy "messages_insert" on public.messages for insert
  with check (sender_id = auth.uid()
    and exists (select 1 from conversations c where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()))
    and not exists (select 1 from blocks b
      join conversations c on c.id = conversation_id
      where (b.blocker_id = c.buyer_id and b.blocked_id = c.seller_id)
         or (b.blocker_id = c.seller_id and b.blocked_id = c.buyer_id)));

create policy "offers_read" on public.offers for select
  using (buyer_id = auth.uid()
    or exists (select 1 from shops where id = shop_id and owner_id = auth.uid()));

create policy "notifications_own_read" on public.notifications for select
  using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update
  using (user_id = auth.uid());
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "wallets_own_read" on public.wallets for select
  using (user_id = auth.uid());
create policy "wallet_tx_own_read" on public.wallet_transactions for select
  using (wallet_user_id = auth.uid());

create policy "reports_insert" on public.reports for insert
  with check (reporter_id = auth.uid());
create policy "reports_admin" on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_admin_update" on public.reports for update
  using (public.is_admin());

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

create policy "storage_public_read" on storage.objects for select
  using (bucket_id in ('product-images','shop-images','avatars'));
create policy "storage_own_write" on storage.objects for insert
  with check (bucket_id in ('product-images','shop-images','avatars')
    and (storage.foldername(name))[1] = auth.uid()::text);
create policy "storage_own_delete" on storage.objects for delete
  using (bucket_id in ('product-images','shop-images','avatars')
    and (storage.foldername(name))[1] = auth.uid()::text);
