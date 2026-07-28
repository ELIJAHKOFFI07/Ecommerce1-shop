-- ============================================================
-- ElijahShop — croissance / engagement (vague 3)
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

create policy "auctions_read" on public.auctions for select using (true);
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
