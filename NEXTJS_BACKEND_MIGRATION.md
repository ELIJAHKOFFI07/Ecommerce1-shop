# Migration Supabase → backend Next.js + Postgres auto-hébergé

Nouvelle direction, qui **remplace** le plan Parse Server précédent
(`PARSE_MIGRATION.md`, dossier `parse-server/`) — conservés comme référence
historique mais plus suivis. Cette fois, il n'y a pas de service backend
séparé : la logique serveur vit **dans cette même application Next.js**
(Route Handlers), la base est un **Postgres classique** que vous hébergez sur
votre VPS, et l'authentification passe par **Auth.js** (Google OAuth +
e-mail/mot de passe). C'est un retour à Postgres — donc aux vraies
transactions et `SELECT … FOR UPDATE`, ce qui élimine toute la catégorie de
bugs de concurrence rencontrée avec Parse (voir `parse-server/cloud/lock.js`
pour ce que ça a coûté d'y arriver sans transaction réelle).

## 1. Ce qui change concrètement

| Avant (Supabase) | Après |
| --- | --- |
| Base gérée par Supabase | **Postgres sur votre VPS**, géré par vous (`postgres-app/docker-compose.yml`) |
| Auth Supabase (magic link, Google) | **Auth.js** (NextAuth v5) — Google OAuth conservé, + identifiants e-mail/mot de passe |
| RLS + RPC `security definer` | **Route Handlers** Next.js (`src/app/api/**/route.ts`) avec vérifications explicites dans le code, transactions Postgres réelles pour tout ce qui touche à l'argent |
| Client `@supabase/supabase-js` | **Prisma** côté serveur uniquement ; le client appelle `fetch("/api/…")`, jamais la base directement |
| Storage Supabase | `postgres-app/uploads/` sur le VPS, servi par une route Next.js ou Nginx directement (à trancher — voir §5) |
| Realtime Supabase | Pas d'équivalent immédiat : polling ou SSE à ajouter plus tard (voir §5) |

## 2. Schéma — `prisma/schema.prisma`

Traduit table par table depuis `supabase/schema.sql` + toutes les migrations
(`supabase/SETUP_COMPLET.sql`, 39 tables) : mêmes colonnes, mêmes contraintes
(`check` → `enum` Postgres natif via Prisma, `unique`, clés composites pour
les tables de jonction). `auth.users` + `public.profiles` sont fusionnées en
un seul modèle `User`, complété par les modèles standard de l'adaptateur
Prisma d'Auth.js (`Account`, `Session`, `VerificationToken`).

## 3. Ordre de travail

1. **Postgres sur le VPS** — `postgres-app/` (docker-compose, `.env.example`).
2. **Prisma** — schéma (fait), migration initiale (`prisma migrate dev`),
   client singleton (`src/lib/db.ts`).
3. **Auth.js** — Google + identifiants, adaptateur Prisma, session JWT.
4. **Les routes à risque d'abord** — `placeOrder`, `confirmDelivery`,
   `advanceOrderStatus`, `placeBid` : ce sont elles qui manipulent de
   l'argent et du stock. Avec un vrai Postgres, `prisma.$transaction` +
   `SELECT … FOR UPDATE` (via `$queryRaw` pour le verrou de ligne, Prisma n'a
   pas de raccourci dédié) reproduisent **exactement** la logique originale
   des RPC Supabase — plus besoin du verrou en mémoire de `lock.js`.
5. **Le reste des routes**, une par RPC de l'inventaire (voir
   `PARSE_MIGRATION.md §3` pour la liste des 29 — la logique métier ne
   change pas, seule la façon de l'exposer change).
6. **Auth Google** — flux OAuth Auth.js, écran de callback.
7. **Bascule des ~60 fichiers** qui appellent aujourd'hui
   `createClient().from(...)` — chacun devient soit un appel direct à
   Prisma (composant serveur), soit un `fetch("/api/...")` (composant
   client). C'est le plus gros morceau en volume, mais mécanique une fois
   les routes en place.
8. **Fichiers, Realtime** — voir §5, pas encore tranché.
9. **Reprise des données** Supabase → Postgres (export `pg_dump` du schéma
   Supabase, réimport après mapping des colonnes — les deux étant Postgres,
   c'est plus simple qu'une migration vers Mongo).

## 4. Sécurité — ce qui remplace RLS

Il n'y a plus de RLS : **chaque route est responsable de sa propre
autorisation**, explicitement, en code. Règles non négociables (reprises
telles quelles de Supabase) :

- Aucun calcul d'argent (prix, remise, frais, commission, solde) n'est
  jamais accepté depuis le client — toujours relu/recalculé serveur.
- `isAdmin`/`isSeller` ne sont modifiables que par une route admin dédiée,
  jamais par un endpoint générique de mise à jour de profil.
- Le code de retrait (`OrderPickupCode`) n'est renvoyé par **aucune** route
  accessible à l'acheteur — seule la route `confirmDelivery` le compare
  côté serveur.
- Chaque route qui touche à une ressource doit vérifier explicitement la
  propriété (le vendeur agit sur ses produits, l'acheteur sur ses
  commandes) — il n'y a plus de policy RLS pour le faire à sa place.

## 5. Décisions en attente

- **Fichiers** : stockage disque sur le VPS servi par une route Next.js
  (`/api/files/[...]`) avec contrôle d'accès, ou par Nginx directement sur un
  chemin public pour les images de produits (plus simple, mais alors tout ce
  qui est sous ce chemin est public sans contrôle — acceptable pour des
  photos de produits, pas pour autre chose). À trancher avant d'implémenter
  l'upload.
- **Temps réel** (messages, notifications) : pas de Realtime intégré côté
  Postgres/Next.js. Options : polling court côté client (simple, suffisant
  au démarrage), ou SSE via une route Next.js qui `LISTEN`/`NOTIFY` sur
  Postgres. Non tranché.
- **E-mail/push** : la logique déjà écrite dans `parse-server/cloud/` pour
  l'envoi (SMTP, FCM) est indépendante de la base — réutilisable telle
  quelle dans une route Next.js ou un script séparé, à rebrancher.

## 6. Ce qui est fait à ce jour

- [x] Ce document
- [x] `prisma/schema.prisma` — 39 tables traduites, énumérations pour les
      champs à valeurs fixes
- [x] `postgres-app/docker-compose.yml` — Postgres seul, pas de service
      applicatif (l'app Next.js tourne où vous voulez, pas forcément sur le
      même VPS)
- [x] `src/lib/db.ts` — client Prisma singleton
- [x] Auth.js : `src/lib/auth.ts`, Google + identifiants, adaptateur Prisma
- [ ] Routes API — aucune écrite pour l'instant, à faire dans l'ordre du §3
- [ ] Bascule des composants existants vers `fetch("/api/...")`
- [ ] Fichiers, temps réel (voir §5)
- [ ] Reprise des données
