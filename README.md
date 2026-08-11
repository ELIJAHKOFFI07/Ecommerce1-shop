# DreamTeamShop — Web

Marketplace sociale pour la Côte d'Ivoire : vitrine publique, application
acheteur/vendeur et back-office. Trois niveaux de compte (client, vendeur,
admin), négociation directe, enchères, paiement Mobile Money, portefeuille
vendeur, parrainage.

Ce document est le point d'entrée pour quiconque reprend le projet : stack,
structure, conventions, pièges connus et pointeurs vers le reste de la
documentation.

---

## 1. Stack et principes

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript strict**,
  **Tailwind CSS 4** (`@theme inline`, variables CSS — pas de config JS).
- **Backend actif : Supabase** (Postgres + RLS + RPC `security definer` +
  Auth + Storage + Realtime + Edge Functions).
- **Backend futur : Parse Server** auto-hébergé sur un VPS — en préparation,
  pas encore actif. Voir **§9**.
- Tout l'argent (prix, stock, commission, solde) est **calculé et validé
  côté serveur uniquement**. Le panier vit dans le navigateur ; il n'est
  jamais la source de vérité. C'est la règle non négociable du projet —
  toute nouvelle fonctionnalité qui touche à de l'argent doit passer par une
  RPC `security definer`, jamais par une écriture directe du client.

## 2. Démarrage local

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés (voir §3)
npm run dev
```

Ouvrir http://localhost:3000. Tant que les clés du backend actif ne sont pas
renseignées, `/play` et `/admin` affichent un écran d'attente (`SetupNotice`)
au lieu de planter — c'est volontaire, pour que le reste de la vitrine reste
consultable sans configuration.

Scripts disponibles (`package.json`) :

```bash
npm run dev     # serveur de dev (Turbopack)
npm run build   # build de production
npm run start   # sert le build
npm run lint    # eslint
```

Contrôles à faire passer avant tout commit :

```bash
npx tsc --noEmit
npx eslint src
npx next build
```

Il n'y a pas de suite de tests automatisés à ce jour.

## 3. Variables d'environnement

Voir `.env.example`, qui documente chaque valeur et où aller la chercher.
Résumé :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_BACKEND_PROVIDER` | `supabase` (actuel) ou `parse` (futur) — voir §9 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clés publiques Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secrète.** Contourne RLS. Utilisée uniquement par les routes serveur `/api/admin/*`. Jamais préfixée `NEXT_PUBLIC_`, jamais exposée au client. |
| `NEXT_PUBLIC_FIREBASE_*` | Config publique Firebase (notifications push) |
| `NEXT_PUBLIC_PARSE_*`, `PARSE_MASTER_KEY` | Backend Parse — pas encore utilisées |

**Fichiers de secrets, jamais commités** (voir `.gitignore`) :

- `all_secrets.md` — toutes les valeurs réelles, tenu à jour au fil du projet.
- `guide_secrets.md` — comment régénérer/retrouver chaque secret.
- `.env.local` — les variables d'environnement locales.
- `*firebase-adminsdk*.json` — compte de service Firebase.

Si vous reprenez ce projet sans accès à ces fichiers, demandez-les au
propriétaire plutôt que de recréer les projets Supabase/Firebase : les IDs et
clés existants sont déjà référencés dans les Edge Functions et le schéma.

## 4. Structure du dépôt

```
src/
  app/
    page.tsx              vitrine publique (visiteur, non connecté)
    play/                 application acheteur/vendeur (voir §6)
    admin/                back-office (voir §7)
    api/admin/             routes serveur utilisant service_role
    auth/                  callback OAuth, confirmation magic link
  components/
    marketing/             vitrine publique (hero, carrousel, footer…)
    play/                  composants de l'application (cartes, nav mobile…)
    ui/                    primitives partagées (Section, Card…)
    charts/                graphiques back-office
    three/                 éléments 3D décoratifs
  lib/
    backend/               adaptateur de backend — voir §5
    supabase/               client Supabase brut (ne pas importer ailleurs que backend/)
    types.ts                types partagés + formatFcfa()
    roles.ts                roleOf(), ROLE_LABELS — module non-client, importable
                             depuis un composant serveur
    nav.ts                  définition de la navigation (voir §6)
    cart.tsx, session.tsx   contextes React (panier, session)
    stats.ts                agrégations pour les graphiques admin
    storage.ts              upload d'images (sanitizeFileName, uploadImage)
    push.ts                 notifications push (Firebase)
supabase/
  schema.sql               schéma de référence (tables, RLS, RPC, triggers)
  migrations/               historique des migrations, numérotées
  SETUP_COMPLET.sql         schéma + toutes les migrations, ré-exécutable —
                             c'est le fichier à lancer sur une base neuve
  functions/                Edge Functions (e-mail, push)
parse-server/               déploiement Parse Server pour le VPS — voir §9
backend-parse-wip/          code client Parse déjà écrit, pas encore branché
```

