<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DreamTeamShop — Conventions de l'interface

> Manuel de référence pour le travail sur **l'interface** (vitrine publique,
> application `/play`, back-office `/admin`). Rédigé en mode *evidence-first* :
> chaque règle provient de fichiers réels du projet, pas de bonnes pratiques
> génériques. Toute affirmation non vérifiable est marquée
> `Non établi dans la codebase`.

## Philosophie de l'interface

Le projet privilégie une **interface sobre, accessible et mobile-first** :

- **Palette réduite pilotée par des jetons CSS** : toutes les couleurs de
  l'interface passent par des variables définies dans `src/app/globals.css`
  (`--background`, `--foreground`, `--surface`, `--surface-2`, `--border`,
  `--muted`, `--accent`, `--accent-dark`, `--on-accent`). Les composants
  n'utilisent que les classes Tailwind correspondantes (`bg-surface`,
  `text-muted`, `border-border`, …) — jamais de valeur de couleur en dur.
- **L'accent est l'unique couleur de marque** : seul l'accent change selon le
  thème/palette, les surfaces et le texte restent fixes pour préserver les
  contrastes mesurés (WCAG, voir les commentaires de `globals.css`).
- **Mobile d'abord** : barre de navigation fixe en bas sur téléphone
  (`BOTTOM_LINKS`), en-tête sticky, carrousels à ancrage natif, cibles
  tactiles suffisantes.
- **Accessibilité systématique** : `prefers-reduced-motion`, libellés ARIA sur
  les boutons icône, contrastes mesurés et documentés.
- **Documentation dans le code** : chaque composant porte un commentaire
  `///` qui explique le *pourquoi* du design (références, pièges évités).
  Ce style est systématique — tout nouveau composant doit le suivre.

## Stack et structure (vue interface)

- **Next.js 16 (App Router)** — attention : version avec breaking changes.
  Voir le bandeau en tête de fichier. Le middleware est renommé **Proxy**
  (`src/proxy.ts`), les `params` dynamiques sont des `Promise` résolues par
  `use(params)` côté client (`src/app/play/product/[id]/page.tsx:20-22`).
- **React 19**, **TypeScript strict**, **Tailwind CSS v4** (config CSS-first :
  `@theme inline` dans `globals.css`, pas de `tailwind.config.*`).
- **Icônes : `lucide-react`**. **Animation : CSS natif + `framer-motion`**
  (uniquement dans `components/marketing/`). **3D : `@react-three/*`** pour un
  seul composant (`FloatingBag.tsx`).
- Imports via l'alias `@/*` → `./src/*` (`tsconfig.json`).

### Arborescence

```
src/
├── app/            # Routes App Router
│   ├── page.tsx    # Vitrine publique (composant serveur)
│   ├── layout.tsx  # Layout racine : polices, anti-flash de thème, manifest
│   ├── play/       # Application acheteur/vendeur
│   ├── admin/      # Back-office
│   └── api/        # Routes serveur
├── components/
│   ├── marketing/  # Blocs de la vitrine (server + client)
│   ├── play/       # Composants de l'app /play
│   ├── ui/         # Primitives de mise en page (Card, Section)
│   ├── charts/     # Graphiques SVG sans dépendance
│   └── three/      # Scène 3D (FloatingBag)
└── lib/
    ├── theme.ts    # Palettes + mode clair/sombre
    ├── nav.ts      # Navigation : liens primaires, sections, gardes
    ├── cart.tsx    # Panier (Context + localStorage)
    ├── session.tsx # Session (Context + Supabase)
    └── backend/    # Façade backend (Supabase actuellement, Parse en prépa)
```

## Système de thème

- Deux dimensions indépendantes : **palette** (`data-preset` sur `<html>`) et
  **mode** clair/sombre (`data-theme`). Valeurs par défaut : `gold` / `light`.
- Persistance en `localStorage` (clés `dreamteamshop_theme_preset` et
  `dreamteamshop_theme_mode`), lues par un **script inline anti-flash** dans
  `layout.tsx` avant l'hydratation.
- Le sélecteur est `components/ThemeSwitcher.tsx`, réutilisé sur
  `/play/account` et `/admin`. La liste des palettes vit dans `lib/theme.ts`.
- **Ne pas renommer** l'identifiant `gold` : c'est la valeur déjà écrite dans
  le localStorage des visiteurs (`lib/theme.ts:22-24`).

## Règles de styling (Tailwind v4)

