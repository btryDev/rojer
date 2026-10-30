# Pile locale « comme Clever Cloud » (plan de bascule, § 5 bis).
# Rejoue, dans un conteneur Linux, ce que Clever Cloud fait en Node natif :
# installation pnpm (dépendances de dev comprises : CC_NODE_DEV_DEPENDENCIES=install),
# build CC (`pnpm build:cc`, webpack), puis au démarrage migrations et serveur
# par le même script que chez Clever Cloud. Linux exprès : des erreurs de types
# passent sur macOS et cassent sur Linux (constat de GestBAT).
#
# Ce n'est PAS une image de production : Clever Cloud déploie en Node natif.
# Node 22, comme .nvmrc et la CI.
FROM node:22-bookworm-slim

# OpenSSL : requis par le moteur de Prisma.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# pnpm à la version de `packageManager`.
RUN corepack enable

WORKDIR /app
# Le dépôt entier avant l'installation, comme chez Clever Cloud : le
# `postinstall` lance `prisma generate`, qui lit `prisma/schema.prisma`.
COPY . .
RUN pnpm install --frozen-lockfile

# Les NEXT_PUBLIC_* sont figées dans le code au build, comme chez Clever Cloud
# où les variables de l'application sont présentes pendant le build.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NODE_ENV=production
RUN pnpm build:cc

EXPOSE 8080
CMD ["sh", "-c", "sh scripts/demarrer-cc.sh migrer && sh scripts/demarrer-cc.sh servir"]
