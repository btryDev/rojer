#!/bin/sh
# Démarrage chez Clever Cloud, et dans la pile locale qui l'imite (plan de
# bascule, § 5 bis). Un seul script pour les deux gestes du démarrage :
#
#   sh scripts/demarrer-cc.sh migrer           CC_PRE_RUN_HOOK : migrations
#   sh scripts/demarrer-cc.sh servir           CC_RUN_COMMAND : le serveur autonome
#   sh scripts/demarrer-cc.sh lancer <cmd…>    toute autre commande sur l'instance
#                                              (clever ssh : seed, script) avec la même base
#   sh scripts/demarrer-cc.sh verifier         affiche l'URL construite, mot de passe masqué
#
# Pourquoi un script : Clever Cloud ne développe pas `$VAR` dans la valeur
# d'une variable — `DATABASE_URL=$POSTGRESQL_ADDON_URI` y reste littéral
# (constaté par GestBAT). Un shell, lui, le fait. On construit donc ici
# `DATABASE_URL` depuis l'add-on, avec le pool et le TLS, sans toucher au code
# ni au développement local.
#
# Variables lues :
#   POSTGRESQL_ADDON_URI   posée par l'add-on : elle l'emporte toujours
#   DATABASE_URL           seulement sans add-on (une valeur héritée ne doit
#                          pas remplacer la base de l'add-on en silence)
#   BASE_CA_PEM            certificat de l'add-on (auto-signé), PEM complet :
#                          TLS vérifié contre lui, hôte compris
#   BASE_EN_CLAIR_HOTE     le SEUL hôte joignable sans TLS (pile locale : `db`).
#                          Lié à un nom d'hôte, jamais à NODE_ENV : sans
#                          certificat, tout autre hôte est refusé
#   BASE_POOL              connexions par instance (défaut 5 ; plan § 5)
#   PORT                   défaut 8080, celui que Clever Cloud attend
#   KEEP_ALIVE_TIMEOUT     ms qu'une connexion inactive reste ouverte
#                          (défaut 65000, entier ≥ 10000 ; voir `servir`)
set -eu

mode="${1:-}"
case "$mode" in
  migrer|servir|verifier) ;;
  lancer) shift; [ $# -gt 0 ] || { echo "lancer : quelle commande ?" >&2; exit 2; } ;;
  *) echo "Usage : sh scripts/demarrer-cc.sh migrer|servir|verifier|lancer <commande>" >&2; exit 2 ;;
esac

base="${POSTGRESQL_ADDON_URI:-${DATABASE_URL:-}}"
if [ -z "$base" ]; then
  echo "Ni POSTGRESQL_ADDON_URI ni DATABASE_URL : aucune base à joindre." >&2
  exit 1
fi
# Refusées ici plutôt que dans Prisma : des paramètres déjà présents (un
# `sslmode` hérité désactiverait la vérification sans bruit), et une valeur
# restée littérale (« $POSTGRESQL_ADDON_URI », le piège même que ce script
# contourne) ou mal formée.
case "$base" in
  *\?*)
    echo "L'URL de la base porte déjà des paramètres (« ? ») : à relire, ce script pose les siens." >&2
    exit 1 ;;
  postgres://*|postgresql://*) ;;
  *) echo "L'URL de la base ne commence pas par postgresql:// : à relire." >&2; exit 1 ;;
esac

# L'hôte : entre le dernier « @ » et le « : » ou « / » qui suit.
hote=$(printf '%s' "$base" | sed -E 's#^[a-z]+://([^@]*@)?##; s#[:/].*$##')
if [ -z "$hote" ]; then
  echo "Hôte illisible dans l'URL de la base." >&2
  exit 1
fi