- **Toujours utiliser les jetons** : `bg-background`, `text-foreground`,
  `bg-surface`, `bg-surface-2`, `border-border`, `text-muted`,
  `bg-accent`, `text-accent`, `border-accent`, `text-on-accent`.
  Ne jamais coder `#hex` en dur dans un composant.
- **Boutons primaires** : `rounded-full bg-foreground text-background`
  (noir sur blanc, CTA principal). **Boutons secondaires** :
  `rounded-full border border-border` avec `hover:bg-surface-2`.
- **Liens avec animation** : classe utilitaire `underline-grow`
  (soulignement qui se déploie, défini dans `globals.css`).
- **Retour tactile** : classe `press` sur tout élément cliquable
  (scale au clic). **Cartes hover** : classe `lift`.
- **Rythme de page** : les sections utilisent le conteneur standard
  `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 2xl:max-w-[1440px]`
  (défini dans `components/ui/Section.tsx`). Ne pas inventer d'autres largeurs.
- **Images** : `<img>` natif avec `object-cover` (pas `next/image`, la
  politique ESLint `@next/next/no-img-element` est désactivée ligne par ligne).
  Les domaines autorisés pour les images distantes sont déclarés dans
  `next.config.ts` (host Supabase). Toute nouvelle source distante doit y
  être ajoutée, sinon l'image sera bloquée.
- **Animation d'entrée en cascade** : classe `stagger` sur un conteneur ;
  la grille applique des retards `nth-child` (globals.css).

## Composants et conventions de code

### Organisation des composants

- **Composants serveur par défaut** ; ajouter `"use client"` seulement si le
  composant a besoin d'état interactif, d'effets ou de contexte client.
- Les **données de session sont résolues côté serveur** (`layout.tsx` de
  `/play`, `page.tsx` de la vitrine) et passées en props aux composants
  serveur — jamais déduites côté navigateur pour éviter le clignotement
  (`LandingHeader.tsx:4-8`).
- Les composants client qui **chargent des données** utilisent le pattern
  `useCallback(load)` + `useEffect` (`ProductQna.tsx:21-36`).

### Primitives réutilisables (`components/ui/`)

- `Card` / `CardHeader` / `CardTitle` / `CardContent` / `CardFooter` :
  composition par assemblage. Props `accent` (filet coloré en haut, pour les
  rubriques) et `hover` (effet lift).
- `Section` : rythme vertical + largeur. `tone` = `plain` | `raised` (aplat
  bordé) | `fade` (aplat léger). `SectionHeading` : titre + sous-titre +
  `action` (lien « Tout voir → ») ou centrage.
- `IconBadge` : pastille ronde portant l'icône d'une rubrique.
- **Squelettes de chargement** (`components/Skeleton.tsx`) : `Skeleton`
  (shimmer), `ProductGridSkeleton`, `ListSkeleton`, `HeaderSkeleton`.
  Toujours afficher ces shimmers pendant un chargement, jamais un texte
  « Chargement… » brut.

### États et feedback

- **Garde d'hydratation** : les écrans dépendant du `localStorage` (panier)
  ou de la session affichent un shimmer tant que l'état n'est pas connu, pour
  éviter un faux état vide puis une correction (`cart.tsx:44-49`,
  `play/cart/page.tsx:15-22`).
- **Messages de retour** : texte court en `text-xs`, couleur `text-accent`
  pour le succès, `text-red-400` pour l'erreur (voir `PointsCard`,
  `ProductActions`). Pas de bibliothèque de toasts — `Non établi dans la codebase`.
- **États vides** : centrés, `text-muted`, avec un CTA de secours vers une
  action utile (ex. `play/cart/page.tsx:24-37`).

## Navigation

- **Source unique dans `lib/nav.ts`** : ajouter une entrée ici la fait
  apparaître dans le menu ET la page compte.
- `PRIMARY_LINKS` (barre du haut, filtrée par rôle), `BOTTOM_LINKS` (barre
  du bas mobile, **exactement 4 entrées fixes** — ne pas en ajouter, chaque
  item est en `flex-1` et passerait de 25 % à 20 % de largeur),
  `SECTIONS` (menu regroupé par thème).
- **Gardes d'accès** : `MEMBER_ONLY_PREFIXES` + `isMemberOnly()` déclenchent
  la redirection vers la connexion via `AuthGate`. `/play/cart` en est
  volontairement absent (panier sans compte). Le back-office `/admin` est
  gardé par le Proxy + RLS (`src/lib/supabase/middleware.ts:36-48`).
