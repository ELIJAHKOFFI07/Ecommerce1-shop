# Guide — obtenir chaque secret

Comment créer chaque compte et récupérer chaque valeur, étape par étape.

**Ce fichier ne contient aucune valeur réelle** : il est versionné. Les
valeurs vivent dans `all_secrets.md`, exclu du dépôt.

> ## Règles à ne jamais enfreindre
>
> 1. **Aucune valeur réelle dans un fichier suivi par git** — y compris dans
>    un exemple de commande. Un secret commité doit être considéré comme
>    compromis même après suppression : il reste dans l'historique.
> 2. **`NEXT_PUBLIC_` signifie public.** Ce préfixe indique à Next.js
>    d'injecter la valeur dans le code envoyé au navigateur. Ne jamais
>    l'utiliser pour une clé secrète.
> 3. **Un secret partagé oralement ou par messagerie est compromis.** Le faire
>    tourner coûte deux minutes ; une fuite peut coûter la base entière.
> 4. **Après toute rotation**, mettre à jour les trois endroits :
>    `.env.local`, Vercel (puis redéployer), et `all_secrets.md`.

---

## 1. Supabase — base de données, authentification, stockage

### Créer le projet

1. https://supabase.com → **Start your project**
2. **New project** : nom, mot de passe de base (à conserver), région
   — choisir la plus proche de vos utilisateurs (Europe pour l'Afrique de
   l'Ouest, la latence passe par l'Europe)
3. Attendre la fin de l'initialisation (~2 min)

### Récupérer les clés

**Project Settings → API**

| Écran | Variable |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

La clé `anon` est **conçue pour être publique** : la sécurité repose sur les
politiques RLS, pas sur son secret.

La clé `service_role` **contourne toutes les RLS**. Elle n'est utilisée que
par les routes serveur `/api/admin/*`, pour agir sur `auth.users` (créer,
supprimer un compte, réinitialiser un mot de passe) — opérations impossibles
avec la clé `anon`.

### Appliquer le schéma

**SQL Editor → New query** → coller tout `supabase/SETUP_COMPLET.sql` → Run.

Vérification : `select count(*) from information_schema.tables where
table_schema = 'public';` doit renvoyer 42.

### Créer le premier administrateur

Aucune interface ne le permet : seul un admin peut en promouvoir un autre.
Après inscription dans l'application :

```sql
update profiles set is_admin = true where username = '<votre-pseudo>';
```

Ensuite, tout se gère depuis `/admin/users`.

### Configurer les URL de redirection

**Authentication → URL Configuration**

- **Site URL** : votre URL de production
- **Redirect URLs** : `https://<votre-domaine>/**` et
  `http://localhost:3000/**`

Sans cela, la connexion Google renvoie vers `localhost` depuis la production :
Supabase n'honore l'adresse de redirection que si elle figure dans cette
liste, sinon il retombe sur la Site URL.

---

## 2. Google OAuth — connexion avec Google

1. https://console.cloud.google.com → créer ou choisir un projet
2. **API et services → Écran de consentement OAuth** : type *Externe*,
   renseigner nom, e-mail de contact et domaine
3. **Identifiants → Créer → ID client OAuth** → type *Application Web*
4. **URI de redirection autorisés** :
   `https://<ref-projet>.supabase.co/auth/v1/callback`
5. Copier *Client ID* et *Client Secret*
6. Supabase → **Authentication → Providers → Google** : activer et coller

Rien à mettre dans `.env.local` : Supabase gère l'échange.

---

## 3. Gmail SMTP — envoi des e-mails

### Pourquoi un mot de passe d'application

Google **ne propose ni CLI ni clé d'API** pour SMTP. Le seul mécanisme est un
mot de passe d'application : 16 caractères, limités à SMTP, révocables sans
toucher au compte.

⚠️ Le mot de passe du compte Google est **refusé depuis 2022** pour SMTP.

### Étapes

1. **Validation en deux étapes** — https://myaccount.google.com/security
   → l'activer. Sans elle, l'option suivante n'apparaît pas.
2. **Mot de passe d'application** — https://myaccount.google.com/apppasswords
   → nom `DreamTeamShop` → **Créer**
3. Google affiche 16 caractères en 4 groupes. **C'est le seul moment où ils
   sont visibles** : les copier immédiatement.

