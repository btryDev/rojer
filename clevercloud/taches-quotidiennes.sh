#!/bin/bash -l
# Tâches quotidiennes de Rojer (src/lib/taches/quotidiennes.ts), lancées par
# clevercloud/cron.json. `bash -l` : la crontab de Clever Cloud ne transmet
# pas les variables d'environnement de l'application, le shell de connexion
# les charge. Chaque instance joue la crontab : seule la première appelle.
# Le secret passe par l'entrée standard, jamais sur la ligne de commande
# (visible dans la liste des processus).
set -eu

[ "${INSTANCE_NUMBER:-0}" = "0" ] || exit 0

if [ -z "${TACHES_SECRET:-}" ] || [ -z "${PUBLIC_APP_URL:-}" ]; then
  echo "taches-quotidiennes : TACHES_SECRET ou PUBLIC_APP_URL absente, rien d'appelé" >&2
  exit 1
fi

printf 'Authorization: Bearer %s\n' "$TACHES_SECRET" |
  /usr/bin/curl --fail --silent --show-error --max-time 900 \
    --request POST --header @- \
    "${PUBLIC_APP_URL%/}/api/taches/quotidiennes"
echo
