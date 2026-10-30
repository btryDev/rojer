#!/bin/sh
# Démarrage chez Clever Cloud, et dans la pile locale qui l'imite (plan de
# bascule, § 5 bis). Un seul script pour les deux gestes du démarrage :
#
#   sh scripts/demarrer-cc.sh migrer     CC_PRE_RUN_HOOK : migrations
#   sh scripts/demarrer-cc.sh servir     CC_RUN_COMMAND : le serveur autonome
#   sh scripts/demarrer-cc.sh verifier   affiche l'URL construite, mot de passe masqué
#
# Pourquoi un script : Clever Cloud ne développe pas `$VAR` dans la valeur
# d'une variable — `DATABASE_URL=$POSTGRESQL_ADDON_URI` y reste littéral
# (constaté par GestBAT). Un shell, lui, le fait. On construit donc ici
# `DATABASE_URL` depuis l'add-on, avec le pool et le TLS, sans toucher au code
# ni au développement local.
#
# Variables lues :
#   POSTGRESQL_ADDON_URI   posée par l'add-on (ignorée si DATABASE_URL l'est)
#   DATABASE_URL           sinon : la pile locale la pose elle-même
#   BASE_CA_PEM            certificat de l'add-on (auto-signé), PEM complet :
#                          TLS vérifié contre lui, hôte compris
#   BASE_EN_CLAIR_HOTE     le SEUL hôte joignable sans TLS (pile locale : `db`).
#                          Lié à un nom d'hôte, jamais à NODE_ENV : sans
#                          certificat, tout autre hôte est refusé
#   BASE_POOL              connexions par instance (défaut 5 ; plan § 5)
#   PORT                   défaut 8080, celui que Clever Cloud attend
set -eu

mode="${1:-}"
case "$mode" in
  migrer|servir|verifier) ;;
  *) echo "Usage : sh scripts/demarrer-cc.sh migrer|servir|verifier" >&2; exit 2 ;;
esac

base="${DATABASE_URL:-${POSTGRESQL_ADDON_URI:-}}"
if [ -z "$base" ]; then
  echo "Ni DATABASE_URL ni POSTGRESQL_ADDON_URI : aucune base à joindre." >&2
  exit 1
fi

# Des paramètres déjà présents se mêleraient aux nôtres sans qu'on sache
# lequel l'emporte (un `sslmode` hérité désactiverait la vérification) :
# mieux vaut s'arrêter et relire l'URL.
case "$base" in
  *\?*)
    echo "L'URL de la base porte déjà des paramètres (« ? ») : à relire, ce script pose les siens." >&2
    exit 1 ;;
esac

# L'hôte : entre le dernier « @ » et le « : » ou « / » qui suit.
hote=$(printf '%s' "$base" | sed -E 's#^[a-z]+://([^@]*@)?##; s#[:/].*$##')
if [ -z "$hote" ]; then
  echo "Hôte illisible dans l'URL de la base." >&2
  exit 1
fi

parametres="connection_limit=${BASE_POOL:-5}"
if [ -n "${BASE_CA_PEM:-}" ]; then
  ca="${TMPDIR:-/tmp}/rojer-base-ca.pem"
  printf '%s\n' "$BASE_CA_PEM" > "$ca"
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
    exec pnpm exec prisma migrate deploy
    ;;
  servir)
    test -f .next/standalone/server.js || {
      echo "Pas de .next/standalone/server.js : le build CC (pnpm build:cc) n'a pas tourné." >&2
      exit 1
    }
    # 0.0.0.0 : le contrôle de santé de Clever Cloud échoue si le serveur
    # n'écoute que sur localhost.
    PORT="${PORT:-8080}" HOSTNAME=0.0.0.0 exec node .next/standalone/server.js
    ;;
esac
