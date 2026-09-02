-- ============================================================
-- DreamTeamShop — réduction des catégories : 12 → 6.
--
-- Le client a tranché : douze catégories, c'est un mur de choix. On garde
-- les six qui couvrent l'essentiel du catalogue et on fusionne le reste.
--
-- ORDRE IMPORTANT : les produits sont réaffectés AVANT la suppression.
-- `products.category_id` référence `categories(id)` sans ON DELETE, donc en
-- NO ACTION : supprimer une catégorie encore référencée échouerait, et une
-- migration qui échoue à mi-parcours laisse la base dans un état bâtard.
--
-- Rejouable : les réaffectations sont idempotentes, la suppression ne
-- s'applique qu'aux slugs encore présents.
-- ============================================================

-- ---------- 1. Réaffectation des produits ----------
-- Chaque catégorie retirée est rattachée à la plus proche parmi les six
-- conservées, pour qu'aucun produit ne se retrouve sans catégorie.
update public.products p
set category_id = (select id from public.categories where slug = 'maison')
where p.category_id in (
  select id from public.categories where slug in ('alimentation', 'immobilier')
);

update public.products p
set category_id = (select id from public.categories where slug = 'accessoires')
where p.category_id in (
  select id from public.categories where slug in ('beaute', 'enfants')
);

update public.products p
set category_id = (select id from public.categories where slug = 'electronique')
where p.category_id in (
  select id from public.categories where slug in ('vehicules', 'sport')
);

-- ---------- 2. Suppression des catégories retirées ----------
delete from public.categories
where slug in (
  'beaute', 'alimentation', 'enfants', 'sport', 'vehicules', 'immobilier'
);

-- ---------- 3. Renommage court + ordre d'affichage ----------
-- Libellés raccourcis : « Mode & Vêtements » sous une vignette carrée passe
-- sur deux lignes et casse l'alignement de la grille.
update public.categories set name = 'Mode',          position = 1 where slug = 'mode';
update public.categories set name = 'Téléphones',    position = 2 where slug = 'telephones';
update public.categories set name = 'Électronique',  position = 3 where slug = 'electronique';
update public.categories set name = 'Chaussures',    position = 4 where slug = 'chaussures';
update public.categories set name = 'Accessoires',   position = 5 where slug = 'accessoires';
update public.categories set name = 'Maison',        position = 6 where slug = 'maison';
