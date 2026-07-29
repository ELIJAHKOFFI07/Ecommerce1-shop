# Notifications — e-mails et push

Trois canaux, une seule source de vérité.

La table `notifications` est écrite par les fonctions serveur (commande,
offre, enchère, message, baisse de prix). Tout part de là :

| Canal | État | Ce qu'il reste à configurer |
| --- | --- | --- |
| **Dans l'application** (`/play/notifications`) | ✅ fonctionne | rien |
| **E-mail** | code fourni, à déployer | compte Resend + webhook |
| **Push** | à mettre en place | projet Firebase |

Conséquence utile : l'historique reste complet dans l'application même si un
e-mail n'est pas délivré, et le contenu affiché est exactement celui envoyé.

---

## 1. E-mails

Supabase **n'envoie pas** d'e-mails applicatifs : son service d'e-mail sert
uniquement à l'authentification (confirmation d'inscription, mot de passe
oublié). Il faut donc un prestataire d'envoi.

Recommandation : **Resend** — offre gratuite de 3 000 e-mails/mois, mise en
route en quelques minutes.

### Étape 1 — Compte Resend

1. Créer un compte sur https://resend.com
2. **Domains** → ajouter votre domaine et créer les enregistrements DNS
   proposés (SPF + DKIM)
   > Sans domaine vérifié, seuls les envois vers votre propre adresse
   > fonctionnent. C'est suffisant pour tester, pas pour la production.
3. **API Keys** → créer une clé (`re_...`)

### Étape 2 — Déployer la fonction

Le code est déjà écrit : `supabase/functions/send-notification-email/index.ts`

```bash
npx supabase login
npx supabase link --project-ref pwkcwtgbngkcxgduhopy

npx supabase secrets set RESEND_API_KEY=re_xxxxxxxx
npx supabase secrets set NOTIFY_FROM="ElijahShop <no-reply@votre-domaine.com>"
npx supabase secrets set APP_URL=https://votre-domaine.vercel.app

npx supabase functions deploy send-notification-email --no-verify-jwt
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont injectés automatiquement
dans les Edge Functions — ne les définissez pas à la main.

### Étape 3 — Brancher le webhook

Supabase → **Database → Webhooks → Create a new hook**

| Champ | Valeur |
| --- | --- |
| Name | `notification_email` |
| Table | `public.notifications` |
| Events | `Insert` uniquement |
| Type | `Supabase Edge Functions` |
| Edge Function | `send-notification-email` |

À partir de là, chaque notification créée déclenche un e-mail.

### Ce que reçoit déjà chaque partie

| Événement | Acheteur | Vendeur |
| --- | --- | --- |
| Commande passée | « Commande prise en compte » | « Nouvelle commande » |
| Changement de statut | ✅ | ✅ |
| Offre reçue / réponse | ✅ | ✅ |
| Surenchère, fin d'enchère | ✅ | ✅ |
| Nouveau message | ✅ | ✅ |
| Baisse de prix suivie | ✅ | — |

> La notification acheteur à la commande est posée par le trigger
> `on_order_created_notify_buyer` (migration 007). Elle n'existait pas avant :
> seul le vendeur était prévenu.

---

## 2. Notifications push — oui, Firebase

**Réponse courte : oui, Firebase Cloud Messaging (FCM).** C'est le standard,
c'est gratuit et sans quota pratique, et c'est le seul moyen d'atteindre à la
fois le web et une future application mobile avec le même code serveur.

Le schéma le prévoyait déjà : `profiles.fcm_token` existe depuis le départ.

### Limite à connaître avant de s'engager

Le push web ne fonctionne **pas** sur iPhone via un navigateur classique.
Depuis iOS 16.4, il faut que l'utilisateur ajoute le site à son écran
d'accueil (PWA) et accepte la demande. Sur Android et sur ordinateur, cela
fonctionne normalement.

Si la cible est majoritairement mobile ivoirienne sur iPhone, WhatsApp (déjà
branché sur les commandes) et l'e-mail couvriront mieux le besoin.

### Ce qu'il faut configurer

1. **Projet Firebase** — https://console.firebase.google.com
   - Créer un projet
   - **Paramètres du projet → Général → Vos applications → Web** : récupérer
     l'objet `firebaseConfig`
   - **Cloud Messaging → Web Push certificates** : générer une paire de clés,
     récupérer la **clé VAPID**
   - **Comptes de service** : générer une clé privée (fichier JSON) — elle
     servira à l'envoi côté serveur

2. **Variables d'environnement Vercel** (publiques, côté navigateur)

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=
   ```

3. **Secret Supabase** (privé, côté serveur)

   ```bash
   npx supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"
   ```

   ⚠️ Ce fichier JSON ne doit jamais être commité ni préfixé `NEXT_PUBLIC_`.

4. **Service worker** — fichier `public/firebase-messaging-sw.js` à créer, qui
   reçoit les messages quand l'onglet est fermé. Il doit être servi à la
   racine du domaine (Vercel le fait automatiquement depuis `public/`).

5. **Côté application** — demander l'autorisation, récupérer le jeton et
   l'enregistrer dans `profiles.fcm_token` (la colonne est déjà accessible en
   écriture au client).

6. **Côté serveur** — une seconde Edge Function, branchée sur le même webhook
   `notifications`, qui lit `fcm_token` du destinataire et appelle l'API FCM
   HTTP v1.

### Ce que je n'ai pas fait, et pourquoi

Je n'ai **pas** implémenté le push : il exige un projet Firebase existant
(clés, VAPID, compte de service) que je ne peux ni créer ni tester d'ici, et
du code non testable à l'aveugle — un service worker mal configuré casse
silencieusement.

Créez le projet Firebase et donnez-moi les clés publiques : je branche le
reste (service worker, enregistrement du jeton, Edge Function d'envoi).

---

## 3. Ordre de mise en place conseillé

1. **Vérifier l'existant** — passer une commande avec deux comptes et voir la
   notification arriver en direct des deux côtés. Aucune configuration
   requise, c'est déjà fonctionnel.
2. **Ajouter l'e-mail** — Resend, environ 30 minutes.
3. **Le push en dernier** — plus lourd, et à ne faire que si la cible n'est
   pas majoritairement sur iPhone.
