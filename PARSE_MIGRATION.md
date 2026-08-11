# Migration Supabase → Parse Server

Inventaire exhaustif de ce qui tourne aujourd'hui sur Supabase et de ce que
cela devient sur Parse Server auto-hébergé.

Le point de bascule reste unique : `NEXT_PUBLIC_BACKEND_PROVIDER`
(`supabase` | `parse`) dans `src/lib/backend/config.ts`. Tant que la colonne
« état » n'est pas verte partout, la variable reste sur `supabase`.

---

## 1. Ce qui change de nature (à lire avant tout)

Quatre mécanismes Postgres n'ont **aucun équivalent direct** dans Parse. Ce
sont eux qui portent le risque de la migration, pas les tables.

| Mécanisme Supabase | Ce qu'il garantit | Équivalent Parse |
| --- | --- | --- |
| **RLS** (49 policies) | Le serveur refuse la lecture/écriture, quel que soit le client | **CLP** par classe + **ACL** par objet + `beforeSave`/`beforeFind`. Aucun des trois seul ne suffit. |
| **`security definer` + transaction** | `place_order` décrémente le stock et crée la commande **ou rien** | Cloud Function avec master key. **Parse n'a pas de transaction multi-objets** → il faut `Parse.Object.saveAll` + compensation explicite en cas d'échec. C'est le point dur. |
| **`for update`** (verrou de ligne) | Deux acheteurs simultanés ne peuvent pas vider le même stock | `increment()` atomique côté Mongo/PG + relecture. Un `select … for update` naïvement traduit en `query.first()` **réintroduit la survente**. |
| **Triggers** (12) | Se déclenchent même si l'écriture vient d'ailleurs | `beforeSave`/`afterSave`. Équivalent fonctionnel. |

> **Règle non négociable, déjà appliquée côté Supabase :** aucun calcul
> d'argent (total, remise, frais, commission, solde) ne doit être fait ou
> accepté depuis le client. Le panier vit dans le navigateur ; seul le
> serveur fait foi.

---

## 2. Données — 40 tables → classes Parse

Convention : `snake_case` (Postgres) → `PascalCase` (classe Parse),
clé étrangère → **Pointer**, `uuid` → `objectId`.

### Comptes et boutiques
| Table | Classe Parse | Remarques |
| --- | --- | --- |
| `auth.users` + `profiles` | `_User` | Fusionnés. `profiles.is_admin`/`is_seller` → **rôles Parse** `admin` / `seller`, pas des colonnes booléennes (voir §5). |
| `shops` | `Shop` | Pointer `owner` → `_User`. |
| `addresses` | `Address` | ACL propriétaire. |
| `follows`, `blocks` | `Follow`, `Block` | |
| `referrals` | `Referral` | |

### Catalogue
| Table | Classe Parse |
| --- | --- |
| `categories` | `Category` |
| `products` | `Product` |
| `product_images` | `ProductImage` (ou `Array<Parse.File>` sur `Product`) |
| `product_variants` | `ProductVariant` |
| `product_questions` | `ProductQuestion` |
| `price_history`, `price_alerts` | `PriceHistory`, `PriceAlert` |
| `product_boosts` | `ProductBoost` |
| `stock_movements` | `StockMovement` |
| `recently_viewed`, `favorites` | `RecentlyViewed`, `Favorite` |
| `wishlists`, `wishlist_items` | `Wishlist`, `WishlistItem` |
| `reviews` | `Review` |

### Commerce
| Table | Classe Parse |
| --- | --- |
| `orders`, `order_items`, `order_events` | `Order`, `OrderItem`, `OrderEvent` |
| `order_pickup_codes` | `OrderPickupCode` — **jamais lisible par le client** (CLP vide, lecture par Cloud Function uniquement) |
| `coupons`, `delivery_zones` | `Coupon`, `DeliveryZone` |
| `offers` | `Offer` |
| `auctions`, `bids` | `Auction`, `Bid` |
| `wallets`, `wallet_transactions` | `Wallet`, `WalletTransaction` — **écriture master key exclusivement** |
| `spin_rewards` | `SpinReward` |