### Poser les secrets

```powershell
npx supabase login
npx supabase link --project-ref <ref-projet>

npx supabase secrets set SMTP_HOST=smtp.gmail.com
npx supabase secrets set SMTP_PORT=465
npx supabase secrets set SMTP_USER=<adresse@gmail.com>
npx supabase secrets set SMTP_PASSWORD="<mot de passe d'application>"
npx supabase secrets set SMTP_FROM="DreamTeamShop <adresse@gmail.com>"
npx supabase secrets set APP_URL=<URL de production>
```

---

## 4. Firebase Cloud Messaging — notifications push

### Créer le projet

1. https://console.firebase.google.com → **Ajouter un projet**
2. Analytics facultatif

### Application web

**Paramètres du projet → Général → Vos applications → `</>`**

Ne pas cocher Firebase Hosting. Récupérer dans `firebaseConfig` :
`apiKey`, `projectId`, `messagingSenderId`, `appId`.

### Clé VAPID

**Paramètres → Cloud Messaging → Certificats push Web → Générer une paire**

### Compte de service

**Paramètres → Comptes de service → Générer une nouvelle clé privée**

Un fichier `.json` se télécharge. ⚠️ **C'est un secret** : il permet
d'envoyer une notification à n'importe quel utilisateur. Il est déjà exclu
du dépôt (`.gitignore` : `*firebase-adminsdk*.json`).

### Poser les secrets

Les cinq valeurs publiques vont dans `.env.local` **et** Vercel.

Le compte de service va côté Supabase. En PowerShell, `cat` renvoie un
tableau de lignes : `"$(cat fichier.json)"` casse la commande. Deux voies :

- **Tableau de bord** (le plus simple) : Supabase → Edge Functions → Secrets
  → *Add new secret* → nom `FIREBASE_SERVICE_ACCOUNT`, valeur = tout le
  contenu du fichier
- **Ligne de commande** : mettre le JSON réduit à une ligne dans un fichier
  `NOM='<json>'`, puis `npx supabase secrets set --env-file <chemin>`

### Service worker

Les cinq valeurs publiques sont aussi **écrites en dur** dans
`public/firebase-messaging-sw.js` : un service worker n'a pas accès aux
variables d'environnement. Les modifier impose de modifier ce fichier.

---

## 5. Déclencheurs internes — secret partagé

Les Edge Functions sont déployées avec `--no-verify-jwt`, donc joignables
publiquement. Sans contrôle, un tiers pourrait déclencher un e-mail ou une
notification vers l'utilisateur de son choix. Un secret partagé le bloque.

Générer une chaîne aléatoire :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Côté base (SQL Editor) :

```sql
select vault.create_secret('<la chaîne>', 'webhook_secret', 'Secret partagé');
select vault.create_secret(
  'https://<ref-projet>.supabase.co/functions/v1',
  'functions_base_url', 'Base des Edge Functions'
);
```

Côté fonctions :

```powershell
npx supabase secrets set WEBHOOK_SECRET=<la même chaîne>
```

La valeur doit être **identique des deux côtés**, sinon tout envoi est rejeté
par 401.

---

## 6. Vercel — hébergement

1. https://vercel.com/new → importer le dépôt
2. Preset Next.js détecté, ne rien changer
3. **Settings → Environment Variables** : ajouter toutes les variables pour
   les trois environnements (Production, Preview, Development)
4. Marquer *Sensitive* les valeurs secrètes si l'option est proposée
5. **Deploy**

Les variables ne transitent **jamais** par git : `.env.local` est exclu du
dépôt et Vercel ne le lit pas.

⚠️ Les `NEXT_PUBLIC_*` sont figées à la compilation : après toute
modification, **redéployer** (Deployments → ⋯ → Redeploy).

---

## Ajouter un nouveau service

À faire à chaque fois, sans exception :

1. Ajouter la procédure d'obtention **ici**
2. Ajouter les valeurs dans `all_secrets.md` (exclu du dépôt)
3. Ajouter le service dans `monitoring.md` : rôle, limites, impact d'un
   changement
4. Ajouter les variables **sans valeur** dans `.env.example`
5. Si un fichier de secret est déposé dans le projet, l'ajouter au
   `.gitignore` **avant** de le créer
