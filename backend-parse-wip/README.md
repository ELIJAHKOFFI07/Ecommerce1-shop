# Migration Parse Server — travail en cours (non actif)

Ce dossier contient le début de la migration vers **Parse Server auto-hébergé**.
Il est **exclu de la compilation** (voir `exclude` dans `tsconfig.json`) et n'a
**aucun effet** sur l'application : le backend actif est **Supabase**.

Raison : le VPS du client n'est pas encore prêt. L'application tourne et se
déploie sur Supabase en attendant.

## Contenu

| Fichier | Destination finale |
| --- | --- |
| `lib-parse/init.ts` | `src/lib/backend/parse/init.ts` |
| `lib-parse/client.ts` | `src/lib/backend/parse/client.ts` |
| `lib-parse/server.ts` | `src/lib/backend/parse/server.ts` |
| `lib-parse/middleware.ts` | `src/lib/backend/parse/middleware.ts` |
| `api-auth-session-route.ts` | `src/app/api/auth/session/route.ts` |

## Ce qui est déjà fait

- Init du SDK Parse + `isParseConfigured()`
- Client navigateur avec la même surface `auth.*` que Supabase
  (signInWithPassword, signUp, signInWithGoogle, signOut, getUser)
- Session SSR via cookie httpOnly `parseSessionToken` posé par une API route
- Garde `/admin` revalidée côté serveur avec la master key

## Ce qui reste (le gros du travail)

1. Déployer Parse Server sur le VPS (Node, parse-server, adaptateur Postgres,
   Nginx + TLS, PM2/systemd, Parse Dashboard).
2. Définir le schéma Parse (classes, Pointers, index) équivalent aux tables
   Postgres actuelles.
3. Réécrire les ~25 RPC Postgres en Cloud Functions Parse — toute la logique
   argent (commandes, stock, commission, portefeuille, enchères, coupons)
   reste validée **côté serveur uniquement**.
4. Reproduire les policies RLS en CLP / ACL / `beforeSave` + rôle `admin`.
5. Migrer le stockage `shop-images` vers `Parse.File`.
6. Brancher LiveQuery (commandes, stock, questions produit).
7. Migrer les requêtes `.from(...)` des pages vers `Parse.Query`.

## Comment reprendre

Le point de bascule est `src/lib/backend/config.ts` : la variable d'environnement
`NEXT_PUBLIC_BACKEND_PROVIDER` vaut `supabase` (défaut) ou `parse`. Une fois
l'implémentation Parse complète, il suffira de basculer cette variable.