### Social et système
| Table | Classe Parse |
| --- | --- |
| `conversations`, `messages` | `Conversation`, `Message` |
| `notifications` | `Notification` |
| `shop_posts`, `shop_stories`, `shop_story_views` | `ShopPost`, `ShopStory`, `ShopStoryView` |
| `reports` | `Report` |
| `platform_settings` | `PlatformSettings` (singleton, lecture publique, écriture admin) |

---

## 3. Logique métier — 44 fonctions Postgres → Cloud Functions

**29 RPC sont appelées directement par l'application** (vérifié par
`grep '.rpc("' src`). Les autres sont des triggers ou des utilitaires internes.

**Les 29 sont maintenant écrites** dans `parse-server/cloud/` (`orders.js`,
`offers.js`, `auctions.js`, `wallet.js`, `referral.js`, `social.js`,
`admin.js`, plus `adminSetUserRole` dans `roles.js`). Chacune passe
`node --check`. **Aucune n'est testée contre un serveur réel** — voir §6.

### Argent et stock — priorité 1, aucune tolérance
| RPC | Cloud Function | Ce qu'elle doit continuer à garantir |
| --- | --- | --- |
| `place_order` | `placeOrder` | Une commande **par boutique** ; prix relu en base (jamais celui du panier) ; stock décrémenté atomiquement ; refus d'acheter ses propres produits ; remise coupon et frais de zone recalculés serveur ; code de retrait à 6 chiffres généré. |
| `advance_order_status` | `advanceOrderStatus` | **La seule machine à états.** Transitions autorisées uniquement ; l'acheteur ne peut qu'annuler, et seulement avant expédition ; l'annulation rend le stock ; la livraison crédite le vendeur, ajoute les points de fidélité et le bonus de parrainage. |
| `confirm_delivery` | `confirmDelivery` | Passe-plat : contrôle l'appartenance, l'état `shipped` et le code de retrait, puis délègue à la machine à états. Le code n'est jamais envoyé au client. |
| `request_withdrawal` | `requestWithdrawal` | Contrôle du solde et du minimum de retrait, gardé par le même garde-fou que le stock (`increment` + `beforeSave` anti-négatif sur `Wallet`). |
| `admin_adjust_stock` | `adminAdjustStock` | Trace un `StockMovement`, motif obligatoire. |
| `redeem_points`, `spin_wheel` | `redeemPoints`, `spinWheel` | Un tirage par jour (vérifié par requête, pas par contrainte unique) ; le gain est décidé **serveur**. |
| `boost_product` | `boostProduct` | Tarif fixe par durée, débité du portefeuille avant activation. |

### Négociation et enchères — priorité 1
| RPC | Cloud Function | Garanties |
| --- | --- | --- |
| `make_offer` | `makeOffer` | Montant entre 50 % et 100 % du prix affiché, 3 offres max par produit et par acheteur. |
| `respond_to_offer` | `respondToOffer` | Seul le vendeur répond ; contre-offre bornée. |
| `create_auction` | `createAuction` | Propriétaire du produit uniquement, une enchère active à la fois. |
| `place_bid` | `placeBid` | Surenchère minimale +5 %, prolongation anti-sniping de 2 minutes, refus après expiration. **Le point le plus exposé aux courses** : deux enchères simultanées — gardé par un `beforeSave` qui compare au montant persisté au moment du save (`request.original`), pas à celui lu en début de requête. Ce n'est pas un verrou de ligne : à vérifier sous charge avant la bascule. |
| `settle_expired_auctions` | `settleExpiredAuctions` | Appelable en Cloud Function **et** planifiée en job (`Parse.Cloud.job`, à programmer depuis le Dashboard) — la version Postgres dépendait du trafic pour se déclencher, ce n'est plus la seule garantie. |

