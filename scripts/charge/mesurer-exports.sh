#!/bin/sh
# Chaque export, seul, sur une instance au repos (`docs/plan-test-de-charge.md`,
# scénario H2) : statut, durée, poids, pic de mémoire du conteneur, et si
# l'application a survécu. Une application tombée est redémarrée avant la
# mesure suivante.
#
#   sh scripts/charge/mesurer-exports.sh xs|s "<n> <n>…" "<route> <route>…"
#   ex. : sh scripts/charge/mesurer-exports.sh xs "1 6" "registre/pdf controle-zip"
#
# Les routes sont relatives à /api/etablissements/<id>/.
set -eu
taille="${1:?xs ou s}"
dossiers="${2:?numéros de dossier}"
routes="${3:?routes des exports}"
cd "$(dirname "$0")/../.."
sessions=.charge/sessions.json

demarrer() {
  sh scripts/charge/banc.sh demarrer "$taille" >/dev/null 2>&1
  for _ in $(seq 1 60); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/login || true)
    [ "$code" = 200 ] && return 0
    sleep 2
  done
  echo "L'application ne répond pas." >&2
  exit 1
}

champ() { python3 -I -c "import json,sys;print([d for d in json.load(open(sys.argv[1])) if d['n']==int(sys.argv[2])][0][sys.argv[3]])" "$sessions" "$1" "$2"; }

demarrer
echo "taille | dossier | rapports | export | statut | durée | poids | pic mémoire | application"
for n in $dossiers; do
  cookie=$(champ "$n" cookie)
  etab=$(champ "$n" etablissementId)
  rapports=$(docker exec rojer-charge-db psql -U rojer -d rojer -Atc \
    "select count(*) from \"RapportVerification\" where \"etablissementId\" = '$etab'")
  for route in $routes; do
    memoire=$(mktemp)
    (trap "exit 0" TERM; while :; do docker stats --no-stream --format '{{.MemUsage}}' rojer-charge-app >> "$memoire" 2>/dev/null; sleep 1; done) &
    sonde=$!
    r=$(curl -s -o /dev/null -m 180 -w '%{http_code} | %{time_total}s | %{size_download} o' \
      -H "cookie: $cookie" "http://localhost:8080/api/etablissements/$etab/$route" || true)
    kill $sonde
    pic=$(sort -h "$memoire" | tail -1 | cut -d/ -f1)
    rm -f "$memoire"
    etat=$(docker inspect rojer-charge-app --format '{{.State.Status}}')
    echo "$taille | $n | $rapports | $route | $r | ${pic:-—} | $etat"
    [ "$etat" = running ] || demarrer
  done
done
