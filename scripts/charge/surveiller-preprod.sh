#!/bin/sh
# Relevé côté serveur pendant un scénario contre la préproduction Clever Cloud
# (même format que `surveiller.sh`, lu par `analyser.py`). Toutes les 5 s :
# processeur et mémoire du serveur Next sur l'instance (lus par une session
# SSH ouverte une fois), connexions à la base par état, et le temps d'une page
# légère (la sonde).
#
#   APP=app_… URL=https://… BASE_URI=postgresql://… \
#     sh scripts/charge/surveiller-preprod.sh <fichier.csv> &   … puis kill %1
#
# Lecture seule : rien n'est écrit sur l'instance ni dans la base.
set -eu
sortie="${1:?fichier de sortie}"
: "${APP:?APP (identifiant de l application Clever Cloud)}"
: "${URL:?URL (adresse publique de la préprod)}"
: "${BASE_URI:?BASE_URI (URI de la base préprod)}"
instance="$sortie.instance"

# Sur l'instance : processeur (deltas de /proc/stat) et mémoire résidente du
# serveur Next, une ligne « epoch cpu% rss_Mo » toutes les 5 s.
clever ssh --app "$APP" > "$instance" 2>/dev/null <<'EOF' &
prev=$(awk '/^cpu /{print $2+$3+$4+$5+$6+$7+$8, $5+$6}' /proc/stat)
while :; do
  sleep 5
  cur=$(awk '/^cpu /{print $2+$3+$4+$5+$6+$7+$8, $5+$6}' /proc/stat)
  set -- $prev $cur
  cpu=$(awk -v t0="$1" -v i0="$2" -v t1="$3" -v i1="$4" 'BEGIN{d=t1-t0; if(d>0) printf "%.0f", 100*(d-(i1-i0))/d; else print 0}')
  prev=$cur
  p=$(pgrep -f next-server | head -1)
  rss=$(awk '/VmRSS/{printf "%.0f", $2/1024}' /proc/$p/status 2>/dev/null || echo 0)
  echo "$(date +%s) $cpu $rss"
done
EOF
ssh_pid=$!
# Arrêter la boucle aussi : sans `exit`, `kill %1` ne coupait que la
# session SSH et la boucle continuait d'écrire.
trap 'kill $ssh_pid 2>/dev/null' EXIT
trap 'exit 0' INT TERM

echo "heure,app_cpu,app_mem,db_cpu,connexions_actives,connexions_inactives,en_attente_verrou,sonde_ms" > "$sortie"
while :; do
  derniere=$(tail -1 "$instance" 2>/dev/null | awk 'NF==3' || true)
  app_cpu=$(echo "$derniere" | awk '{print ($2==""?0:$2)"%"}')
  app_mem=$(echo "$derniere" | awk '{print ($3==""?0:$3)"MiB"}')
  pg=$(docker run --rm --dns 1.1.1.1 postgres:18 psql "$BASE_URI" -Atc \
    "select count(*) filter (where state = 'active'), count(*) filter (where state = 'idle'),
            count(*) filter (where wait_event_type = 'Lock')
       from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid()" 2>/dev/null \
    | tr '|' ',' || echo "0,0,0")
  [ -n "$pg" ] || pg="0,0,0"
  sonde=$(curl -s -o /dev/null -w '%{time_total}' "$URL/login" | awk '{printf "%.0f", $1 * 1000}')
  echo "$(date +%H:%M:%S),$app_cpu,$app_mem,—,$pg,$sonde" >> "$sortie"
  sleep 5
done
