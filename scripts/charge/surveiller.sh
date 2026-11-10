#!/bin/sh
# Relevé côté serveur pendant un scénario (`docs/plan-test-de-charge.md` § 6),
# sans rien ajouter à l'application : toutes les 5 s, processeur et mémoire
# de l'application et de la base, connexions à la base par état, et le temps
# d'une page légère (la sonde : il dit combien la boucle de Node fait attendre).
#
#   sh scripts/charge/surveiller.sh <fichier.csv> &   … puis kill %1
set -eu
sortie="${1:?fichier de sortie}"
echo "heure,app_cpu,app_mem,db_cpu,connexions_actives,connexions_inactives,en_attente_verrou,sonde_ms" > "$sortie"
while :; do
  stats=$(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' rojer-charge-app rojer-charge-db)
  app_cpu=$(echo "$stats" | awk '/rojer-charge-app/ {print $2}')
  app_mem=$(echo "$stats" | awk '/rojer-charge-app/ {print $3}')
  db_cpu=$(echo "$stats" | awk '/rojer-charge-db/ {print $2}')
  pg=$(docker exec rojer-charge-db psql -U rojer -d rojer -Atc \
    "select count(*) filter (where state = 'active'), count(*) filter (where state = 'idle'),
            count(*) filter (where wait_event_type = 'Lock')
       from pg_stat_activity where datname = 'rojer' and pid <> pg_backend_pid()" | tr '|' ',')
  sonde=$(curl -s -o /dev/null -w '%{time_total}' http://localhost:8080/login | awk '{printf "%.0f", $1 * 1000}')
  echo "$(date +%H:%M:%S),$app_cpu,$app_mem,$db_cpu,$pg,$sonde" >> "$sortie"
  sleep 5
done
