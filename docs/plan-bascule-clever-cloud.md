# Plan de bascule vers Clever Cloud (et Better Auth)

Rédigé le 2026-10-30 sur `main` 9bdbb47d, à la demande de la propriétaire.
Rien n'est codé ni configuré par ce document : il ordonne ce que les audits ont
déjà demandé, le confronte à la documentation de Clever Cloud, de Better Auth,
de Next.js et de Prisma (lues le 2026-10-30, URL en annexe), et dit ce qui reste
à trancher.

**Le principe** : tout ce qui ne dépend pas de l'hébergeur part d'abord en
production sur Vercel, où il est vérifiable sans rien couper. Clever Cloud se
monte ensuite à côté, en préproduction, sans toucher à la prod. La bascule
elle-même n'est alors qu'un changement de DNS, réversible.

**[2026-10-30, décision de la propriétaire : deux lignes jusqu'à la bascule.]**
Un testeur utilise la prod Vercel : rien ne doit la perturber, sans faire de
nœuds pour la préserver.
- **`main`** reste la prod Vercel, déployée au merge comme aujourd'hui. Y vont
  les lots qui servent les deux hébergeurs (correctifs, isolation, phase 0).
- **`cc`** porte la migration : Better Auth, le build Clever Cloud, ce qui ne
  tournerait plus sur Vercel/Supabase. Chaque lot est une PR vers `cc` (la CI
  tourne sur toute PR), déployée sur Clever Cloud par commande, jamais au merge.
- **Le flux ne va que de `main` vers `cc`** : chaque merge dans `main` est
  reporté dans `cc` par une fusion de `main`, tout de suite, pour que les
  conflits restent petits. Jamais `cc` vers `main` avant la bascule.
- **À la bascule** : `cc` fusionnée dans `main` une fois, Clever Cloud se
  déploie depuis `main` (toujours par commande), Vercel est supprimé.
- `vercel.json` désactive les aperçus Vercel de `cc` : un aperçu y tournerait
  un code que Supabase ne sert plus.

**Aucune donnée n'est migrée** (décision de la propriétaire du 2026-10-30) : les
comptes et dossiers actuels sont fictifs, créés pour les tests. Clever Cloud
part d'une base neuve, construite par les migrations ; les testeurs recréent
leurs comptes. Ni dump, ni import des mots de passe, ni recopie des fichiers.

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
| Mémoire | `--max-old-space-size` réglé aux 3/4 de la RAM [2026-10-30 : ~62 % mesuré par GestBAT, § 5 bis] | limitée à la RAM, sans swap |
| Pgpool-II | disponible | non |
| À maintenir | rien | un Dockerfile, ses mises à jour de sécurité |

Docker ne se justifierait que pour une dépendance système absente de l'image
Node. Ce n'est pas le cas : `sharp` livre ses binaires précompilés. **Choix :
Node.js natif**, sortie `standalone`, démarrage par `CC_RUN_COMMAND`.

---

## 2. Décisions de la propriétaire (2026-10-30)

1. **E-mails : l'add-on Mailpace de Clever Cloud.** Better Auth n'envoie rien
   lui-même (vérification d'adresse, mot de passe oublié, OTP, code de double
   authentification) ; aujourd'hui c'est Supabase, et l'app n'a qu'un pilote
   `console` (`src/lib/email/index.ts`). **Le lot e-mail, gelé, devient un
   prérequis de la bascule.** Ce que la doc dit de Mailpace :
   - API HTTPS et SMTP (`smtp.mailpace.com`, TLS) ; l'add-on donne une clé
     qu'on pose soi-même dans l'app (`MAILPACE_API_KEY`), rien n'est injecté ;
   - domaine d'envoi à vérifier, DKIM obligatoire avant tout envoi ;
   - **RGPD** : société britannique (OhMySMTP Ltd), données « hébergées en
     France » selon son DPA, mais **envois par des serveurs au Royaume-Uni**,
     e-mails conservés jusqu'à 30 jours. Transfert hors UE à inscrire dans le
     registre des traitements, sur la base de la décision d'adéquation
     UE–Royaume-Uni (à vérifier en vigueur au jour de la bascule) ;
   - prix non publiés : à lire dans la console ;
   - jamais de test sur btry.fr.
2. **Mots de passe et données : rien n'est migré** (voir l'en-tête). Better
   Auth hache en scrypt, sa valeur par défaut.
