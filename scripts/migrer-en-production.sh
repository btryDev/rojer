#!/bin/sh
# Migrations au BUILD : seulement sur Vercel, en production (2026-10-25).
# Un aperçu Vercel (PR) n'a pas DIRECT_URL et échouait ; s'il l'avait eue, il
# aurait migré la base de prod avant tout merge. En local, `pnpm build` ne
# migre pas : `prisma migrate dev` reste le geste du développeur.
#
# ~~Filet : sans VERCEL_ENV, on migrait dès que DIRECT_URL était fournie.~~
# [2026-10-30, plan de bascule Clever Cloud, 0.2 : retiré. Les logs de build
# Vercel montrent `VERCEL_ENV=production` (déploiement de 9bdbb47d), le filet ne
# servait à rien ici ; chez Clever Cloud, il aurait migré pendant le BUILD, sur
# l'instance de build, avant que le déploiement soit retenu. Là-bas, les
# migrations passent par le hook de démarrage (~~`CC_PRE_RUN_HOOK=pnpm
# db:migrate`~~ [2026-10-30 : `sh scripts/demarrer-cc.sh migrer`]), qui fait échouer le déploiement si elles échouent.]
#
# Mais un build Vercel SANS `VERCEL_ENV` (variables système plus exposées,
# build par la CLI) sauterait les migrations en silence, et le code partirait
# contre un schéma ancien (revue de la PR #127). Vercel pose toujours
# `VERCEL=1` au build : dans ce cas, on s'arrête au lieu de deviner.
set -e
if [ "$VERCEL" = "1" ] && [ -z "$VERCEL_ENV" ]; then
  echo "Build Vercel sans VERCEL_ENV : impossible de savoir s'il faut migrer. Arrêt." >&2
  exit 1
fi
if [ "$VERCEL_ENV" = "production" ]; then
  echo "Migrations : VERCEL_ENV=production, on applique."
  prisma migrate deploy
else
  echo "Migrations sautées au build : VERCEL_ENV=${VERCEL_ENV:-non défini}. Hors Vercel, elles passent au démarrage (CC_PRE_RUN_HOOK)."
fi
