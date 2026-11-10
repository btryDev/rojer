#!/bin/sh
# Vagues d'exports simultanés (`k6/exports-simultanes.js`) pour un export,
# sur les dossiers de démo puis à un an, à N = 3, 6, 12. Une instance fraîche
# par vague. Résultats : .charge/resultats/H2-vague-<taille>-2ms-<export>-<historique>-n<N>.*
#
#   sh scripts/charge/vagues.sh xs registre/pdf
set -u
taille="${1:?xs ou s}"
export_="${2:?route de l export, ex. registre/pdf}"
cd "$(dirname "$0")/../.."
nom=$(printf '%s' "$export_" | tr '/' '_')
for h in demo un-an; do for n in 3 6 12; do
  R=.charge/resultats/H2-vague-$taille-2ms-$nom-$h-n$n
  # `up -d` laisse en place un conteneur déjà lancé : on le redémarre pour
  # que chaque vague parte d'un processus neuf (tas, caches, file vides).
  sh scripts/charge/banc.sh demarrer "$taille" >/dev/null 2>&1
  docker restart rojer-charge-app >/dev/null; sleep 6
  sh scripts/charge/banc.sh latence 2 >/dev/null
  for i in $(seq 1 30); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/login)" = 200 ] && break; sleep 2; done
  sh scripts/charge/surveiller.sh "$R.csv" & p=$!
  k6 run -q -e N=$n -e HISTORIQUE=$h -e EXPORT="$export_" -e DUREE=4m \
    --summary-export "$R.json" --out csv="$R-k6.csv.gz" scripts/charge/k6/exports-simultanes.js > "$R.txt" 2>&1
  kill $p 2>/dev/null
  echo "$h n=$n app=$(docker inspect rojer-charge-app --format '{{.State.Status}}')" >> "$R.txt"
done; done
