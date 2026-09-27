# ADR-013 — Serveur MCP distant authentifié en OAuth 2.1

> **Amendée le 2026-09-01 par l'ADR-028.** Ce document suppose qu'un utilisateur
> n'a qu'un seul établissement — l'affirmation « la requête ne peut pas rendre
> deux résultats » ne tient plus. L'outil MCP doit désambiguïser. Le reste de
> l'ADR (OAuth 2.1, portée, lecture seule) est inchangé.

- Statut : acceptée
- Date : 2026-08-12
- Portée : `src/lib/mcp/`, `src/app/api/mcp/`, `src/app/.well-known/`
- Dépend de : ADR-005 (authentification Supabase)

## Contexte

Le serveur MCP existe aujourd'hui sous deux formes, toutes deux en lecture seule et bornées à un établissement :

1. **stdio** (`scripts/mcp-server.ts`) — le client lance le processus, la portée vient de `MCP_ETABLISSEMENT_ID`. Rien n'écoute sur le réseau. C'est le spike d'origine.
2. **HTTP à URL capacitaire** (`src/app/api/mcp/[cle]/route.ts`) — le secret est un segment du chemin. Cette forme a été retenue faute de mieux : le dialogue « connecteur personnalisé » de Claude ne transporte qu'une URL et, optionnellement, un client OAuth ; il n'offre aucun champ pour un en-tête `Authorization`.

La forme 2 a été documentée dès son écriture comme un compromis assumé (`src/lib/mcp/acces-http.ts`) : le secret voyage dans l'URL, donc se retrouve dans les journaux des intermédiaires, les historiques et les copier-coller. Elle tient parce que le serveur est en lecture seule, borné à un établissement, sur des données de démonstration, et que la clé se révoque en changeant une variable d'environnement. **Elle ne tient pas sur un dossier réel multi-clients** : une clé unique en variable d'environnement ne sait pas distinguer deux dirigeants.

Deux éléments nouveaux lèvent le blocage qui justifiait ce compromis.

**Supabase Auth sait désormais être un serveur d'autorisation OAuth 2.1.** La capacité est en beta publique depuis le 26 novembre 2025, documentée explicitement pour les serveurs MCP, et gratuite sur tous les plans pendant la beta. Elle expose `/oauth/authorize`, `/oauth/token`, la découverte RFC 8414, un JWKS, et l'enregistrement dynamique de clients (DCR). Les jetons émis sont des JWT Supabase ordinaires dont le `sub` est l'UUID de l'utilisateur.

**Le modèle de données rend la résolution de portée triviale.** `Entreprise.userId` est unique (ADR-005), et l'invariant « 1 entreprise = 1 établissement » est porté par la base (`@unique` sur `entrepriseId`). De l'UUID Supabase à l'établissement, il n'y a qu'un chemin, sans ambiguïté :

```
jeton.sub → Entreprise.userId → Entreprise → Etablissement.id
```

Il n'y a donc pas de question « quel établissement le client veut-il lire ? » à négocier avec le client — question qui aurait exigé un mécanisme de sélection et rouvert la surface d'attaque que `ScopeMcp` avait justement fermée.

## Décision

Authentifier le serveur MCP distant par **OAuth 2.1, avec Supabase Auth comme serveur d'autorisation**, et faire porter la portée par l'identité du porteur du jeton plutôt que par un secret partagé.

1. **Supabase reste la racine d'identité.** Conformément à ADR-005, il n'y a pas de second référentiel d'utilisateurs. Le serveur MCP est un *resource server* : il vérifie des jetons, il n'en émet pas et ne gère aucun compte.

2. **Pas de serveur d'autorisation applicatif.** Aucune bibliothèque tierce (Better Auth, Auth.js, Clerk) n'est introduite. Toute solution de ce type imposerait ses propres tables `user`/`session` et donc un second système d'identité à synchroniser avec `auth.users` — exactement ce que ADR-005 a écarté. Cf. « Alternatives rejetées ».

3. **La portée se déduit du jeton, jamais de la requête.** `resoudreScope` vérifie le JWT puis résout `sub → Entreprise.userId → Etablissement`. Aucun schéma d'outil ne comporte d'identifiant d'établissement ; cette propriété, posée dans `src/lib/mcp/tools.ts`, est conservée telle quelle.

