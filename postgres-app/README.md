# Postgres — VPS

```bash
ssh utilisateur@vps
sudo apt update && sudo apt install -y docker.io docker-compose-plugin

git clone https://github.com/ELIJAHKOFFI07/Ecommerce1-shop.git dreamteamshop
cd dreamteamshop/postgres-app
cp .env.example .env
sed -i "s#^PG_PASSWORD=.*#PG_PASSWORD=$(openssl rand -base64 32)#" .env

sudo docker compose up -d
sudo docker compose logs -f postgres   # attendre "database system is ready"
```

## Joindre cette base depuis l'application Next.js

Le port n'est bindé que sur `127.0.0.1` du VPS — deux façons de la joindre
depuis l'app :

**1. L'app tourne sur ce même VPS** : `DATABASE_URL` pointe directement sur
`localhost`.

```env
DATABASE_URL=postgresql://<PG_USER>:<PG_PASSWORD>@localhost:5432/<PG_DATABASE>
```

**2. L'app tourne ailleurs (Vercel, un autre VPS…)** : un tunnel SSH est plus
sûr qu'ouvrir le port 5432 sur Internet.

```bash
ssh -N -L 5432:localhost:5432 utilisateur@vps
```

puis `DATABASE_URL=postgresql://<PG_USER>:<PG_PASSWORD>@localhost:5432/<PG_DATABASE>`
côté app, tant que le tunnel tourne. Pour une solution permanente sans
tunnel manuel, publier le port dans `docker-compose.yml`
(`"5432:5432"` au lieu de `"127.0.0.1:5432:5432"`) et restreindre l'accès
par pare-feu à la seule IP du serveur applicatif (`ufw allow from <IP> to
any port 5432`) — jamais grand ouvert sur Internet.

## Migrations

Depuis la racine du dépôt (pas `postgres-app/`), une fois `DATABASE_URL`
renseignée dans `.env.local` :

```bash
npx prisma migrate deploy   # applique les migrations existantes (prod)
npx prisma migrate dev      # crée une nouvelle migration (dev, en local)
```
