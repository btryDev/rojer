# ADR-052 — L'authentification passe de Supabase Auth à Better Auth

- **Statut** : **proposée**, 2026-10-30. ~~Attend le feu vert de la propriétaire
  sur les trois questions du § « Questions ».~~ [2026-10-30 : questions
  tranchées (§ « Questions ») ; reste à l'accepter.]
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

### 1. Le moment : ~~Better Auth part d'abord sur Vercel~~ sur la branche `cc`

[2026-10-30, décision de la propriétaire : un testeur utilise la prod Vercel,
qui ne doit pas bouger. Better Auth se code sur la branche `cc`, qui porte la
migration ; il ne rejoint `main` qu'à la bascule (plan de bascule, en-tête).
Mailpace se branche sur Clever Cloud, depuis son interface. Le texte ci-dessous
était la recommandation d'avant, écartée.]


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

Plugin `twoFactor` : application d'authentification (TOTP), ~~code par e-mail,~~
codes de secours, appareil de confiance 30 jours. [2026-10-30, décision de la
propriétaire : pas de code par e-mail — qui tient la boîte tient déjà la
réinitialisation du mot de passe, et le second facteur ne protégerait plus que
d'un mot de passe divulgué.] **Proposée, non imposée**
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
- **IP** : Better Auth lit ~~`x-forwarded-for` à sa façon~~ la **première**
  entrée de `x-forwarded-for`, celle que le client écrit, alors que le proxy
  de Clever Cloud ajoute l'adresse réelle à droite (mesuré en prod par
  GestBAT, plan § 5 bis). Notre proxy (`src/proxy.ts`) calcule l'IP par
  `ipClient` (`securite/ip-client.ts`, la dernière entrée), la pose dans un
  en-tête interne **écrasé à chaque requête**, et
  `advanced.ipAddress.ipAddressHeaders` ne lit que lui. Recette (plan § 7.2) :
  un `X-Forwarded-For` forgé, ou l'en-tête interne envoyé par le client, ne
  déplace pas la limite (B17).
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

## Ce que la réalisation a précisé (lots 1 et 2, 2026-10-30, PR #133 et #135)

Écarts à ce qui précède, chacun avec sa raison :

- **Aucune route HTTP de Better Auth** (`/api/auth/*` n'est pas monté) : nos
  actions serveur et deux routes (`/auth/verification`, la page
  `/auth/reinitialisation`) appellent `auth.api.*`. La surface exposée reste
  celle de l'app, sous sa limitation de débit (`securite/limite-debit.ts`) ;
  la limitation « en base » de Better Auth (§ 8), qui ne garde que ses routes
  HTTP, n'a donc rien à protéger et n'est pas activée.
- **Sessions de sept jours depuis la connexion, sans prolongation**
  (`disableSessionRefresh`), au lieu de « prolongée chaque jour » (§ 6) :
  prolongée pendant le rendu d'une page, la session l'était en base mais pas
  dans le cookie (un composant serveur ne peut pas écrire de cookie), et la
  déconnexion tombait au septième jour malgré tout. Choix assumé : une
  utilisatrice active se reconnecte une fois par semaine. À rouvrir si
  c'est gênant, en prolongeant là où le cookie s'écrit (actions).
- **Ni la confirmation d'adresse ni la réinitialisation n'ouvrent de
  session** : elles renvoient vers la connexion. La réinitialisation ferme
  toutes les sessions du compte.
- **Les e-mails de compte partent sans être attendus** : attendus, ils
  rendaient la réponse plus lente quand le compte existe — le chronomètre
  disait qui a un compte (revue de sécurité). L'échec est journalisé.
- **IP** (§ 8) : réglé comme prévu, l'en-tête interne `x-rojer-ip-client`,
  écrasé par le proxy à chaque requête. Elle ne sert qu'à l'IP notée sur la
  session, que la liste des sessions du lot 3 affichera.
- **`Clear-Site-Data`** à la déconnexion : reporté au lot 3, avec la liste
  des sessions — une action serveur ne pose pas d'en-tête de réponse.
- **Clés étrangères vers `User`** : posées au lot 2 et non au lot 1, avec la
  bascule qui crée les comptes ; une migration qui trouve un compte inconnu
  de `User` s'arrête avant toute modification (base Supabase non remise à
  zéro).

## Ce que la réalisation a précisé (lots 3a et 3b, 2026-10-30, PR #138 et suivante)

- **Mots de passe divulgués** : notre module (`auth/mot-de-passe-divulgue.ts`),
  pas le plugin `haveIBeenPwned` — celui-ci appelle le service sans délai et
  refuse l'inscription quand il est en panne. Même k-anonymat ; délai de
  4 s ; service muet = on laisse passer, et le journal le dit.
- **Pas de `Clear-Site-Data`** à la déconnexion (§ 6, revue de la PR #138) :
  il effaçait les préférences du tableau de bord et tous les cookies du
  domaine pour ne rien protéger de plus. La déconnexion efface nommément le
  cookie d'établissement actif.
- **Double authentification** (§ 7) :
  - à la connexion, `/login/code` relève le défi de dix minutes posé par le
    plugin ; un seul champ pour le code de l'application ou un code de
    secours ; cinq essais par défi, compte verrouillé quinze minutes après
    dix échecs (plugin), plus notre limite par IP ;
  - activer exige le mot de passe, puis un premier code : rien n'est actif
    avant ; les codes de secours ne s'affichent qu'après ;
  - **à chaque activation, tous les appareils de confiance du compte sont
    oubliés** : le plugin n'efface que celui du navigateur qui désactive, et
    un appareil approuvé avant une désactivation passait sans code jusqu'à
    trente jours après la réactivation ;
  - le rendu qui suit une action lit la session dans les cookies laissés par
    l'action (`entetesDeSession`) : activer renouvelle la session, et la page
    relisait l'ancien cookie, puis renvoyait à `/login`.

## Questions à la propriétaire

1. ~~**Moment** : Better Auth en production actuelle, sur Vercel, avant la
   bascule (recommandé, § 1) — les comptes de test disparaissent alors, et
   Mailpace doit être en service sur Vercel aussi — ; ou seulement à la
   bascule, sur Clever Cloud, au prix d'une période où le code connaît deux
   authentifications.~~ [2026-10-30 : sur la branche `cc`, § 1.]
2. **Mots de passe divulgués** : le plugin `haveIBeenPwned` de Better Auth
   interroge le service Have I Been Pwned avec les 5 premiers caractères de
   l'empreinte du mot de passe (anonymat par k-anonymat : ni le mot de passe
   ni son empreinte complète ne sortent). C'est une exigence de l'ASVS (B27).
   Recommandé : oui. [2026-10-30 : retenu — la propriétaire laisse
   l'authentification à l'appréciation de la session (« peu importe »).]
3. **Vérification de l'adresse** obligatoire à l'inscription, comme
   aujourd'hui : recommandé, oui. [2026-10-30 : retenu, même motif.]

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
