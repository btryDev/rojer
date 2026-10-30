# ADR-052 — L'authentification passe de Supabase Auth à Better Auth

- **Statut** : **proposée**, 2026-10-30. Attend le feu vert de la propriétaire
  sur les trois questions du § « Questions ».
- **Remplace** l'ADR-005 (Supabase Auth). **Amende** l'ADR-013 : le serveur
  d'autorisation OAuth du MCP sera Better Auth, dans un lot ultérieur.
- **S'appuie sur** l'ADR-051 (proposée, isolation des comptes par un client
  Prisma borné) : `lireUserCourant` est le seul endroit qui change de source,
  et les tables de Better Auth passent par le client hors compte.
- **Cadre** : plan de bascule vers Clever Cloud, `docs/plan-bascule-clever-cloud.md`,
  phase 1, et les critères de sécurité B1 à B31 qu'il reprend.

## Contexte

Rojer quitte Vercel et Supabase pour Clever Cloud (décision de la
propriétaire, 2026-09-27). Supabase Auth part avec Supabase. Better Auth a été
retenu à la même date : bibliothèque TypeScript, les données de compte dans
notre propre PostgreSQL, sans service tiers.

Trois décisions du 2026-10-30 cadrent ce changement :
- **aucune donnée n'est migrée** : les comptes actuels sont des comptes de
  test ; Better Auth part de tables vides, sans import des mots de passe ;
