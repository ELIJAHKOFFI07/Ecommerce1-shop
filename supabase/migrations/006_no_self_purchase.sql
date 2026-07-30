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