parametres="connection_limit=${BASE_POOL:-5}"
if [ -n "${BASE_CA_PEM:-}" ]; then
  # Une variable sur une ligne porte souvent des « \n » littéraux : on les
  # rend (un PEM ne contient jamais de barre oblique inverse), puis on exige
  # la forme d'un certificat plutôt qu'un échec obscur à la poignée de main.
  pem=$(printf '%s\n' "$BASE_CA_PEM" | sed 's/\\n/\
/g')
  case "$pem" in
    *"-----BEGIN CERTIFICATE-----"*"-----END CERTIFICATE-----"*) ;;
    *) echo "BASE_CA_PEM n'a pas la forme d'un certificat PEM (BEGIN/END CERTIFICATE)." >&2; exit 1 ;;
  esac
  # Nom imprévisible, droits 600 (mktemp) : ni deviné ni lu par un autre compte.
  ca=$(mktemp "${TMPDIR:-/tmp}/rojer-base-ca.XXXXXX")
  printf '%s\n' "$pem" > "$ca"
  # Prisma 6 (moteur Rust) : `sslcert` = l'autorité de confiance,
  # `sslaccept=strict` = chaîne et hôte vérifiés.
  parametres="$parametres&sslmode=require&sslcert=$ca&sslaccept=strict"
elif [ "$hote" = "${BASE_EN_CLAIR_HOTE:-}" ]; then
  parametres="$parametres&sslmode=disable"
else
  echo "Base « $hote » sans BASE_CA_PEM : connexion en clair refusée." >&2
  echo "Poser le certificat de l'add-on dans BASE_CA_PEM (plan de bascule, § 5)." >&2
  exit 1
fi

DATABASE_URL="$base?$parametres"
# Pas de pooler devant la base chez Clever Cloud : les migrations prennent la
# même URL (le schéma Prisma lit `directUrl` dans DIRECT_URL).
DIRECT_URL="$DATABASE_URL"
export DATABASE_URL DIRECT_URL

case "$mode" in
  verifier)
    printf '%s\n' "$DATABASE_URL" | sed -E 's#^([a-z]+://[^:@/]*):[^@]*@#\1:***@#'
    ;;
  migrer)
    # Place disque mesurée avant de rien effacer (plan § 5 bis : GestBAT a dû
    # vider node_modules après les migrations ; nous, d'abord mesurer).
    df -h . 2>/dev/null | tail -1 || true
    # `exec` : l'échec des migrations est celui du hook, donc du déploiement.
    exec pnpm db:migrate
    ;;
  servir)
    test -f .next/standalone/server.js || {
      echo "Pas de .next/standalone/server.js : le build CC (pnpm build:cc) n'a pas tourné." >&2
      exit 1
    }
    # 0.0.0.0 : le contrôle de santé de Clever Cloud échoue si le serveur
    # n'écoute que sur localhost.
    # KEEP_ALIVE_TIMEOUT (ms, lu par le serveur autonome de Next) : par
    # défaut Node ferme une connexion inactive au bout de 5 s ; le
    # répartiteur de Clever Cloud la réutilise parfois à cet instant et
    # répond 502 sans que la requête atteigne l'application. Mesuré sur la
    # préprod XS le 2026-11-10 (k6, paliers 1 à 100 utilisateurs) : 9 puis
    # 5 réponses 502 sur ~6 100 pages à 5 s, 0 sur 6 176 à 65 s (PR #292 ;
    # détail dans le plan de test de charge, PR #291). Une valeur posée sur
    # l'application l'emporte, si c'est un entier de millisecondes ≥ 10000 :
    # Next la lit par parseInt, et « 65 » (des secondes) ou « 0 » rendraient
    # les 502 sans un mot.
    delai="${KEEP_ALIVE_TIMEOUT:-65000}"
    case "$delai" in
      ''|*[!0-9]*) echo "KEEP_ALIVE_TIMEOUT « $delai » : un entier de millisecondes (ex. 65000)." >&2; exit 1 ;;
    esac
    [ "$delai" -ge 10000 ] || { echo "KEEP_ALIVE_TIMEOUT « $delai » ms : 10000 au moins (des millisecondes, pas des secondes)." >&2; exit 1; }
    PORT="${PORT:-8080}" HOSTNAME=0.0.0.0 KEEP_ALIVE_TIMEOUT="$delai" \
      exec node .next/standalone/server.js
    ;;
  lancer)
    exec "$@"
    ;;
esac
