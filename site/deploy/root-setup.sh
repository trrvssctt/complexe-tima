#!/usr/bin/env bash
# À lancer UNE FOIS en root sur le VPS : sudo bash /home/tima/complexe-tima/deploy/root-setup.sh
# Ne touche à aucune autre application : nouveau conteneur, nouveau site nginx, nouveaux noms uniquement.
set -euo pipefail
APP=/home/tima/complexe-tima-app

echo "== 1. PostgreSQL dédié (conteneur complexe-tima-db, 127.0.0.1:5441 seulement)"
if ! docker ps -a --format '{{.Names}}' | grep -qx complexe-tima-db; then
  docker run -d --name complexe-tima-db --restart unless-stopped \
    --env-file "$APP/deploy/db.env" \
    -p 127.0.0.1:5441:5432 \
    -v complexe_tima_pgdata:/var/lib/postgresql/data \
    postgres:16-alpine
else
  echo "   déjà présent, rien à faire"
fi

echo "== 2. Démarrage automatique de pm2 pour l'utilisateur tima"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u tima --hp /home/tima >/dev/null
systemctl enable pm2-tima >/dev/null 2>&1 || true

echo "== 3. Site nginx"
cp "$APP/deploy/nginx-complexe-tima.conf" /etc/nginx/sites-available/complexe-tima
ln -sf /etc/nginx/sites-available/complexe-tima /etc/nginx/sites-enabled/complexe-tima
nginx -t && systemctl reload nginx

echo
echo "Terminé. Quand le DNS de complexe-tima.com pointe vers ce serveur :"
echo "  certbot --nginx -d complexe-tima.com -d www.complexe-tima.com"
