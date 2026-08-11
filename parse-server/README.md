# Parse Server — déploiement sur le VPS

Inventaire et plan complet : [`../PARSE_MIGRATION.md`](../PARSE_MIGRATION.md).

Ce dossier est du **code serveur**, exclu de la compilation Next.js. Il ne
change rien à l'application tant que `NEXT_PUBLIC_BACKEND_PROVIDER` vaut
`supabase`.

## Contenu

```
docker-compose.yml   Postgres + Parse Server (API, Cloud Code, LiveQuery) + Dashboard
.env.example         Variables attendues — copier en .env sur le VPS
cloud/
  main.js            point d'entrée
  schema.js          classes, index et CLP (idempotent, rejouable)
  roles.js           rôles admin / seller — remplacent is_admin / is_seller
  hooks.js           les 12 triggers Postgres + le garde-fou anti-survente
  orders.js          placeOrder, confirmDelivery, advanceOrderStatus
```

## Installation

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
openssl rand -base64 32   # PG_PASSWORD
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

```bash
curl -X POST https://api.exemple.ci/parse/functions/ping \
  -H "X-Parse-Application-Id: dreamteamshop" \
  -H "Content-Type: application/json" -d '{}'
```

## Côté application

```env
NEXT_PUBLIC_BACKEND_PROVIDER=parse
NEXT_PUBLIC_PARSE_SERVER_URL=https://api.exemple.ci/parse
NEXT_PUBLIC_PARSE_APP_ID=dreamteamshop
NEXT_PUBLIC_PARSE_JS_KEY=…
PARSE_MASTER_KEY=…      # serveur uniquement, jamais préfixé NEXT_PUBLIC_
```

**Ne pas basculer la variable maintenant.** Les Cloud Functions argent
(`placeOrder`, `confirmDelivery`) existent mais ne sont pas testées, et le
reste des ~29 RPC n'est pas écrit. La bascule se fait à l'étape 8 du plan.

## Sécurité

- `PARSE_MASTER_KEY` contourne CLP et ACL, exactement comme le `service_role`
  de Supabase. Elle ne doit jamais quitter le VPS ni apparaître dans une
  variable `NEXT_PUBLIC_`.
- `PARSE_JS_KEY` est lisible dans le navigateur — c'est normal. Elle
  n'autorise rien par elle-même : la protection vient des CLP et des ACL.
- Le Dashboard n'est pas ouvert au public : le placer derrière une
  authentification Nginx en plus de son propre mot de passe, ou le restreindre
  par IP.
