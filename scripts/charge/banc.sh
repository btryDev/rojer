#!/bin/sh
# Pilote le banc du test de charge (`docs/plan-test-de-charge.md` § 3).
#
#   sh scripts/charge/banc.sh preparer          certificat MinIO, .env.cc-local (une fois)
#   sh scripts/charge/banc.sh construire        image de l'application (lourd : seul)
#   sh scripts/charge/banc.sh demarrer xs|s     pile aux ressources de l'instance visée
#   sh scripts/charge/banc.sh latence <ms>      latence par aller-retour vers la base (0 = aucune)
#   sh scripts/charge/banc.sh semer [N] [G]     N comptes (50), G gros dossiers (5), sessions
#   sh scripts/charge/banc.sh arreter           arrête la pile (la base reste)
#   sh scripts/charge/banc.sh vider             arrête et efface base et fichiers du banc
#
# Projet Compose à part (`rojer-charge`) : ni la pile `rojer-cc` d'une autre
# session, ni `duerp-db`, ni GestBAT ne sont touchés. Ports : 8080 (app),
# 5435 (base, sans latence), 8474 (API Toxiproxy).
#
# Tailles Clever Cloud (scalers) : XS = 1 vCPU, 1 Go ; S = 2 vCPU, 2 Go.
# À revérifier dans la console au moment de la campagne Clever Cloud.
set -eu

racine=$(cd "$(dirname "$0")/../.." && pwd)
cd "$racine"
banc=".charge"
env_local=".env.cc-local"
compose() {
  docker compose -p rojer-charge -f docker-compose.cc.yml -f docker-compose.charge.yml \
    --env-file "$env_local" "$@"
}
base_locale="postgresql://rojer:rojer@localhost:5435/rojer"

refuser_si_pile_cc() {
  if docker ps --format '{{.Names}}' | grep -q '^rojer-cc-'; then
    echo "La pile rojer-cc d'une autre session tourne (mêmes ports) : l'arrêter d'abord, ou attendre." >&2
    exit 1
  fi
}

case "${1:-}" in
  preparer)
    mkdir -p "$banc/certs"
    if [ ! -f "$banc/certs/public.crt" ]; then
      openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=minio" \
        -addext "subjectAltName=DNS:minio" \
        -keyout "$banc/certs/private.key" -out "$banc/certs/public.crt" 2>/dev/null
      echo "Certificat du banc : $banc/certs/public.crt"
    fi
    if [ ! -f "$banc/rapport-1mo.pdf" ]; then
      # Le rapport déposé par le parcours Saisie : un PDF de 1 Mo (en-tête
      # %PDF-, ce que le contrôle du contenu lit), le reste en commentaires.
      python3 -I -c "
import sys
corps = b'%PDF-1.4\n' + b''.join(b'% remplissage du test de charge ' + str(i).encode() + b'\n' for i in range(30000))
corps = corps[: 1024 * 1024 - 6] + b'%%EOF\n'
open(sys.argv[1], 'wb').write(corps)" "$banc/rapport-1mo.pdf"
    fi
    if [ ! -f "$env_local" ]; then
      printf 'BETTER_AUTH_SECRET=%s\nAPP_ENV=preview\n' "$(openssl rand -base64 32)" > "$env_local"
      echo "$env_local créé (secret propre au banc)."
    fi
    ;;
  construire)
    refuser_si_pile_cc
    compose build app
    ;;
  demarrer)
    refuser_si_pile_cc
    case "${2:-}" in
      xs) export APP_CPUS=1 APP_MEM=1g ;;
      s) export APP_CPUS=2 APP_MEM=2g ;;
      *) echo "Taille : xs ou s." >&2; exit 2 ;;
    esac
    export BASE_POOL="${BASE_POOL:-5}"
    compose up -d --no-build
    echo "Pile démarrée : ${2} (${APP_CPUS} cœur(s), ${APP_MEM}), pool ${BASE_POOL}. http://localhost:8080"
    ;;
  latence)
    ms="${2:?latence en millisecondes}"
    curl -s -X DELETE http://localhost:8474/proxies/base/toxics/latence >/dev/null || true
    if [ "$ms" -gt 0 ]; then
      # En aval (réponses de la base) : un aller-retour paie la latence une fois.
      curl -sf -X POST http://localhost:8474/proxies/base/toxics \
        -d "{\"name\":\"latence\",\"type\":\"latency\",\"stream\":\"downstream\",\"attributes\":{\"latency\":$ms}}" >/dev/null
    fi
    echo "Latence vers la base : ${ms} ms par aller-retour."
    ;;
  semer)
    secret=$(sed -n 's/^BETTER_AUTH_SECRET=//p' "$env_local")
    DATABASE_URL="$base_locale" DIRECT_URL="$base_locale" BETTER_AUTH_SECRET="$secret" \
      PUBLIC_APP_URL=http://localhost:8080 \
      pnpm exec tsx --import ./scripts/server-only-hors-next.mjs scripts/charge/semer-comptes.ts \
      --comptes "${2:-50}" --gros "${3:-5}" --sortie "$banc/sessions.json"
    ;;
  arreter)
    compose stop
    ;;
  vider)
    compose down -v
    rm -rf "$banc/sessions.json"
    ;;
  *)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
    ;;
esac
