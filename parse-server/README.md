# Parse Server — déploiement sur le VPS

Inventaire et plan complet : [`../PARSE_MIGRATION.md`](../PARSE_MIGRATION.md).

Ce dossier est du **code serveur**, exclu de la compilation Next.js. Il ne
change rien à l'application tant que `NEXT_PUBLIC_BACKEND_PROVIDER` vaut
`supabase`.

## Contenu

```
docker-compose.yml   MongoDB + Parse Server (API, Cloud Code, LiveQuery) + Dashboard
.env.example         Variables attendues — copier en .env sur le VPS
cloud/
  main.js            point d'entrée
  schema.js          classes, index et CLP (idempotent, rejouable)
  roles.js           rôles admin / seller — remplacent is_admin / is_seller,
                     adminSetUserRole
  hooks.js           les 12 triggers Postgres + le garde-fou anti-survente
  orders.js          placeOrder, advanceOrderStatus (machine à états unique),
                     confirmDelivery
  offers.js          makeOffer, respondToOffer
  auctions.js        createAuction, placeBid, settleExpiredAuctions (+ job)
  wallet.js          requestWithdrawal, redeemPoints, spinWheel, boostProduct
  referral.js        linkReferral, redeemReferral, referralLeaderboard, myReferralRank
  social.js          openConversation, markConversationRead, markStoryViewed,
                     answerQuestion, activeViewers, registerProductView
  admin.js           adminStats, adminWalletsOverview, adminShopRevenue,
                     adminRevenueReport, adminUpdateSettings, adminAdjustStock,
                     adminUpdateProfile, adminRequirePasswordChange,
                     clearPasswordChangeFlag, shopStats
```

Les 29 RPC appelées par l'application sont toutes portées. Aucune n'est
testée contre un serveur réel — voir `../PARSE_MIGRATION.md §7`.

## Installation automatisée

`deploy.sh` fait tout : paquets système, clé de déploiement SSH (dépôt
privé), clonage, génération des secrets, démarrage des conteneurs, Nginx, et
TLS si un domaine est fourni. Rejouable — un second passage fait `git pull`
et ne touche pas à un `.env` déjà rempli.

Première exécution — le script n'étant pas encore sur le VPS avant le tout
premier clonage, copiez son contenu dans un fichier sur le VPS (scp, ou
copier-coller dans `nano deploy.sh`), puis :

```bash
chmod +x deploy.sh
./deploy.sh                     # sans domaine : Nginx en HTTP simple
# ou, si le domaine est déjà prêt en DNS :
DOMAIN=api.exemple.ci CERTBOT_EMAIL=vous@exemple.ci ./deploy.sh
```

S'il n'existe pas encore de clé de déploiement, le script en génère une,
affiche la clé publique et attend que vous l'ajoutiez sur GitHub
(`Settings > Deploy keys`, lecture seule) avant de continuer.

Pour ajouter le domaine plus tard une fois le DNS prêt, relancez le script
avec `DOMAIN=…` : il complète la conf Nginx et obtient le certificat TLS.

## Installation manuelle (détail des étapes du script)

```bash
ssh utilisateur@vps
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker "$USER" && exec su -l "$USER"

git clone <dépôt> dreamteamshop && cd dreamteamshop/parse-server
cp .env.example .env
```

Générer les secrets et les coller dans `.env` :

```bash
openssl rand -base64 48   # PARSE_MASTER_KEY
openssl rand -base64 32   # PARSE_JS_KEY
```

Puis :

```bash
docker compose up -d
docker compose logs -f parse    # attendre « X classes vérifiées »
```

## Nginx + TLS

Rien n'est exposé sur l'extérieur : les deux services écoutent sur
`127.0.0.1`. Nginx est le seul point d'entrée.

```nginx
server {
    server_name api.exemple.ci;

    location /parse/ {
        proxy_pass http://127.0.0.1:1337;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # LiveQuery : sans ces deux en-têtes, le WebSocket ne s'établit pas et le
    # temps réel échoue silencieusement — les messages n'arrivent plus.
    location /parse/livequery {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /dashboard/ {
        proxy_pass http://127.0.0.1:4040/;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo certbot --nginx -d api.exemple.ci
```

## Vérification

`cloud/health.js` définit une fonction `ping` qui ne touche à aucune classe —
elle sert uniquement à vérifier que le serveur répond et que le Cloud Code
s'est bien chargé.

```bash
curl -X POST https://api.exemple.ci/parse/functions/ping \
  -H "X-Parse-Application-Id: dreamteamshop" \
  -H "X-Parse-JavaScript-Key: <PARSE_JS_KEY du .env>" \
  -H "Content-Type: application/json" -d '{}'
```

Réponse attendue : `{"result":{"ok":true,"at":"...")}}`. Une erreur
`unauthorized` signifie une clé manquante ou fausse ; une erreur de connexion
signifie que Nginx ou le conteneur `parse` n'est pas up.

## Côté application

```env
NEXT_PUBLIC_BACKEND_PROVIDER=parse
NEXT_PUBLIC_PARSE_SERVER_URL=https://api.exemple.ci/parse
NEXT_PUBLIC_PARSE_APP_ID=dreamteamshop
NEXT_PUBLIC_PARSE_JS_KEY=…
PARSE_MASTER_KEY=…      # serveur uniquement, jamais préfixé NEXT_PUBLIC_
```

**Ne pas basculer la variable maintenant.** Les 29 Cloud Functions sont
écrites mais **aucune n'est testée** contre un serveur réel. La bascule se
fait à l'étape 8 du plan (`../PARSE_MIGRATION.md §6`), après vérification.

## Sécurité

- `PARSE_MASTER_KEY` contourne CLP et ACL, exactement comme le `service_role`
  de Supabase. Elle ne doit jamais quitter le VPS ni apparaître dans une
  variable `NEXT_PUBLIC_`.
- `PARSE_JS_KEY` est lisible dans le navigateur — c'est normal. Elle
  n'autorise rien par elle-même : la protection vient des CLP et des ACL.
- Le Dashboard n'est pas ouvert au public : le placer derrière une
  authentification Nginx en plus de son propre mot de passe, ou le restreindre
  par IP.
