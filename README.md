# DreamTeamShop — Web

Marketplace sociale : vitrine publique + application et back-office.

- **Stack** : Next.js 16 (App Router), React 19, Tailwind 4, TypeScript strict
- **Backend actif** : Supabase (Postgres + RLS + RPC + Auth + Storage)
- **Backend futur** : Parse Server auto-hébergé — préparé mais pas encore actif
  (voir `backend-parse-wip/README.md`)

## Zones de l'application

| Route | Rôle |
| --- | --- |
| `/` | Vitrine marketing (or/noir) |
| `/play/*` | Application acheteur/vendeur |
| `/admin/*` | Back-office (réservé aux comptes `is_admin`) |

## Démarrage local

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés Supabase
npm run dev
```

Ouvrir http://localhost:3000

Tant que les clés Supabase ne sont pas renseignées, `/play` et `/admin`
affichent un écran d'attente (`SetupNotice`) au lieu de planter.

## Variables d'environnement

Voir `.env.example`. Les deux clés indispensables :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Changer de backend

Le basculement se fait en un seul endroit : `src/lib/backend/config.ts`,
piloté par `NEXT_PUBLIC_BACKEND_PROVIDER` (`supabase` par défaut).
Toutes les pages importent `@/lib/backend/client` ou `@/lib/backend/server`,
jamais le SDK d'un backend directement.

## Contrôles qualité

```bash
npx tsc --noEmit
npx eslint src
npx next build
```

Les trois doivent passer sans erreur.

## Déploiement

Voir **`DEPLOIEMENT_VERCEL.md`**.
