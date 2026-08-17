# DreamTeamShop — Description produit

> Document de référence décrivant le produit : vision, positionnement, publics
> visés, parcours et fonctionnalités. Source : `README.md`, la vitrine publique
> (`src/app/page.tsx`) et l'application (`src/app/play/**`).

---

## 1. En une phrase

**DreamTeamShop est une marketplace sociale locale pour la Côte d'Ivoire** : on y
achète, on y vend, et surtout on y **négocie** — le paiement se fait en Mobile
Money ou à la livraison, et la consultation du catalogue ne demande aucun compte.

---

## 2. Vision et positionnement

La plateforme se décrit comme *« la marketplace sociale de Côte d'Ivoire »*
(`app/page.tsx`). Trois idées porteuses structurent tout le produit :

1. **Proximité** — « achetez, vendez et négociez près de chez vous ». L'accent est
   mis sur les vendeurs locaux et la géolocalisation par ville (`ProductCard`
   affiche `product.city`).
2. **Mobile Money d'abord** — le paiement est pensé pour le réseau ivoirien
   (Orange, MTN, Moov, Wave), avec un code de retrait à 6 chiffres par colis. La
   carte bancaire existe mais n'est qu'une option parmi d'autres.
3. **Pas de barrière à l'entrée** — tout le catalogue est consultable sans
   compte ; la connexion n'est exigée qu'au moment de commander.

Ce n'est **pas** une boutique mono-marque type Shopify, ni un modèle
dropshipping/Amazon : c'est une **place de marché multi-vendeurs** (chaque vendeur
a sa propre boutique) avec une couche **sociale et négociée** par-dessus.

---

## 3. Type de site e-commerce

| Dimension | Caractéristique |
| --- | --- |
| Modèle | Marketplace **C2C / B2C hybride** (particuliers + vendeurs/pros) |
| Multi-vendeurs | Oui — boutiques indépendantes, catalogue agrégé |
| Paiement | Mobile Money (Orange/MTN/Moov/Wave) · Carte bancaire · À la livraison |
| Négociation | Au cœur du produit (offres de prix + enchères) |
| Compte requis | Non pour naviguer ; oui pour commander |
| Cible | Mobile-first, francophone, réseau 3G/Data |
| Gamification | Points de fidélité, parrainage, roue de la chance, stories |
| Back-office | Complet (users, stock, compta, factures, coupons) |

Proches équivalents de marché : **Jumia**, **CoinAfrique** ou **Expat-Dakar**,
mais avec une dimension négociation/enchères et sociale beaucoup plus marquée.

---

## 4. Publics visés (personas)

### 4.1 L'acheteur (client)
Le rôle par défaut. Il peut :
- parcourir le catalogue, les catégories, les boutiques et la recherche ;
- comparer les produits, gérer des listes de souhaits (wishlists) ;
- proposer un prix au vendeur et discuter en direct (messagerie) ;
- enchérir sur les produits aux enchères ;
- passer commande et payer en Mobile Money / à la livraison ;
- suivre ses commandes via un code de retrait.

