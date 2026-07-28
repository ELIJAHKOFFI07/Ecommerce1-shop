# Déploiement sur Vercel

Guide pas à pas pour mettre ElijahShop en ligne. Backend actif : **Supabase**.

---

## 1. Prérequis

- Un compte **GitHub** (ou GitLab/Bitbucket)
- Un compte **Vercel** (l'offre gratuite Hobby suffit pour tester)
- Un projet **Supabase** existant, avec le schéma déjà appliqué
  (tables, RLS, fonctions RPC)

### ⚠️ Appliquer (ou ré-appliquer) le schéma SQL — obligatoire

Les migrations contenaient une erreur de syntaxe (`language sql stability stable`,
mot-clé inexistant en PostgreSQL) qui faisait **échouer en entier** les
migrations `001`, `002` et `004`. Elle est corrigée, mais si le schéma avait
déjà été appliqué avant, ces trois fichiers n'avaient rien créé.

Conséquence : sans ré-application, il manque les enchères, la roue, les
stories, les listes de souhaits, `platform_settings`, `stock_movements` et
toute la comptabilité admin.

Dans **Supabase → SQL Editor**, exécuter dans cet ordre :

1. `supabase/schema.sql`
2. `supabase/migrations/001_growth_features.sql`
3. `supabase/migrations/002_growth_features_2.sql`
4. `supabase/migrations/003_growth_features_3.sql`
5. `supabase/migrations/004_admin_backoffice.sql`
6. `supabase/seed.sql` (catégories / zones / coupons de démo)

Les scripts sont idempotents (`create table if not exists`,
`create or replace function`) : les relancer ne détruit aucune donnée.

Pour créer un compte administrateur, après s'être inscrit dans l'app :

```sql
update profiles set is_admin = true where id = '<uuid-du-compte>';
```

### Clés d'API

Récupérer les deux clés dans Supabase :
**Project Settings → Data API**

| Clé Supabase | Variable Vercel |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> ⚠️ Ne **jamais** mettre la clé `service_role` dans une variable préfixée
> `NEXT_PUBLIC_` : elle serait exposée dans le navigateur et donnerait un accès
> total à la base. Le projet n'en a pas besoin.

---

## 2. Pousser le code sur GitHub

```bash
git add -A
git commit -m "Preparation deploiement Vercel"
git remote add origin https://github.com/<compte>/<depot>.git
git branch -M main
git push -u origin main
```

Vérifier que `.env.local` **n'est pas** poussé (il est déjà dans `.gitignore`).

---

## 3. Importer le projet dans Vercel

1. https://vercel.com/new
2. **Import Git Repository** → sélectionner le dépôt
3. Vercel détecte Next.js automatiquement — ne rien changer :
   - Framework Preset : `Next.js`
   - Build Command : `next build` (défaut)
   - Output Directory : (défaut)
   - Install Command : `npm install` (défaut)
4. **Ne pas déployer tout de suite** : ouvrir d'abord *Environment Variables*
   (étape 4).

---

## 4. Variables d'environnement

Dans Vercel → **Settings → Environment Variables**, ajouter pour les trois
environnements (**Production**, **Preview**, **Development**) :

| Nom | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |
| `NEXT_PUBLIC_BACKEND_PROVIDER` | `supabase` |

Puis lancer **Deploy**.

> Les variables `NEXT_PUBLIC_*` sont figées **au moment du build**. Après toute
> modification d'une de ces variables, il faut **redéployer**
> (Deployments → ⋯ → Redeploy) pour qu'elle soit prise en compte.

---

## 5. Configurer Supabase pour le domaine Vercel

Une fois l'URL de production connue (ex. `https://elijahshop.vercel.app`) :

**Supabase → Authentication → URL Configuration**

- **Site URL** : `https://elijahshop.vercel.app`
- **Redirect URLs** — ajouter :
  - `https://elijahshop.vercel.app/**`
  - `http://localhost:3000/**` (pour continuer à développer en local)

Sans cela, la connexion Google et les liens de confirmation d'e-mail
renverront une erreur de redirection.

### Connexion Google (optionnel)

Si le bouton « Continuer avec Google » doit fonctionner :

1. **Google Cloud Console** → créer un OAuth 2.0 Client ID (type *Web*)
   - Authorized redirect URI :
     `https://<projet>.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Providers → Google** : activer, coller
   *Client ID* et *Client Secret*

Après connexion, l'utilisateur est redirigé vers `/play/account`.

---

## 6. Vérification après déploiement

Checklist à faire tester au client :

- [ ] La vitrine `/` s'affiche (design or/noir, animations)
- [ ] `/play` liste les produits
- [ ] Création de compte sur `/play/register`
- [ ] Connexion / déconnexion sur `/play/login` et `/play/account`
- [ ] Ajout au panier puis commande sur `/play/checkout`
- [ ] La commande apparaît dans `/play/orders`
- [ ] Un compte **non-admin** qui ouvre `/admin` est bien redirigé vers `/play`
- [ ] Un compte **admin** (`profiles.is_admin = true`) accède au back-office
- [ ] Roue de la chance `/play/spin`, enchères `/play/auctions`,
      parrainage `/play/referral`

Fonctionnalités ajoutées (à tester avec **deux comptes** : un acheteur et un
vendeur) :

- [ ] **Notifications** `/play/notifications` — passer une commande avec le
      compte acheteur, la notification doit apparaître **en direct** chez le
      vendeur (Realtime, sans rafraîchir)
- [ ] **Messagerie** `/play/messages` — « Contacter le vendeur » sur une fiche
      produit, puis échanger : les messages arrivent en direct des deux côtés
- [ ] **Offres** `/play/offers` — « Proposer un prix » sur une fiche produit
      (entre 50 % et 100 % du prix, 3 maximum), puis accepter / refuser /
      contre-offrer côté vendeur
- [ ] **Portefeuille** `/play/wallet` — après une commande passée en
      « livrée », le vendeur voit la vente créditée (commission déduite) ;
      tester une demande de retrait sous le minimum → doit être refusée
- [ ] **Stats boutique** `/play/sell` — les 4 tuiles en haut affichent des
      chiffres cohérents
- [ ] **Code parrain** `/play/referral` — un compte non parrainé peut saisir
      le code d'un autre compte

Si `/play` affiche l'écran « configuration » au lieu du contenu : les
variables d'environnement sont absentes ou le redéploiement n'a pas eu lieu.

---

## 7. Domaine personnalisé (optionnel)

Vercel → **Settings → Domains** → ajouter le domaine, puis créer chez le
registrar l'enregistrement DNS indiqué par Vercel. Le certificat TLS est
automatique.

⚠️ Après ajout d'un domaine, **remettre à jour la Site URL et les Redirect
URLs dans Supabase** (étape 5) avec le nouveau domaine.

---

## 8. Plus tard : bascule vers Parse Server

Quand le VPS du client sera prêt et l'implémentation Parse terminée
(voir `backend-parse-wip/README.md`), le basculement côté Vercel se limitera à :

1. Ajouter `NEXT_PUBLIC_PARSE_APP_ID`, `NEXT_PUBLIC_PARSE_JS_KEY`,
   `NEXT_PUBLIC_PARSE_SERVER_URL` et `PARSE_MASTER_KEY`
2. Passer `NEXT_PUBLIC_BACKEND_PROVIDER` à `parse`
3. Redéployer

Aucune page n'est à modifier : elles passent toutes par `src/lib/backend/`.
