#!/bin/sh
# Déployer sur Clever Cloud — la seule porte (plan de bascule, § 5).
#
#   sh scripts/deployer-cc.sh preprod
#   sh scripts/deployer-cc.sh prod
#
# Un merge ne déploie rien : l'application Clever Cloud n'est pas reliée à
# GitHub. Ce script déploie le commit de tête de la branche de déploiement
# (`cc` jusqu'à la bascule, `main` ensuite : BRANCHE=main), tel qu'il est sur
# GitHub, et seulement si la CI l'a validé.
#
# Il refuse : un arbre modifié, un commit local absent de GitHub, une CI
# absente, en cours ou en échec. Puis il ne croit pas le message de fin de
# Clever Cloud — GestBAT a vu un push « réussi » ne lancer aucun build : il
# relit le commit servi (`clever status`) et appelle l'application.
#
# Variables :
#   BRANCHE                 branche déployée (défaut : cc)
#   CC_APP_PREPROD          alias de l'application de préproduction (défaut : rojer-preprod)
#   CC_APP_PROD             alias de l'application de production (défaut : rojer)
#   URL_PREPROD, URL_PROD   adresse publique, pour l'appel de contrôle (requise)
set -eu

cible="${1:-}"
case "$cible" in
  preprod) app="${CC_APP_PREPROD:-rojer-preprod}"; url="${URL_PREPROD:-}" ;;
  prod)    app="${CC_APP_PROD:-rojer}";            url="${URL_PROD:-}" ;;
  *) echo "Usage : sh scripts/deployer-cc.sh preprod|prod" >&2; exit 2 ;;
esac
branche="${BRANCHE:-cc}"

refus() { echo "Refusé : $1" >&2; exit 1; }

command -v clever >/dev/null || refus "la CLI clever n'est pas installée (npm i -g clever-tools)."
command -v gh >/dev/null || refus "la CLI gh n'est pas installée : impossible de lire la CI."
[ -n "$url" ] || refus "adresse de la cible absente (URL_PREPROD ou URL_PROD)."

[ "$(git branch --show-current)" = "$branche" ] || refus "on n'est pas sur la branche $branche."
[ -z "$(git status --porcelain)" ] || refus "l'arbre de travail est modifié."

git fetch --quiet origin "$branche"
sha=$(git rev-parse HEAD)
[ "$sha" = "$(git rev-parse "origin/$branche")" ] ||
  refus "la tête locale n'est pas celle de origin/$branche : pousser ou se mettre à jour d'abord."
court=$(printf '%s' "$sha" | cut -c1-7)

# La CI de ce commit : au moins un workflow, aucun en cours, aucun en échec.
etats=$(gh run list --commit "$sha" --json status,conclusion \
  --jq '.[] | "\(.status) \(.conclusion)"')
[ -n "$etats" ] || refus "aucune CI pour $court : attendre qu'elle démarre."
if printf '%s\n' "$etats" | grep -qv '^completed '; then
  refus "la CI de $court tourne encore."
fi
if printf '%s\n' "$etats" | grep -qv -E '^completed (success|skipped|neutral)$'; then
  refus "la CI de $court n'est pas verte."
fi
echo "CI verte pour $court."

echo "Déploiement de $court ($branche) sur $app…"
# `rebuild` : un commit déjà poussé chez Clever Cloud est reconstruit au lieu
# d'être refusé (politique par défaut `error`). La commande attend la fin.
clever deploy --alias "$app" --branch "$branche" \
  --same-commit-policy rebuild --exit-on deploy-end

statut=$(clever status --alias "$app")
printf '%s\n' "$statut"
printf '%s\n' "$statut" | grep -q "$court" ||
  refus "clever status ne montre pas $court : le commit servi n'est pas celui déployé, à vérifier."

# `/robots.txt` : servi sans session ni base, il prouve que le serveur répond.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url/robots.txt" || true)
[ "$code" = "200" ] || refus "$url/robots.txt répond « $code » au lieu de 200."
echo "Déployé et servi : $court sur $app ($url)."