### 4.2 Le vendeur (`is_seller`)
Tout ce qu'un acheteur peut faire, **plus** :
- ouvrir une **boutique** (photos, stock, variantes, mise en avant) ;
- publier et gérer des produits, suivre ses commandes ;
- recevoir et répondre aux **offres de prix** (accepter / refuser) ;
- encaisser ses ventes dans un **portefeuille vendeur**, et retirer en Mobile Money
  (seuil de retrait paramétré par l'admin) ;
- gagner en visibilité : stories, boost produit, apparition dans le fil de
  nouveautés.

### 4.3 L'administrateur (`is_admin`)
Back-office complet (`/admin`) : gestion des utilisateurs (CRUD, réinitialisation
de mot de passe avec changement forcé), catégories, produits, **stock audité**,
coupons, commandes, **comptabilité**, rapports, paramètres plateforme (commission,
seuil de retrait), factures.

> La promotion vendeur → admin est réservée à l'admin, via une RPC
> `admin_set_user_role` — jamais une écriture directe sur `profiles` (sécurité
> RLS, voir `README.md §8`).

---

## 5. Parcours utilisateur détaillés

### 5.1 Parcours acheteur

**Découverte (sans compte)**
- Vitrine publique `/` : hero, carousel de mise en avant, 3 piliers
  (Acheter / Négocier / Vendre), catégories, extrait du catalogue.
- Accueil membre `/play` : stories, accroche personnalisée (« Bonjour {prénom} »),
  raccourcis (Enchères, Roue, Parrainage, Portefeuille/Commandes), catégories,
  ventes flash, enchères en cours, « les plus aimés », boutiques à découvrir,
  nouveautés.
- Navigation : barre du haut + **barre du bas fixe** sur mobile (Accueil,
  Recherche, Panier, Compte) ; le reste vit dans un menu drawer.

**Fiche produit** (`/play/product/[id]`)
- Galerie d'images, variantes (prix/stock par variante), vendeur + boutique.
- Historique de prix (`PriceHistory`), questions/réponses (`ProductQna`), avis
  (`reviews` avec note moyenne).
- Bloc enchère si le produit est aux enchères (`AuctionBlock`).
- Actions : ajout panier, proposition de prix, favori, partage.
- Compteur de vues incrémenté côté serveur (`register_product_view`).

**Négociation**
- L'acheteur propose un prix entre **50 % et 100 %** du prix affiché
  (`PillarCard` « Négocier »).
- Le vendeur reçoit l'offre (`/play/offers`, onglet « reçues »), peut accepter ou
  refuser ; discussion possible en messagerie directe.

**Panier & commande**
- Le panier vit dans le navigateur (jamais source de vérité) — il survit à la
  connexion.
- `/play/checkout` : coordonnées (nom, téléphone, ville), méthode de paiement,
  puis passage de commande. La connexion n'y devient obligatoire qu'à cette
  étape (« Plus qu'une étape », panier conservé).
- Méthodes : `orange_money`, `mtn_momo`, `moov_money`, `wave`, `card`,
  `cod` (paiement à la livraison).
- Suivi : code de retrait à 6 chiffres par colis, suivi des commandes
  (`/play/orders`).

**Enchères**
- Produits avec compte à rebours, surenchère minimale et **prolongation
  anti-sniping** (`PillarCard` « Enchères »). Liste sur `/play/auctions`.

### 5.2 Parcours vendeur
- Ouverture de boutique (`/play/sell`) conditionnée au rôle `is_seller`.
- Publication/produit avec images, stock, variantes, prix comparatif (pour
  badge « −X % »), ventes flash (`flash_ends_at`), flag « produit en vedette ».
- Portefeuille (`/play/wallet`) : solde crédité des ventes, retrait Mobile Money.
- Gestion des offres reçues et des commandes.

### 5.3 Couches sociales & gamification
- **Stories** (barre en haut de l'accueil, façon réseau social) + gestionnaire
  côté vendeur.
- **Parrainage** : 100 points pour le filleul, 200 pour le parrain.
- **Points de fidélité** affichés sur la fiche et l'accueil.
- **Roue de la chance** (`/play/spin`) : tirage quotidien (points ou bon d'achat).
- **Listes de souhaits** et **comparaison** de produits.
- **Notifications** (in-app + push FCM) et **messages** vendeur/acheteur
  (Realtime Supabase).

---

## 6. Back-office (`/admin`)

Réservé aux `is_admin`, gardé côté serveur (`src/lib/admin/guard.ts`). Modules :
utilisateurs (CRUD + reset mot de passe), catégories, produits, **stock audité**,
coupons, commandes, **comptabilité**, rapports, paramètres (commission, seuil de
retrait), factures. Graphiques avec palette daltonisme-sûre (`--viz-*`, ordre fixe
des séries).

Les routes `/api/admin/users/*` sont les **seules** à utiliser la clé
`SUPABASE_SERVICE_ROLE` (création/suppression de comptes, reset mot de passe).

---

## 7. Logique métier & sécurité (points clés)

- **Tout l'argent est calculé et validé côté serveur uniquement** (règle non
  négociable, `README.md §1`). Commande, stock, commission, portefeuille,
  enchère, coupon passent par des fonctions `security definer` — jamais par une
  écriture directe du client.
- Le **stock est verrouillé `for update`** dans `place_order` pour éviter la
  survente en achats simultanés.
- `profiles.is_admin` / `is_seller` **interdits en écriture au client** (RLS) ;
  seules les RPC peuvent les changer.
- **Realtime** : `messages`, `notifications`, `product_questions` publiés dans
  `supabase_realtime`.
- **Edge Functions** : `send-notification-email` (SMTP Gmail, magic link),
  `send-push-notification` (FCM, JWT signé), appelées par trigger avec secret
  webhook.

---

## 8. Différenciateurs principaux

1. **La négociation intégrée** (offres de prix + messagerie + enchères) — rare
   dans une marketplace locale.
2. **Mobile Money natif** comme moyen de paiement principal, adapté au marché.
3. **Zéro friction de découverte** : catalogue ouvert sans compte, panier
   persistant.
4. **Dimension sociale/gamifiée** : stories, roue, parrainage, fidélité —
   conçue pour la rétention et le bouche-à-oreille.
5. **Back-office comptable complet** (stock audité, compta, factures) — pensé
   pour une exploitation réelle, pas un prototype.

---

## 9. Surfaces de l'application

| Route | Rôle | Public |
| --- | --- | --- |
| `/` | Vitrine publique (visiteur) | Tous |
| `/play/**` | Application acheteur / vendeur (nav mobile en bas) | Connecté ou visiteur |
| `/admin/**` | Back-office | Admin uniquement |
| `/api/admin/*` | Routes serveur (service_role) | Serveur |

---

## 10. Précisions techniques utiles au produit

- **Stack** : Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4
  · Supabase (Postgres + RLS + Auth + Storage + Realtime + Edge Functions).
- **Backend futur** : Parse Server (VPS) en préparation, non actif — tout passe
  par un adaptateur unique (`src/lib/backend/config.ts`) pour permettre la bascule.
- **Design system** : tokens CSS centralisés (`globals.css`), thème clair/sombre +
  5 palettes de couleur, accessibilité soignée (contrastes WCAG mesurés,
  `prefers-reduced-motion`, anti-flash de thème).
- **i18n** : l'interface est entièrement en français.

---

## 11. Synthèse

DreamTeamShop est une **place de marché locale sociale et négociée**, conçue pour
le marché ivoirien mobile-first. Elle combine le catalogue agrégé d'une marketplace
multi-vendeurs, la négociation directe (offres + enchères) d'une place de
négociation, et les ressorts de rétention d'un réseau social (stories, parrainage,
gamification) — le tout adossé à un paiement Mobile Money et à un back-office
comptable prêt pour la production.
