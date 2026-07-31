-- ============================================================
-- DreamTeamShop — visuel de catégorie.
--
-- L'emoji reste en base (colonne `icon`) pour ne rien perdre, mais
-- l'interface client affiche désormais des cartes : une image de fond donne
-- un rendu nettement plus soigné qu'un emoji.
-- ============================================================

alter table public.categories
  add column if not exists image_url text;

-- Le bucket shop-images est déjà public en lecture et n'autorise l'écriture
-- que sous le dossier de l'utilisateur (policies de schema.sql). Il accueille
-- aussi les visuels de catégorie : seuls les admins peuvent en créer, la
-- policy `categories_admin` s'en charge côté table.