### Parrainage, social — priorité 2, toutes écrites
| RPC | Cloud Function |
| --- | --- |
| `link_referral`, `redeem_referral` | `linkReferral`, `redeemReferral` |
| `referral_leaderboard`, `my_referral_rank` | `referralLeaderboard`, `myReferralRank` — regroupent en mémoire, à revoir en pipeline d'agrégation si le volume grossit |
| `open_conversation`, `mark_conversation_read` | `openConversation`, `markConversationRead` |
| `answer_question`, `active_viewers`, `register_product_view`, `mark_story_viewed` | `answerQuestion`, `activeViewers`, `registerProductView`, `markStoryViewed` |
| `shop_stats` | `shopStats` |

### Back-office — priorité 3, toutes écrites
| RPC | Cloud Function |
| --- | --- |
| `admin_stats`, `admin_revenue_report`, `admin_shop_revenue`, `admin_wallets_overview` | `adminStats`, `adminRevenueReport`, `adminShopRevenue`, `adminWalletsOverview` |
| `admin_update_settings`, `admin_update_profile` | `adminUpdateSettings`, `adminUpdateProfile` |
| `admin_set_user_role` | `adminSetUserRole` (dans `roles.js`) — met aussi en pause les produits actifs d'un vendeur rétrogradé, comme le trigger `on_seller_revoked` |
| `admin_require_password_change`, `clear_password_change_flag` | idem |

> Les rapports agrègent en mémoire (JS) plutôt qu'en SQL. Ça reste correct
> tant que le volume de commandes reste à l'échelle MVP ; au-delà, remplacer
> par l'aggregation pipeline Mongo/PG que Parse expose en master key.

### Triggers → hooks
| Trigger Postgres | Hook Parse |
| --- | --- |
| `on_auth_user_created` (`handle_new_user`) | `Parse.Cloud.afterSave(Parse.User)` — crée le profil, le portefeuille, le code de parrainage. **Attention** : la version Postgres a besoin de `pgcrypto` et son absence cassait toute inscription. |
| `on_shop_created` | `afterSave('Shop')` — donne le rôle `seller`. |
| `before_product_insert` | `beforeSave('Product')` — force le vendeur. |
| `on_favorite_change` | `afterSave`/`afterDelete('Favorite')` — compteur. |
| `on_message_created` | `afterSave('Message')` — met à jour la conversation. |
| `on_notification_created` (`dispatch_notification`) | `afterSave('Notification')` — déclenche e-mail + push. |
| `on_order_created_notify_buyer` | `afterSave('Order')`. |
| `trg_gen_pickup_code` | `beforeSave('Order')`. |
| `trg_track_price_*`, `trg_notify_price_drop` | `afterSave('Product')`. |
| `on_seller_revoked` | `afterSave(Parse.User)` — met les produits en pause. |

---

## 4. Le reste de la plateforme

| Service Supabase | Cible Parse | État |
| --- | --- | --- |
| **Auth** e-mail/mot de passe | `Parse.User.logIn` / `signUp` | Fait (client WIP) |
| **Auth Google** (OAuth PKCE) | `Parse.User.linkWith('google')` — **le flux change**, il faudra refaire `/auth/callback` | À faire |
| **Magic link** usage unique (`generateLink` + `verifyOtp`) | Aucun équivalent natif : jeton à usage unique à implémenter à la main (classe `LoginToken`, TTL, suppression à la première utilisation) | À faire |
| **Session SSR** (cookie) | Cookie httpOnly `parseSessionToken` + `/api/auth/session` | Fait (WIP) |
| **Storage** `product-images`, `shop-images` | `Parse.File` + adaptateur disque ou S3 sur le VPS | À faire — **penser à la migration des fichiers existants** |
| **Realtime** (`messages`, `notifications`, `product_questions`) | **LiveQuery** (serveur WebSocket séparé, à activer explicitement) | À faire |
| **Edge Functions** `send-notification-email` (SMTP Gmail + gabarits) et `send-push-notification` (FCM) | Cloud Functions Node — **plus simple**, `nodemailer` et `firebase-admin` remplacent le denomailer et la signature JWT manuelle en WebCrypto | À faire |
| **Vault / secrets** | Variables d'environnement du VPS + `.env` non versionné | À faire |
| **Webhooks** (`x-webhook-secret`) | Disparaissent : les hooks sont dans le même process | — |

