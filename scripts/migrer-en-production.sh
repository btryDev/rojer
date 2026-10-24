#!/bin/sh
# Les migrations ne s'appliquent qu'au déploiement de PRODUCTION (2026-10-25).
# Un aperçu Vercel (PR) n'a pas DIRECT_URL et échouait ; s'il l'avait eue, il
# aurait migré la base de prod avant tout merge. En local, `pnpm build` ne
# migre plus : `prisma migrate dev` reste le geste du développeur.
#
# Filet : si VERCEL_ENV n'était pas exposé au build, la production cesserait
# de migrer en silence. Sans VERCEL_ENV, on migre donc dès que DIRECT_URL est
# fournie par l'environnement (la production l'a, les aperçus non) ; un aperçu
# déclaré (`preview`) ne migre jamais.
set -e
if [ "$VERCEL_ENV" = "production" ] || { [ -z "$VERCEL_ENV" ] && [ -n "$DIRECT_URL" ]; }; then
  echo "Migrations : VERCEL_ENV=${VERCEL_ENV:-non défini}, on applique."
  prisma migrate deploy
else
  echo "Migrations sautées : VERCEL_ENV=${VERCEL_ENV:-non défini} (seule la production migre)."
fi