## 5. L'adaptateur de backend

Le point de bascule est **unique** : `src/lib/backend/config.ts`, piloté par
`NEXT_PUBLIC_BACKEND_PROVIDER`. Toutes les pages et composants passent par
`@/lib/backend/client` (navigateur) ou `@/lib/backend/server` (composants
serveur) — **jamais** par `@/lib/supabase/client` directement. C'est ce qui
permettra de basculer sur Parse en ne touchant qu'un fichier plutôt que les
~60 fichiers qui font des requêtes.

```ts
import { createClient } from "@/lib/backend/client"; // ou /server
import { isBackendConfigured } from "@/lib/backend/client";
```

`isBackendConfigured()` doit être vérifié avant tout appel dans une page
publique, pour afficher `SetupNotice` plutôt que de planter si les clés sont
absentes.

## 6. L'application (`/play`)

Trois rôles, portés par `profiles.is_admin` / `profiles.is_seller` (lus via
`src/lib/roles.ts`) :

| Rôle | Peut |
| --- | --- |
| `user` (défaut) | Consulter, mettre au panier, acheter, négocier, enchérir |
| `vendeur` (`is_seller`) | Tout ce qui précède + ouvrir une boutique, publier des produits, gérer ses commandes, retirer son solde |
| `admin` (`is_admin`) | Back-office complet |

**La promotion vendeur → admin est réservée à l'admin**, via la RPC
`admin_set_user_role` (jamais une écriture directe sur `profiles`, qui est
interdite en écriture au client par RLS — voir §8).

Le visiteur non connecté voit `LandingHeader` + `LandingFooter` (vitrine
publique, page `/`) ; une fois connecté, `PlayNav` (navigation mobile en bas
d'écran + menu). C'est `src/app/play/layout.tsx` qui bascule entre les deux
selon `supabase.auth.getUser()`, côté serveur — pas de flash au chargement.

`src/lib/nav.ts` centralise la navigation :
- `PRIMARY_LINKS` — liens principaux, avec `sellerOnly` sur ceux réservés aux vendeurs.
- `BOTTOM_LINKS` — la barre du bas, **volontairement séparée** de
  `PRIMARY_LINKS` : c'est une liste à 4 entrées fixes. Un `flex-1` dont le
  nombre d'éléments varie selon le rôle fait sauter la barre à chaque
  changement — piège déjà rencontré, voir §8.
- `MEMBER_ONLY_PREFIXES` — routes qui nécessitent d'être connecté. `/play/cart`
  en est délibérément exclu : le panier doit rester utilisable sans compte,
  la connexion n'est requise qu'au moment de commander.

## 7. Le back-office (`/admin`)

Réservé aux comptes `is_admin`, gardé côté serveur par `src/lib/admin/guard.ts`.
Contient : gestion des utilisateurs (CRUD, réinitialisation de mot de passe
avec changement forcé à la prochaine connexion), catégories, produits, stock
audité, coupons, commandes, comptabilité, rapports, paramètres plateforme
(commission, seuil de retrait), factures.

Les routes `src/app/api/admin/users/*` sont les **seules** à utiliser
`SUPABASE_SERVICE_ROLE_KEY` — c'est nécessaire pour créer/supprimer des
comptes et réinitialiser un mot de passe (`auth.users` n'est pas accessible
avec la clé anonyme). Toute nouvelle opération qui a besoin de la clé
service_role doit passer par une route serveur de ce type, jamais être
appelée depuis un composant client.

## 8. Base de données — conventions et pièges

Le schéma vit dans `supabase/`. `SETUP_COMPLET.sql` est le fichier à lancer
sur une base neuve : il regroupe `schema.sql` et toutes les migrations, et
est **ré-exécutable** (idempotent) — c'est ce qui a permis de rejouer les
migrations plusieurs fois pendant le développement sans tout recréer à la
main.

**Règles de sécurité déjà appliquées, à ne pas régresser** :

- Toute logique qui touche à l'argent (commande, stock, commission,
  portefeuille, enchère, coupon) est une **fonction `security definer`**, pas
  une suite d'`update`/`insert` depuis le client. Le stock est verrouillé par
  `for update` dans `place_order` pour éviter la survente en cas d'achats
  simultanés.
- `profiles.is_admin` et `profiles.is_seller` sont **interdits en écriture au
  client** (revoke/grant dans `schema.sql`). Elles ne changent que via des
  RPC (`admin_set_user_role`). Un bug de ce type a existé dans le back-office
  (écriture directe `update({is_admin})`) et a été corrigé — toute nouvelle
  page d'administration doit passer par la RPC.
