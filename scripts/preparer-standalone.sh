#!/bin/sh
# Complète le serveur autonome de Next après `next build` (plan de bascule
# Clever Cloud, 0.3). `output: "standalone"` ne copie ni `public/` ni
# `.next/static` : sans eux, le serveur répond mais sans images ni CSS/JS. Ni
# le fil des PDF (`dist-pdf/`, ADR-059), qu'aucune route n'importe.
# Documentation : https://nextjs.org/docs/app/api-reference/config/next-config-js/output
#
# Chez Clever Cloud (plan de bascule, § 5 bis) : CC_POST_BUILD_HOOK="pnpm build:cc"
# (webpack, puis ce script), CC_PRE_RUN_HOOK="sh scripts/demarrer-cc.sh migrer",
# CC_RUN_COMMAND="sh scripts/demarrer-cc.sh servir". Le CLI
# `prisma` est une devDependency, donc CC_NODE_DEV_DEPENDENCIES=install est
# requis (sans lui, « prisma: not found » fait échouer le déploiement).
set -e
test -f .next/standalone/server.js || { echo "Pas de .next/standalone/server.js : lancer next build avec output standalone."; exit 1; }
rm -rf .next/standalone/public .next/standalone/.next/static
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
# Le fil des PDF (ADR-059), construit par `scripts/construire-worker-pdf.mjs`
# juste avant ce script : le serveur autonome se place dans son dossier au
# démarrage (`process.chdir`), et le cherche dans `dist-pdf/`. Sans lui, la
# production échoue au premier export : on échoue ici plutôt.
test -f dist-pdf/pdf-worker.mjs || { echo "Pas de dist-pdf/pdf-worker.mjs : lancer node scripts/construire-worker-pdf.mjs avant ce script."; exit 1; }
rm -rf .next/standalone/dist-pdf
cp -r dist-pdf .next/standalone/dist-pdf
echo "Serveur autonome prêt : node .next/standalone/server.js"