- **En-têtes de pages secondaires** : `PageHeader` (titre + retour arrière
  avec `fallbackHref`). Les pages de navigation mobile hors barre du bas
  doivent en avoir un (`PageHeader.tsx:6-14`).

## Accès aux données

- **Toute lecture passe par la façade `createClient()`** de
  `@/lib/backend/client` (navigateur) ou `@/lib/backend/server` (serveur) —
  jamais un import direct de `@/lib/supabase/*` dans un composant
  (`lib/backend/client.ts:6-10`). C'est le seul point à modifier pour la
  future bascule Parse.
- **Le backend peut être non configuré** : utiliser `isBackendConfigured()`
  et afficher `SetupNotice` plutôt que de planter
  (`app/play/layout.tsx:23-29`).
- **Prix et montants** : toujours `formatFcfa()` (`lib/types.ts`). Tout ce
  qui touche à de l'argent est calculé côté serveur (RPC) ; l'interface
  affiche et transmet, elle ne calcule jamais un total « officiel ».

## Back-office (`/admin`)

- Navigation latérale groupée par métier (`AdminNav.tsx`), active sur
  `pathname.startsWith`. Sur mobile : en-tête sticky + tiroir.
- **Graphiques** : composants SVG maison dans `components/charts/Charts.tsx`
  (pas de librairie). Palette `--viz-*` validée daltonisme (ordre fixe des
  séries = mécanisme de sécurité, ne pas réordonner). Chaque graphique doit
  être accompagné d'une vue tableau (la couleur n'est jamais le seul canal).
- `ThemeSwitcher` est intégré à la sidebar admin.

## Accèsibilité

- **`prefers-reduced-motion`** : toutes les animations CSS sont neutralisées
  dans `globals.css:205-234`. Pour l'animation JS, utiliser
  `useReducedMotion()` (`lib/useReducedMotion.ts`, basé sur
  `useSyncExternalStore`) — jamais un `useEffect` + `setState`.
- **Boutons icône seuls** : toujours un `aria-label` explicite.
- **Contrastes** : les ratios sont mesurés et documentés en commentaire dans
  `globals.css`. Ne pas changer les valeurs de surfaces/texte sans revérifier
  les ratios (règle explicite dans le fichier).

## Qualité

- **Commandes à faire passer avant tout commit** (README.md §2) :
  ```bash
  npx tsc --noEmit
  npx eslint src
  npx next build
  ```
- **Pas de suite de tests automatisés** dans le projet
  (`Aucune convention de test clairement établie dans la codebase`).
- **ESLint** : config `eslint-config-next` (core-web-vitals + typescript),
  `npm run lint` = `eslint`. Certains patterns volontaires sont désactivés
  ligne par ligne avec un commentaire justifiant pourquoi (`no-img-element`,
  `react-hooks/set-state-in-effect` pour l'hydratation).

## Direction produit (vitrine publique)

- La vitrine (`/`) reprend la structure de référence **Turbodeal** : bande
  d'accroche pleine largeur, rubriques en cartes à filet coloré, tableau des
  avantages, catalogue, citation + appel final (commentaires de
  `src/app/page.tsx`). Les primitives `Card`/`Section` viennent de
  `shirt-shop`/`shopCommerce`.
- **Travail en cours (TODO.md)** : amélioration de la vitrine sur le modèle
  **Back Market** — voir `analyse-design-inspiration.md` (architecture en 12
  blocs, réassurance précoce, couleur = signal, densité maîtrisée). Le header
  doit se masquer au scroll down et réapparaître au scroll up avec une
  transition fluide, visible sur mobile.

## Workflow de feature (bonus)

Sur demande d'une nouvelle fonctionnalité : documenter d'abord la stratégie
(outils, librairies, fonctions), puis créer un plan `[FEATURE-NAME].plan.md`
via le skill `writing-plans`, mis à jour à chaque modification, avec statut
`EN COURS` ou `COMPLETED` dans le titre.

## Zones à vérifier

- **Composant `FloatingBag` (3D)** : présent mais non branché dans les pages
  actuelles — `Non établi dans la codebase` s'il est actif quelque part.
- **`framer-motion`** n'est utilisé que dans `components/marketing/`
  (`Reveal`, `Testimonial`) ; les composants `play/` utilisent le CSS natif.
- **Notification push / FCM** (`lib/push.ts`, `PushToggle`) : hors périmètre
  interface, non détaillé ici.