# Héberger la base de données sur le VPS

> Décision prise : l'application tourne sur **Vercel**, la base Postgres sur
> **votre VPS** (`72.62.31.97`). Ce choix impose d'ouvrir Postgres à
> internet — ce document explique comment le faire **sans exposer la base
> au monde entier**.

Aujourd'hui, Postgres écoute sur `0.0.0.0:5432` mais `pg_hba.conf` refuse
toute connexion externe : Vercel ne peut pas se connecter. Il faut :

1. forcer le chiffrement TLS,
2. n'accepter que des connexions chiffrées, par mot de passe,
3. créer un utilisateur et une base dédiés à DreamShop,
4. limiter les adresses autorisées autant que possible,
5. appliquer la migration et l'amorçage.

Toutes les commandes ci-dessous s'exécutent **sur le VPS**, en `root`.

---

## 1. Certificat TLS pour Postgres

Un certificat auto-signé suffit : le client (Prisma) vérifie que le lien
est chiffré, pas l'identité du serveur (`sslmode=require`).

```bash
PGDATA=$(sudo -u postgres psql -tAc "SHOW data_directory")
cd "$PGDATA"
openssl req -new -x509 -days 3650 -nodes -text \
  -out server.crt -keyout server.key \
  -subj "/CN=dreamshopshop-db"
chown postgres:postgres server.key server.crt
chmod 600 server.key
```

Dans `postgresql.conf` (même dossier, ou `/etc/postgresql/*/main/postgresql.conf`) :

```conf
listen_addresses = '*'
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file  = 'server.key'
password_encryption = scram-sha-256
```

## 2. Autoriser UNIQUEMENT les connexions chiffrées

Dans `pg_hba.conf`, **ajoutez en fin de fichier** (l'ordre compte : les
lignes `local` et `127.0.0.1` existantes restent au-dessus) :

```conf
# DreamShop depuis Vercel — TLS obligatoire, mot de passe SCRAM
hostssl  dreamshopshop  dreamshopshop  0.0.0.0/0  scram-sha-256
# Tout le reste, non chiffré, est refusé :
hostnossl all all 0.0.0.0/0 reject
```

`hostssl` + `dreamshopshop dreamshopshop` : seul CET utilisateur, sur
CETTE base, en TLS. Un attaquant qui scanne le port 5432 tombe sur une
authentification SCRAM d'un seul utilisateur — pas sur `postgres`.

> Vercel n'a pas de plage d'IP fixe garantie sur l'offre standard, d'où le
> `0.0.0.0/0`. Si vous passez un jour sur des IP statiques Vercel (offre
> Pro « Secure Compute »), remplacez `0.0.0.0/0` par ces plages.

Redémarrez :

```bash
systemctl restart postgresql
sudo -u postgres psql -c "SHOW ssl"   # doit afficher : on
```

## 3. Utilisateur et base dédiés

```bash
sudo -u postgres psql <<'SQL'
CREATE USER dreamshopshop WITH PASSWORD 'GENEREZ_UN_MOT_DE_PASSE_LONG';
CREATE DATABASE dreamshopshop OWNER dreamshopshop;
REVOKE ALL ON DATABASE dreamshopshop FROM PUBLIC;
GRANT ALL PRIVILEGES ON DATABASE dreamshopshop TO dreamshopshop;
SQL
```

Générez le mot de passe avec `openssl rand -base64 24` — **ne réutilisez
pas** celui de `dreamteamshop`, qui a transité en clair dans une
conversation. Puis effacez-le de l'historique :

```bash
history -d $(history 1 | awk '{print $1}')   # dernière commande
rm -f ~/.psql_history /var/lib/postgresql/.psql_history
```

L'ancienne base `dreamteamshop` peut être supprimée quand vous le décidez :
`DROP DATABASE dreamteamshop; DROP USER dreamteamshop;`

## 4. Pare-feu

Le port 5432 doit être ouvert (Vercel) mais **rien d'autre** que SSH, 80
et 443 :

```bash
ufw allow OpenSSH
ufw allow 5432/tcp
ufw --force enable
ufw status
```

Installez **fail2ban** pour bannir les IP qui martèlent Postgres :

```bash
apt install -y fail2ban
cat >/etc/fail2ban/jail.d/postgresql.conf <<'EOF'
[postgresql]
enabled  = true
port     = 5432
filter   = postgresql
logpath  = /var/log/postgresql/postgresql-*-main.log
maxretry = 5
bantime  = 1h
EOF
cat >/etc/fail2ban/filter.d/postgresql.conf <<'EOF'
[Definition]
failregex = FATAL:\s+password authentication failed for user .* <HOST>
            FATAL:\s+no pg_hba.conf entry for host "<HOST>"
EOF
systemctl restart fail2ban
```

Pour que `<HOST>` apparaisse dans les journaux, dans `postgresql.conf` :
`log_connections = on` et `log_line_prefix = '%m [%p] %h '`.

## 5. Vérifier depuis l'extérieur

Depuis votre PC (pas depuis le VPS) :

```bash
psql "postgresql://dreamshopshop:MOT_DE_PASSE@72.62.31.97:5432/dreamshopshop?sslmode=require" -c "select version()"
```

Doit répondre. Et **sans** TLS, doit refuser :

```bash
psql "postgresql://dreamshopshop:MOT_DE_PASSE@72.62.31.97:5432/dreamshopshop?sslmode=disable" -c "select 1"
# → FATAL: no pg_hba.conf entry ... SSL off   ← c'est le comportement attendu
```

## 6. Appliquer le schéma et créer le super-admin

Depuis votre PC, dans le dossier du projet, avec `DATABASE_URL` pointant
sur la nouvelle base (encodez `+` en `%2B`, `/` en `%2F` dans le mot de passe) :

```bash
npx prisma migrate deploy        # crée les 23 tables
SEED_ADMIN_EMAIL=vous@exemple.com SEED_ADMIN_NAME="Votre nom" npm run db:seed
```

Le seed affiche **une seule fois** le mot de passe temporaire du
super-admin. Connectez-vous et changez-le immédiatement (Profil).

## 7. Sauvegardes

Une base sans sauvegarde est une base perdue. Sur le VPS :

```bash
mkdir -p /var/backups/dreamshopshop
cat >/etc/cron.daily/dreamshopshop-backup <<'EOF'
#!/bin/sh
D=/var/backups/dreamshopshop
sudo -u postgres pg_dump -Fc dreamshopshop > "$D/dreamshopshop-$(date +%F).dump"
find "$D" -name '*.dump' -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/dreamshopshop-backup
```

Copiez régulièrement `/var/backups/dreamshopshop` hors du VPS (scp, rclone
vers un stockage objet). Restauration : `pg_restore -d dreamshopshop fichier.dump`.

## 8. PgBouncer

PgBouncer est installé sur le VPS mais **n'est pas utilisé** : en mode
`transaction`, il casse les requêtes préparées de Prisma. L'app se
connecte directement au port 5432. Vous pouvez le désactiver :
`systemctl disable --now pgbouncer`.

---

## Récapitulatif des variables Vercel

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `postgresql://dreamshopshop:MDP_ENCODE@72.62.31.97:5432/dreamshopshop?sslmode=require` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL`, `NEXT_PUBLIC_APP_URL` | URL de production Vercel |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | docs/SERVICES.md §1 |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_FOLDER` | docs/SERVICES.md §2 |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | docs/SERVICES.md §3 |

Le build Vercel exécute `prisma generate && next build` ; les migrations
ne sont **pas** appliquées automatiquement — lancez `prisma migrate deploy`
depuis votre PC à chaque nouvelle migration.
