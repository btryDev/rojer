#!/bin/sh
# Les migrations ne s'appliquent qu'au déploiement de PRODUCTION (2026-10-25).
# Un aperçu Vercel (PR) n'a pas DIRECT_URL et échouait ; s'il l'avait eue, il
# aurait migré la base de prod avant tout merge. En local, `pnpm build` ne
# migre plus : `prisma migrate dev` reste le geste du développeur.
set -e
if [ "$VERCEL_ENV" = "production" ]; then
  prisma migrate deploy
else
  echo "Migrations sautées : VERCEL_ENV=${VERCEL_ENV:-non défini} (seule la production migre)."
fi
