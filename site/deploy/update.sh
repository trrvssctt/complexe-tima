#!/usr/bin/env bash
# Sur le VPS, utilisateur tima : bash ~/complexe-tima-app/deploy/update.sh
# Installe, migre la base, recompile et redémarre (sans toucher aux autres applications).
set -euo pipefail
cd "$(dirname "$0")/.."
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack pnpm install --frozen-lockfile
corepack pnpm db:migrate
corepack pnpm build
if pm2 describe complexe-tima >/dev/null 2>&1; then
  pm2 reload complexe-tima --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save
