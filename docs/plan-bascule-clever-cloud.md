# Plan de bascule vers Clever Cloud (et Better Auth)

Rédigé le 2026-10-30 sur `main` 9bdbb47d, à la demande de la propriétaire.
Rien n'est codé ni configuré par ce document : il ordonne ce que les audits ont
déjà demandé, le confronte à la documentation de Clever Cloud, de Better Auth,
de Next.js et de Prisma (lues le 2026-10-30, URL en annexe), et dit ce qui reste
à trancher.

**Le principe** : tout ce qui ne dépend pas de l'hébergeur part d'abord en
production sur Vercel, où il est vérifiable sans rien couper. Clever Cloud se
monte ensuite à côté, en préproduction, sans toucher à la prod. On répète la
bascule sur une copie, chronomètre en main. La bascule elle-même n'est alors
qu'une fenêtre courte et réversible.

Sources du dépôt reprises ici, sans les recopier (identifiants d'origine entre
parenthèses) :
`docs/revues/audit-owasp-2026-10-13.md` (B1-B16, S7),
`docs/verification-asvs-L2-2026-10.md` (B17-B31),
`docs/revues/audit-nextjs-2026-10-14.md` (H2-H6, M5-M11, « Critères de recette »),
`docs/revues/audit-acces-donnees-2026-10-29.md` (AD),
`docs/plan-performance.md` (« Hors plan », lots 7 et 8),
`docs/deploiement-stockage.md`,
`docs/revues/audit-base-2026-10-28.md` (BA, « Bascule Clever Cloud »).

---

## 1. Node.js ou Docker : **Node.js natif**

Clever Cloud n'a pas de guide Next.js. Le plus proche est son guide Nuxt, en
Node natif. Ce qui tranche :

| | Node.js natif | Docker |
|---|---|---|
| pnpm | détecté par `pnpm-lock.yaml`, version prise dans `packageManager` | à écrire dans le Dockerfile |
| Version de Node | `engines.node` (déjà `>=22.15 <25`) ou `CC_NODE_VERSION` | dans l'image |
| Migrations au démarrage | `CC_PRE_RUN_HOOK`, documenté pour cet usage ; son échec fait échouer le déploiement | la doc se contredit : une page dit tous les hooks supportés, une autre seulement `CC_RUN_SUCCEEDED_HOOK` |
| Mémoire | `--max-old-space-size` réglé aux 3/4 de la RAM | limitée à la RAM, sans swap |
| Pgpool-II | disponible | non |
| À maintenir | rien | un Dockerfile, ses mises à jour de sécurité |

Docker ne se justifierait que pour une dépendance système absente de l'image
Node. Ce n'est pas le cas : `sharp` livre ses binaires précompilés. **Choix :
Node.js natif**, sortie `standalone`, démarrage par `CC_RUN_COMMAND`.

---

## 2. Décisions à prendre par la propriétaire

1. **Fournisseur d'e-mails.** Better Auth n'envoie rien lui-même : vérification
   d'adresse, mot de passe oublié et OTP passent par une fonction qu'on branche.
   Aujourd'hui, c'est Supabase qui les envoie, et l'app n'a qu'un pilote
   `console` (`src/lib/email/index.ts`). **Le lot e-mail, gelé, devient un
   prérequis de la bascule.** Il faut un fournisseur hébergé dans l'UE, et
   jamais de test sur btry.fr.
2. **Mots de passe.** Recommandé : importer les hachés bcrypt de Supabase, comme
   le fait le guide officiel de Better Auth. Personne ne réinitialise ; chacun
   se reconnecte une fois. L'autre voie est une réinitialisation forcée.
3. **Double authentification** (B22) : le plugin `twoFactor` dès la bascule, ou
   une justification écrite pour plus tard.
4. **Fenêtre de coupure.** La prod n'a pas de clients réels (données factices
   au 2026-10-08, à revérifier). Une page de maintenance de l'ordre d'une heure
   suffit, sans réplication logique.
5. **Contradictions entre audits** (§ 9), à trancher une à une.
6. **Taille des plans**, voir § 5 : base XS (75 connexions) et app XS, avec
   instance de build S.

