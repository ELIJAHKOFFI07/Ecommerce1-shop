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
create policy "shops_insert" on public.shops for insert
  with check (owner_id = auth.uid() and public.is_seller());

-- Publier un produit aussi (en plus d'être propriétaire de la boutique).
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
