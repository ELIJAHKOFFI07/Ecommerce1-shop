# DreamShop

Boutique en ligne **DreamShop** (Côte d'Ivoire) : tout type de produits,
consultation libre, connexion au moment de commander, paiement à la
livraison ou par Mobile Money. Next.js 16 pour le front **et** l'API,
Postgres sur VPS.

## Ce que fait l'application

**Visiteur** — voit la boutique, les rayons, les produits à la une, cherche
et filtre instantanément, met au panier sans compte.

**Client** — crée un compte (ou Google) au moment de commander, choisit une
adresse (carnet d'adresses) et un moyen de paiement, suit sa commande
(à confirmer → confirmée → expédiée → livrée), peut l'annuler tant
qu'elle n'est pas expédiée, gère ses adresses et son profil.

**Administration** — confirme / expédie / livre / annule les commandes,
marque les paiements Mobile Money reçus, gère le catalogue (produits avec
photos, promotions, mise à la une ; catégories avec image et ordre), le
stock (réceptions, retours, pertes, inventaire, historique), les
utilisateurs (rôles, permissions par module, blocage), la comptabilité
(ventes livrées, meilleures ventes, exports CSV) et les paramètres (frais
de livraison, seuil de livraison offerte, numéro Mobile Money). Journal
d'audit complet.

## Stack

Next.js 16 (App Router, proxy Node) · React 19 · TypeScript strict ·
Tailwind 4 · Prisma 7 + `@prisma/adapter-pg` · Auth.js v5 (mot de passe +
Google) · zod · ImageKit · Gmail SMTP · vitest.

## Démarrer en local

```bash
git clone … && cd Ecommerce1-shop
npm install                      # génère aussi le client Prisma
cp .env.example .env             # remplissez au moins DATABASE_URL et AUTH_SECRET
npx prisma migrate deploy        # crée les tables
SEED_ADMIN_EMAIL=vous@ex.com npm run db:seed   # premier super-admin (mot de passe affiché une fois)
npm run db:seed:test             # facultatif : comptes, produits, commandes de démonstration
npm run dev                      # http://localhost:3000
```

La base est sur le VPS : ouvrez un tunnel SSH et pointez
`DATABASE_URL` sur `localhost:5433` (`.env.local`) :

```bash
ssh -f -N -L 5433:localhost:5432 root@72.62.31.97
```

Sans clés ImageKit / Gmail, l'app fonctionne : les fichiers sont refusés
avec un message clair et les e-mails s'affichent en console.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | `prisma generate` + `next build` (ce que Vercel exécute) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (config Next 16) |
| `npm test` / `npm run test:security` | vitest — tests de sécurité |
| `npm run db:migrate` | applique les migrations (`prisma migrate deploy`) |
| `npm run db:seed` | modules, paramètres, super-admin |
| `npm run db:seed:test` | **jeu de test** : un compte par rôle, clients, catégories, produits, commandes à chaque état — jamais en production |

**Avant tout commit** : `npm run typecheck && npm run lint && npm test && npm run build`.
Ne lancez jamais `next build` pendant que `npm run dev` tourne (même
dossier `.next`).

## Arborescence

```
prisma/
  schema.prisma          User, Address, Category, Product, StockMovement, Order, OrderItem, Settings + sécurité
  migrations/            SQL versionné — jamais modifié à la main après application
  seed.ts, seed-test.ts
src/
  app/
    (shop)/              accueil, produit, panier, commander, compte (commandes, adresses, profil)
    (auth)/              connexion, inscription, mot de passe
    admin/               back-office (menu filtré par permissions)
    api/                 toutes les routes passent par withApi + zod + requireAuth
  lib/
    auth.ts              Auth.js : verrouillage, limitation, Google
    requireAuth.ts       requireUser / requireStaff / requirePermission
    pageAuth.ts          mêmes gardes pour les pages (redirection)
    validators.ts        TOUS les schémas d'entrée
    catalog.ts           catalogue en cache (tag « catalog »), invalidé à chaque écriture admin
    orders.ts, stock.ts  logique métier, FOR UPDATE
    accounting.ts        ventes, mensuel, exports
    rateLimit.ts, audit.ts, password.ts, storage.ts, email.ts
  components/
    ui.tsx               primitives (Button, Field, Money, StatusPill…)
    ProductCard.tsx      la « vitrine » : scène + socle
    admin.tsx            briques back-office (ActionButton, Table, SearchBox…)
  proxy.ts               redirections optimistes (JWT seul, sans base)
tests/security/
docs/
  VPS.md                 héberger Postgres, ouvrir à Vercel proprement, sauvegardes
  SERVICES.md            Google OAuth, ImageKit, Gmail, Vercel
  SECURITE.md            menaces → mesures → fichiers
```

## Comptes de test (`npm run db:seed:test`)

Mot de passe commun : `Dreamshop2026test` (variable `SEED_TEST_PASSWORD`).

| Rôle | E-mail | Ce qu'il voit |
|---|---|---|
| ADMIN | admin@test.dreamshop | tous les modules, en écriture |
| STOCK_MANAGER | stock@test.dreamshop | produits, catégories, stock ; commandes en lecture |
| SUPPORT | support@test.dreamshop | commandes (traitement), utilisateurs en lecture |
| CLIENT | client1@test.dreamshop | commandes à confirmer, Mobile Money en attente, livrée |
| CLIENT | client2@test.dreamshop | commandes confirmée, expédiée, annulée |
| CLIENT | client3@test.dreamshop | compte neuf, aucune commande |
| CLIENT bloqué | bloque@test.dreamshop | ne peut pas se connecter |

Le super-admin vient de `npm run db:seed` (`SEED_ADMIN_EMAIL`). Les prix
du seed sont **fictifs**.

## Conventions

- **Sécurité d'abord** : aucune route sans `withApi`, aucune entrée sans
  schéma zod, aucune ressource sans vérification de propriétaire. Une
  ressource d'autrui renvoie 404.
- **Argent** : `Decimal(15,2)` en base, jamais `Float` ; tout calcul côté
  serveur ; `formatFcfa()` pour l'affichage.
- **Stock** : uniquement via `stock.move()`.
- **Pages** = composants serveur qui lisent la base directement ;
  **formulaires** = composants client qui appellent `/api/*` via `lib/api.ts`.
- **Interface** : un bouton principal par écran, libellés en verbes,
  montants gros, aucune icône sans mot, chaque statut expliqué en une
  phrase. Base 17 px. Palette pierre + un accent or. Cormorant (titres,
  montants) + Montserrat. Mode sombre par `data-theme`.
- **Commentaires `///`** en tête de chaque module : le *pourquoi*, pas le *quoi*.
- Commits en français, sujet ≤ 72 caractères, corps expliquant la décision.

## Déployer

Voir `docs/VPS.md` (base) puis `docs/SERVICES.md` §4 (Vercel).
