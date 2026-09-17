# Services externes

Trois services, tous facultatifs en développement (l'app fonctionne en
mode « console » sans eux), tous requis en production.

## 1. Google — « Continuer avec Google »

Rappel du fonctionnement : Google **ne crée jamais de compte**. Il connecte
un membre déjà inscrit (par le formulaire ou par l'admin) dont l'e-mail
correspond. Un inconnu voit : « Aucun compte n'est associé à cette adresse ».

1. <https://console.cloud.google.com> → votre projet → **APIs & Services →
   Credentials → Create credentials → OAuth client ID** (type *Web
   application*).
2. **Authorized JavaScript origins** :
   - `https://VOTRE-DOMAINE.vercel.app`
   - `http://localhost:3000` (dev)
3. **Authorized redirect URIs** :
   - `https://VOTRE-DOMAINE.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. Copiez *Client ID* → `GOOGLE_CLIENT_ID`, *Client secret* → `GOOGLE_CLIENT_SECRET`.
5. **OAuth consent screen** : type *External*, ajoutez le logo et le nom
   « SuperlifeShop », publiez (sinon seuls les testeurs déclarés peuvent
   se connecter).

Sans ces deux variables, le bouton Google n'apparaît pas — rien ne casse.

## 2. ImageKit — photos, reçus, preuves

Dossier de stockage : `SuperlifeShop/` (sous-dossiers `product`, `receipt`,
`proof`, `avatar`, `logo` créés automatiquement).

1. <https://imagekit.io/dashboard> → **Developer options**.
2. `IMAGEKIT_PUBLIC_KEY` = *Public key*, `IMAGEKIT_PRIVATE_KEY` = *Private key*.
3. `IMAGEKIT_FOLDER=SuperlifeShop`.

Les fichiers sont publics par URL (les URL sont imprévisibles). Si vous
voulez des reçus **privés**, activez *Restrict unsigned URLs* dans
ImageKit — ce sera une évolution de `src/lib/storage.ts` (URL signées).

Si vos clés ont transité en clair dans une conversation, **régénérez-les**
(Developer options → Regenerate).

## 3. Gmail — e-mails transactionnels

Envoi via SMTP Gmail avec un **mot de passe d'application** (jamais votre
mot de passe Google).

1. Le compte Gmail doit avoir la **validation en deux étapes** activée.
2. <https://myaccount.google.com/apppasswords> → créer une application
   « SuperlifeShop » → copiez les 16 caractères.
3. `GMAIL_USER=votre.adresse@gmail.com`, `GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx`
   (les espaces sont acceptés).

Limites : ~500 e-mails/jour sur un compte Gmail gratuit ; au-delà, passez
à Brevo/Resend — seul `src/lib/email.ts` change.

E-mails envoyés : bienvenue (+ mot de passe temporaire si créé par
l'admin), réinitialisation de mot de passe, changement de statut de
commande, de retrait, crédit du solde.

## 4. Vercel

1. Importez le dépôt GitHub `ELIJAHKOFFI07/Ecommerce1-shop`.
2. Framework *Next.js*, commande de build par défaut (`npm run build` lance
   `prisma generate` puis `next build`).
3. **Settings → Environment Variables → Import .env** avec votre `.env`
   rempli — ou saisissez chaque variable de `.env.example`.
4. Déployez. Puis, depuis votre PC : `npx prisma migrate deploy` et
   `npm run db:seed` (voir docs/VPS.md §6).

## Ce qui n'est PAS repris de Superlife-management

- **Analyse de reçu par IA (Gemini)** — exclue à la demande du client.
- **SMS / WhatsApp (Twilio)** — aucune fonctionnalité ne l'exige ; les
  clés Twilio de l'ancienne app peuvent être révoquées.
- **Firebase (notifications push)** — retiré. Le fichier
  `*firebase-adminsdk*.json` encore présent à la racine est un secret de
  l'ancien projet : supprimez-le et révoquez la clé dans la console Firebase.