---

## 5. Sécurité — traduction des 49 policies RLS

Trois niveaux, à poser **dans cet ordre** :

1. **CLP** (par classe) — le grillage. Exemple : `Wallet` et
   `WalletTransaction` en lecture/écriture *master key uniquement* ; toute
   opération passe par une Cloud Function.
2. **ACL** (par objet) — le propriétaire. Posée à la création dans
   `beforeSave` : `setReadAccess(owner, true)`, `setWriteAccess(owner, true)`,
   `setRoleReadAccess('admin', true)`.
3. **`beforeSave`** — les règles qu'aucun des deux ne sait exprimer :
   « on ne modifie pas le prix d'un produit déjà commandé »,
   « on n'écrit pas dans une conversation où l'on est bloqué ».

Rôles Parse : `admin`, `seller`. Le rôle remplace `profiles.is_admin` /
`is_seller`. **Ces champs ne doivent jamais être modifiables par le client** —
c'est exactement le bug corrigé côté Supabase (une écriture directe
`update({is_admin})` remplacée par la RPC `admin_set_user_role`). La même
erreur en Parse donne une élévation de privilège.

---

## 6. Ordre de travail

1. **Infrastructure** — Parse Server + Postgres + Dashboard sur le VPS,
   Nginx + TLS, service systemd. → `parse-server/`
2. **Schéma** — classes, Pointers, index, CLP. Migration idempotente.
3. **Sécurité** — rôles, ACL, `beforeSave`.
4. **Argent** — `placeOrder`, `confirmDelivery`, `placeBid`, portefeuille.
   Rien d'autre ne bascule tant que ces quatre-là ne sont pas testés.
5. **Le reste des Cloud Functions**, puis les hooks.
6. **Fichiers et LiveQuery.**
7. **Reprise des données** Supabase → Parse (script d'export/import).
8. **Bascule** `NEXT_PUBLIC_BACKEND_PROVIDER=parse`, Supabase gardé en
   lecture seule quelques jours.

---

## 7. Ce qui est fait à ce jour

- [x] Adaptateur de backend, point de bascule unique
- [x] Client Parse navigateur (surface `auth.*` identique)
- [x] Session SSR par cookie httpOnly
- [x] Garde `/admin` revalidée serveur
- [x] Inventaire complet (ce document)
- [x] Déploiement VPS : `parse-server/` (compose, schéma, Cloud Code)
- [x] Cloud Functions commandes : `placeOrder`, `advanceOrderStatus`,
      `confirmDelivery`
- [x] Cloud Functions offres, enchères, portefeuille, points, parrainage,
      social, back-office — les **29 RPC appelées par l'app sont toutes
      écrites** (`parse-server/cloud/*.js`), syntaxe vérifiée
      (`node --check`), **rien n'est testé contre un serveur réel**
- [x] Rôles (`admin`, `seller`) et CLP par classe
- [ ] ACL par objet à la volée — posées pour Shop/Product/Order/Conversation,
      à vérifier une par une contre les 49 policies RLS d'origine
- [ ] Fichiers (`Parse.File`), LiveQuery, e-mail, push
- [ ] Reprise des données
- [ ] **Tests contre un Parse Server réel** — priorité avant toute bascule :
      écrire des cas pour la survente (achats simultanés), la course
      d'enchères (`beforeSave` sur `Auction`), et la compensation de stock de
      `placeOrder` en cas d'échec à mi-chemin
