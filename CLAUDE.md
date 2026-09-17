# This is NOT the Next.js you know

Next.js 16 : APIs, conventions et structure diffèrent de vos données
d'entraînement. Lisez `node_modules/next/dist/docs/` avant d'écrire du
code (middleware = `proxy.ts`, `params` sont des Promise, runtime Node
par défaut dans le proxy).

# SuperlifeShop — règles pour travailler ici

Lisez `README.md` (structure, conventions) et `docs/SECURITE.md` (menaces
et mesures) avant toute modification. Les règles ci-dessous sont celles
qu'on ne devine pas en lisant le code.

## Non négociable

- **Aucune route API sans `withApi`, sans schéma zod (`lib/validators.ts`)
  et sans `requireUser` / `requirePermission`.** Une nouvelle route qui
  contourne l'un des trois est une régression de sécurité.
- **Aucune écriture de stock hors `stock.move()`.** Aucune écriture de
  solde hors `lib/wallet.ts`. Les deux verrouillent (`FOR UPDATE`) et
  journalisent.
- **Les montants d'une commande viennent du catalogue**, jamais du client.
- **Aucun secret dans un fichier suivi par git.** `.env.example` ne
  contient que des espaces réservés. Si un secret a transité dans une
  conversation, il est considéré compromis : le dire, proposer la rotation.
- **Une ressource d'autrui renvoie 404**, pas 403 (ne pas confirmer son
  existence).
- **E-mails après la transaction**, jamais dedans.

## Prisma 7

- `prisma.config.ts` porte l'URL (`process.env.DATABASE_URL ?? ""`, pas
  `env()` qui lève au build Vercel).
- Client généré dans `prisma/generated/` (ignoré par git, régénéré au
  `postinstall`).
- **Ne jamais importer le client Prisma depuis un composant client** :
  `lib/money.ts` est pur, `lib/decimal.ts` est serveur.
- Nouvelle migration : `npx prisma migrate dev --name xxx` (avec tunnel),
  ou `prisma migrate diff --from-migrations … --to-schema … --script`
  hors ligne. Ne jamais modifier une migration déjà appliquée.

## Build

- `npm run build` = `prisma generate && next build`. **Jamais pendant
  que `npm run dev` tourne** (même `.next`).
- Avant commit : `npm run typecheck && npm run lint && npm test && npm run build`.

## Interface

- Le client final « n'est pas trop intellectuel » : un bouton principal
  par écran, verbes, montants gros, statuts expliqués en une phrase, pas
  d'icône seule. Ne pas ajouter de rubrique, de badge ou de raccourci
  « utile » sans demande explicite.
- Palette et polices dans `src/app/globals.css` — aucune couleur en dur
  dans un composant.
- Pages = serveur (accès direct à `db`, garde `pageAuth.ts`) ;
  formulaires = client (`lib/api.ts`).

## Base de données

- Postgres sur le VPS `72.62.31.97`, tunnel SSH `localhost:5433` en local
  (`.env.local`). Vercel s'y connecte directement en TLS (`docs/VPS.md`).
- Aucun accès à la base depuis le proxy.
