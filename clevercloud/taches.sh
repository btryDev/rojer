#!/bin/bash -l
# Tâches de Rojer (src/lib/taches/quotidiennes.ts), lancées chaque minute par
# clevercloud/cron.json : la file Stripe, et les tâches du jour dès 9 h.
# `bash -l` : la crontab de Clever Cloud ne transmet pas les variables
# d'environnement de l'application, le shell de connexion les charge.
# Chaque instance joue la crontab : seule la première appelle — une économie
# seulement ; pendant un déploiement, deux instances numérotées 0 coexistent,
# et la sûreté vient des baux en base (ADR-053 § 5, amendé le 2026-11-10).
# Le secret passe par l'entrée standard, jamais sur la ligne de commande
# (visible dans la liste des processus).
set -eu

[ "${INSTANCE_NUMBER:-0}" = "0" ] || exit 0

if [ -z "${TACHES_SECRET:-}" ] || [ -z "${PUBLIC_APP_URL:-}" ]; then
  echo "taches : TACHES_SECRET ou PUBLIC_APP_URL absente, rien d'appelé" >&2
  exit 1
fi

printf 'Authorization: Bearer %s\n' "$TACHES_SECRET" |
  /usr/bin/curl --fail --silent --show-error --max-time 30 \
    --request POST --header @- \
    "${PUBLIC_APP_URL%/}/api/taches/chaque-minute"