3. **Double authentification : oui, proposée** (B22), plugin `twoFactor` dès
   la bascule, non imposée. TOTP et code par e-mail, codes de secours,
   appareils de confiance 30 jours. La perte du facteur n'a que les codes de
   secours : aucune réinitialisation par un administrateur n'existe, il
   faudrait la construire le jour où un utilisateur perd les deux.
4. **Coupure** : sans données à copier, la bascule se réduit au DNS ;
   quelques minutes, testeurs prévenus.
5. **Taille des plans : XS** pour la base (75 connexions) et pour l'app, build
   sur une instance S.
6. **Contradictions entre audits** : propositions acceptées sous réserve de
   contre-vérification, faite le 2026-10-30 (§ 9). Deux ont changé.

---

## 3. Phase 0 — le code, avant la bascule, déployé sur Vercel

Chaque point est un lot ordinaire, revu puis fusionné, et vérifiable en prod
actuelle.

| # | Quoi | Source | État au 2026-10-30 |
|---|---|---|---|
| 0.1 | La preuve de signature lit l'IP par le helper commun (`securite/ip-client.ts`), pas par `x-forwarded-for` découpé à la main | B17 | ~~**à faire** : `signatures/actions.ts:360` et `:619` prennent la première entrée, forgeable~~ [2026-10-30 : PR #127, avec une garde] |
| 0.2 | Migrations hors du build : `scripts/migrer-en-production.sh` ne migre que sur Vercel ; ailleurs, c'est le rôle du hook de démarrage | B7, H5 | ~~**à faire**~~ [2026-10-30 : PR #127] |
| 0.3 | `output: "standalone"`, avec copie de `public/` et `.next/static` après le build | H5 | ~~à faire~~ [2026-10-30 : PR #127, `scripts/preparer-standalone.sh`, vérifié en local] |
| 0.4 | Export ZIP borné à moins de **180 s**, le délai du proxy de Clever Cloud (aujourd'hui `maxDuration` vaut 300 s) ; sinon, export asynchrone | H3, H5 | à faire : mesurer le plus gros dossier réel |
| 0.5 | `EXPORTS_SIMULTANES` validée dans `src/env.ts` | H3 | ~~partiel~~ [2026-10-30 : PR #127] |
| 0.6 | `Clear-Site-Data` à la déconnexion | B30 | à faire, ou avec Better Auth |
| 0.7 | Pilote de stockage S3 (Cellar) derrière `FileStorage`, avec délai sortant | ST, M9 | ~~à faire~~ [2026-10-30 : fusionné, PR #129 ; reste à la propriétaire : créer l'add-on et le bucket privé, sans versionnage (décision du 2026-10-30, RGPD), poser `STORAGE_DRIVER=s3` — `docs/deploiement-stockage.md`] |
| 0.8 | Pilote d'e-mail Mailpace (API HTTPS, clé `MAILPACE_API_KEY`, délai sortant), domaine d'envoi vérifié (DKIM) | décision 1 | ~~à faire~~ [2026-10-30 : code fusionné, PR #128 (06951fa5) ; reste à la propriétaire : créer l'add-on, DKIM dans la zone rojer.fr, Mailpace au registre RGPD] |
| 0.9 | Retrait des données mortes : `Intervention`, `chiffonsImpregnes`, `classeIgh`, `familleHabitation`, `pdfUrl` | BA 2 | facultatif : sans copie de données, ce n'est plus un préalable ; à faire quand on veut |
| 0.10 | `DemandeAssistance.userId` en UUID, comme les trois autres `userId` | BA | à faire, ou en phase 1 avec les clés étrangères vers `user` |
| 0.11 | Antivirus des dépôts, ou décision écrite | B29 | à trancher |
| 0.12 | Plafond total de renvois d'OTP par jeton | B3, B14 | ~~non retrouvé dans le code : à vérifier~~ [2026-10-30 : en place — 3 essais au total par lien, nouveaux codes compris (`access-tokens/verify.ts`), 5 envois par heure et par adresse (`OTP_ENVOIS_MAX_PAR_HEURE`), 60 s entre deux renvois] |
| 0.13 | Garde : aucun DDL (`CREATE`, `ALTER`, `DROP`, `GRANT`, `TRUNCATE`) ailleurs que dans `prisma/migrations` — l'app se connectant avec le rôle propriétaire, c'est la seule barrière | § 9 bis | à faire ; relevé le 2026-10-30 : aucun DDL dans `src/`, mais rien ne l'interdit |

Déjà fait, et sans rien à refaire : `APP_ENV` (H5), hôtes MCP par
`PUBLIC_APP_URL`, exports sous sémaphore et ZIP en flux (H3), un seul
`PrismaClient` (M5), `env.ts` et `instrumentation.ts` (M6), délais sortants
(M9), CSP à nonce (S7), CSP `sandbox` des fichiers (B18), limitation de débit
en base, `next` 16.4.1 (B24), bombe XLSX close (le rapport ASVS la dit encore
ouverte : il est périmé sur ce point).

---

## 4. Phase 1 — Better Auth, sur la branche `cc`

[2026-10-30 : ADR-052, PR #130. Better Auth n'entre pas dans `main` avant la
bascule (en-tête) ; il se teste sur la pile locale CC puis la préproduction.
Il vient après le lot « build CC et pile locale » (§ 5 bis).]

**Avant de coder : une ADR.** L'ADR-005 avait écarté Better Auth, et l'ADR-013
son plugin OAuth. La nouvelle ADR les amende. Version visée : `better-auth`
1.7.x (1.7.14 au 2026-10-26).

Ce que le changement doit tenir :

- **Un seul point de lecture de l'identité.** `requireUser(): {id, email}` passe
  sur `auth.api.getSession({ headers })`. Douze fichiers dépendent de Supabase
  Auth (liste en annexe B).
- **Identifiants en UUID**, comme les `userId` des tables métier (`@db.Uuid`) :
  `advanced.database.generateId: "uuid"`, à poser explicitement, deux pages de
  la doc se contredisant sur la valeur par défaut (H6).
- **Clés étrangères vers `user.id`** dès cette phase (`Entreprise.userId`,
  `Signature.userId`, `DemandeAssistance.userId`…). La base partant neuve,
  aucun compte orphelin ne peut les bloquer (BA 8).
- **Collision de noms** : la table `verification` de Better Auth se renomme par
  `modelName` (par exemple `authVerification`), avant de générer son schéma
  (BA 1). `auth generate` pour Prisma a une issue ouverte (#12134), relations en
  double : relire le diff.
- **Mots de passe** : scrypt, la valeur par défaut de Better Auth ; rien à
  importer. Paramètres écrits (B4, B27). Longueur minimale 12, déjà en place
  côté app ; mots de passe divulgués refusés.
- **Double authentification** (décision 3, B22) : plugin `twoFactor`, TOTP et
  code par e-mail (`sendOTP` par Mailpace), codes de secours, appareils de
  confiance. Activer la 2FA exige le mot de passe. Les routes `/two-factor/*`
  sont limitées à 3 essais par 10 s par Better Auth. Si elle est
  obligatoire : enrôlement forcé à la première connexion, codé côté app.
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
- **IP derrière le proxy** : ~~`advanced.ipAddress.ipAddressHeaders` sur
  l'en-tête que Clever Cloud pose~~ [2026-10-30, leçon de GestBAT (§ 5 bis) :
  le proxy de Clever Cloud AJOUTE l'adresse réelle à droite de
  `X-Forwarded-For`, et Better Auth en lit la première entrée, que le client
  écrit. Notre proxy calcule l'IP par `ipClient` (la dernière entrée), la
  publie dans un en-tête interne **écrasé à chaque requête** (sinon le client
  le forge), et `ipAddressHeaders` ne lit que celui-là], et le même helper que 0.1 (B17).
- **OTP par e-mail** : `storeOTP: "hashed"`, la valeur par défaut étant `plain`.
- **Mémoïsation de la session hors RSC** (M7), par `AsyncLocalStorage`.
- **Journal** : les événements d'authentification vont au drain de logs (B25).
- **Avec le lot d'isolation** (ADR-051, proposée, `lot/isolation-rls`) : les
  tables de Better Auth passent par le client hors compte, remis à son
  adaptateur dans un seul module ; la mémoïsation de l'identité hors rendu
  (M7) devient une condition de la variante « implicite » du client borné ;
  la clé MCP actuelle borne à un établissement, pas à un compte, d'où deux
  portées du client borné (compte, établissement).

**Le MCP n'est pas dans la bascule.** `/api/mcp/[cle]` reste en place, clé
tournée. L'accès par compte (OAuth) vient après, avec `@better-auth/mcp`.
L'ancien plugin `mcp` de `better-auth/plugins` est déprécié. Voir § 8.

---

## 5. Phase 2 — Clever Cloud en préproduction, à côté de Vercel

Tout se fait dans la région **Paris (`par`)**, application et base dans la
même zone (B12, AD § 3).

**Déploiement : une commande, jamais un merge** (décision de la propriétaire,
2026-10-30). Fusionner dans `main` ne déploie rien chez Clever Cloud :
- l'application Clever Cloud **n'est pas reliée à GitHub** (pas de
  déploiement automatique sur push) ;
- ~~une branche `cc` porte ce qui est en production ; déployer, c'est l'avancer
  sur le commit voulu de `main` (avance rapide seulement), la pousser sur
  GitHub pour la trace, puis lancer `clever deploy --branch cc --alias <app>`.
  La commande suit le déploiement jusqu'à sa fin (`--exit-on deploy-end`, par
  défaut) ;~~ [2026-10-30 : `cc` n'avance plus sur `main`, elle porte la
  migration (en-tête). Déployer, c'est déployer un commit de `cc` déjà poussé
  sur GitHub : `clever deploy --branch cc --alias <app>
  --same-commit-policy rebuild --exit-on deploy-end`. GestBAT a constaté
  qu'un simple `git push` vers Clever Cloud peut mettre à jour la référence
  sans lancer de build ; la politique par défaut (`error`) refuse un commit
  déjà poussé. Après la bascule, la même commande part de `main`.]
- un script versionné (`scripts/deployer-cc.sh`, ~~à écrire en phase 2~~
  [2026-10-30 : lot « build CC et pile locale », § 5 bis]) enchaîne
  ces gestes et refuse un arbre sale, ~~une branche qui ne serait pas en avance
  rapide~~ un commit absent de `origin/cc`, ou un commit dont la CI n'est pas verte ; une cible `preprod` et une
  cible `prod`, chacune son alias. **Il ne croit pas le message de fin** : il
  relit le commit servi (`clever status`) et appelle la route de santé ;
- revenir en arrière : redéployer le commit précédent de `cc`
  (`clever deploy --force` sur ce commit), sans toucher à `main`.
- d'ici la bascule, Vercel continue de déployer `main` comme aujourd'hui, et
  ne déploie jamais `cc`.

Source : https://cdn.jsdelivr.net/npm/clever-tools@4.10.0/src/commands/deploy/deploy.docs.md
(`--branch` : branche poussée, la courante par défaut ; `--force` ; `--same-commit-policy`).

**Application Node.js**
- Instance XS (1 Go) pour commencer (GestBAT, comparable, y tient à ~611 Mo),
  build sur une instance dédiée ~~S (2 Go)~~ M (§ 5 bis).
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
  - [2026-10-30, § 5 bis : le hook et la commande passent par
    `scripts/demarrer-cc.sh`, qui construit `DATABASE_URL` depuis
    `POSTGRESQL_ADDON_URI` — CC ne développe pas `$VAR` dans une variable —,
    et le build par `next build --webpack`] ;
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
- `DATABASE_URL` sans `pgbouncer=true` ni `connection_limit=1`, avec un pool
  explicite (`connection_limit` 5 à 10) (H2, AD). `DIRECT_URL` sur le nom
  d'hôte direct, à régénérer après toute migration de l'add-on.
- TLS : la doc de Clever Cloud ne dit rien du chiffrement en transit. À
  constater sur l'add-on (`SHOW ssl;`, `SELECT * FROM pg_stat_ssl;`) et à
  demander au support avec l'autorité de certification (B19, § 9).
  [2026-10-30 : GestBAT l'a constaté en prod le 2026-10-22 — TLS 1.3, et le
  certificat de l'add-on est **auto-signé** : il l'épingle comme autorité, en
  vérification stricte, et un faux certificat est refusé. Pour nous (Prisma 6,
  moteur Rust, URL de connexion) : `sslmode=verify-full&sslrootcert=<fichier>`,
  le fichier écrit au démarrage depuis une variable. Plus besoin de le
  demander au support ; reste à le constater sur notre add-on.]
- **À demander au support, pour des données de salariés** : le chiffrement au
  repos (LUKS, non activé par défaut), le PITR (pgBackRest, non installé par
  défaut), et une rétention des sauvegardes plus longue que 7 jours si besoin.
  Prévoir aussi un dump chiffré mensuel hors de Clever Cloud (B13).
- **Un seul rôle, le propriétaire** : Clever Cloud ne permet pas de créer
  d'autre utilisateur que ceux de son plan de contrôle (le propriétaire et des
  lecteurs), et ne donne pas de superutilisateur. Le rôle applicatif distinct
  (B6) n'est donc pas atteignable : l'écart est accepté et écrit. La RLS, active
  sans politique, ne gêne pas le propriétaire, qui y échappe ; elle reste
  (voir § 9).
- `ALTER DATABASE … SET timezone = 'UTC'` en tant que propriétaire : non
  documenté, à constater à la création. `pg_stat_statements` est disponible par
  défaut.
- Réseau : les Network Groups sont en bêta pour les add-ons, et la liste d'IP
  autorisées n'est pas documentée. À demander.

**Cellar**
- Bucket privé, clés limitées à ce bucket, aucune URL publique (B9).
  ~~Versionnage activé~~ [2026-10-30 : **sans versionnage**, décision de la
  propriétaire — il ne se désactive plus, et garderait des versions qu'un
  effacement RGPD doit supprimer.] Fichiers servis par l'app, ou par URL présignée courte.

**Journaux et mesure**
- Rétention native de 7 jours seulement : un drain (Better Stack, Datadog,
  syslog…) avec une durée de conservation décidée (B10).
- Lot 7 (OpenTelemetry, Web Vitals) à poser ici, pour avoir des chiffres avant
  et après (PP, AD option 5).

**Domaine de préproduction** : un sous-domaine, HSTS, CSP revérifiée sur ce
domaine (M11, B8).

---

## 5 bis. Leçons de GestBAT, et le lot « build CC et pile locale »

GestBAT (RiskBoard), autre projet de la propriétaire, tourne sur Clever Cloud.
Son `CLAUDE.md` (§ « Clever Cloud Deployment », relevés de `clever env` et
incidents datés) a été **lu le 2026-10-30, sans rien en copier**. Chaque leçon
est confrontée à notre cas ; certaines sont prises autrement.

| Leçon de GestBAT | Ce qu'on en fait |
|---|---|
| Turbopack se fige au build sur Clever Cloud : `next build --webpack` | **Pris.** Le build CC passe en webpack. Constat de GestBAT, non daté : à remesurer une fois en préproduction avant de s'y tenir pour toujours |
| CC ne développe pas `$VAR` dans ses variables : `DATABASE_URL=$POSTGRESQL_ADDON_URI` reste littéral. GestBAT lit `POSTGRESQL_ADDON_URI` dans le code | **Pris autrement.** Les hooks et la commande de démarrage, eux, passent par un shell. Un seul script de démarrage (`scripts/demarrer-cc.sh`) construit `DATABASE_URL` depuis l'add-on, avec le pool (`connection_limit`) et le TLS, puis lance migrations ou serveur. Le code et le développement local ne changent pas |
| Disque de l'instance limité : node_modules et le cache pnpm effacés après les migrations (le serveur standalone a sa copie) ; GestBAT efface aussi les sources | **Pris en partie.** D'abord mesurer (`df` au démarrage, en préproduction) ; n'effacer que node_modules et le cache pnpm si la place manque. La migration se chaîne par `&&` : son échec arrête le déploiement, jamais de `; true` (GestBAT l'a payé le 2026-07-29) |
| Types : du code qui compile sur macOS casse sur Linux (résolution pnpm) | **Pris.** La pile locale construit dans un conteneur Linux, comme CC. La CI, Linux elle aussi, vérifie déjà les types |
| Build dédié en taille M, après un manque de mémoire en S ; vérification des types retirée du build | **M pris** (le § 5 disait S) : quelques centimes par build. **La vérification des types reste au build** tant qu'il ne manque pas de mémoire |
| Ne jamais poser `CC_DISABLE_BUILD_CACHE_UPLOAD` (builds en boucle, facturés) ni `--max-old-space-size` (CC le règle, mesuré à ~62 % de la RAM, pas 75 %) | **Pris.** Le tableau du § 1 disait « 3/4 » : c'est la doc, GestBAT a mesuré moins |
| Le proxy ajoute l'IP à droite de `X-Forwarded-For` ; Better Auth lit la gauche | **Pris**, § 4. Notre `ipClient` lit déjà la droite ; un hop de proxy de plus (CDN, WAF) change la règle, à écrire avec |
| TLS de la base : certificat auto-signé épinglé | **Pris**, § 5, adapté à Prisma 6 |
| L'add-on Mailpace injecterait `MAILPACE_API_TOKEN` | **Contredit par la doc de Clever Cloud** (clé à poser soi-même, nommée `MAILPACE_API_KEY` dans son exemple). À lire dans l'onglet des variables à la création de l'add-on ; notre pilote lit `MAILPACE_API_KEY` |
| Sauvegardes quotidiennes gardées 7 jours ; restauration testée et écrite ; tâches planifiées sur l'instance 0 seulement | **À reprendre** : procédure de restauration écrite et jouée en phase 3 ; les purges du § 8 sur l'instance 0 |

**Le lot « build CC et pile locale »**, première PR vers `cc`, avant Better
Auth (décision de la propriétaire du 2026-10-30 : léger, sans S3) :
- build CC : webpack, `scripts/demarrer-cc.sh` (variables de l'add-on, TLS,
  migrations par `&&`, serveur sur `0.0.0.0:8080`), `vercel.json` sans aperçu
  pour `cc` ;
- `scripts/deployer-cc.sh` (ci-dessus) ;
- pile locale pour tester un commit avant de le déployer : un conteneur Linux
  qui construit et démarre l'app exactement comme CC (Node 24, pnpm, build
  webpack, script de démarrage), et Postgres 17 à part de la base de
  développement. Stockage sur disque, e-mails dans la console : le S3 et
  Mailpace se testent en préproduction. Pour développer, `pnpm dev` reste.

---

## 6. Phase 3 — répétition générale

Sans données à copier, la répétition porte sur le déploiement lui-même, sur la
préproduction :

1. Base vide : le premier démarrage applique les 97 migrations et plus
   (`CC_PRE_RUN_HOOK`). Contrôle de dérive entre le schéma et la base
   (`prisma migrate diff`), puis `scripts/sante-base.sql`.
2. Deux déploiements successifs, pour voir le passage sans coupure et une
   migration appliquée pendant que l'ancienne version sert.
3. Un déploiement qui échoue volontairement (migration fautive) : l'ancienne
   version doit rester en ligne. La doc de Clever Cloud ne l'écrit pas
   explicitement : c'est ce test qui le dit.
4. Recette complète (§ 7.2).
5. Rejouer le seed des situations de test si les testeurs en ont besoin.

Recommencer jusqu'à ce que tout passe sans geste à la main.

---

## 7. Phase 4 — la bascule

### 7.1 Déroulé

- **J-2** : abaisser le TTL de l'enregistrement de l'app (rojer.fr reste chez
  OVH ; les MX ne bougent pas). Attendre l'expiration de l'ancien TTL.
  Prévenir les testeurs : **leurs comptes et dossiers ne suivent pas**, ils
  les recréeront.
- **H0** : `scripts/deployer-cc.sh prod` sur la version finale (base neuve),
  recette courte (§ 7.2) sur l'adresse Clever Cloud.
- Pointer le DNS vers Clever Cloud, en notant les anciennes valeurs. Passer
  Vercel en page de maintenance, pour qu'un navigateur encore sur l'ancienne
  adresse n'y écrive pas.

### 7.2 Recette

Critères B1 à B31, les « Critères de recette » de l'audit Next.js, et en
particulier :
- création d'un compte, avec l'e-mail de vérification reçu ; connexion ;
  mot de passe oublié ; déconnexion ; liste et révocation des sessions ;
- double authentification : enrôlement TOTP, connexion avec le code, code par
  e-mail, code de secours, appareil de confiance ;
- un `X-Forwarded-For` forgé ne se retrouve ni dans la preuve de signature ni
  dans la limitation de débit. La doc de Clever Cloud dit que la **première**
  entrée est l'IP du client, sans dire si son proxy écrase celle qu'envoie le
  client : c'est ce test qui décide quelle entrée lire (B17) ;
- dépôt et lecture d'un fichier ; export ZIP du plus gros dossier en moins de
  180 s ; aucune réponse personnelle mise en cache ;
- une requête en clair sur `/api/mcp*` est refusée, pas redirigée (B26) ;
- CSP, HSTS, `Clear-Site-Data` sur le domaine de production.

### 7.3 Retour arrière

Vercel et Supabase ne sont pas touchés par la bascule. Revenir, c'est remettre
l'ancien DNS et lever la maintenance sur Vercel. Ce qui aura été saisi sur
Clever Cloud entre-temps n'y suivra pas ; les données étant de test, c'est
acceptable. Le retour arrière cesse d'être simple le jour où de vrais clients
écrivent sur Clever Cloud.

---

## 8. Phase 5 — après la bascule

- Supabase et Vercel gardés quelques semaines pour le retour arrière, puis
  supprimés (projets, stockage, clés).
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
- Tâches planifiées : purge des jetons, OTP, limites et IP expirés (BA).

---

## 9. Contradictions entre audits — tranchées le 2026-10-30

Propositions acceptées par la propriétaire sous réserve de contre-vérification.
Contre-vérifiées le même jour, dans le code et la doc ; deux ont changé.

| Sujet | D'un côté | De l'autre | Retenu | Contre-vérification |
|---|---|---|---|---|
| RLS | B15 : la garder en défense en profondeur | BA 6 : un rôle non propriétaire ne voit rien ; la désactiver ou donner `BYPASSRLS` | ~~`BYPASSRLS` au rôle applicatif~~ **La garder telle quelle, l'app se connecte en propriétaire ; chaque trou fermé au § 9 bis** | **Changé.** `BYPASSRLS` exige un superutilisateur, et Clever Cloud n'en donne pas ni ne permet de créer un second rôle. L'app se connecte déjà en propriétaire aujourd'hui (BA), qui échappe à la RLS ; la RLS sans politique ne gêne donc rien, et coupe tout accès à un rôle lecteur créé par la plateforme. La garde `migrations-rls.test.ts` reste |
| TLS de la base | B6 : `sslmode=require` | B19 : `require` accepte un certificat auto-signé | ~~`verify-full` si l'autorité est fournie~~ **À constater, puis `verify-full` si possible, sinon `require` et écart écrit** | **Changé.** La doc de Clever Cloud ne dit rien du TLS en transit ni d'une autorité de certification : à constater sur l'add-on et à demander au support |
| Limitation de débit | B3 : celle de Better Auth | M11 : celle de l'app existe déjà, en base | Garder celle de l'app ; celle de Better Auth en base (`rateLimit.storage: "database"`) pour ses routes | Confirmé : le stockage en base existe ; la mémoire, par défaut, est fausse dès deux instances. Better Auth limite déjà `/sign-in/email` et `/two-factor/*` à 3 essais par 10 s |
| Session | H4 : proxy optimiste par cookie | AD § 4 : session en base ou cookie signé | Session en base, sans `cookieCache` ; le proxy ne teste que la présence du cookie | Confirmé : la session est en base par défaut, `cookieCache` est à activer explicitement ; `listSessions`, `revokeSession`, `revokeOtherSessions` existent |
| `MCP_HOTES` | H5 : obligatoire | correctif de H5 : `PUBLIC_APP_URL` suffit | `PUBLIC_APP_URL` | Confirmé dans le code : `src/lib/mcp/hotes.ts` lit `PUBLIC_APP_URL` |
| Lot 7 | PP : à la bascule, pas avant | AD § 5.2 : mesurer la prod avant | Le poser en préproduction (§ 5) | Sans objet à vérifier : c'est un choix d'ordre |

---

## 9 bis. Un seul rôle de base : fermer chaque trou

Revérifié le 2026-10-30 dans la doc PostgreSQL de Clever Cloud : « you won't be
able to create other users than the one handled with our control plane (i.e.
the base owner and read-only users) ». Aucun superutilisateur n'est fourni. Un
rôle applicatif séparé et `BYPASSRLS` sont donc hors d'atteinte **selon la
doc**. Deux vérifications restent, et elles ne coûtent rien :
- `CREATE ROLE essai;` sur un add-on DEV gratuit : on constate le refus ;
- la question au support, avec celles du chiffrement au repos et du PITR :
  peuvent-ils créer un rôle applicatif sans DDL, ou lui donner `BYPASSRLS` ?
  Si oui, on le prend : migrations par le propriétaire, app par ce rôle (B6).

Sinon, chaque risque qu'un second rôle ou la RLS aurait couvert a sa
fermeture :

| Risque | Fermeture | État |
|---|---|---|
| Un compte lit ou modifie les données d'un autre (oubli de portée dans le code) | Toutes les lectures et écritures passent par `scope.ts` ; six gardes relisent le code (`tenancy-lectures`, `-ecritures`, `-enfants`, `-oracle`, `-routes`, `-sonde`) | **Éprouvé le 2026-10-30** : la borne au compte retirée d'une lecture exportée (`listerEtablissementsDuCompte`, la classe M2 de l'ASVS) fait tomber `tenancy-lectures` et un test métier ; une lecture non bornée injectée dans une action serveur (`resumeEtatsPermanentsPourWidget`, la classe M3) fait tomber `tenancy-lectures`. Les deux trous relevés le 2026-10-13 sont fermés (B15) |
| Un tiers lit la base par une API exposée | Chez Supabase, la RLS existait pour l'API Data publique. Clever Cloud n'en expose aucune : la base n'est joignable qu'avec ses identifiants | disparaît avec la bascule |
| Un rôle lecteur créé par la plateforme (statistiques, support) voit les données | La RLS active sans politique ne lui laisse voir aucune ligne. Elle reste, avec la garde `migrations-rls.test.ts` | en place |
| L'app, propriétaire, modifie le schéma ou détruit une table | Aucun DDL hors des migrations : garde à écrire (0.13). Les migrations ne tournent que dans le hook de démarrage | garde à faire |
| Injection SQL | Aucun `$queryRawUnsafe` ni `$executeRawUnsafe` ; SQL brut paramétré, `Prisma.raw` sur liste fermée (BA) | en place |
| Fuite des identifiants de la base | Pas d'accès direct généré sans besoin, TLS (§ 5), restriction réseau à demander, rotation écrite (B31), jamais dans les journaux | à faire en phase 2 |

**La RLS stricte** ~~gardée pour plus tard~~ ~~[2026-10-30 : retenue par la
propriétaire ; instruite dans un lot à part]~~ [2026-10-30, seconde décision :
**l'isolation se renforce côté application**, par une extension Prisma qui
borne chaque requête au compte connecté (lot à part, plan et ADR avant tout
code). La RLS par compte en base reste une option comparée, non retenue pour
les raisons ci-dessous.]
 On peut soumettre même le
propriétaire à la RLS (`FORCE ROW LEVEL SECURITY`) avec des politiques par
compte, lues dans une variable posée à chaque transaction (`set_config`,
exemple officiel de Prisma, `prisma-client-extensions/row-level-security`).
C'est la seule isolation en base possible avec un rôle unique. Pas pour la
bascule :
- chaque requête doit passer dans une transaction qui pose la variable, ce qui
  ajoute un aller-retour ;
- l'exemple officiel prévient que les transactions explicites ne se comportent
  plus comme prévu, or le code en compte une cinquantaine (avec le SQL brut) ;
- les tables sans `userId` direct exigent des politiques par jointure jusqu'à
  `Entreprise`, sur trente-quatre modèles ;
- le propriétaire peut toujours retirer `FORCE` : elle protège d'un oubli dans
  le code, pas d'un identifiant volé.

À rouvrir si l'isolation applicative ne suffit plus, par exemple avec des
utilisateurs multiples par entreprise.

---

## 10. Ce qui reste à vérifier (non documenté par Clever Cloud)

- ~~Le proxy écrase-t-il un `X-Forwarded-For` envoyé par le client ? (test § 7.2)~~ [2026-10-30 : non, il ajoute à droite — mesuré en prod par GestBAT ; le test § 7.2 le reconfirme pour nous]
- ~~TLS en transit et autorité de certification de l'add-on PostgreSQL.~~ [2026-10-30 : TLS 1.3, certificat auto-signé à épingler — constaté par GestBAT ; à reconstater sur notre add-on]
- `ALTER DATABASE … SET timezone` par le propriétaire.
- Prix de l'add-on Mailpace.
- Création d'un second rôle : constatée sur un add-on DEV, et demandée au
  support (§ 9 bis).
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

- Rôles PostgreSQL (citation du § 9 bis) : même page que PostgreSQL ci-dessus.
- RLS par extension Prisma : https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security

Better Auth :
- Base de données (`modelName`, `generateId`) : https://www.better-auth.com/docs/concepts/database
- Sécurité : https://www.better-auth.com/docs/reference/security
- Limitation de débit : https://www.better-auth.com/docs/concepts/rate-limit
- Sessions : https://www.better-auth.com/docs/concepts/session-management
- Next.js : https://www.better-auth.com/docs/integrations/next
- E-mails : https://www.better-auth.com/docs/concepts/email
- MCP : https://www.better-auth.com/docs/plugins/mcp
- Double authentification : https://www.better-auth.com/docs/plugins/2fa

Mailpace :
- Add-on Clever Cloud : https://www.clever.cloud/developers/doc/deploy/services/mailpace/
- Documentation : https://docs.mailpace.com
- Confidentialité et DPA : https://mailpace.com/privacy et https://mailpace.com/dpa

Next.js, Prisma, PostgreSQL :
- Auto-hébergement : https://nextjs.org/docs/app/guides/self-hosting
- Sortie `standalone` : https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- `deploymentId` : https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId
- Pool Prisma 6 : https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections
- Migrations en production : https://www.prisma.io/docs/v6/orm/prisma-migrate/workflows/development-and-production

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