4. **Vérification locale du jeton.** `supabase.auth.getClaims(jwt)` valide la signature via le JWKS du projet et contrôle l'expiration, sans appel réseau dès lors que le projet signe en asymétrique (RS256/ES256). Le passage aux clés asymétriques est un prérequis, pas une option : en HS256 la méthode retombe sur un aller-retour réseau à chaque requête, et les ID tokens `openid` ne peuvent pas être émis.

5. **Refus conforme au protocole.** Un accès non authentifié répond `401` avec un en-tête `WWW-Authenticate: Bearer` portant `resource_metadata`. C'est ce qui déclenche le flux OAuth côté Claude : un `200` transportant une erreur d'outil ne le déclenche pas, et laisse l'utilisateur devant un message d'erreur au lieu d'un bouton « Connecter ».

6. **Métadonnées de ressource protégée (RFC 9728).** Le serveur publie `/.well-known/oauth-protected-resource/api/mcp`, dont le champ `resource` correspond exactement à l'URL du serveur MCP et dont `authorization_servers` désigne l'émetteur Supabase.

7. **Les deux transports cohabitent pendant la validation.** La route à URL capacitaire n'est pas supprimée dans cette décision : la capacité OAuth de Supabase est en beta, et un point reste à vérifier en conditions réelles (point 8). Elle sera retirée une fois le flux OAuth validé de bout en bout depuis claude.ai — c'est un retrait de route et d'un module, sans effet sur les outils.

