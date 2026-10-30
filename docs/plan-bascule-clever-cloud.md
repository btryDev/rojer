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
| Mémoire | `--max-old-space-size` réglé aux 3/4 de la RAM | limitée à la RAM, sans swap |
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
3. **Double authentification : oui** (B22), plugin `twoFactor` dès la
   bascule. TOTP et code par e-mail, codes de secours, appareils de confiance
   30 jours. **À trancher encore : proposée ou obligatoire.** Better Auth ne
   sait pas l'imposer nativement : l'obligation se code (enrôlement forcé à la
   première connexion, hook sur les routes de connexion). La perte du facteur
   n'a que les codes de secours ; aucune réinitialisation par un
   administrateur n'est prévue, il faudrait la construire.
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
| 0.1 | La preuve de signature lit l'IP par le helper commun (`securite/ip-client.ts`), pas par `x-forwarded-for` découpé à la main | B17 | **à faire** : `signatures/actions.ts:360` et `:619` prennent la première entrée, forgeable |
| 0.2 | Migrations hors du build : `scripts/migrer-en-production.sh` ne migre que sur Vercel ; ailleurs, c'est le rôle du hook de démarrage | B7, H5 | **à faire** : sans `VERCEL_ENV` mais avec `DIRECT_URL`, le script migre au build, ce qui serait le cas chez Clever Cloud |
| 0.3 | `output: "standalone"`, avec copie de `public/` et `.next/static` après le build | H5 | à faire |
| 0.4 | Export ZIP borné à moins de **180 s**, le délai du proxy de Clever Cloud (aujourd'hui `maxDuration` vaut 300 s) ; sinon, export asynchrone | H3, H5 | à faire : mesurer le plus gros dossier réel |
| 0.5 | `EXPORTS_SIMULTANES` validée dans `src/env.ts` | H3 | partiel : la variable est dans `.env.example` seulement |
| 0.6 | `Clear-Site-Data` à la déconnexion | B30 | à faire, ou avec Better Auth |
| 0.7 | Pilote de stockage S3 (Cellar) derrière `FileStorage`, avec délai sortant | ST, M9 | à faire. Points connus : `region: 'default'`, et `requestChecksumCalculation` / `responseChecksumValidation` à `WHEN_REQUIRED` avec le SDK v3 récent |
| 0.8 | Pilote d'e-mail Mailpace (API HTTPS, clé `MAILPACE_API_KEY`, délai sortant), domaine d'envoi vérifié (DKIM) | décision 1 | à faire ; le lot e-mail était gelé |
| 0.9 | Retrait des données mortes : `Intervention`, `chiffonsImpregnes`, `classeIgh`, `familleHabitation`, `pdfUrl` | BA 2 | facultatif : sans copie de données, ce n'est plus un préalable ; à faire quand on veut |
| 0.10 | `DemandeAssistance.userId` en UUID, comme les trois autres `userId` | BA | à faire, ou en phase 1 avec les clés étrangères vers `user` |
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
- `DATABASE_URL` sans `pgbouncer=true` ni `connection_limit=1`, avec un pool
  explicite (`connection_limit` 5 à 10) (H2, AD). `DIRECT_URL` sur le nom
  d'hôte direct, à régénérer après toute migration de l'add-on.
- TLS : la doc de Clever Cloud ne dit rien du chiffrement en transit. À
  constater sur l'add-on (`SHOW ssl;`, `SELECT * FROM pg_stat_ssl;`) et à
  demander au support avec l'autorité de certification (B19, § 9).
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
- **H0** : déployer la version finale sur la production Clever Cloud (base
  neuve), recette courte (§ 7.2) sur son adresse Clever Cloud.
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
| RLS | B15 : la garder en défense en profondeur | BA 6 : un rôle non propriétaire ne voit rien ; la désactiver ou donner `BYPASSRLS` | ~~`BYPASSRLS` au rôle applicatif~~ **La garder telle quelle, l'app se connecte en propriétaire** | **Changé.** `BYPASSRLS` exige un superutilisateur, et Clever Cloud n'en donne pas ni ne permet de créer un second rôle. L'app se connecte déjà en propriétaire aujourd'hui (BA), qui échappe à la RLS ; la RLS sans politique ne gêne donc rien, et coupe tout accès à un rôle lecteur créé par la plateforme. La garde `migrations-rls.test.ts` reste |
| TLS de la base | B6 : `sslmode=require` | B19 : `require` accepte un certificat auto-signé | ~~`verify-full` si l'autorité est fournie~~ **À constater, puis `verify-full` si possible, sinon `require` et écart écrit** | **Changé.** La doc de Clever Cloud ne dit rien du TLS en transit ni d'une autorité de certification : à constater sur l'add-on et à demander au support |
| Limitation de débit | B3 : celle de Better Auth | M11 : celle de l'app existe déjà, en base | Garder celle de l'app ; celle de Better Auth en base (`rateLimit.storage: "database"`) pour ses routes | Confirmé : le stockage en base existe ; la mémoire, par défaut, est fausse dès deux instances. Better Auth limite déjà `/sign-in/email` et `/two-factor/*` à 3 essais par 10 s |
| Session | H4 : proxy optimiste par cookie | AD § 4 : session en base ou cookie signé | Session en base, sans `cookieCache` ; le proxy ne teste que la présence du cookie | Confirmé : la session est en base par défaut, `cookieCache` est à activer explicitement ; `listSessions`, `revokeSession`, `revokeOtherSessions` existent |
| `MCP_HOTES` | H5 : obligatoire | correctif de H5 : `PUBLIC_APP_URL` suffit | `PUBLIC_APP_URL` | Confirmé dans le code : `src/lib/mcp/hotes.ts` lit `PUBLIC_APP_URL` |
| Lot 7 | PP : à la bascule, pas avant | AD § 5.2 : mesurer la prod avant | Le poser en préproduction (§ 5) | Sans objet à vérifier : c'est un choix d'ordre |

---

## 10. Ce qui reste à vérifier (non documenté par Clever Cloud)

- Le proxy écrase-t-il un `X-Forwarded-For` envoyé par le client ? (test § 7.2)
- TLS en transit et autorité de certification de l'add-on PostgreSQL.
- `ALTER DATABASE … SET timezone` par le propriétaire.
- Prix de l'add-on Mailpace.
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
