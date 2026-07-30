-- ============================================================
-- ElijahShop — gestion des comptes par l'administrateur.
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