8. **Point ouvert assumé.** La spécification MCP impose au client d'envoyer un paramètre `resource` (RFC 8707) sur les requêtes d'autorisation et de jeton. La documentation Supabase ne mentionne pas ce paramètre. Deux issues : il est ignoré (le flux passe, sans liaison d'audience), ou il est rejeté (le flux casse). Le premier test de bout en bout doit trancher. En corollaire, le `aud` des jetons Supabase vaut `"authenticated"` et non l'URL du serveur MCP : la vérification d'audience stricte n'est pas praticable en l'état et n'est donc pas exigée. Un Custom Access Token Hook permettrait de la rétablir si le besoin se confirme.

## Conséquences

### Positives

- Le secret quitte l'URL. Plus de clé partagée dans les journaux et les historiques.
- Multi-utilisateurs par construction : chaque dirigeant voit son établissement, sans configuration par utilisateur ni variable d'environnement à faire tourner.
- Révocation par utilisateur, gérée par Supabase (retrait du consentement, expiration, rotation des jetons de rafraîchissement).
- Aucun schéma d'autorisation à maintenir : pas de table de clients, de consentements ni de jetons côté application.
- Cohérent avec ADR-005 — une seule identité, une seule source de vérité.
- Les outils (`src/lib/mcp/tools.ts`) et les gardes de transport (`src/lib/mcp/http.ts`) sont inchangés. C'est le résultat attendu du découplage posé à l'écriture du spike.

### Négatives

- Dépendance à une capacité **en beta**. Le contrat d'API peut bouger, et la gratuité est annoncée « pendant la beta ».
- Une page de consentement doit être écrite et maintenue côté application : Supabase délègue l'écran d'autorisation, il ne le fournit pas.
- Le passage aux clés de signature asymétriques touche l'ensemble du projet Supabase, pas seulement le MCP.
- L'enregistrement dynamique de clients (DCR) expose un endpoint où n'importe quel client peut s'enregistrer. La spécification MCP 2026-07-28 déprécie d'ailleurs DCR au profit des Client ID Metadata Documents, que ni Supabase ni les alternatives évaluées ne supportent encore. On reste donc sur le mécanisme déprécié — conforme, mais à revoir.

### Coût de rétractation

Faible et borné. Revenir en arrière consiste à remettre `resoudreScope` sur la clé d'URL : un module d'accès et une route. Ni les outils, ni les requêtes, ni le modèle de données ne sont engagés par cette décision.

## Alternatives rejetées

### Better Auth (plugin OAuth Provider)

Candidat sérieux : `@better-auth/oauth-provider` est un serveur OAuth 2.1 complet, activement maintenu, avec DCR, introspection, JWKS et un helper MCP dédié.

Rejeté pour une raison dirimante dans notre contexte : **le plugin résout l'utilisateur depuis les tables `user`/`session` de Better Auth**. L'inspection des types du paquet publié confirme l'absence de tout point d'extension permettant de piloter le flux d'autorisation depuis une session externe — aucun `getUser`, `resolveUser` ni `getSession` dans ses options. L'adopter reviendrait à faire coexister deux référentiels d'identité et à écrire une synchronisation entre `auth.users` et les tables Better Auth, ce que ADR-005 a explicitement écarté.

À noter également : son plugin `mcp` historique est annoncé comme bientôt déprécié au profit du plugin OAuth Provider.

### Clerk / WorkOS AuthKit / Stytch / Auth0

Même objection structurelle que Better Auth : ces produits sont des fournisseurs d'identité, et les employer comme simple serveur d'autorisation devant une identité Supabase existante crée un second référentiel. Le coût d'intégration ne se justifierait que si Supabase ne savait pas faire — ce qui n'est plus le cas.

### Rester sur l'URL capacitaire

C'est la solution en place, et elle a le mérite de fonctionner sans configuration. Elle est écartée comme cible parce qu'elle ne sait pas distinguer deux utilisateurs : le secret et l'établissement sont tous deux figés dans l'environnement du déploiement. Elle reste disponible le temps de valider OAuth (décision 7).

### Jeton porteur statique en en-tête

Techniquement plus propre que le secret dans l'URL, mais le connecteur personnalisé de Claude n'offre pas de champ d'en-tête à l'utilisateur final. Anthropic propose bien un mode `static_headers`, mais il est en beta, renseigné par un administrateur d'organisation, et partagé par toute l'organisation — donc inapte à porter une portée par dirigeant.

## Plan d'implémentation

1. `src/lib/mcp/acces-oauth.ts` — vérification du jeton et résolution de portée. Testable sans configuration Supabase.
2. `src/app/.well-known/oauth-protected-resource/api/mcp/route.ts` — métadonnées RFC 9728.
3. `src/app/api/mcp/route.ts` — point d'entrée OAuth, `401` + `WWW-Authenticate` en cas de refus.
4. Côté Supabase : activer le serveur OAuth 2.1, activer DCR, basculer les clés de signature en asymétrique.
5. Page de consentement `/oauth/consent`.
6. Test de bout en bout depuis claude.ai — **c'est ce test qui tranche le point 8**.
7. Retrait de la route `[cle]` une fois le point 6 validé.

## Notes post-implémentation

Les étapes 1 à 3 sont livrées et **validées en local** (`pnpm mcp:test`, `scripts/mcp-http-test.ts`).

La moitié « serveur de ressource » se vérifie sans rien changer chez Supabase, et c'est ce qui rend la mise au point locale possible. La raison tient à une propriété du dispositif : `getClaims` vérifie *un jeton Supabase*, sans égard pour le flux qui l'a produit. Un jeton de session ordinaire porte le même `sub` qu'en porterait un jeton délivré par le flux OAuth — la chaîne `sub → Entreprise.userId → Etablissement` est donc exercée à l'identique. Le serveur de ressource ne fait pas la différence, et c'est correct qu'il ne la fasse pas : son rôle s'arrête à « ce jeton est-il valide, et qui désigne-t-il ».

Vérifié en local :

- refus sans jeton, en `401` porteur du défi `WWW-Authenticate` désignant les métadonnées ;
- refus avec un jeton invalide ;
- document RFC 9728 servi, `resource` correspondant exactement à l'URL du serveur — port compris, ce qui n'allait pas de soi en développement ;
- résolution de portée contre la base réelle, y compris le refus d'un utilisateur inconnu.

Reste à valider, et qui ne peut pas l'être en local :

- le flux d'autorisation lui-même (consentement, échange de code, rafraîchissement) — étapes 4 à 6 ;
- **le point 8** : le sort réservé par Supabase au paramètre `resource` (RFC 8707).

Note sur le test avec un client réel : claude.ai ne joint que des URL publiques (egress `160.79.104.0/21`) et ne verra donc jamais un `localhost`. Deux clients savent en revanche parler à un serveur local — l'inspecteur MCP et Claude Code, ce dernier utilisant une redirection en boucle locale (RFC 8252). C'est par eux que passera la validation du flux complet avant tout déploiement.

## Note du 2026-09-27 — suspendu jusqu'à la migration Better Auth

Les étapes 4 et 5 (serveur OAuth Supabase, DCR, page `/oauth/consent`) n'ont
jamais été faites : un essai depuis Claude.ai le 2026-09-27 a échoué sur
l'enregistrement automatique du client. La propriétaire a décidé de ne pas
les terminer avec Supabase : l'authentification basculera sur Better Auth avec
la base sur Clever Cloud, et l'accès par compte du MCP sera construit à ce
moment-là (cf. `docs/backlog.md`, « Connecteur MCP par compte »). D'ici là, la
route à clé reste le seul accès ; sa clé a été changée le 2026-09-27.
