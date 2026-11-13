#!/bin/sh
# Déployer sur Clever Cloud — la seule porte (plan de bascule, § 5).
#
#   sh scripts/deployer-cc.sh preprod
#   sh scripts/deployer-cc.sh prod
#
# Un merge ne déploie rien : l'application Clever Cloud n'est pas reliée à
# GitHub. Ce script déploie le commit de tête de la branche de déploiement
# (~~`cc` jusqu'à la bascule, `main` ensuite : BRANCHE=main~~ [2026-11-13 :
# `main` — `cc` est devenue `main`, Vercel ne déploie plus rien]), tel qu'il
# est sur GitHub, et seulement si la CI l'a validé.
#
# Il refuse : un arbre modifié, un commit local absent de GitHub, une CI
# absente, en cours ou en échec. Puis il ne croit pas le message de fin de
# Clever Cloud — GestBAT a vu un push « réussi » ne lancer aucun build : il
# relit le commit servi (`clever status`) et appelle l'application.
#
# Il se suffit à lui-même (2026-11-13) : la préproduction est désignée par son
# IDENTIFIANT, écrit ici, et son adresse aussi. Rien à savoir par cœur, rien à
# relier à la main — une session d'un autre poste avait dû deviner les deux.
# Le dossier est relié à Clever Cloud au besoin (`clever link`, fichier local
# `.clever.json`, ignoré par git), puis le script demande à `clever` sous quel
# alias ce dossier connaît CETTE application et ne déploie que sous celui-là.
# Le compte Clever Cloud porte aussi RiskBoard ; ce script ne peut pas
# l'atteindre.
#
# Variables :
#   BRANCHE                 branche déployée (défaut : main)
#   CC_APP_PREPROD          alias donné à la préproduction si le dossier n'est
#                           pas encore relié (défaut : rojer-preprod)
#   CC_APP_PROD             de même pour la production (défaut : rojer)
#   CC_APP_PROD_ID          identifiant de l'application de production (requis
#                           pour `prod` : elle n'existe pas encore, 2026-11-13)
#   URL_PREPROD             adresse de la préproduction (défaut : la sienne)
#   URL_PROD                adresse de la production (requise pour `prod`)
set -eu

APP_PREPROD_ID="app_9bbac77c-af66-4562-81a7-0257a21401ad"
URL_PREPROD_DEFAUT="https://app-9bbac77c-af66-4562-81a7-0257a21401ad.cleverapps.io"

cible="${1:-}"
case "$cible" in
  preprod) app="${CC_APP_PREPROD:-rojer-preprod}"; app_id="$APP_PREPROD_ID"
           url="${URL_PREPROD:-$URL_PREPROD_DEFAUT}" ;;
  prod)    app="${CC_APP_PROD:-rojer}"; app_id="${CC_APP_PROD_ID:-}"
           url="${URL_PROD:-}" ;;
  *) echo "Usage : sh scripts/deployer-cc.sh preprod|prod" >&2; exit 2 ;;
esac
branche="${BRANCHE:-main}"

refus() { echo "Refusé : $1" >&2; exit 1; }

command -v clever >/dev/null || refus "la CLI clever n'est pas installée (npm i -g clever-tools)."
command -v gh >/dev/null || refus "la CLI gh n'est pas installée : impossible de lire la CI."
[ -n "$url" ] || refus "adresse de la cible absente (URL_PROD)."
[ -n "$app_id" ] || refus "identifiant de l'application absent (CC_APP_PROD_ID)."

[ "$(git branch --show-current)" = "$branche" ] || refus "on n'est pas sur la branche $branche."
# Un worktree a un FICHIER `.git`, que la CLI Clever Cloud ne sait pas lire
# (« [ERROR] Could not find cc. », 2026-11-10) : il faut le dépôt principal,
# ou un clone.
[ -d "$(git rev-parse --show-toplevel)/.git" ] ||
  refus "ce dossier est un worktree : déployer depuis le dépôt principal, sur $branche."
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
# Et le build Clever Cloud lui-même, nommément : « tout ce qui a tourné est
# vert » passerait si le job n'avait pas tourné du tout.
build=$(gh run list --commit "$sha" --workflow tests.yml --json databaseId --jq '.[0].databaseId')
[ -n "$build" ] || refus "pas de workflow Tests pour $court."
etat_build=$(gh run view "$build" --json jobs --jq '.jobs[] | select(.name == "build-cc") | .conclusion')
[ "$etat_build" = "success" ] || refus "le job build-cc de $court n'a pas réussi (« ${etat_build:-absent} »)."
echo "CI verte pour $court, build Clever Cloud compris."

# L'alias sous lequel CE dossier connaît l'application attendue, demandé à
# `clever` lui-même : c'est son fichier de lien à lui qui compte (il le cherche
# aussi dans les dossiers parents), et un dossier déjà relié sous un autre
# alias n'en reçoit pas un second (`clever link` le refuse). L'identifiant ET
# l'adresse de dépôt doivent désigner l'application : c'est vers la seconde que
# `clever deploy` pousse.
alias_de_la_cible() {
  clever applications --json 2>/dev/null | tr -d '\n' | tr '}' '\n' |
    grep "\"app_id\": *\"$app_id\"" |
    grep "\"deploy_url\": *\"[^\"]*/$app_id\.git\"" |
    sed -E 's/.*"alias": *"([^"]*)".*/\1/' | head -1
}
alias_cible=$(alias_de_la_cible)
if [ -z "$alias_cible" ]; then
  clever link "$app_id" --alias "$app" >/dev/null ||
    refus "impossible de relier ce dossier à $app_id (clever login ?)."
  alias_cible=$(alias_de_la_cible)
fi
[ -n "$alias_cible" ] ||
  refus "ce dossier n'est pas relié à $app_id, ou son lien ne pousse pas vers elle : à relire (clever applications)."

echo "Déploiement de $court ($branche) sur ${app}…"
# `rebuild` : un commit déjà poussé chez Clever Cloud est reconstruit au lieu
# d'être refusé (politique par défaut `error`). La commande attend la fin.
clever deploy --alias "$alias_cible" --branch "$branche" \
  --same-commit-policy rebuild --exit-on deploy-end

statut=$(clever status --app "$app_id")
printf '%s\n' "$statut"
printf '%s\n' "$statut" | grep -q "$court" ||
  refus "clever status ne montre pas $court : le commit servi n'est pas celui déployé, à vérifier."

# `/robots.txt` : servi sans session ni base, il prouve que le serveur répond.
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url/robots.txt" || true)
[ "$code" = "200" ] || refus "$url/robots.txt répond « $code » au lieu de 200."
echo "Déployé et servi : $court sur $app ($url)."
