# Envoi des e-mails par Gmail (SMTP)

Configuration de l'envoi via un compte Gmail. Environ 10 minutes.

---

## Réponse à votre question : pas de CLI, pas de clé d'API

Google **ne propose pas** de CLI ni de clé d'API pour envoyer du courrier par
SMTP. Le seul mécanisme est un **mot de passe d'application** : une chaîne de
16 caractères que vous générez vous-même, qui ne fonctionne que pour SMTP et
que vous pouvez révoquer sans toucher à votre mot de passe Google.

Je ne peux donc pas le créer à votre place — il faut passer par votre compte.
Les étapes ci-dessous prennent 5 minutes.

> ⚠️ **N'utilisez jamais le mot de passe de votre compte Google.** Google le
> refuse depuis 2022 pour SMTP, et il donnerait accès à tout votre compte.

---

## Étape 1 — Activer la validation en deux étapes

Obligatoire : sans elle, Google n'affiche pas l'option « mots de passe
d'application ».

1. https://myaccount.google.com/security
2. **Validation en deux étapes** → activer et suivre la procédure

## Étape 2 — Générer le mot de passe d'application

1. https://myaccount.google.com/apppasswords
2. Nom de l'application : `DreamTeamShop`
3. **Créer**

Google affiche 16 caractères en 4 groupes (`abcd efgh ijkl mnop`).
**Copiez-les sans les espaces** — c'est le seul moment où ils sont visibles.

## Étape 3 — Poser les secrets

```powershell
npx supabase login
npx supabase link --project-ref pwkcwtgbngkcxgduhopy

npx supabase secrets set SMTP_HOST=smtp.gmail.com
npx supabase secrets set SMTP_PORT=465
npx supabase secrets set SMTP_USER=votre.adresse@gmail.com
npx supabase secrets set SMTP_PASSWORD=abcdefghijklmnop
npx supabase secrets set SMTP_FROM="DreamTeamShop <votre.adresse@gmail.com>"
npx supabase secrets set APP_URL=https://ecommerce1-shop.vercel.app
```

Si `WEBHOOK_SECRET` n'est pas encore posé (voir `NOTIFICATIONS_SETUP.md`),
ajoutez-le : sans lui la fonction rejette tout par 401.

## Étape 4 — Déployer

```powershell
npx supabase functions deploy send-notification-email --no-verify-jwt
```

## Étape 5 — Tester

Passez une commande avec un compte de test. L'acheteur et le vendeur
reçoivent chacun leur e-mail.

En cas de silence : **Supabase → Edge Functions → Logs**. Chaque point
d'échec y écrit un message explicite.

---

## Limites de Gmail — à connaître avant la mise en production

| Point | Valeur |
| --- | --- |
| Quota d'envoi | **500 destinataires par jour** (compte gratuit) |
| Expéditeur affiché | Votre adresse Gmail, **même** si `SMTP_FROM` en indique une autre |
| Réputation | Correcte, mais un Gmail personnel finit plus souvent en indésirables qu'un domaine authentifié |

Gmail réécrit l'expéditeur : vos clients verront `votre.adresse@gmail.com`,
pas `no-reply@dreamteamshop.ci`. C'est une limite du service, pas de la
configuration.

**Quand changer** — dès que vous dépassez ~50 commandes par jour, ou dès que
vous avez un nom de domaine. Un service transactionnel (Resend, Brevo,
Mailgun) apporte l'authentification SPF/DKIM, les statistiques d'ouverture et
un quota bien supérieur. Le code n'aura pas à changer : seuls les secrets
`SMTP_*` sont à remplacer.

Brevo, par exemple, offre 300 e-mails/jour gratuits avec votre propre domaine :

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<identifiant fourni par Brevo>
SMTP_PASSWORD=<clé SMTP Brevo>
```

---

## Les gabarits

`supabase/functions/send-notification-email/templates.ts`

Un gabarit unique, décliné par type de notification :

| Type | Emblème | Accent | Bouton |
| --- | --- | --- | --- |
| `order` | 📦 Commande | or | Suivre ma commande |
| `offer` | 🤝 Offre | bleu | Répondre |
| `auction` | 🔨 Enchère | violet | Voir l'enchère |
| `message` | ✉️ Message | vert | Répondre |
| `price_drop` | 📉 Baisse de prix | rose | Voir le produit |
| `info` | 🔔 Information | or | Ouvrir l'application |

Ils reprennent le thème sombre de l'application : or `#e6c15c` sur fond
`#0b0b0d`, pastille d'accent, filet coloré, bouton arrondi.

### Contraintes propres à l'e-mail

Le rendu obéit à des règles qui n'ont rien à voir avec le web :

- **Styles en ligne uniquement** — Gmail supprime les balises `<style>` dans
  certaines vues.
- **Mise en page en `<table>`** — Outlook ignore flexbox et grid.
- **Aucune police distante** — Gmail bloque `@font-face`. J'utilise une pile
  système : Segoe UI sous Windows, San Francisco sous macOS/iOS, Roboto sous
  Android. Le rendu est net partout, sans téléchargement.
- **Couleurs en dur** — les variables CSS du thème ne franchissent pas la
  frontière du client de messagerie.
- **Version texte systématique** — un message en HTML seul est nettement plus
  souvent classé en indésirable.
- **Texte d'aperçu masqué** — ce que la boîte de réception affiche à côté de
  l'objet.
