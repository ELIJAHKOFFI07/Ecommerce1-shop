# Compte Dashboard Implementation Plan — COMPLETED

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer l'espace compte (`/play/account` + pages rattachées) en un dashboard néo-brutal, avec une barre de navigation horizontale commune et le style `card-hard` appliqué à toutes les cartes et boutons.

**Architecture:** Groupe de routes `src/app/play/(account)/` (les URLs restent plates : `/play/orders`, `/play/wallet`…) hébergeant toutes les pages de l'espace compte. Un `layout.tsx` serveur y injecte la barre horizontale (`AccountDashboardNav`, client, état actif via `usePathname`) + `{children}`. Aucune route API ni RPC n'est touchée — ils sont 100 % agnostiques à l'URL. `/play/sell` reste hors du groupe.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (utilitaires `card-hard`, `card-hard-sm`, aliases `bg-ink`/`bg-cream`/`bg-paper`/`bg-orange` définis dans `globals.css`), `lucide-react`, Supabase façade `@/lib/backend/client`.

---

## Conventions de style (à appliquer partout)

- **Carte** : `card-hard rounded-2xl bg-paper` (+ `p-5`/`p-6` selon contexte). Remplacent `rounded-* border border-border bg-surface`.
- **Bouton primaire** : `card-hard-sm inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-display text-sm font-bold text-cream transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none`.
- **Bouton secondaire** : même classe avec `bg-paper text-ink` (et `hover:bg-orange-soft` si besoin).
- **Bouton danger** : même classe avec `bg-orange text-white` ou, pour sortie de session, `bg-paper text-ink hover:text-red-600`.
- **Pastille d'icône** : `grid place-items-center border-2 border-border` + tone (`bg-orange text-white`, `bg-ink text-sun`, `bg-paper text-ink`…) — cf. `IconBadge` dans `src/components/landing/Primitives.tsx`.
- **En-tête de page** : `font-display text-2xl font-extrabold tracking-tight` (titre) — aligner `PageHeader` sur ce style.
- **Champs de formulaire** : garder les bordures `border-2 border-border bg-paper rounded-xl` (déjà néo-brutal là où c'est le cas).

## Conventions de structure

- Les pages restent des composants client (`"use client"`), elles héritent d'`AuthGate`/`PasswordChangeGate` via le layout `/play`.
- `src/lib/nav.ts` reste la source unique des liens (la barre horizontale réutilise `SECTIONS` aplati + filtre rôle).
- `MEMBER_ONLY_PREFIXES` et les redirects auth ne changent pas : les URLs sont identiques.

---

## Phase 1 — Coquille dashboard + barre horizontale

### Task 1: Déplacer les pages dans le groupe `(account)`

**Files:** déplacement (git mv, aucune édition de code)

- [ ] **Step 1: Déplacer les fichiers**

```bash
cd /home/xxv/dev/freelance/Ecommerce1-shop
git mv src/app/play/account/page.tsx "src/app/play/(account)/account/page.tsx"
git mv src/app/play/account/edit "src/app/play/(account)/account/edit"
git mv src/app/play/account/password "src/app/play/(account)/account/password"
git mv src/app/play/orders "src/app/play/(account)/orders"
git mv src/app/play/wishlists "src/app/play/(account)/wishlists"
git mv src/app/play/offers "src/app/play/(account)/offers"
git mv src/app/play/wallet "src/app/play/(account)/wallet"
git mv src/app/play/notifications "src/app/play/(account)/notifications"
git mv src/app/play/messages "src/app/play/(account)/messages"
git mv src/app/play/spin "src/app/play/(account)/spin"
git mv src/app/play/referral "src/app/play/(account)/referral"
git status --short
```

Expected: les fichiers sont marqués `R` (renamed). Les URLs restent inchangées (groupe de route).

- [ ] **Step 2: Vérifier que rien ne casse à la compilation**

Run: `npx tsc --noEmit`
Expected: aucun type-error (les chemins d'import relatifs sont préservés par le déplacement).

### Task 2: Créer `AccountDashboardNav` (barre horizontale)

**Files:**
- Create: `src/components/play/AccountDashboardNav.tsx`

- [ ] **Step 1: Créer le composant**

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, UserPen } from "lucide-react";
import { SECTIONS, visibleLinks } from "@/lib/nav";

/// Barre de navigation horizontale du dashboard compte : les destinations de
/// l'espace personnel en un seul rang scrollable (pas de sidebar). Le lien
/// actif est détecté par `usePathname` avec préfixe — la page d'accueil du
/// dashboard `/play/account` est l'« Accueil ».
function useAccountLinks(canSell: boolean, isAdmin: boolean) {
  const links = SECTIONS.flatMap((section) =>
    visibleLinks(section.links, { canSell, isAdmin }),
  );
  return [
    { href: "/play/account", label: "Accueil", icon: HomeIcon },
    ...links,
  ];
}
```

> Note : le code complet du composant (avec `HomeIcon`, état actif, styles `card-hard-sm`) est à écrire dans le fichier, en suivant les conventions ci-dessus. Tous les liens proviennent de `SECTIONS` (aplat) pour rester synchronisés avec `lib/nav.ts`.

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npx eslint src/components/play/AccountDashboardNav.tsx`
Expected: aucune erreur.

### Task 3: Créer le layout du groupe `(account)`

**Files:**
- Create: `src/app/play/(account)/layout.tsx`

- [ ] **Step 1: Créer le layout**

```tsx
import { AccountDashboardNav } from "@/components/play/AccountDashboardNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl pb-10 2xl:max-w-[1440px]">
      <AccountDashboardNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
```

> Note : le layout est un composant serveur ; la session est déjà résolue par le layout `/play` parent (AuthGate). La largeur est volontairement pleine (`max-w-7xl`) car le layout parent `/play` applique déjà le padding `px-4 md:px-6` via `CONTAINER`.

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

---

## Phase 2 — Redesign de la page d'accueil du dashboard (`/play/account`)

### Task 4: Refondre la page index du dashboard

**Files:**
- Modify: `src/app/play/(account)/account/page.tsx` (réécriture du rendu uniquement ; la logique data reste identique)

- [ ] **Step 1: Réécrire le rendu en style néo-brutal**

Remplacer la grille actuelle (carte d'identité + grille SECTIONS) par :
- une **carte d'identité** `card-hard rounded-2xl bg-paper` (avatar, nom, email, rôle · points) ;
- un rang de **stats/actions rapides** en cartes `card-hard` (Portefeuille, Mes commandes, Points, Notifications) ;
- `PointsCard` + `ThemeSwitcher` + bouton déconnexion avec les conventions ci-dessus.

> Note : le bouton « Modifier mon profil » reste ; les liens SECTIONS sont désormais dans la barre horizontale (layout), ils disparaissent donc de la grille de la page.

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit && npx eslint src/app/play/"(account)"/account/page.tsx`
Expected: aucune erreur.

---

## Phase 3 — Restyle `card-hard` des pages rattachées

### Task 5: Restyler `orders`

**Files:**
- Modify: `src/app/play/(account)/orders/page.tsx`

- [ ] **Step 1:** Appliquer `card-hard rounded-2xl bg-paper` aux cartes de commandes ; les boutons WhatsApp/actions en boutons primaires/secondaires ci-dessus ; `PageHeader` aligné sur le style `font-display`.
- [ ] **Step 2:** `npx tsc --noEmit && npx eslint src/app/play/"(account)"/orders/page.tsx`

### Task 6: Restyler `wallet`

**Files:**
- Modify: `src/app/play/(account)/wallet/page.tsx`

- [ ] **Step 1:** Carte solde + historique en `card-hard rounded-2xl bg-paper` ; formulaire de retrait (inputs `border-2 border-border bg-paper rounded-xl`) ; bouton primaire `card-hard-sm bg-ink`.
- [ ] **Step 2:** vérification lint/tsc.

### Task 7: Restyler `offers`

**Files:**
- Modify: `src/app/play/(account)/offers/page.tsx`

- [ ] **Step 1:** Onglets en pills `card-hard-sm` (actif `bg-ink text-cream` / inactif `bg-paper`) ; cartes d'offre `card-hard rounded-2xl bg-paper` ; boutons accepter/refuser/contre-proposer en conventions primaire/secondaire/danger.
- [ ] **Step 2:** vérification lint/tsc.

### Task 8: Restyler `notifications`

**Files:**
- Modify: `src/app/play/(account)/notifications/page.tsx`

- [ ] **Step 1:** Lignes de notifications en cartes `card-hard rounded-2xl bg-paper` ; bouton « tout marquer lu » en bouton secondaire.
- [ ] **Step 2:** vérification lint/tsc.

### Task 9: Restyler `messages` + `messages/[id]`

**Files:**
- Modify: `src/app/play/(account)/messages/page.tsx`
- Modify: `src/app/play/(account)/messages/[id]/page.tsx`

- [ ] **Step 1:** Conversations en cartes `card-hard rounded-2xl bg-paper` ; bulles de chat en `bubble bubble-me`/`bubble bubble-vendor` (déjà dans globals.css) ; champ de saisie `border-2 border-border bg-paper rounded-full`.
- [ ] **Step 2:** vérification lint/tsc.

### Task 10: Restyler `wishlists` + `wishlists/[id]`

**Files:**
- Modify: `src/app/play/(account)/wishlists/page.tsx`
- Modify: `src/app/play/(account)/wishlists/[id]/page.tsx`

- [ ] **Step 1:** Cartes de listes `card-hard rounded-2xl bg-paper` ; formulaire création (input + bouton `card-hard-sm bg-ink`).
- [ ] **Step 2:** vérification lint/tsc.

### Task 11: Restyler `spin`

**Files:**
- Modify: `src/app/play/(account)/spin/page.tsx`

- [ ] **Step 1:** Cadre de la roue et cartes de gains en `card-hard` ; bouton « tourner » en primaire `bg-orange` ; garder les styles `#wheel`/`.wheel-seg` existants.
- [ ] **Step 2:** vérification lint/tsc.

### Task 12: Restyler `referral`

**Files:**
- Modify: `src/app/play/(account)/referral/page.tsx`

- [ ] **Step 1:** Cartes code/classement `card-hard rounded-2xl bg-paper` ; code de parrainage en `bg-sun text-ink` ; boutons en conventions.
- [ ] **Step 2:** vérification lint/tsc.

### Task 13: Restyler `account/edit` + `account/password`

**Files:**
- Modify: `src/app/play/(account)/account/edit/page.tsx`
- Modify: `src/app/play/(account)/account/password/page.tsx`

- [ ] **Step 1:** Formulaires en carte `card-hard rounded-2xl bg-paper` ; champs `border-2 border-border bg-paper rounded-xl` ; bouton enregistrer/mot de passe en primaire `bg-ink`.
- [ ] **Step 2:** vérification lint/tsc.

### Task 14: Aligner `PageHeader` sur le style néo-brutal

**Files:**
- Modify: `src/components/play/PageHeader.tsx`

- [ ] **Step 1:** Titre en `font-display text-2xl font-extrabold tracking-tight` ; bouton retour en bouton secondaire `card-hard-sm bg-paper` ; `fallbackHref` inchangé (`/play/account`).
- [ ] **Step 2:** vérification lint/tsc.

---

## Phase 4 — Qualité finale

### Task 15: Vérifications complètes

- [ ] **Step 1:** `npx tsc --noEmit` → aucune erreur.
- [ ] **Step 2:** `npx eslint src` → aucune erreur.
- [ ] **Step 3:** `npx next build` (dev server arrêté, sinon `rm -rf .next` d'abord) → build OK.
- [ ] **Step 4:** Vérification manuelle sur mobile/desktop : barre horizontale scrollable, état actif correct, URLs identiques (`/play/orders`, `/play/account/edit`…), aucun débordement horizontal.

## Rappels

- Ne PAS lancer `next build` pendant que `npm run dev` tourne (corruption `.next`).
- RPC/API : rien à changer (agnostiques à l'URL).
- `MEMBER_ONLY_PREFIXES`, `PasswordChangeGate`, redirects auth : inchangés (URLs plates conservées).
