# ADR-062 — Le connecteur MCP s'ouvre par compte, en OAuth servi par Better Auth, et seulement en Pro

- **Statut** : proposée, 2026-11-21.
- **Portée** : `src/lib/auth/better-auth.ts` (plugins `jwt`, `mcp`, `cimd`),
  route `/api/auth/[...all]` (liste blanche), `/.well-known/*`,
  `src/app/api/mcp/route.ts`, `src/lib/mcp/`, page de consentement,
  page « Connecter un assistant », `src/lib/abonnements/formules.ts`
  (`connecterUnAssistant`), schéma Prisma (tables du fournisseur OAuth).
- **Remplace** l'ADR-013 (OAuth 2.1 avec Supabase comme serveur
  d'autorisation). **Amende** l'ADR-052 (une route HTTP de Better Auth est
  montée, bornée à l'OAuth) et l'ADR-051 (une portée « compte » sans session
  de navigateur, prouvée par un jeton).
- **Décision de la propriétaire** (2026-11-17) : le connecteur n'est
  accessible qu'en formule Pro.

## Contexte

L'ADR-013 confiait l'autorisation à Supabase. Elle écartait Better Auth pour
une seule raison, dirimante à l'époque : son fournisseur OAuth lit
l'utilisateur dans ses propres tables, ce qui aurait créé une seconde
identité à côté de `auth.users`. **Cette prémisse est tombée** : depuis
l'ADR-052, Better Auth EST notre identité. L'ADR-013 n'a jamais été achevée
(étapes 4 et 5 suspendues le 2026-09-27 ; le code OAuth Supabase est retiré
depuis la bascule).

Ce qui reste en service : une adresse à clé `/api/mcp/<clé>`, dont la clé et
l'établissement sont des variables d'environnement. Elle ne distingue pas
deux dirigeants, ignore la formule, le gel et les membres, et met son secret
dans l'URL (audit MCP du 2026-09-27, S1). La page « Connecter » ne décrit que
le mode local, avec les chemins du serveur. Et `connecterUnAssistant`, posé à
`true` pour le Pro, n'est lu nulle part.

Règle 13 du CLAUDE.md : la prémisse tombée rouvre la décision, et l'option
« si on repartait de zéro » se compare d'abord.

## Ce que disent les sources (lues le 2026-11-21)

- **Spécification MCP 2026-07-28, autorisation.** Le serveur MCP est un
  serveur de ressource : métadonnées RFC 9728 obligatoires ; `401` avec
  `WWW-Authenticate: Bearer resource_metadata="…"` ; jeton validé selon
  OAuth 2.1 § 5.2 avec contrôle d'audience (RFC 8707) — « only accept tokens
  that are valid for use with their own resources » ; aucun jeton relayé
  ailleurs ; `403 insufficient_scope` pour une portée insuffisante. Le
  serveur d'autorisation : OAuth 2.1, découverte RFC 8414 ou OIDC, PKCE
  `S256`, correspondance exacte des adresses de retour, **rotation des jetons
  de rafraîchissement pour les clients publics** (MUST), jetons d'accès
  courts (SHOULD), `iss` dans la réponse (RFC 9207, SHOULD). CIMD : SHOULD ;
  DCR : MAY, **dépréciée**. `scopes_supported` minimal, sans
  `offline_access` côté ressource.
- **Transport Streamable HTTP 2026-07-28** : plus de session au niveau du
  protocole ; `Origin` validée sur toute connexion (`403` sinon) ; un
  identifiant d'état n'authentifie jamais, chaque requête est vérifiée.
- **Connecteurs Claude** (claude.com/docs/connectors) : spécifications
  d'autorisation 2025-03-26 à 2025-11-25 ; adresse de retour
  `https://claude.ai/api/mcp/auth_callback` (web, Desktop, mobile), boucle
  locale à port éphémère pour Claude Code ; CIMD si le serveur annonce
  `client_id_metadata_document_supported` et `none` en méthode
  d'authentification au jeton, sinon DCR ; PKCE `S256` ; rafraîchissement
  proactif cinq minutes avant l'expiration, `invalid_grant` pour un jeton
  mort, nouveau jeton rendu dans la réponse qui invalide l'ancien ; `/token`
  en `application/x-www-form-urlencoded` ; 10 s au plus pour découverte,
  enregistrement et jeton ; sortie depuis `160.79.104.0/21` ; résultat
  d'outil ≈ 150 000 caractères (claude.ai), 25 000 jetons (Claude Code),
  240 s par appel. Seule la première entrée d'`authorization_servers` est
  lue.
- **Better Auth** (docs du fournisseur OAuth, de `@better-auth/mcp` et de
  `jwt`) : `mcp()` EST le fournisseur (ne pas lui adjoindre `oauthProvider()`) ;
  il exige le plugin `jwt` ; jetons d'accès JWT dès que la requête nomme une
  ressource ; `requireMcpAuth` vérifie signature, émetteur, audience et
  expiration contre le JWKS en mémoire, sans appel réseau ; rotation
  toujours active, réutilisation d'un jeton tourné = rejeu, la famille est
  révoquée ; PKCE `S256` imposé ; secrets et jetons stockés hachés.
  `postLogin` + `consentReferenceId` lient le consentement à une
  organisation (notre `Compte`). **Écart connu de la 1.7** : un JWT signé par
  les clés du fournisseur et portant `azp` et une audience admise passe pour
  un jeton d'accès ; il faut exiger `typ: "at+jwt"` explicitement. Un JWT
  d'accès ne se révoque pas : il vit jusqu'à son expiration.
- **Versions** : `@better-auth/mcp`, `@better-auth/cimd` et
  `@better-auth/oauth-provider` 1.7.27 exigent `better-auth ^1.7.27` ; nous
  sommes en 1.7.14. `@modelcontextprotocol/server` 2.4.0 sert jusqu'à
  2025-11-25 — ce que Claude parle.

## Options comparées

1. **Repartir de zéro avec le fournisseur de Better Auth** (`@better-auth/mcp`).
   Une seule identité, un fournisseur maintenu, CIMD et DCR, rotation,
   PKCE, hachage, JWKS en mémoire. Coût : monter une route HTTP de Better
   Auth et passer en 1.7.27.
2. **Écrire notre propre serveur d'autorisation.** Rejetée : c'est le
   composant où une erreur coûte le plus, et rien ne nous en distingue.
3. **Garder l'adresse à clé, une clé par compte en base.** Rejetée : le
   secret reste dans l'URL et les journaux, et la spécification comme les
   connecteurs Claude attendent OAuth ; `static_headers` est réservé à
   l'administrateur d'une organisation Claude, inapte à une portée par
   dirigeant (ADR-013, inchangé sur ce point).
4. **Fournisseur tiers (WorkOS, Auth0, Clerk).** Rejetée : second référentiel
   d'identité, ce qu'on vient de quitter.

## Décision

### 1. Better Auth est le serveur d'autorisation

`better-auth` passe en 1.7.27 ; on ajoute `@better-auth/mcp` et
`@better-auth/cimd`, avec le plugin `jwt`. Le plugin `jwt` ne sert QUE les
jetons d'accès : sa route `/token` est désactivée (`disabledPaths`) et
l'en-tête `set-auth-jwt` coupé, pour qu'aucun JWT de session n'atteigne un
navigateur.

### 2. Une route HTTP de Better Auth, en liste blanche

`/api/auth/[...all]` monte le gestionnaire de Better Auth, mais ne laisse
passer QUE les chemins de l'OAuth — `oauth2/authorize`, `oauth2/token`,
`oauth2/register`, `oauth2/revoke`, `oauth2/consent`, `oauth2/continue`,
`jwks` et ce que la découverte désigne. Tout autre chemin répond `404`.
L'ADR-052 tient pour le reste : connexion, inscription, double
authentification, membres restent des actions serveur avec leurs propres
gardes (limites de débit, quotas, refus). Monter tout le gestionnaire
ouvrirait des portes qui contournent ces gardes. Une garde de test relit la
liste blanche.

La limitation de débit de Better Auth est active sur ces chemins, et
`oauth2/register` passe en plus par `LimiteDebit` (par IP).

### 3. Enregistrement des clients : CIMD d'abord, DCR bornée aux assistants admis

- **CIMD** (Claude Code) : activé, profil `mcp-2026-07-28`, récupération du
  document par le transport de `@better-auth/cimd/node`, qui pare au SSRF
  (HTTPS seul, plages privées et locales refusées).
- **DCR** (claude.ai l'emploie) : ouverte sans jeton préalable — c'est la
  seule façon dont claude.ai s'enregistre —, mais **les adresses de retour
  admises sont une liste fermée** : `https://claude.ai/api/mcp/auth_callback`,
  `https://claude.com/api/mcp/auth_callback`, et la boucle locale
  (`localhost`, `127.0.0.1`, port libre) pour les clients en ligne de
  commande. Un client qui déclare une autre adresse est refusé à
  l'enregistrement. Le connecteur promis est « Claude » ; un autre assistant
  s'ajoute en ajoutant son adresse de retour, par décision.
- Portée accordée à l'enregistrement : `rojer:lecture` (et `offline_access`
  pour le rafraîchissement), rien d'autre.

### 4. Ce que porte le jeton, ce qui est vérifié à chaque requête

- Une seule portée métier, **`rojer:lecture`**. Les outils sont tous en
  lecture ; il n'y a rien à graduer.
- Le consentement est lié à **un compte** (`consentReferenceId` = le compte
  actif choisi à la connexion, ADR-054) et l'identifiant du compte entre au
  jeton (`customAccessTokenClaims`). Le jeton a pour audience l'URL exacte
  du serveur MCP (`resource`).
- À chaque requête sur `/api/mcp`, dans cet ordre, et le premier échec arrête :
  1. jeton vérifié **localement** (signature contre le JWKS en mémoire,
     `iss`, `aud` = l'URL du serveur, expiration, `typ: "at+jwt"`, `azp`
     présent, portée `rojer:lecture`) — sinon `401` avec le défi RFC 9728 ;
  2. **appartenance relue** : l'utilisateur est toujours membre du compte du
     jeton (`Membre`, comme `requireCompte`) — sinon `401` ;
  3. **formule** : le compte a un abonnement ouvert (`OUVRENT`, ADR-053) en
     formule dont `connecterUnAssistant` vaut `true` — sinon `403` avec un
     message lisible (« Le connecteur est réservé à la formule Pro »).
     L'essai porte sur l'Essentiel (`FORMULE_D_ESSAI`) : il n'ouvre pas le
     connecteur.
  Les points 2 et 3 font qu'un départ du compte ou une fin d'abonnement
  coupe l'accès à la requête suivante, sans attendre l'expiration du jeton.
- Rôle : tout membre, lecture seule comprise — le connecteur ne fait que lire.

### 5. Portée des outils : le compte, puis l'établissement désigné

La lecture se fait par le client borné au compte (ADR-051), jamais par un
client libre. Un compte Pro tient jusqu'à cinq établissements (ADR-028) :

- un outil **`etablissements`** liste ceux du compte (identifiant, nom,
  ville) ;
- chaque outil prend un argument **`etablissement`** facultatif. Absent et
  un seul établissement : celui-là. Absent et plusieurs : l'outil répond par
  la liste et demande lequel. Présent : il doit appartenir au compte, sinon
  l'outil répond « établissement introuvable », sans dire s'il existe
  ailleurs.

L'invariant de l'ADR-013 « aucun identifiant d'établissement dans un
schéma d'outil » est abandonné, et c'est la prémisse de l'ADR-028 qui l'a
fait tomber : il protégeait une portée figée par la configuration. La
garantie qu'il servait demeure, portée autrement : le client borné au
compte ne peut lire aucun établissement d'un autre compte, quel que soit
l'argument.

### 6. Durées

- Jeton d'accès : **15 minutes** (non révocable : court ; Claude le
  rafraîchit avant l'expiration).
- Jeton de rafraîchissement : **30 jours** glissants, rotation à chaque
  usage ; fenêtre de réutilisation laissée au défaut de `mcp()` (30 s), pour
  les rafraîchissements concurrents d'un même client.
- Code d'autorisation : 10 minutes, usage unique.

### 7. Consentement

Une page `/oauth/consentement`, à la charte board, qui :
- nomme le client tel qu'il se déclare, en le disant (« se présente comme »),
  et **affiche l'hôte de l'adresse de retour** (exigence de la spécification
  et des docs de Claude) ;
- dit ce qui sera lu (tous les établissements du compte, en lecture), et que
  ces données sortent de Rojer vers l'assistant ;
- fait choisir le compte quand l'utilisateur en a plusieurs ;
- refuse l'affichage en cadre (`frame-ancestors 'none'`) ;
- n'accepte que la requête signée par Better Auth (`oauth_query`) et la
  session en cours.

Un utilisateur non connecté passe par `/login`, qui reprend le flux après
connexion (double authentification comprise).

### 8. Révocation

La page « Connecter un assistant » liste les assistants autorisés par
l'utilisateur sur le compte (consentements) et permet de les retirer :
retirer supprime le consentement **et** révoque ses jetons de
rafraîchissement. Le jeton d'accès en cours meurt au plus tard 15 minutes
après ; les vérifications du § 4 coupent plus tôt quand c'est l'abonnement
ou l'appartenance qui tombe.

### 9. Transport et performance

- Streamable HTTP **sans état** : aucune session MCP en mémoire, chaque
  `POST` porte son jeton et est vérifié de bout en bout. C'est ce que fait
  la révision 2026-07-28 et ce qui tient sur plusieurs instances Clever
  Cloud. `GET` et `DELETE` répondent `405`.
- Les gardes de transport restent (`Host`, `Origin` → `403`), sans
  `localhost` en production (audit S8).
- Limite de débit par compte et par IP (`LimiteDebit`, déjà en place pour
  le MCP).
- Vérification du jeton sans réseau ; une seule requête en base pour le
  § 4 (appartenance + abonnement), avant l'appel d'outil.
- Réponses bornées sous les plafonds de Claude (audit E4) : une liste
  tronquée le dit et dit comment filtrer.

### 10. Ce qui part

- La route `/api/mcp/[cle]`, `src/lib/mcp/acces-http.ts`, les variables
  `MCP_CLE` et `MCP_ETABLISSEMENT_ID` : retirées une fois le flux validé de
  bout en bout depuis claude.ai en préproduction — dans le même lot si le
  test passe, sinon au lot suivant, mais jamais servies en production.
- Le mode local (`scripts/mcp-server.ts`) reste un outil de développement ;
  il quitte la page « Connecter ».
- `connecterUnAssistant` est lu (§ 4) et affiché dans les points de la
  formule ; l'entrée « Connecter un assistant » reste visible pour tous, et
  la page invite à passer en Pro hors formule.

## Conséquences

- Positives : un accès par dirigeant et par compte, révocable par lui ; plus
  de secret dans une URL ; conforme à la spécification et à ce que Claude
  attend ; la formule Pro tient sa promesse ; un seul système d'identité.
- Négatives : une route HTTP de Better Auth à surveiller (d'où la liste
  blanche et sa garde) ; une montée de version de Better Auth à relire ;
  sept tables de plus, à couvrir par les gardes RLS et de portée ; DCR
  ouverte (bornée par les adresses de retour et la limite de débit) ; un
  JWT d'accès vit 15 minutes après un retrait.
- Coût de rétractation : moyen. Les outils et les gardes de transport ne
  dépendent pas du mode d'authentification ; revenir en arrière retire des
  plugins, une route et des tables.

## Plan

1. Montée `better-auth` 1.7.27 seule, suite ciblée sur l'authentification.
2. Plugins `jwt`, `mcp`, `cimd`, tables et migration, route en liste blanche,
   découverte. Gardes : RLS, liste blanche, en-têtes.
3. `/api/mcp` : vérification (§ 4), portée compte puis établissement (§ 5),
   outil `etablissements`, réponses bornées.
4. Consentement, reprise après `/login`, page « Connecter » (adresse à
   coller, assistants autorisés, retrait), `connecterUnAssistant` lu.
5. Test de bout en bout : Claude Code en local (boucle locale, CIMD), puis
   claude.ai sur la préproduction (DCR).
6. Retrait de l'adresse à clé et de ses variables.

## Sources

- https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
- https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices
- https://modelcontextprotocol.io/specification/2026-07-28/basic/transports
- https://claude.com/docs/connectors/building/authentication
- https://claude.com/docs/connectors/building
- https://claude.com/docs/connectors/custom
- https://better-auth.com/docs/plugins/oauth-provider
- https://better-auth.com/docs/plugins/mcp
- https://better-auth.com/docs/plugins/jwt
- https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html
