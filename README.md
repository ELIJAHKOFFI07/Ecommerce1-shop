# SuperlifeShop

Boutique et espace membre de **SuperlifeShop** (vente directe par réseau
de membres, Côte d'Ivoire). Reconstruction complète de
*Superlife-management* : Next.js 16 pour le front **et** l'API, Postgres
sur VPS, sans Supabase.

## Ce que fait l'application

**Membre** — voit la boutique, met des produits au panier, **envoie son
reçu d'achat** (référence obligatoire) ; une fois validé par
l'administration, les produits entrent dans son **stock personnel** ; il
demande alors un **retrait** au bureau ; il consulte son **solde** (alimenté
par l'administration), transfère à un autre membre, voit son bureau et
ses formations.

**Administration** — valide ou rejette les reçus, approuve et remet les
retraits (avec TVA encaissée depuis le solde ou sur place), gère le
catalogue, le stock à quatre niveaux (voir `docs/STOCK.md`), les
conversions, les portefeuilles et la caisse, les membres et leurs
permissions, les bureaux et formations. Journal d'audit complet.

**Hors périmètre** (décision client) : analyse de reçu par IA.

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

**Avant tout commit** : `npm run typecheck && npm run lint && npm test && npm run build`.
Ne lancez jamais `next build` pendant que `npm run dev` tourne (même
dossier `.next`).

## Arborescence

```
prisma/
  schema.prisma          23 modèles, enums, tables de sécurité
  migrations/            SQL versionné — jamais modifié à la main après application
  seed.ts
src/
  app/
    (shop)/              boutique, panier, commander, espace membre
    (auth)/              connexion, inscription, mot de passe
    admin/               back-office (barre latérale filtrée par permissions)
    api/                 48 routes — toutes passent par withApi + zod + requireAuth
  lib/
    auth.ts              Auth.js : verrouillage, limitation, Google = compte existant
    requireAuth.ts       requireUser / requireStaff / requirePermission / assertOwnerOrStaff
    pageAuth.ts          mêmes gardes pour les pages (redirection)
    validators.ts        TOUS les schémas d'entrée
    wallet.ts, stock.ts, orders.ts, deliveries.ts   logique métier, FOR UPDATE
    rateLimit.ts, audit.ts, password.ts, storage.ts, email.ts
  components/
    ui.tsx               primitives (Button, Field, Money, StatusPill…)
    admin.tsx            briques back-office (ActionButton, Table, SearchBox…)
  proxy.ts               redirections optimistes (JWT seul, sans base)
tests/security/          37 tests
docs/
  VPS.md                 héberger Postgres, ouvrir à Vercel proprement, sauvegardes
  SERVICES.md            Google OAuth, ImageKit, Gmail, Vercel
  SECURITE.md            menaces → mesures → fichiers
  STOCK.md               les quatre stocks
```

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
  montants) + Montserrat.
- **Commentaires `///`** en tête de chaque module : le *pourquoi*, pas le *quoi*.
- Commits en français, sujet ≤ 72 caractères, corps expliquant la décision.

## Déployer

Voir `docs/VPS.md` (base) puis `docs/SERVICES.md` §4 (Vercel).
