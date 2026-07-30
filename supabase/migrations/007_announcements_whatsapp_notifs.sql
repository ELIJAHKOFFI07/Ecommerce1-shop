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
