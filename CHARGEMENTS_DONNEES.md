# Chargements de données côté client — endurcissement à prévoir

> Dette technique relevée lors du débogage du test mobile (accès via IP LAN
> `192.168.1.129`). Le symptôme initial — pages figées sur les skeletons —
> venait du dev server qui bloquait l'hydratation (voir `allowedDevOrigins`
> dans `next.config.ts`). Ce document décrit un **risque latent indépendant** :
> un échec ou un blocage réseau des requêtes Supabase laisse les skeletons
> affichés **pour toujours**, sans message ni moyen de rejouer.

## Problème

Toutes les pages/écrans qui chargent des données au montage (pattern
`useCallback(load)`/`useEffect` + `createClient().from(...)`) ne gèrent **ni
erreur, ni timeout** :

- `await Promise.all([...])` sans `try/catch` (`src/app/play/page.tsx:66-116`) :
  si une requête **rejette** (réseau coupé, DNS, timeout, erreur CORS), la
  promesse du IIFE rejette, `setLoading(false)` (ligne 114) n'est jamais
  exécuté → `loading` reste `true` → skeleton infini.
- Promesses en `.then(...)` sans `.catch` (`src/app/play/search/page.tsx:40-84`) :
  même conséquence : `setLoading(false)` n'est pas appelé.
- Aucun timeout : une requête qui **reste en attente** (réseau instable,
  téléphone, roaming) ne produit jamais d'erreur ni de fin de chargement.
- Conséquence UX : impossible de distinguer « encore en cours » d'« échec » ;
  aucun message, aucun bouton « Réessayer ». Le seul recours est un rechargement
  complet de la page.

## Écrans concernés

Pages `/play` chargées au montage :

- `src/app/play/page.tsx` (accueil : produits, catégories, boutiques, enchères)
- `src/app/play/search/page.tsx`
- `src/app/play/wishlists/page.tsx` et `src/app/play/wishlists/[id]/page.tsx`
- `src/app/play/wallet/page.tsx`
- `src/app/play/spin/page.tsx`
- `src/app/play/shop/[id]/page.tsx`
- `src/app/play/sell/page.tsx`
- `src/app/play/referral/page.tsx`
- `src/app/play/product/[id]/page.tsx`
- `src/app/play/offers/page.tsx`
- `src/app/play/notifications/page.tsx`
- `src/app/play/messages/page.tsx` et `src/app/play/messages/[id]/page.tsx`
- `src/app/play/compare/page.tsx`
- `src/app/play/auctions/page.tsx`

Composants :

- `src/components/play/ProductActions.tsx` (`Promise.all` lignes 44+)
- `src/components/play/AuctionBlock.tsx`
- `src/components/play/EditProductDialog.tsx`
- `src/components/play/StoriesManager.tsx`

Back-office `/admin` :

- `src/app/admin/page.tsx`
- `src/app/admin/accounting/page.tsx`
- `src/app/admin/invoices/page.tsx` et `[id]/page.tsx`
- `src/app/admin/categories/page.tsx`
- `src/app/admin/stock/page.tsx`
- `src/app/admin/settings/page.tsx`

`src/lib/session.tsx` est aussi concerné (profil) : une requête bloquée laisse
`loading` à `true` pour tout le layout `/play`.

## Piste de correction

1. **Helper partagé** : un utilitaire/hook `useSupabaseQuery` (ou
   `withTimeout`) qui
   - enveloppe chaque requête dans un `try/catch/finally` → `loading` passe
     toujours à `false` ;
   - applique un timeout (ex. `AbortController`, ~15 s) pour qu'une requête en
     attente finisse par produire une erreur ;
   - expose un état `error` + un `retry()` pour relancer.
2. **État d'erreur visuel** : remplacer le « skeleton infini » par le pattern
   existant du projet — texte court `text-sm`, bordure `border-red-500/40`,
   fond `bg-red-500/10`, texte `text-red-300` — avec un bouton « Réessayer »
   (voir le bloc déjà présent dans `src/app/play/page.tsx:303-308`).
3. **Timeout global Supabase** (optionnel) : surcharger `fetch` dans
   `src/lib/supabase/client.ts` (option `global.fetch` de
   `createBrowserClient`) pour appliquer le délai à toutes les requêtes sans
   toucher chaque page.
4. **Pages critiques** (accueil `/play`) : alternative structurelle plus
   lourde — charger les données côté serveur (composant serveur ou route
   handler) et les passer en props, pour que le premier HTML contienne déjà le
   contenu, sans skeleton ni dépendance à l'hydratation.

## Vérification

- Passer `npx tsc --noEmit` et `npx eslint src` après modification.
- Simuler un échec : couper le réseau (ou pointer `NEXT_PUBLIC_SUPABASE_URL`
  vers un hôte injoignable) et vérifier qu'une page affiche l'état d'erreur
  avec « Réessayer » au lieu d'un skeleton infini.
- Simuler une latence : throttling réseau (DevTools) et confirmer que le
  timeout finit par afficher l'erreur.