- **les e-mails passent par Mailpace** (`src/lib/email`, PR #128) : Better
  Auth n'envoie rien lui-même ;
- **double authentification proposée**, non imposée.

Ce qui dépend aujourd'hui de Supabase Auth (relevé sur `main` c9603fd1) :
- `src/lib/auth/require-user.ts` — `lireUserCourant`, seule lecture de
  l'identité (`requireUser`, `getOptionalUser`) ;
- `src/lib/auth/actions.ts` — connexion, inscription, mot de passe oublié,
  nouveau mot de passe, déconnexion ;
- `src/proxy.ts` et `src/lib/supabase/{middleware,server,client}.ts` —
  rafraîchissement de la session, routes publiques ;
- `src/app/auth/callback` et `src/app/auth/reinitialisation` — retours des
  e-mails Supabase ;
- `src/lib/mcp/acces-oauth*.ts` et `src/app/api/mcp/route.ts` — l'accès MCP
  par OAuth Supabase, commencé et jamais terminé (ADR-013, étapes 4-5) ;
- `src/env.ts` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

L'accès des prestataires par lien et code (ADR-007) n'en dépend pas : il est
déjà propre à l'application.

## Décision

### 1. Le moment : Better Auth part d'abord sur Vercel

Better Auth ne dépend pas de l'hébergeur : ses tables vivent dans la base,
quelle qu'elle soit. Suivant le principe du plan de bascule — tout ce qui ne
dépend pas de l'hébergeur part d'abord sur Vercel, où il se vérifie sans rien
couper —, Better Auth **remplace Supabase Auth en production actuelle**, sur
la base Supabase Postgres. Une seule façon de s'authentifier dans le code, à
aucun moment deux.

La bascule vers Clever Cloud ne touche plus alors à l'authentification : elle
déplace l'application, la base et les fichiers. Conséquence : les comptes de
test actuels disparaissent à ce moment-là, plutôt qu'à la bascule (question 1).

### 2. Les données

- Adaptateur **Prisma** de Better Auth ; tables `user`, `session`, `account`
  et la table de vérification, **renommée** par `modelName` (par exemple
  `authVerification`) : notre modèle `Verification` porte déjà ce nom (audit
  de la base, BA 1).
- **Identifiants en UUID** (`advanced.database.generateId: "uuid"`, posé
  explicitement : deux pages de la doc se contredisent sur la valeur par
  défaut). Ils remplissent les colonnes `@db.Uuid` existantes.
- **Clés étrangères vers `user.id`**, possibles parce que la base de comptes
  part vide : `Entreprise.userId`, `Signature.userId`,
  `AccessToken.createdByUserId`, `DemandeAssistance.userId` (qui passe en
  `@db.Uuid`, point 0.10 du plan), `Intervention.creeParUserId` (module
  retiré, ADR-018 : à supprimer plutôt qu'à relier). Les migrations suivent
  `migrations-index.test.ts` (clés `NOT VALID` puis `VALIDATE`).
- Le schéma généré par `npx auth generate` est relu ligne à ligne : une issue
  ouverte (#12134) signale des relations en double pour Prisma.
- Les tables de Better Auth sont hors compte au sens de l'ADR-051 : son
  adaptateur reçoit le client hors compte, dans un seul module
  (`src/lib/auth/better-auth.ts`).

### 3. L'identité dans l'application

- `lireUserCourant` lit `auth.api.getSession({ headers: await headers() })`.
  Le contrat de `requireUser(): { id, email }` ne change pas : aucun appelant
  n'est touché.
- **Le proxy** (`src/proxy.ts`) ne fait qu'un test de présence du cookie
  (`getSessionCookie`) pour rediriger tôt ; la validation reste dans
  `requireUser`, sur chaque page, action et route (H4). Le 401 sur `/api`
  reste.
- **Actions serveur** : plugin `nextCookies()`, en dernier dans la liste des
  plugins, sans quoi une connexion faite dans une action ne pose pas de
  cookie.
- **Coût par appel (M7)** : `cache()` de React ne mémoïse rien dans les
  actions et les routes. Sans `cookieCache` (§ 6), chaque `requireUser` d'une
  action lit donc la session en base : une requête par appel. L'ADR-051
  obtient le client une fois par fonction et n'aggrave rien ; la mémoïsation
  hors rendu reste ouverte, ce lot ne la règle pas.

### 4. Les comptes et les mots de passe

- E-mail et mot de passe, comme aujourd'hui. Hachage **scrypt**, la valeur
  par défaut de Better Auth, paramètres écrits dans le code (B4, B27).
- Longueur minimale 12, la règle actuelle (`src/lib/auth/mot-de-passe.ts`).
- **Vérification de l'adresse à l'inscription**, obligatoire avant la
  première connexion (`requireEmailVerification`) — c'est le comportement
  actuel de Supabase.
- Mots de passe divulgués refusés : question 2.
- Changer de mot de passe exige l'ancien et ferme les autres sessions
  (`revokeOtherSessions`) ; changer d'adresse exige une session récente
  (`freshAge`) (B21).

### 5. Les e-mails

Vérification d'adresse, mot de passe oublié, codes de double
authentification : les fonctions d'envoi de Better Auth appellent `sendMail`
(`src/lib/email`, pilote Mailpace). La doc de Better Auth demande de ne pas
attendre l'envoi, contre les attaques par mesure du temps ; l'envoi part donc
sans `await`, mais son échec est journalisé (`motifErreur`), jamais avalé.

`envoiEnService()` (PR #128) vaut aussi ici : sans pilote d'e-mail réel,
l'inscription et le mot de passe oublié disent qu'ils sont hors service au
lieu de promettre un e-mail.

### 6. Les sessions

- En base (défaut de Better Auth), donc révocables ; **sans `cookieCache`**,
  qui garderait valide une session révoquée jusqu'à son expiration (§ 9 du
  plan, contre-vérifié).
- Durée 7 jours, prolongée chaque jour d'usage (défauts) ; `freshAge` d'un
  jour pour les gestes sensibles.
- L'utilisateur voit ses sessions et en ferme une (`listSessions`,
  `revokeSession`) ; la déconnexion envoie `Clear-Site-Data` (B20, B30).

### 7. Double authentification

Plugin `twoFactor` : application d'authentification (TOTP), code par e-mail,
codes de secours, appareil de confiance 30 jours. **Proposée, non imposée**
(décision du 2026-10-30). Activer la 2FA exige le mot de passe. La perte des
deux facteurs n'a que les codes de secours : aucune réinitialisation par un
administrateur n'existe, et ce lot n'en crée pas.

### 8. Sécurité transversale

- Cookies `httpOnly`, `secure`, `SameSite=Lax` (défauts) ;
  `BETTER_AUTH_SECRET` exigé ; `baseURL` et `trustedOrigins` tirés de
  `PUBLIC_APP_URL`, sans joker ni localhost en production ; contrôles CSRF et
  d'origine jamais désactivés (B1, B2).
- Limitation de débit de Better Auth **en base** (`rateLimit.storage:
  "database"`) : en mémoire, elle serait fausse dès deux instances. Celle de
  l'application (`securite/limite-debit.ts`) reste pour ce qui n'est pas de
  Better Auth (B3, § 9 du plan).
- **IP** : Better Auth lit `x-forwarded-for` à sa façon ; elle doit lire la
  même entrée que `ipClient` (`securite/ip-client.ts`, la dernière). Le
  réglage (`advanced.ipAddress`) se fige au test de recette du plan (§ 7.2) :
  un `X-Forwarded-For` forgé ne doit pas déplacer la limite (B17).
- Les événements d'authentification vont au journal (B25).

### 9. Le MCP

L'accès par OAuth Supabase (`/api/mcp`, `acces-oauth*.ts`) n'a jamais servi :
il est **retiré** avec Supabase. L'accès par clé (`/api/mcp/[cle]`) reste,
clé tournée. L'accès par compte viendra dans un lot à part, avec le plugin
`@better-auth/mcp` (OAuth 2.1, PKCE, consentement, audience vérifiée) ; son
statut de stabilité n'est pas écrit, et une issue ouverte (#9961) fige
l'émetteur sur `baseURL` : à revérifier à ce moment-là (B5, B23).

### 10. Ce qui disparaît

`@supabase/ssr`, `src/lib/supabase/`, `src/app/auth/callback`, les variables
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` et l'URL publique Supabase **pour
l'authentification**. `@supabase/supabase-js` reste tant que le stockage
Supabase sert sur Vercel, et part à la bascule.

## Questions à la propriétaire

1. **Moment** : Better Auth en production actuelle, sur Vercel, avant la
   bascule (recommandé, § 1) — les comptes de test disparaissent alors, et
   Mailpace doit être en service sur Vercel aussi — ; ou seulement à la
   bascule, sur Clever Cloud, au prix d'une période où le code connaît deux
   authentifications.
2. **Mots de passe divulgués** : le plugin `haveIBeenPwned` de Better Auth
   interroge le service Have I Been Pwned avec les 5 premiers caractères de
   l'empreinte du mot de passe (anonymat par k-anonymat : ni le mot de passe
   ni son empreinte complète ne sortent). C'est une exigence de l'ASVS (B27).
   Recommandé : oui.
3. **Vérification de l'adresse** obligatoire à l'inscription, comme
   aujourd'hui : recommandé, oui.

## Lots

1. Tables et migrations (Better Auth, renommage, UUID, clés étrangères `NOT
   VALID` puis `VALIDATE`).
2. `src/lib/auth/better-auth.ts`, `lireUserCourant`, proxy, actions
   (connexion, inscription, vérification, mot de passe oublié, déconnexion),
   e-mails ; retrait de Supabase Auth et de l'OAuth MCP Supabase.
3. Sessions (liste, révocation), double authentification, mots de passe
   divulgués.
4. Recette : B1 à B31 concernés, matrice d'autorisation de l'ADR-051 rejouée.

Chaque lot : tests ciblés, gardes `tenancy-*`, épreuve par mutation, revue de
code, simplification et revue de sécurité avant fusion.

## Conséquences

- **Positives** : plus de dépendance à un service d'identité tiers ; comptes
  et sessions dans notre base, révocables ; clés étrangères vers les comptes ;
  la bascule vers Clever Cloud ne porte plus que de l'infrastructure.
- **Négatives** : nous portons ce que Supabase portait — e-mails de compte,
  limitation de débit, sécurité des sessions — d'où les critères B du plan ;
  les comptes de test sont à recréer ; une dépendance de plus à suivre
  (`better-auth`, versions 1.7.x).
- **Rétractation** : moyenne. L'identité ne se lit qu'en un endroit
  (`lireUserCourant`) et les tables sont les nôtres.

## Sources lues le 2026-10-30

- Better Auth : base de données (`modelName`, `generateId`), sécurité,
  sessions, limitation de débit, e-mails, Next.js, 2FA, MCP —
  https://www.better-auth.com/docs (pages citées dans le plan de bascule,
  annexe A).
- `better-auth` 1.7.14, `@better-auth/mcp` 1.7.14 (registre npm, 2026-10-26).
- Issues GitHub better-auth #12134 (Prisma, relations en double), #9961
  (émetteur MCP).
