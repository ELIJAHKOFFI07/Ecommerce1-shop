#!/usr/bin/env bash
# ============================================================================
# DreamTeamShop — installation Parse Server sur un VPS neuf (Ubuntu/Debian).
#
# Ce script est fait pour être exécuté DIRECTEMENT SUR LE VPS, en SSH, par un
# utilisateur avec accès sudo. Il est rejouable : relancé une seconde fois, il
# met à jour le code (git pull) plutôt que de tout recréer, et ne touche pas à
# un .env déjà rempli.
#
# Dépôt privé : ce script clone en SSH avec une clé de déploiement. S'il
# n'existe pas encore de clé, le script en génère une, affiche la clé
# publique et attend que vous l'ajoutiez sur GitHub avant de continuer
# (Settings > Deploy keys, lecture seule suffit).
#
# Pas de nom de domaine pour le moment : le script configure Nginx en HTTP
# simple, joignable par l'IP du serveur. Quand un domaine sera prêt, relancez
# ce script avec la variable DOMAIN renseignée (voir plus bas) : il ajoutera
# le nom de domaine à la conf Nginx et obtiendra un certificat TLS avec
# certbot. Tant qu'il n'y a que du HTTP, ce serveur ne doit pas recevoir de
# vraies données utilisateur — seulement servir aux tests décrits dans
# PARSE_MIGRATION.md §7.
#
# Usage :
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Pour ajouter le domaine plus tard :
#   DOMAIN=api.exemple.ci CERTBOT_EMAIL=vous@exemple.ci ./deploy.sh
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — modifiable par variable d'environnement au lancement, sinon
# le script demande interactivement ce qu'il lui manque.
# ---------------------------------------------------------------------------
GIT_REPO_SSH="git@github.com:ELIJAHKOFFI07/Ecommerce1-shop.git"
APP_DIR="$HOME/dreamteamshop"
DOMAIN="${DOMAIN:-}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-elijahkoffi420@gmail.com}"
PARSE_APP_ID="${PARSE_APP_ID:-dreamteamshop}"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$1"; }
die()  { printf '\033[1;31mERREUR : %s\033[0m\n' "$1"; exit 1; }

[[ $EUID -eq 0 ]] && die "Ne pas lancer en root — lancez avec un utilisateur sudo normal."
command -v sudo >/dev/null || die "sudo est requis."

# ---------------------------------------------------------------------------
# 1. Paquets système
# ---------------------------------------------------------------------------
log "Installation des paquets système (docker, nginx, git, openssl…)"
sudo apt-get update -qq
sudo apt-get install -y -qq docker.io docker-compose-plugin nginx git openssl curl >/dev/null

sudo systemctl enable --now docker >/dev/null
sudo systemctl enable --now nginx >/dev/null

# Le groupe docker évite le sudo sur chaque commande docker, mais son effet
# n'est visible qu'à la prochaine connexion — ce script utilise `sudo docker`
# partout pour ne pas dépendre d'une reconnexion en plein milieu.
sudo usermod -aG docker "$USER" || true

# ---------------------------------------------------------------------------
# 2. Clé de déploiement SSH (dépôt privé)
# ---------------------------------------------------------------------------
DEPLOY_KEY="$HOME/.ssh/dreamteamshop_deploy"
if [[ ! -f "$DEPLOY_KEY" ]]; then
  log "Génération d'une clé de déploiement SSH"
  mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -f "$DEPLOY_KEY" -N "" -C "dreamteamshop-vps-deploy" >/dev/null

  cat >> "$HOME/.ssh/config" <<EOF

Host github.com-dreamteamshop
  HostName github.com
  User git
  IdentityFile $DEPLOY_KEY
  IdentitiesOnly yes
EOF
  GIT_REPO_SSH="${GIT_REPO_SSH/github.com/github.com-dreamteamshop}"

  warn "Ajoutez cette clé publique dans GitHub avant de continuer :"
  echo "   https://github.com/ELIJAHKOFFI07/Ecommerce1-shop/settings/keys"
  echo "   (Add deploy key — lecture seule suffit)"
  echo
  cat "$DEPLOY_KEY.pub"
  echo
  read -rp "Appuyez sur Entrée une fois la clé ajoutée sur GitHub… "
else
  GIT_REPO_SSH="${GIT_REPO_SSH/github.com/github.com-dreamteamshop}"
fi

# ---------------------------------------------------------------------------
# 3. Code source
# ---------------------------------------------------------------------------
if [[ -d "$APP_DIR/.git" ]]; then
  log "Dépôt déjà cloné — mise à jour (git pull)"
  git -C "$APP_DIR" pull --ff-only
else
  log "Clonage du dépôt"
  git clone "$GIT_REPO_SSH" "$APP_DIR"
fi

cd "$APP_DIR/parse-server"