---

## 3. Phase 0 — le code, avant la bascule, déployé sur Vercel

Chaque point est un lot ordinaire, revu puis fusionné, et vérifiable en prod
actuelle.

| # | Quoi | Source | État au 2026-10-30 |
|---|---|---|---|
| 0.1 | La preuve de signature lit l'IP par le helper commun (`securite/ip-client.ts`), pas par `x-forwarded-for` découpé à la main | B17 | **à faire** : `signatures/actions.ts:360` et `:619` prennent la première entrée, forgeable |
| 0.2 | Migrations hors du build : `scripts/migrer-en-production.sh` ne migre que sur Vercel ; ailleurs, c'est le rôle du hook de démarrage | B7, H5 | **à faire** : sans `VERCEL_ENV` mais avec `DIRECT_URL`, le script migre au build, ce qui serait le cas chez Clever Cloud |
| 0.3 | `output: "standalone"`, avec copie de `public/` et `.next/static` après le build | H5 | à faire |
| 0.4 | Export ZIP borné à moins de **180 s**, le délai du proxy de Clever Cloud (aujourd'hui `maxDuration` vaut 300 s) ; sinon, export asynchrone | H3, H5 | à faire : mesurer le plus gros dossier réel |
| 0.5 | `EXPORTS_SIMULTANES` validée dans `src/env.ts` | H3 | partiel : la variable est dans `.env.example` seulement |
| 0.6 | `Clear-Site-Data` à la déconnexion | B30 | à faire, ou avec Better Auth |
| 0.7 | Pilote de stockage S3 (Cellar) derrière `FileStorage`, avec délai sortant | ST, M9 | à faire. Points connus : `region: 'default'`, et `requestChecksumCalculation` / `responseChecksumValidation` à `WHEN_REQUIRED` avec le SDK v3 récent |
| 0.8 | Pilote d'e-mail réel | décision 1 | à faire, gelé |
| 0.9 | Retrait des données mortes en deux déploiements : `Intervention`, `chiffonsImpregnes`, `classeIgh`, `familleHabitation`, `pdfUrl` | BA 2 | à faire, après lecture de `scripts/sante-base.sql` en prod |
| 0.10 | `DemandeAssistance.userId` en UUID, comme les trois autres `userId` | BA | à faire |
| 0.11 | Antivirus des dépôts, ou décision écrite | B29 | à trancher |
| 0.12 | Plafond total de renvois d'OTP par jeton | B3, B14 | non retrouvé dans le code : à vérifier |

Déjà fait, et sans rien à refaire : `APP_ENV` (H5), hôtes MCP par
`PUBLIC_APP_URL`, exports sous sémaphore et ZIP en flux (H3), un seul
`PrismaClient` (M5), `env.ts` et `instrumentation.ts` (M6), délais sortants
(M9), CSP à nonce (S7), CSP `sandbox` des fichiers (B18), limitation de débit
en base, `next` 16.4.1 (B24), bombe XLSX close (le rapport ASVS la dit encore
ouverte : il est périmé sur ce point).

---

## 4. Phase 1 — Better Auth, sur une branche

**Avant de coder : une ADR.** L'ADR-005 avait écarté Better Auth, et l'ADR-013
son plugin OAuth. La nouvelle ADR les amende. Version visée : `better-auth`
1.7.x (1.7.14 au 2026-10-26).

Ce que le changement doit tenir :

- **Un seul point de lecture de l'identité.** `requireUser(): {id, email}` passe
  sur `auth.api.getSession({ headers })`. Douze fichiers dépendent de Supabase
  Auth (liste en annexe B).
- **Mêmes identifiants.** Le script du guide de migration conserve `id` =
  l'UUID Supabase, donc les `userId` des tables métier restent valides. Les
  nouveaux comptes doivent aussi être des UUID (`advanced.database.generateId:
  "uuid"`, à poser explicitement : deux pages de la doc se contredisent sur la
  valeur par défaut) (H6).
- **Collision de noms** : la table `verification` de Better Auth se renomme par
  `modelName` (par exemple `authVerification`), avant de générer son schéma
  (BA 1). `auth generate` pour Prisma a une issue ouverte (#12134), relations en
  double : relire le diff.
- **Mots de passe** : `verify` à deux branches, bcrypt pour les hachés importés
  (`$2a$`, `$2b$`) et scrypt sinon. Un `verify` personnalisé désactive la
  détection automatique. Écrire les paramètres retenus (B4, B27). Longueur
  minimale 12, déjà en place côté app.
- **Server Actions** : plugin `nextCookies()`, en **dernier** dans la liste,
  sinon une connexion faite dans une action ne pose pas de cookie.
- **Proxy optimiste** : `getSessionCookie` ne teste que la présence du cookie.
  La validation se fait dans `requireUser`, sur chaque page, action et route
  (H4). Le 401 sur `/api` est déjà fait.
- **Cookies et origines** (B1, B2) : `httpOnly`, `secure`, `SameSite=Lax`,
  `BETTER_AUTH_SECRET`, `baseURL` et `trustedOrigins` fixés depuis
  `PUBLIC_APP_URL`, sans joker ni localhost. Ne jamais désactiver les
  contrôles CSRF et d'origine.
- **Sessions** (B20, B21) : durée absolue et délai d'inactivité écrits
  (défaut : 7 jours, rafraîchie chaque jour), liste et révocation des sessions,
  `revokeOtherSessions` au changement de mot de passe, réauthentification
  avant un changement d'e-mail ou de mot de passe. Laisser `cookieCache`
  désactivé : avec lui, une session révoquée reste valide jusqu'à expiration
  du cache.
- **Limitation de débit** : celle de Better Auth est en mémoire par défaut,
  fausse dès deux instances. `rateLimit.storage: "database"`, ou garder la
  limitation de l'app, qui est déjà en base (B3, voir § 9).
- **IP derrière le proxy** : `advanced.ipAddress.ipAddressHeaders` sur
  l'en-tête que Clever Cloud pose, et le même helper que 0.1 (B17).
- **OTP par e-mail** : `storeOTP: "hashed"`, la valeur par défaut étant `plain`.
- **Mémoïsation de la session hors RSC** (M7), par `AsyncLocalStorage`.
- **Journal** : les événements d'authentification vont au drain de logs (B25).

**Le MCP n'est pas dans la bascule.** `/api/mcp/[cle]` reste en place, clé
tournée. L'accès par compte (OAuth) vient après, avec `@better-auth/mcp`.
L'ancien plugin `mcp` de `better-auth/plugins` est déprécié. Voir § 8.

---

## 5. Phase 2 — Clever Cloud en préproduction, à côté de Vercel

Tout se fait dans la région **Paris (`par`)**, application et base dans la
même zone (B12, AD § 3).

**Application Node.js**
- Instance XS (1 Go) pour commencer, build sur une instance dédiée S (2 Go).
  Le déploiement sans coupure garde les anciennes instances jusqu'à ce que
  les nouvelles répondent.
- Variables :
  - `NODE_ENV=production`, `APP_ENV=production` (ou `preview` sur la
    préproduction) ;
  - `CC_NODE_DEV_DEPENDENCIES=install` : avec pnpm, les devDependencies sont
    exclues par défaut, et Next comme le CLI Prisma en ont besoin au build ;
  - `CC_POST_BUILD_HOOK` : `pnpm build` (sans migration, cf. 0.2), puis la
    copie de `public/` et `.next/static` ;
  - `CC_PRE_RUN_HOOK` : `prisma migrate deploy` ;
  - `CC_RUN_COMMAND` : `node .next/standalone/server.js`, avec `PORT=8080` et
    `HOSTNAME=0.0.0.0` ;
  - `CC_HEALTH_CHECK_PATH` : une route légère qui répond 200.
- Au-delà d'une instance : `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` commune,
  fournie au build, et un `deploymentId` stable (le hash git).
- Le hook de migration s'exécute sur chaque instance qui démarre. Le verrou
  consultatif de Prisma les sérialise. **La migration tourne pendant que
  l'ancienne version sert encore : elle doit rester compatible avec elle**,
  ce que la règle `migrations-index.test.ts` tient déjà pour les verrous.
- Arrêt propre sur SIGTERM : Next finit les requêtes en cours.

**PostgreSQL**
- Version 17, comme la prod et la CI. Plan XS (1 Go, 75 connexions) :
  2 instances × pool de 5 à 10, doublé pendant un déploiement, plus les
  migrations et les scripts, reste en dessous (AD).
- `ALTER DATABASE … SET timezone = 'UTC'` à la création (BA 4).
- `DATABASE_URL` sans `pgbouncer=true` ni `connection_limit=1`, avec un pool
  explicite (`connection_limit` 5 à 10) (H2, AD). `DIRECT_URL` sur le nom
  d'hôte direct, à régénérer après toute migration de l'add-on.
- TLS : la doc de Clever Cloud ne dit rien de `sslmode`. À vérifier,
  `verify-full` visé (B19).
- **À demander au support, pour des données de salariés** : le chiffrement au
  repos (LUKS, non activé par défaut), le PITR (pgBackRest, non installé par
  défaut), et une rétention des sauvegardes plus longue que 7 jours si besoin.
  Prévoir aussi un dump chiffré mensuel hors de Clever Cloud (B13).
- Rôle applicatif distinct du rôle de migration (B6). La RLS est activée sans
  politique : un rôle non propriétaire ne voit aucune ligne, sans erreur
  (BA 6, voir § 9).
- Réseau : les Network Groups sont en bêta pour les add-ons, et la liste d'IP
  autorisées n'est pas documentée. À demander.

**Cellar**
- Bucket privé, clés limitées à ce bucket, aucune URL publique, versionnage
  activé (B9). Fichiers servis par l'app, ou par URL présignée courte.

**Journaux et mesure**
- Rétention native de 7 jours seulement : un drain (Better Stack, Datadog,
  syslog…) avec une durée de conservation décidée (B10).
- Lot 7 (OpenTelemetry, Web Vitals) à poser ici, pour avoir des chiffres avant
  et après (PP, AD option 5).

**Domaine de préproduction** : un sous-domaine, HSTS, CSP revérifiée sur ce
domaine (M11, B8).

---

## 6. Phase 3 — répétition générale

Sur la préproduction, avec une copie de la prod, chronomètre en main :

1. `scripts/sante-base.sql` sur la prod (lecture seule).
2. `pg_dump` depuis Supabase par la connexion **directe ou le pooler de
   session**, jamais le pooler de transaction : `-n public --no-owner
   --no-privileges`, `_prisma_migrations` compris. pg_dump doit être d'une
   version majeure au moins égale à celle du serveur (BA 5).
3. `pg_restore` avec `--exit-on-error`, puis `ANALYZE`.
4. Migration des comptes : le script du guide Better Auth, lu et adapté
   (`auth.users` + `auth.identities` → `user`, `account`), par lots
   transactionnels.
5. Recopie des fichiers Supabase Storage → Cellar, clé par clé (ST).
6. Vérifications : comptes de lignes par table, `last_value` des séquences,
   `sante-base.sql`, toutes les clés de fichiers présentes dans Cellar (BA 7).
7. Recette (§ 7.2) sur la préproduction.
8. **Durée totale mesurée = fenêtre de coupure annoncée.**

Recommencer jusqu'à ce que la répétition passe sans geste à la main.

---

## 7. Phase 4 — la bascule

### 7.1 Déroulé

- **J-2** : abaisser le TTL de l'enregistrement de l'app (rojer.fr reste chez
  OVH ; les MX ne bougent pas). Attendre l'expiration de l'ancien TTL.
  Prévenir les testeurs.
- **H0** : page de maintenance sur Vercel, ce qui gèle les écritures.
- Étapes 2 à 6 de la répétition, telles quelles.
- Déployer la version finale sur Clever Cloud, puis pointer le DNS vers
  Clever Cloud, en notant les anciennes valeurs.
- Recette courte (§ 7.2), levée de la maintenance.

### 7.2 Recette

Critères B1 à B31, les « Critères de recette » de l'audit Next.js, et en
particulier :
- connexion d'un compte migré **avec son ancien mot de passe** ; création d'un
  compte ; mot de passe oublié, avec un e-mail reçu ; déconnexion ;
- un `X-Forwarded-For` forgé ne se retrouve ni dans la preuve de signature ni
  dans la limitation de débit. La doc de Clever Cloud dit que la **première**
  entrée est l'IP du client, sans dire si son proxy écrase celle qu'envoie le
  client : c'est ce test qui décide quelle entrée lire (B17) ;
- dépôt et lecture d'un fichier ; export ZIP du plus gros dossier en moins de
  180 s ; aucune réponse personnelle mise en cache ;
- une requête en clair sur `/api/mcp*` est refusée, pas redirigée (B26) ;
- CSP, HSTS, `Clear-Site-Data` sur le domaine de production.

### 7.3 Retour arrière

La base Supabase n'est pas touchée pendant la bascule : elle reste intacte et
sans écriture. Revenir, c'est remettre l'ancien DNS et lever la maintenance sur
Vercel. Les écritures faites sur Clever Cloud entre-temps seraient perdues :
d'où une recette courte avant d'ouvrir. Le retour arrière n'est plus possible
une fois des écritures réelles acceptées sur Clever Cloud ; c'est le moment de
le décider.

---

## 8. Phase 5 — après la bascule

- Supabase gardé en lecture seule quelques semaines, puis supprimé (projet,
  stockage, clés). Vercel : projet mis en pause puis supprimé.
- Mesures de l'AD § 5.3 : `max_connections` réel, latence avec et sans le proxy
  de Clever Cloud, p95 par page, lot 8 (charge). Le chantier « moins de
  requêtes » ne rouvre que si plus d'un tiers du p95 du tableau de bord attend
  la base.
- MCP par compte (OAuth 2.1) : `@better-auth/mcp` avec le plugin JWT, PKCE,
  page de consentement, audience vérifiée (B5, B23), puis retrait de
  `/api/mcp/[cle]`, `MCP_CLE` et `MCP_ETABLISSEMENT_ID`. À vérifier : ce plugin
  n'a pas de statut de stabilité écrit, et une issue ouverte (#9961) fige
  l'émetteur sur `baseURL`.
- Prisma 7 **seulement après** : pas deux changements de fond en même temps
  (BA). La PR Dependabot #39 reste de côté d'ici là.
- Clés étrangères vers `user.id` (`Entreprise.userId`…), possibles une fois
  les comptes en base (BA 8).
- Tâches planifiées : purge des jetons, OTP, limites et IP expirés (BA).

---

## 9. Contradictions à trancher

| Sujet | D'un côté | De l'autre | Proposition |
|---|---|---|---|
| RLS | B15 : la garder en défense en profondeur | BA 6 : un rôle non propriétaire ne voit rien ; la désactiver ou donner `BYPASSRLS` | Le rôle applicatif reçoit `BYPASSRLS` : l'isolation est dans le code (gardes `tenancy-*`), et la RLS sans politique protège contre un rôle mal configuré |
| TLS de la base | B6 : `sslmode=require` | B19 : `require` accepte un certificat auto-signé | `verify-full` si Clever Cloud fournit l'autorité de certification |
| Limitation de débit | B3 : celle de Better Auth | M11 : celle de l'app existe déjà, en base | Garder celle de l'app, et passer celle de Better Auth en base pour ses propres routes |
| Session | H4 : proxy optimiste par cookie | AD § 4 : session en base ou cookie signé | Session en base (révocable, B20), sans `cookieCache` |
| `MCP_HOTES` | H5 : obligatoire | correctif de H5 : `PUBLIC_APP_URL` suffit | `PUBLIC_APP_URL`, c'est ce qui est en place |
| Lot 7 | PP : à la bascule, pas avant | AD § 5.2 : mesurer la prod avant | Le poser en préproduction (§ 5), qui donne l'« avant » sur la même infrastructure |

---

## 10. Ce qui reste à vérifier (non documenté par Clever Cloud)

- Le proxy écrase-t-il un `X-Forwarded-For` envoyé par le client ? (test § 7.2)
- `sslmode` et autorité de certification de l'add-on PostgreSQL.
- Taille maximale du corps de requête (les dépôts vont jusqu'à 25 Mo).
- Mise en mémoire tampon du proxy : le streaming des pages en dépend (AD § 4).
- Hooks en Docker : sans objet si Node natif est retenu.

---

## Annexe A — sources externes (lues le 2026-10-30)

Clever Cloud :
- Node.js : https://www.clever.cloud/developers/doc/deploy/applications/nodejs/
- Docker : https://www.clever.cloud/developers/doc/deploy/applications/docker/
- Hooks : https://www.clever.cloud/developers/doc/develop/common-configuration/build-hooks/
- Cycle de vie, déploiement sans coupure : https://www.clever.cloud/developers/doc/develop/common-configuration/lifecycle/
- Health check : https://www.clever.cloud/developers/doc/develop/common-configuration/healthcheck/
- PostgreSQL : https://www.clever.cloud/developers/doc/deploy/databases/postgresql/
- Plans et connexions : https://api.clever-cloud.com/v2/products/addonproviders
- Chiffrement au repos : https://www.clever.cloud/developers/doc/security/encryption-at-rest/
- Cellar : https://www.clever.cloud/developers/doc/deploy/storage/cellar/
- Délai du proxy (180 s) : https://www.clever.cloud/developers/doc/find-help/troubleshooting/
- FAQ (IP client, sauvegardes) : https://www.clever.cloud/developers/doc/find-help/faq/
- Logs et drains : https://www.clever.cloud/developers/doc/develop/observability/logs/ et …/drains/
- Conformité (ISO 27001, HDS ; SecNumCloud en cours) : https://www.clever.cloud/compliance

Better Auth :
- Migration depuis Supabase : https://www.better-auth.com/docs/guides/supabase-migration-guide
- Base de données (`modelName`, `generateId`) : https://www.better-auth.com/docs/concepts/database
- Sécurité : https://www.better-auth.com/docs/reference/security
- Limitation de débit : https://www.better-auth.com/docs/concepts/rate-limit
- Sessions : https://www.better-auth.com/docs/concepts/session-management
- Next.js : https://www.better-auth.com/docs/integrations/next
- E-mails : https://www.better-auth.com/docs/concepts/email
- MCP : https://www.better-auth.com/docs/plugins/mcp

Next.js, Prisma, PostgreSQL :
- Auto-hébergement : https://nextjs.org/docs/app/guides/self-hosting
- Sortie `standalone` : https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- `deploymentId` : https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId
- Pool Prisma 6 : https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections
- Migrations en production : https://www.prisma.io/docs/v6/orm/prisma-migrate/workflows/development-and-production
- pg_dump / pg_restore 17 : https://www.postgresql.org/docs/17/app-pgdump.html et …/app-pgrestore.html
- Sortir de Supabase (connexion de dump) : https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres

## Annexe B — ce qui dépend de Supabase et de Vercel (relevé le 2026-10-30)

- **Supabase Auth (12 fichiers)** : `src/proxy.ts`,
  `app/auth/callback/route.ts`, `app/auth/reinitialisation/ResetPasswordForm.tsx`,
  `lib/auth/require-user.ts`, `lib/auth/actions.ts`,
  `lib/accessibilite/sujet-public.ts`, `lib/supabase/{client,server,middleware}.ts`,
  `lib/mcp/acces-oauth.ts`, `lib/mcp/acces-oauth-deps.ts`, `src/env.ts`.
- **Supabase Storage (3)** : `lib/storage/index.ts`, `supabase.ts`,
  `cle-service.ts`.
- **Vercel** : `src/env.ts`, `src/lib/environnement.ts`, `src/lib/mcp/hotes.ts`,
  `src/lib/calendrier/regeneration-sure.ts`, les deux routes MCP
  (`maxDuration`), `api/…/controle-zip/route.ts` (`maxDuration` 300),
  `scripts/migrer-en-production.sh`, `vercel.json` (région `dub1`).
- Plus 4 tests et 3 scripts qui importent `@supabase`.