- Fonctions `language sql` : toujours `stable`, jamais `stability stable`
  (mot-clé invalide qui casse silencieusement la migration entière — piège
  rencontré sur 6 fonctions en une fois).
- Index sur expression : la fonction doit être `IMMUTABLE`. `created_at::date`
  ou une clause `where … > now()` ne le sont pas — Postgres refuse l'index.
- Triggers créant des lignes via `pgcrypto` (`gen_random_bytes`) ont besoin de
  `search_path = public, extensions`, pas seulement `public` — sinon
  **chaque inscription échoue** (`handle_new_user` en a été la cause).

**Realtime** : `messages`, `notifications`, `product_questions` sont publiées
dans `supabase_realtime`. Toute nouvelle table qui doit se mettre à jour en
direct doit y être ajoutée explicitement (`alter publication … add table`).

**Edge Functions** (`supabase/functions/`) :
- `send-notification-email` — SMTP Gmail, gabarits HTML en tables (compatible
  Outlook), lien magique à usage unique intégré (voir `guide_secrets.md`).
- `send-push-notification` — FCM, JWT signé côté Deno (WebCrypto).

Les deux sont déployées avec `--no-verify-jwt` (elles sont appelées par
`pg_net` depuis un trigger, pas par un utilisateur connecté) et vérifient donc
elles-mêmes un en-tête `x-webhook-secret` — sans quoi elles seraient
publiquement appelables par n'importe qui avec l'URL du projet.

## 9. Migration vers Parse Server (en préparation)

Le VPS destiné à héberger Parse Server est prêt, mais **la bascule n'a pas
eu lieu** : `NEXT_PUBLIC_BACKEND_PROVIDER` reste sur `supabase`.

- **`PARSE_MIGRATION.md`** — inventaire complet de ce qui doit être porté :
  40 tables → classes Parse, 44 fonctions Postgres → Cloud Functions (dont 29
  appelées depuis l'app), 12 triggers → hooks, 49 policies RLS → CLP/ACL. Lire
  en premier la section sur les 4 mécanismes Postgres sans équivalent direct
  (transactions, `for update`, RLS, triggers) : c'est là qu'est le risque.
- **`parse-server/`** — le déploiement prêt à lancer sur le VPS
  (`docker-compose.yml`, Cloud Code dans `cloud/`). Voir `parse-server/README.md`
  pour les commandes d'installation, Nginx/TLS, vérification.
- **`backend-parse-wip/`** — code client déjà écrit côté Next.js (auth,
  session SSR), exclu de la compilation tant que la bascule n'est pas faite.

Ordre de travail détaillé dans `PARSE_MIGRATION.md §6`. En résumé : infra
VPS → schéma → sécurité (rôles/ACL) → Cloud Functions argent (déjà écrites :
`placeOrder`, `advanceOrderStatus`, `confirmDelivery` — **pas encore
testées**) → reste des Cloud Functions → fichiers/LiveQuery → reprise des
données → bascule de la variable d'environnement.

## 10. Déploiement

Voir **`DEPLOIEMENT_VERCEL.md`** pour les étapes complètes (variables
d'environnement sur Vercel, connexion au dépôt Git, domaine).

Autres documents opérationnels :

- **`NOTIFICATIONS_SETUP.md`** — configuration des notifications push (FCM),
  test de bout en bout.
- **`SMTP_SETUP.md`** — configuration de l'envoi d'e-mails (mot de passe
  d'application Gmail).
- **`monitoring.md`** — ce qu'il faut surveiller une fois en production.
- **`guide_secrets.md`** — où retrouver ou régénérer chaque secret.

## 11. Style et conventions de code

- Commentaires : uniquement quand le **pourquoi** n'est pas évident (une
  contrainte cachée, un contournement de bug, un comportement qui
  surprendrait). Le code ne décrit pas ce qu'il fait déjà par lui-même.
- Palette et rythme visuel repris de deux projets de référence (shirt-shop,
  shopCommerce) : fond clair, un seul accent, boutons neutres
  (`bg-foreground`/`text-background`), titres `font-medium tracking-tight`,
  vignettes produit sans cadre. Les jetons vivent dans
  `src/app/globals.css` (`--background`, `--foreground`, `--surface`,
  `--surface-2`, `--border`, `--muted`, `--accent`, `--on-accent`) — les
  redéfinir change l'habillage de toute l'app, donc vérifier le contraste
  avant de toucher ces valeurs (WCAG, calculé, pas à l'œil).
- Aucune abstraction avant d'en avoir besoin trois fois. Un composant utilisé
  une fois reste en ligne.