# ---------------------------------------------------------------------------
# 4. Configuration (.env) — générée une seule fois, jamais écrasée ensuite
# ---------------------------------------------------------------------------
if [[ ! -f .env ]]; then
  log "Génération du .env avec des secrets aléatoires"
  cp .env.example .env

  PG_PASSWORD=$(openssl rand -base64 32)
  PARSE_MASTER_KEY=$(openssl rand -base64 48)
  PARSE_JS_KEY=$(openssl rand -base64 32)
  DASHBOARD_PASSWORD=$(openssl rand -base64 18)

  SERVER_IP=$(curl -fsSL ifconfig.me || hostname -I | awk '{print $1}')
  if [[ -n "$DOMAIN" ]]; then
    PUBLIC_BASE="https://$DOMAIN/parse"
  else
    PUBLIC_BASE="http://$SERVER_IP/parse"
    warn "Pas de domaine fourni : le serveur sera joignable en HTTP sur $PUBLIC_BASE"
    warn "Ne pas y faire transiter de vraies données tant qu'il n'y a pas de TLS."
  fi

  sed -i \
    -e "s#^PG_PASSWORD=.*#PG_PASSWORD=$PG_PASSWORD#" \
    -e "s#^PARSE_APP_ID=.*#PARSE_APP_ID=$PARSE_APP_ID#" \
    -e "s#^PARSE_MASTER_KEY=.*#PARSE_MASTER_KEY=$PARSE_MASTER_KEY#" \
    -e "s#^PARSE_JS_KEY=.*#PARSE_JS_KEY=$PARSE_JS_KEY#" \
    -e "s#^PARSE_PUBLIC_URL=.*#PARSE_PUBLIC_URL=$PUBLIC_BASE#" \
    -e "s#^DASHBOARD_USER=.*#DASHBOARD_USER=admin#" \
    -e "s#^DASHBOARD_PASSWORD=.*#DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD#" \
    .env

  log "Secrets générés — à copier dans all_secrets.md sur votre machine, PAS à laisser traîner"
  echo "   PARSE_APP_ID        = $PARSE_APP_ID"
  echo "   PARSE_MASTER_KEY    = $PARSE_MASTER_KEY"
  echo "   PARSE_JS_KEY        = $PARSE_JS_KEY"
  echo "   PARSE_PUBLIC_URL    = $PUBLIC_BASE"
  echo "   DASHBOARD_USER      = admin"
  echo "   DASHBOARD_PASSWORD  = $DASHBOARD_PASSWORD"
else
  log ".env déjà présent — non modifié"
  PUBLIC_BASE=$(grep '^PARSE_PUBLIC_URL=' .env | cut -d= -f2-)
fi

# SMTP et Firebase (e-mail / push) ne sont pas encore branchés côté Cloud
# Code — inutile de bloquer le déploiement dessus. À renseigner dans .env
# quand ce sera le cas (voir PARSE_MIGRATION.md §4).

# ---------------------------------------------------------------------------
# 5. Démarrage des conteneurs
# ---------------------------------------------------------------------------
log "Démarrage de Postgres, Parse Server et le Dashboard"
sudo docker compose up -d

log "Attente du démarrage de Parse Server (jusqu'à 60 s)…"
for i in $(seq 1 30); do
  if sudo docker compose logs parse 2>/dev/null | grep -q "classes vérifiées"; then
    echo "Parse Server prêt."
    break
  fi
  [[ $i -eq 30 ]] && warn "Toujours pas de confirmation après 60 s — vérifiez : sudo docker compose logs parse"
  sleep 2
done

# ---------------------------------------------------------------------------
# 6. Nginx — reverse proxy, avec ou sans domaine
# ---------------------------------------------------------------------------
log "Configuration de Nginx"
NGINX_CONF=/etc/nginx/sites-available/dreamteamshop-parse
SERVER_NAME="${DOMAIN:-_}"

sudo tee "$NGINX_CONF" >/dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_NAME;

    location /parse/ {
        proxy_pass http://127.0.0.1:1337;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # LiveQuery : sans ces deux en-têtes, le WebSocket ne s'établit pas et le
    # temps réel échoue silencieusement.
    location /parse/livequery {
        proxy_pass http://127.0.0.1:1337;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location /dashboard/ {
        proxy_pass http://127.0.0.1:4040/;
        proxy_set_header Host \$host;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/dreamteamshop-parse
sudo nginx -t
sudo systemctl reload nginx

# ---------------------------------------------------------------------------
# 7. TLS — uniquement si un domaine est fourni
# ---------------------------------------------------------------------------
if [[ -n "$DOMAIN" ]]; then
  log "Domaine fourni ($DOMAIN) — obtention du certificat TLS"
  sudo apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  sudo certbot --nginx -d "$DOMAIN" -m "$CERTBOT_EMAIL" --agree-tos --redirect --non-interactive \
    || warn "certbot a échoué — vérifiez que $DOMAIN pointe bien vers l'IP de ce serveur (DNS), puis relancez : sudo certbot --nginx -d $DOMAIN"
else
  warn "Pas de domaine : étape TLS ignorée. Quand un domaine sera prêt :"
  echo "   DOMAIN=api.exemple.ci CERTBOT_EMAIL=vous@exemple.ci ./deploy.sh"
fi

# ---------------------------------------------------------------------------
# 8. Vérification
# ---------------------------------------------------------------------------
log "Vérification (fonction ping)"
JS_KEY=$(grep '^PARSE_JS_KEY=' .env | cut -d= -f2-)
PING_URL="${PUBLIC_BASE:-http://127.0.0.1:1337/parse}/functions/ping"

RESPONSE=$(curl -fsSL -X POST "$PING_URL" \
  -H "X-Parse-Application-Id: $PARSE_APP_ID" \
  -H "X-Parse-JavaScript-Key: $JS_KEY" \
  -H "Content-Type: application/json" -d '{}' 2>&1) \
  && echo "OK : $RESPONSE" \
  || warn "Échec de la vérification. Testez en local : curl -X POST http://127.0.0.1:1337/parse/functions/ping -H 'X-Parse-Application-Id: $PARSE_APP_ID' -H 'X-Parse-JavaScript-Key: $JS_KEY' -H 'Content-Type: application/json' -d '{}'"

log "Terminé"
echo "Dashboard : ${PUBLIC_BASE%/parse}/dashboard/  (identifiants dans .env)"
echo "API       : $PUBLIC_BASE"
echo
echo "Rappel : NEXT_PUBLIC_BACKEND_PROVIDER reste sur 'supabase' côté app tant"
echo "que les tests de PARSE_MIGRATION.md §7 n'ont pas été faits contre ce serveur."
