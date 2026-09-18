# Sécurité — ce qui est en place et pourquoi

Approche *secure by design* : chaque mesure ci-dessous est dans le code,
pas dans une liste de bonnes intentions. Les tests de
`tests/security/` vérifient les plus importantes.

## Authentification

| Menace | Mesure | Où |
|---|---|---|
| Mot de passe lisible en base | bcrypt coût 12, jamais stocké en clair | `lib/password.ts` |
| Énumération des comptes par le temps de réponse | comparaison contre un hash factice quand le compte n'existe pas | `verifyPassword` |
| Énumération par les messages | « e-mail ou mot de passe incorrect », réponse identique à *mot de passe oublié* | `lib/auth.ts`, `api/auth/forgot-password` |
| Force brute sur un compte | verrouillage progressif 5 → 15 min, 10 → 1 h, 15 → 24 h | `lib/auth.ts` |
| Force brute distribuée | limitation de débit par IP **et** par e-mail, persistée en base (Vercel est sans état) | `lib/rateLimit.ts` |
| Mots de passe faibles | 10 caractères min., lettres + chiffres, liste des plus courants refusée | `validatePasswordPolicy` |
| Lien de réinitialisation forgé depuis la base | jeton stocké **haché** (sha256), usage unique, 30 min, un seul actif | `api/auth/*` |
| Compte bloqué gardant sa session | JWT resynchronisé avec la base toutes les 5 min | callback `jwt` |
| Vol de cookie | HttpOnly, Secure, SameSite=Lax, 12 h, préfixe `__Secure-` | `lib/auth.config.ts` |
| Compte Google usurpant un compte mot de passe | Google ne se lie qu'à un compte existant avec le même e-mail vérifié ; sinon crée un compte CLIENT | callback `signIn` |
| Mot de passe temporaire visible par l'admin | envoyé par e-mail à l'utilisateur, jamais renvoyé à l'écran | `api/admin/users/[id]/reset-password` |

## Autorisation

| Menace | Mesure |
|---|---|
| Accès aux données d'autrui (IDOR) | chaque lecture est filtrée par `userId` ; une ressource d'autrui renvoie **404**, pas 403 |
| Élévation de privilèges | rôle modifiable par le SUPER_ADMIN seul ; personne ne change son propre rôle ni ne se bloque ; un admin ne touche pas aux comptes staff |
| Permissions trop larges | permissions fines par module (voir / modifier), attribuées par le SUPER_ADMIN seul |
| Paiement marqué reçu sans contrôle | permission `orders:edit` seulement ; référence et auteur journalisés |
| Proxy contourné | le proxy n'est qu'un confort ; chaque route et chaque page revérifient |

## Entrées et injections

| Menace | Mesure |
|---|---|
| Injection SQL | Prisma paramètre tout ; les rares `$queryRaw` utilisent des paramètres liés |
| Assignation de masse | tout corps passe par un schéma zod ; les champs non listés sont **rejetés** (un client ne peut pas envoyer `role`, un panier ne peut pas envoyer `unitPrice` ni `shippingFee`) |
| Falsification de prix | les montants d'une commande (prix, frais de port, seuil de gratuité) sont **recalculés** depuis le catalogue et les paramètres ; le client n'envoie que des identifiants, des quantités et une adresse |
| XSS | React échappe ; les e-mails HTML passent par `escapeHtml` ; CSP sans `unsafe-eval`, `object-src 'none'` |
| Fichier malveillant | type détecté par **signature binaire**, pas par extension ; SVG avec script refusé ; nom régénéré ; taille plafonnée |
| Corps géant / JSON malformé | 256 Ko max, 413 ; JSON invalide → 400 |
| Identifiants mal formés | UUID validé avant toute requête |

## Concurrence et intégrité du stock

| Menace | Mesure |
|---|---|
| Deux commandes qui vident le même stock | `SELECT … FOR UPDATE` sur chaque produit pendant la confirmation |
| Double confirmation d'une commande | verrou sur la commande ; transitions d'état explicites (PENDING → CONFIRMED → SHIPPED → DELIVERED, annulation restituant le stock) |
| Stock incohérent avec l'historique | **tout** mouvement passe par `stock.move()` qui écrit la ligne StockMovement |
| Numéro de commande dupliqué | `pg_advisory_xact_lock` pendant la génération |

## Fuites d'information

| Menace | Mesure |
|---|---|
| Pile d'appels / chaîne de connexion dans une erreur | `withApi` : 500 générique, détail en console serveur seulement |
| Commande d'autrui devinée | UUID + filtre `userId` ; 404 |
| Secrets dans le dépôt | `.env*`, `all_secrets.md`, `*firebase-adminsdk*.json` ignorés ; `env.ts` valide au démarrage |
| Indexation par les moteurs | `robots: noindex` |

## Traçabilité

Journal d'audit (`AuditLog`) sur : connexion, échec, verrouillage,
inscription, réinitialisation, changement de rôle / blocage /
permissions, suppression de compte, création / statut / paiement /
suppression de commande, produits, mouvements de stock, paramètres,
envois de fichiers. Chaque entrée porte l'auteur, la cible,
l'IP et le navigateur. Lecture : `/admin/journal` (SUPER_ADMIN).

## Ce qui reste à votre charge

- **Secrets déjà exposés** : le mot de passe de la base `dreamteamshop`,
  la clé privée ImageKit, le secret Google et la clé 21st.dev ont transité
  en clair dans une conversation. Régénérez-les (voir docs/VPS.md §3, docs/SERVICES.md §2).
- **Postgres ouvert sur internet** : c'est la conséquence du choix
  Vercel + VPS. docs/VPS.md limite la surface (TLS, un seul utilisateur,
  fail2ban) mais un mot de passe faible resterait fatal.
- **Mises à jour** : `npm audit` régulièrement ; Postgres et le VPS à jour.
- **Sauvegardes** : docs/VPS.md §7.

## Lancer les tests

```bash
npm run test:security     # unitaires, +6 d'intégration si DATABASE_URL joignable
```
