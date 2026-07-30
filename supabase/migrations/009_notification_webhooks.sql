-- ============================================================
-- DreamTeamShop — déclenchement des envois e-mail et push.
--
-- Remplace les « Database Webhooks » du tableau de bord : ceux-ci ne sont
-- rien d'autre qu'un déclencheur appelant pg_net. L'écrire en SQL le rend
-- reproductible, versionné, et indépendant des déplacements d'options dans
-- l'interface.
--
-- PRÉREQUIS — à exécuter une seule fois, AVANT ce fichier, en remplaçant la
-- valeur par une chaîne longue et aléatoire de votre choix :
--
--   select vault.create_secret(
--     'collez-ici-une-chaine-aleatoire-longue',
--     'webhook_secret',
--     'Secret partagé entre les déclencheurs et les Edge Functions'
--   );
--
-- La même valeur doit être posée côté fonctions :
--   npx supabase secrets set WEBHOOK_SECRET=la-meme-chaine
--
-- Le secret n'apparaît donc jamais dans le dépôt : il vit dans Vault côté
-- base, et dans les secrets Supabase côté fonctions.
-- ============================================================

-- pg_net permet à Postgres d'émettre des requêtes HTTP sortantes.
create extension if not exists pg_net with schema extensions;

-- ---------- Appel des fonctions ----------
create or replace function public.dispatch_notification()
returns trigger
language plpgsql security definer set search_path = public, extensions, vault as $$
declare
  v_secret text;
  v_base text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'webhook_secret';

  -- Sans secret configuré, on n'appelle rien : les fonctions rejetteraient
  -- la requête, et on éviterait surtout d'envoyer des requêtes dans le vide
  -- à chaque notification créée.
  if v_secret is null then
    raise warning 'webhook_secret absent du Vault : envoi e-mail/push ignoré';
    return new;
  end if;

  select decrypted_secret into v_base
    from vault.decrypted_secrets where name = 'functions_base_url';
  if v_base is null then
    raise warning 'functions_base_url absent du Vault : envoi e-mail/push ignoré';
    return new;
  end if;

  -- net.http_post est asynchrone : l'insertion de la notification n'attend
  -- pas la réponse, et un envoi lent ou en échec ne bloque jamais une
  -- commande en cours.
  perform net.http_post(
    url := v_base || '/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );

  perform net.http_post(
    url := v_base || '/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );

  return new;
end $$;

drop trigger if exists on_notification_created on public.notifications;
create trigger on_notification_created
  after insert on public.notifications
  for each row execute function public.dispatch_notification();
