-- ============================================================
-- ElijahShop — back-office : stock audité, comptabilité, factures,
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
