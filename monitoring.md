# Services externes — rôle, limites, remplacement

Ce que fait chaque service, ce qui casse s'il tombe, et ce qu'il faut changer
dans le code pour en changer.

Dernière mise à jour : 30 juillet 2026

---

## Vue d'ensemble

| Service | Rôle | Offre | Remplaçable ? | Effort de migration |
| --- | --- | --- | --- | --- |
| **Supabase** | Base, auth, stockage, fonctions | Gratuite | Difficilement | Élevé — préparé pour Parse |
| **Vercel** | Hébergement | Hobby | Oui | Faible |
| **Gmail SMTP** | E-mails | Gratuite | Oui | **Très faible** |
| **Firebase FCM** | Push | Gratuite | Peu | Moyen |
| **Google OAuth** | Connexion Google | Gratuite | Oui | Faible |

---

## 1. Supabase

**Rôle** — PostgreSQL, authentification, stockage d'images, Edge Functions,
temps réel. C'est le cœur : tout en dépend.

### Limites de l'offre gratuite

| Ressource | Plafond | Conséquence au dépassement |
| --- | --- | --- |
| Base de données | 500 Mo | Écritures bloquées |
| Stockage fichiers | 1 Go | Envois d'images refusés |
| Bande passante | 5 Go/mois | Ralentissements |
| Utilisateurs actifs | 50 000/mois | Facturation |
| **Mise en veille** | **7 jours sans requête** | **Projet suspendu** |
| Edge Functions | 500 000 appels/mois | Appels rejetés |

> ⚠️ **La mise en veille est le vrai risque en phase de démonstration.** Un
> projet sans aucune requête pendant 7 jours est suspendu et doit être
> réactivé à la main depuis le tableau de bord. Avant une démonstration
> client, ouvrir le site la veille.

### Surveiller

Tableau de bord → **Reports** : taille de base, bande passante, requêtes.
**Logs** → Edge Functions pour les échecs d'envoi.

### En changer

Le projet a une **couche d'adaptation** : `src/lib/backend/`. Toutes les
pages importent `@/lib/backend/client` ou `/server`, jamais le SDK
directement. Le basculement se pilote par `NEXT_PUBLIC_BACKEND_PROVIDER`.

Une implémentation Parse Server est amorcée dans `backend-parse-wip/`
(client, session SSR, garde admin). Restent à faire : schéma, ~25 Cloud
Functions reprenant les RPC, ACL/CLP en remplacement des RLS, stockage,
LiveQuery. **Chantier lourd** : la logique métier (commandes, stock,
commission, enchères) vit dans les fonctions PostgreSQL.

---

## 2. Vercel

**Rôle** — Hébergement du site Next.js, HTTPS, CDN, déploiement à chaque
poussée git.

### Limites (Hobby)

| Ressource | Plafond |
| --- | --- |
| Bande passante | 100 Go/mois |
| Durée d'exécution | 10 s par requête serveur |
| Compilations | 100/jour |
| Usage commercial | **interdit sur l'offre Hobby** |

> ⚠️ **L'offre Hobby interdit l'usage commercial.** Dès que la marketplace
> encaisse de l'argent, l'offre Pro (20 $/mois) devient obligatoire.

### En changer

Faible effort : Netlify, Cloudflare Pages ou un VPS acceptent Next.js.
À reporter : les variables d'environnement, et la Site URL côté Supabase.
Aucun code à modifier.

---

## 3. Gmail SMTP

**Rôle** — Envoi des e-mails de notification (commande, offre, enchère,
message, baisse de prix).

Utilisé par `supabase/functions/send-notification-email/`.

### Limites

| Point | Valeur |
| --- | --- |
| Envois | **500 destinataires/jour** |
| Expéditeur affiché | **Toujours l'adresse Gmail**, quel que soit `SMTP_FROM` |
| Authentification | Pas de SPF/DKIM sur votre domaine |
| Statistiques | Aucune (ni ouverture, ni échec détaillé) |

> ⚠️ **Gmail réécrit l'expéditeur.** Vos clients verront l'adresse Gmail du
> compte, pas une adresse du type `no-reply@votre-domaine`. C'est une limite
> du service, pas de la configuration.

### Quand changer

- plus de ~50 commandes/jour (chaque commande envoie 2 e-mails) ;
- dès l'acquisition d'un nom de domaine ;
- si les messages arrivent en indésirables.

### En changer — le cas le plus simple du projet

**Aucun code à modifier.** La fonction parle SMTP standard. Il suffit de
remplacer les secrets :

