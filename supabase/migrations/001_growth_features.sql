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
create policy "product_questions_read" on public.product_questions for select using (true);
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