```powershell
# Brevo — 300 e-mails/jour gratuits, avec votre domaine
npx supabase secrets set SMTP_HOST=smtp-relay.brevo.com
npx supabase secrets set SMTP_PORT=587
npx supabase secrets set SMTP_USER=<identifiant Brevo>
npx supabase secrets set SMTP_PASSWORD=<clé SMTP Brevo>
npx supabase secrets set SMTP_FROM="DreamTeamShop <no-reply@votre-domaine>"
```

Le code lit `SMTP_PORT` pour choisir le mode de chiffrement : 465 chiffre dès
la connexion, 587 utilise STARTTLS. Rien d'autre à toucher.

| Service | Gratuit | Domaine propre |
| --- | --- | --- |
| Gmail | 500/jour | ❌ |
| Brevo | 300/jour | ✅ |
| Resend | 3 000/mois | ✅ |
| Mailgun | 100/jour | ✅ |

---

## 4. Firebase Cloud Messaging

**Rôle** — Notifications push navigateur.

Utilisé par `public/firebase-messaging-sw.js`, `src/lib/push.ts` et
`supabase/functions/send-push-notification/`.

### Limites

Aucun quota pratique, service gratuit. La contrainte est ailleurs :

> ⚠️ **Le push ne fonctionne pas sur iPhone en navigation normale.** Depuis
> iOS 16.4, l'utilisateur doit ajouter le site à son écran d'accueil, puis
> accepter. En pratique, très peu le font.
>
> Sur un marché majoritairement iPhone, l'e-mail et WhatsApp (déjà branché
> sur les commandes) touchent bien plus de monde.

Deuxième contrainte : un refus d'autorisation est **définitif**, le
navigateur ne repose plus la question. D'où la demande déclenchée par un clic
explicite, jamais au chargement.

### Surveiller

Console Firebase → **Cloud Messaging** : envois et taux de réception.
Les jetons devenus invalides sont effacés automatiquement.

### En changer

Effort moyen. Le web push standard (VAPID + `web-push`) éviterait Firebase,
mais imposerait de gérer soi-même l'expiration des abonnements. À reconsidérer
seulement si une application mobile native entre en jeu.

À modifier : `firebase-messaging-sw.js`, `src/lib/push.ts`, la fonction
`send-push-notification`. La colonne `profiles.fcm_token` resterait valable.

---

## 5. Google OAuth

**Rôle** — Bouton « Continuer avec Google » à la connexion et à l'inscription.

### Limites

Aucun quota. Un point de vigilance :

> ⚠️ Tant que l'écran de consentement est en mode **Test**, seuls les
> comptes ajoutés à la liste des testeurs peuvent se connecter. Passer en
> **Production** avant l'ouverture au public.

### En changer

Faible effort : Supabase gère Facebook, Apple, GitHub de la même façon. Le
composant `GoogleButton` ne changerait que de `provider`.

---

## Que se passe-t-il si un service tombe

| Panne | Effet | Le site reste-t-il utilisable ? |
| --- | --- | --- |
| Supabase | Tout est bloqué | ❌ Non |
| Vercel | Site inaccessible | ❌ Non |
| Gmail SMTP | Pas d'e-mail | ✅ Oui — notifications visibles dans l'app |
| Firebase | Pas de push | ✅ Oui — idem |
| Google OAuth | Bouton Google en échec | ✅ Oui — connexion par e-mail |

Les envois sont **asynchrones** (`net.http_post`) : une commande n'attend
jamais un e-mail. Un service d'envoi en panne ne bloque aucune vente.

La table `notifications` reste l'unique source de vérité : e-mail et push
n'en sont que des rediffusions. L'historique reste complet dans
`/play/notifications` même si tous les envois échouent.

---

## Coût à la croissance

| Étape | Services | Coût mensuel |
| --- | --- | --- |
| Démonstration | Tout en gratuit | 0 € |
| Lancement | Vercel Pro (obligatoire dès le commercial) | ~20 € |
| Croissance | + Supabase Pro (25 $) + envoi e-mail | ~50 € |

---

## Ajouter un service

À faire à chaque fois :

1. Ajouter une rubrique **ici** : rôle, limites, remplacement, impact code
2. Ajouter la procédure dans `guide_secrets.md`
3. Ajouter les valeurs dans `all_secrets.md` (exclu du dépôt)
4. Ajouter les variables **sans valeur** dans `.env.example`
5. Compléter le tableau « si un service tombe »

---

## Historique

| Date | Modification |
| --- | --- |
| 2026-07-30 | Création. Supabase, Vercel, Gmail SMTP, Firebase, Google OAuth. |
