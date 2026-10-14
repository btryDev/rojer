# Audit Next.js — Rojer — 2026-10-14

Version auditée : `origin/main` `517309db` (PR #32, en production). Audit en
lecture seule dans un worktree dédié (`.claude/worktrees/audit-nextjs-1014`).
Quatre passes : proxy, configuration et déploiement (moi) ; frontière
server/client, actions et routes avec couplage à l'auth, data fetching et
performance (trois sous-agents). **Chaque constat d'un sous-agent a été recoupé
dans le code ou par une commande rejouée** ; ce qui n'a pas pu l'être est en
« Non vérifié ».

**Contexte de lecture.** La production quitte Vercel pour **Clever Cloud**
(Node permanent, PostgreSQL Clever Cloud) et l'auth Supabase pour **Better
Auth**. Chaque constat porte une étiquette :
- **[Maintenant]** : vaut quel que soit l'hébergement ;
- **[Recette bascule]** : à exiger de la migration, ne pas corriger sur Supabase/Vercel ;
- **[Disparaît]** : tombe avec la migration.

L'audit OWASP du 2026-10-13 (`docs/revues/audit-owasp-2026-10-13.md`, S1-S13,
B1-B16, R1-R7) n'est pas refait. Je dis seulement ce qui est toujours ouvert sur
`517309db`.

## Synthèse

**Contexte**

| | |
|---|---|
| Versions | `next` 16.3.8 (Turbopack). `react`/`react-dom` 19.2.4 déclarés, mais l'App Router utilise le React fourni par Next (`19.3.0-canary-cbb046ab-20260731`). TypeScript 5.9.3. Node `>=22 <25` (`engines`, pas de `.nvmrc`). pnpm 10, lockfile commité. |
| Router | App Router seul : 69 `page.tsx`, 3 layouts, 17 `route.ts`, 30 fichiers `'use server'`, 125 fichiers `'use client'`. |
| Déploiement | Vercel (`vercel.json`, région `dub1`), pas de `output: "standalone"`, pas de Dockerfile. |
| Proxy | `src/proxy.ts`, convention Next 16 respectée. |
| Stack | Supabase Auth (`@supabase/ssr`), Prisma 6 / PostgreSQL, zod 4, Tailwind 4 + shadcn/base-ui, @react-pdf, jszip, xlsx. |
| Volume | ≈ 155 000 lignes TS hors tests, 415 fichiers de test. |

**Verdict**

- **Prêt pour la prod actuelle (Vercel, données factices), oui.** Aucune faille
  exploitable nouvelle. Next 16.3.8 n'est touché par aucun avis publié. Il n'y a
  aucune IDOR dans les 140 commits depuis l'audit OWASP, et le contrôle d'accès
  reste centralisé.
- **Pas prêt pour Clever Cloud en l'état.** Plusieurs comportements reposent en
  silence sur Vercel :
  - la garde `VERCEL_ENV` des previews ;
  - les hôtes MCP ;
  - `maxDuration` ;
  - une instance isolée par export PDF/ZIP ;
  - le build qui migre la base ;
  - `Entreprise.userId` typé UUID.
- **Le premier chantier technique est la performance perçue :**
  - le référentiel complet part au navigateur sur une page ;
  - le tableau de bord relit plusieurs fois les mêmes données ;
  - aucun état de chargement n'existe.

**Notes par axe**

| Axe | Note | Justification |
|---|---|---|
| 1. Architecture server/client | B | Aucune page ni aucun layout client, DAL réelle (`queries.ts` + `scope.ts`). Mais `server-only` est quasi absent, et une fuite du référentiel vers le client est mesurée. |
| 2. Proxy | C | Convention, matcher et liste blanche par segment sont corrects. Mais un appel réseau Auth part sur chaque requête, routes publiques comprises, et `/api` reçoit une 307. |
| 3. Sécurité | B | Contrôle d'accès solide et testé. Restent la CSP en Report-Only, l'absence de rate limiting et la validation MCP sans audience, tous déjà connus et liés à la bascule. |
| 4. Data fetching et cache | C | Lectures redondantes non mémoïsées, quelques waterfalls, aucun streaming. Les invalidations, elles, sont cohérentes. |
| 5. Rendu et Core Web Vitals | C | 316 Ko gzip de JS sur `/prescriptions`, 294 Ko gzip sur `/login`, aucun `loading.tsx`. Polices et images, en revanche, sont bien gérées. |
| 6. Robustesse et observabilité | C | Pages d'erreur FR propres (digest seul). Mais pas d'`instrumentation.ts`, pas de monitoring, pas de validation des variables d'environnement au boot, pas de timeouts sortants. |
| 7. Qualité du code | A | `strict`, tsc 0, ESLint 0 erreur, ≈ 5 000 tests, CI tsc + lint + vitest + dérive de schéma. |
| 8. SEO, accessibilité | B | `lang="fr"`, metadata sur 23 pages sur 69. Pas de `robots.ts`, pas de mentions légales (R1). |
| 9. Configuration et déploiement | D pour Clever Cloud | Migrations dans `build`, couplages Vercel, pas de `standalone`, variables non documentées. |

## Vérifications automatiques

| Commande | Résultat |
|---|---|
| `next build` (sans `prisma migrate deploy`) | ✓ 87 routes, **toutes `ƒ` dynamiques**, y compris `/login`, `/signup`, `/_not-found` (cause : M2) |
| `tsc --noEmit` | ✓ 0 erreur |
| `eslint .` | ✓ 0 erreur, 2 avertissements `no-location-assign-relative-destination` (`SignatureExterneForm.tsx:42` et un autre) |
| `pnpm audit --prod` | 10 avis, tous transitifs. Côté exécution : `ws` (supabase-js, disparaît), `sharp` librsvg (next, **pertinent chez CC**), `fflate` (@react-pdf). Côté build : browserslist, source-map-js, baseline-browser-mapping, @babel/core, deepmerge-ts. |
| Advisories next / react (`gh api …/security-advisories`) | Next : le dernier avis (30/09) est corrigé en 16.3.8, donc **aucun ouvert**. React : le correctif DoS du 21/07 (19.2.8) est antérieur au React fourni par Next (canary du 31/07). |
| `madge --circular` | 6 cycles, **tous par `import type`**, aucun à l'exécution |
| `knip` | 11 fichiers et 3 dépendances inutilisés (détail en B7) |
| Bundle (chunks lus à la main) | `/prescriptions` : 1 234 Ko / 316 Ko gzip. `/login` : 1 096 Ko / 294 Ko gzip. Tableau de bord : 612 / 166 Ko gzip. |
| Lighthouse | non installé, non lancé |

## Constats bloquants (Critique)

Aucun. Les risques de sévérité critique de l'audit OWASP (S1 RLS, next 16.3.5)
sont fermés sur `517309db`.

## Constats importants (Haute)

### H1 Le référentiel réglementaire entier est servi au navigateur
- **Axe** : 1 / 5. **[Maintenant]**
- **Où** : `src/components/prescriptions/PrescriptionForm.tsx:6` → `src/lib/prescriptions/schema.ts:7` (`import { obligationParId } from "@/lib/referentiels/conformite"`)
- **Constat** : un composant client importe le schéma zod, qui importe le référentiel.
  - Le chunk `.next/static/chunks/2icopaeas29yz.js` fait **857 Ko (216 Ko gzip)**. Il contient les 173 obligations et **175 occurrences de `notesInternes`**.
  - Il n'est chargé que par `/etablissements/[id]/prescriptions` (`page_client-reference-manifest.js`).
- **Impact** :
  - +216 Ko gzip sur une page, à parser sur mobile ;
  - les notes internes de rédaction sont téléchargeables par tout utilisateur connecté (le dépôt est public, donc ce n'est pas une fuite de secret, mais ce n'est pas voulu) ;
  - rien n'empêchera le prochain import de faire pareil.
- **Correctif** :
  - importer libellés et sources depuis `@/lib/prescriptions/sources` (module feuille) ;
  - garder le `refine` qui appelle `obligationParId` dans un schéma serveur ;
  - ajouter `import "server-only"` en tête de `src/lib/referentiels/conformite/index.ts`, pour que le build casse si ça revient.
- **Effort** : S

### H2 Tableau de bord : mêmes données relues plusieurs fois par rendu, sans `cache()`
- **Axe** : 4. **[Maintenant]**, gain encore plus net sur CC
- **Où** :
  - `src/app/etablissements/[id]/layout.tsx:31-58` et `page.tsx:87-188` ;
  - `getEtablissement` (`src/lib/etablissements/queries.ts:6`) et `getOptionalUserEtablissement` (`src/lib/auth/scope.ts:221`), tous deux non mémoïsés (vérifié : aucun `cache(` dans ces fichiers).
- **Constat** :
  - la ligne `Etablissement` est lue ≥ 7 fois : header racine, layout, `getEtablissement`, `chargerTransmissions`, `etatsPermanentsDuDossier`, marques, couverture ;
  - `compterActions` et `compterEtatEcheances` tournent 2 à 3 fois (sidebar et page) ;
  - le moteur `determineObligationsApplicables` tourne ≥ 3 fois sur le même établissement (`transmissions.ts:391`, `marques-a-confirmer.ts:81`, `etats-permanents/queries.ts:118`), plus les sondes de `reponses-exigees.ts:152`.
- **Impact** :
  - en prod, la base passe par le pooler en mode transaction avec `connection_limit=1` (`.env.example:51`), donc chaque `Promise.all` est **sérialisé** sur une connexion. Ordre de grandeur estimé (non mesuré) : ≈ 50 requêtes SQL par affichage ;
  - sur CC, le parallélisme devient réel, mais un seul rendu peut occuper tout le pool.
- **Correctif** :
  - `cache()` sur `getEtablissement`, `getOptionalUserEtablissement`, `compterActions`, `compterEtatEcheances` (avec `now` passé en argument), `getEtatModules` ;
  - un chargement unique « établissement + équipements actifs », mémoïsé ;
  - un `cache((id) => determineObligationsApplicables(...))` partagé.
- **Effort** : M

### H3 Exports PDF et ZIP entièrement en mémoire, rendu PDF synchrone sur le processus commun
- **Axe** : 4 / 6. **[Recette bascule]**
- **Où** :
  - `src/app/api/etablissements/[id]/controle-zip/route.ts:214,273,299,310` (4 `renderToBuffer`) ;
  - `fichiers-zip.ts:68` (chaque fichier en `Uint8Array`) ;
  - routes `registre/pdf`, `dossier-conformite/pdf`, `plan-actions/pdf`, `duerp/…/pdf`.
- **Constat** :
  - tout le ZIP est construit en mémoire avant d'être « streamé », sans plafond sur le nombre de rapports (20 Mo chacun au plus) ;
  - le rendu `@react-pdf` est du calcul synchrone ;
  - `maxDuration = 300` (l.48) n'a d'effet que sur Vercel.
- **Impact** : sur Vercel, chaque export a son instance isolée. Sur un Node permanent mono-instance, un export lourd :
  - consomme la RAM de l'instance commune ;
  - **bloque la boucle d'événements pour tous les utilisateurs** pendant la mise en page ;
  - n'est plus jamais coupé.
- **Correctif** :
  - sémaphore « un export à la fois » au minimum ;
  - PDF dans un `worker_thread` ;
  - ZIP en vrai flux avec contre-pression, lecture du stockage fichier par fichier ;
  - timeout au reverse proxy CC ;
  - dimensionner la RAM de l'instance.
- **Effort** : M

### H4 Le proxy valide la session par un appel réseau sur chaque requête, routes publiques comprises
- **Axe** : 2. **[Recette bascule]**. Ne pas réécrire sur Supabase.
- **Où** : `src/lib/supabase/middleware.ts:84-101`
- **Constat** :
  - `supabase.auth.getUser()` (aller-retour HTTP vers Supabase Auth) est appelé **avant** `isPublicPath`, donc aussi sur `/accessibilite/*` (scans de QR), `/api/mcp`, `/verifier`, chaque prefetch RSC et chaque server action ;
  - le rendu refait ensuite un appel, mémoïsé, soit 2 allers-retours par page ;
  - une route `/api/*` sans session reçoit `NextResponse.redirect` (307) vers `/login`, pas une 401 (B14 toujours ouvert).
- **Impact** : latence ajoutée à chaque navigation, et dépendance de disponibilité à Supabase pour des pages publiques qui n'en ont pas besoin.
- **Correctif Better Auth** :
  - proxy **optimiste** : présence du cookie (`getSessionCookie`), aucune requête DB ni réseau, et rien du tout sur les chemins publics ;
  - validation réelle dans `requireUser` (déjà le point unique : 67 à 115 fichiers en dépendent, aucun ne touche Supabase) ;
  - 401 JSON pour `/api/*`.
- **Effort** : S (dans la bascule)

### H5 Couplages Vercel qui cassent sans erreur chez Clever Cloud
- **Axe** : 9. **[Recette bascule]**
- **Où et constat** :
  - `package.json:10` : `"build": "prisma generate && next build && prisma migrate deploy"`. Tout build migre la base qu'il vise (B7, toujours ouvert).
  - `src/lib/calendrier/regeneration-sure.ts:90` : `if (process.env.VERCEL_ENV === "preview") return false;`. Chez CC, la variable n'existe pas : une preview **écrirait** le calendrier.
  - `src/lib/mcp/hotes.ts:29` : hôtes autorisés pris dans `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`. Sans `MCP_HOTES`, l'hôte de prod est refusé, et la variable est absente de `.env.example`.
  - `maxDuration` (`controle-zip`, `api/mcp`) n'a plus d'effet.
  - Pas de `output: "standalone"`.
  - Le proxy et `auth/callback` construisent leurs redirections depuis `request.url` : à vérifier derrière le reverse proxy CC (`Host`, `X-Forwarded-Proto`).
- **Correctif** :
  - `migrate deploy` en étape de déploiement distincte (hook CC `CC_PRE_RUN_HOOK`), sur la prod seulement ;
  - une variable d'environnement propre (`APP_ENV=production|preview`) qui remplace `VERCEL_ENV` ;
  - `MCP_HOTES` obligatoire ;
  - `output: "standalone"`.
- **Effort** : S

### H6 `Entreprise.userId` est un UUID : incompatible avec les identifiants par défaut de Better Auth
- **Axe** : 9 / 3. **[Recette bascule]**
- **Où** : `prisma/schema.prisma:32` (`userId String? @unique @db.Uuid`), et `Signature.userId` (l.1176). Comparé environ 90 fois dans 61 fichiers.
- **Constat** : Better Auth ne génère pas d'UUID par défaut. Une insertion dans une colonne `@db.Uuid` échouerait.
- **Correctif** : configurer la génération d'identifiants de Better Auth en UUID (option `advanced.database.generateId`, nom exact à confirmer dans la doc de la version retenue) et **réutiliser les UUID Supabase** à l'import des comptes. Cela évite de migrer 61 fichiers et les données. Variante : passer la colonne en `text` par migration additive.
- **Effort** : S (décision) / M (import des comptes)

## Améliorations (Moyenne)

### M1 Aucun état de chargement
- **Où** : 0 `loading.tsx`, 0 `<Suspense` dans `src` (comptés).
- **Constat** : toutes les routes sont dynamiques. Un clic dans la sidebar ne donne aucun retour tant que la réponse RSC complète n'est pas arrivée.
- **Correctif** : `src/app/etablissements/[id]/loading.tsx` (le layout et la sidebar restent en place), puis `<Suspense>` autour des widgets lents du board (transmissions, états permanents, frise).
- **Effort** : S. **[Maintenant]**

### M2 Le header racine s'exécute sur toutes les pages
- **Où** : `src/app/layout.tsx:28-30`, `src/components/layout/AppHeader.tsx:22-23`, `AppHeaderGate.tsx`.
- **Constat** : `AppHeader` (server) lit la session et fait 1 ou 2 requêtes en base. Le portillon est **client** : il masque le résultat après coup. Le travail est donc fait aussi sur le tableau de bord, le calendrier et le DUERP, où le header n'apparaît jamais. Il rend aussi `/login`, `/signup` et `/_not-found` dynamiques. `/` refait le même couple d'appels (`page.tsx:31-32`).
- **Correctif** : route groups `(public)` / `(app)`, `AppHeader` dans le layout `(public)` seulement, `cache()` sur `getOptionalUserEtablissement`.
- **Effort** : S-M. **[Maintenant]**

### M3 `server-only` presque absent
- **Où** : présent seulement dans `storage/{index,supabase,servir}.ts` et `legifrance/client.ts`. Absent de `src/lib/prisma.ts`, `auth/require-user.ts`, `auth/scope.ts`, `email/index.ts`, `supabase/server.ts`, `mcp/*` et des 23 `*/queries.ts` (vérifié : 0 occurrence).
- **Constat** : `lib/email/index.ts` (lit `EMAIL_DRIVER`, `PUBLIC_APP_URL`) est déjà atteint transitivement depuis un composant client (`WidgetShell.tsx:15` → … → `accessibilite/publication.ts:1`). Seul l'élagage du bundler l'écarte. H1 montre que l'élagage ne suffit pas toujours.
- **Correctif** : `import "server-only"` dans ces modules et dans le référentiel.
- **Effort** : S. **[Maintenant]**

### M4 Requêtes indépendantes en série
- **Où** :
  - `etablissements/[id]/registre/page.tsx:52,62,66,71` (4 `await` à la suite) ;
  - `equipements/page.tsx:54` puis `:66` ;
  - `calendrier/page.tsx:288-294` ;
  - `duerp/[id]/layout.tsx:40` puis `:53`.
- **Correctif** : `Promise.all` après la garde d'accès. Le gain n'existe que sur un pool > 1 connexion, donc chez CC.
- **Effort** : S. **[Maintenant]**

### M5 Deux `PrismaClient` dans le même processus
- **Où** : `src/lib/mcp/prisma.ts:18` (`prismaMcp`), utilisé par `mcp/queries.ts` et `mcp/acces-oauth-deps.ts`, donc par la route HTTP `/api/mcp`.
- **Constat** : justifié en commentaire pour le serveur stdio (logs sur stderr). Mais la route HTTP en hérite.
- **Impact** : sur un Node permanent, deux pools vers la même base, à compter dans `max_connections` du plan CC.
- **Correctif** : n'utiliser `prismaMcp` que dans `scripts/mcp-server.ts`.
- **Effort** : S. **[Recette bascule]**

### M6 Ni validation des variables au démarrage, ni instrumentation, ni monitoring
- **Où** : pas d'`instrumentation.ts`, pas de module `env`. `src/lib/supabase/*.ts` lit `process.env.NEXT_PUBLIC_SUPABASE_URL!`. 20 fichiers journalisent par `console.error`.
- **Constat** : une variable manquante plante à la première requête qui la lit, avec une erreur obscure.
  - `MCP_CLE`, `MCP_ETABLISSEMENT_ID`, `MCP_HOTES`, `LEGIFRANCE_*` sont absentes de `.env.example`.
  - Aucun `onRequestError`.
- **Correctif** :
  - `src/env.ts` (zod) importé par `instrumentation.ts` `register()` ;
  - `onRequestError` vers un drain de logs CC (B10) ;
  - compléter `.env.example`.
- **Effort** : S. **[Recette bascule]**

### M7 Session relue sans mémoïsation hors rendu
- **Où** : `controle-zip/route.ts:110,119` puis les 3 builders (`pdf/builders.ts:119`).
- **Constat** : ≥ 5 appels `getUser()` réseau pour un seul export. `cache()` de React ne mémoïse rien hors rendu Flight : `react.react-server.production.js:311-312`, sans dispatcher la fonction est rappelée directement.
- **Correctif** : passer l'utilisateur en paramètre aux builders, ou une mémoïsation par requête qui marche aussi hors RSC (`AsyncLocalStorage`) dans le futur `requireUser` Better Auth.
- **Effort** : S. **[Recette bascule]**

### M8 zod et le barrel `ui-kit` chargés sur `/login`
- **Où** : `LoginForm` → `@/components/ui-kit` (barrel) → `StatusPill` → `lib/calendrier/etats.ts:29` → `lib/rapports/schema` → zod.
- **Constat** : le chunk `0ict46jwt06ly.js` (282 Ko, 67 Ko gzip, contient `ZodError`) figure dans les manifestes de `/login` et `/login/mot-de-passe-oublie`. Le barrel `ui-kit` est importé par environ 30 composants client, presque tous pour `ChampBoard`.
- **Correctif** : import direct `@/components/ui-kit/ChampBoard`, et sortir `statutDepuisResultat` du fichier de schéma.
- **Effort** : S. **[Maintenant]**

### M9 Pas de timeout sur les appels sortants
- **Où** : aucun `AbortSignal` ni timeout sur le stockage ni sur l'auth.
- **Correctif** : timeouts explicites sur le client S3 (Cellar) et l'adaptateur Better Auth. Fixer `connect_timeout` et `pool_timeout` dans `DATABASE_URL`.
- **Effort** : S. **[Recette bascule]**

### M10 Le calendrier sérialise toutes les années
- **Où** : `calendrier/page.tsx:440-443` (`anneeMin` → `anneeMax` sur toutes les lignes).
- **Constat** : la charge utile RSC grandit avec l'historique du dossier (taille réelle non mesurée, pas de données).
- **Correctif** : ne rendre que l'année affichée.
- **Effort** : S. **[Maintenant]**

### M11 Toujours ouverts depuis l'audit OWASP, à exiger de la bascule
Vérifiés sur `517309db` :
- **S7** : CSP en Report-Only (`src/lib/securite/entetes.ts:10-21`). À passer en bloquante avec nonce au moment de la bascule.
- **B3 / B14** : aucun rate limiting dans l'app (connexion, inscription, réinitialisation, MCP, `/verifier`). `verifierIntegriteSignature` est publique et hache jusqu'à 20 Mo.
- **S11** : `/api/mcp` accepte tout JWT Supabase (`getClaims` puis `sub` seulement), sans contrôle d'`aud`. Disparaît avec le plugin OAuth Better Auth (B5).
- **S9** : cookies Supabase par défaut. **[Disparaît]**, critère de recette B1.
- **B4** : mot de passe de 8 caractères minimum (`auth/actions.ts:16`).
- **S12** : `error.message` Supabase renvoyé brut au signup (`auth/actions.ts:77`). **[Disparaît]**
- **B11** : `bodySizeLimit: "25mb"`. Vérifier le plafond du reverse proxy CC.

## Polish (Basse)

- **B1** `regenererSansInvalider` est exporté d'un module `'use server'` (`calendrier/actions.ts:1,96`). C'est donc un endpoint public, même s'il est gardé par l'appartenance : un propriétaire peut déclencher des régénérations coûteuses à volonté. Le sortir dans un module `server-only`.
- **B2** `listerVersions` (`versions/queries.ts:5-13`) charge tous les `snapshot` JSON (conservation 40 ans) pour une liste. Ajouter un `select`.
- **B3** `signOutAction` (`auth/actions.ts:117-121`) n'efface pas le cookie `etablissement-actif`. Il est revalidé par `userId` à la lecture, donc sans risque, mais il est à nettoyer.
- **B4** `react`/`react-dom` 19.2.4 déclarés alors que le correctif DoS RSC est en 19.2.8. Sans effet sur l'App Router (React fourni par Next), mais à aligner pour les tests et le futur.
- **B5** `sharp` (librsvg, via next) : à monter dès que next le propose. Pertinent en self-host si `next/image` sert un jour des SVG.
- **B6** 27 appels `prisma.` directs dans 10 fichiers de `src/app` (dont `controle/page.tsx` ×8 et `controle-zip/route.ts` ×8). Les 4 routes de fichiers recodent leur garde au lieu de passer par `scope.ts`. Les ramener dans les `queries.ts`.
- **B7** Code mort (knip, vérifié à la main) :
  - fichiers : `CreerDuerpButton.tsx`, `onboarding/CarteChoix.tsx`, `ui/card.tsx`, `ui/select.tsx`, `lib/equipements/pictos.ts` ;
  - dépendances : `react-hook-form`, `@hookform/resolvers` (0 import), `@dnd-kit/modifiers` ;
  - `public/` : `vercel.svg`, `next.svg`, `globe.svg`, `window.svg`, `file.svg`, `building.png`, `store.png` (0 référence dans `src`) ;
  - la section « Stack » du CLAUDE.md annonce react-hook-form, qui n'est plus utilisé.
- **B8** Cinq routes PDF répètent le même squelette `renderToBuffer` → `Response`. Un helper `reponsePdf()`.
- **B9** `useLayoutPerso` (`useLayoutPerso.ts:180-199`) rend la disposition par défaut puis celle du `localStorage` : saut visuel (CLS) chez qui a personnalisé son board.
- **B10** Index manquants sur `PermisFeu.prestataireId`, `PlanPrevention.prestataireId`, `AccessToken.prestataireId`.
- **B11** Pas de `robots.ts`. Les pages publiques (`/accessibilite/[slug]`, `/verifier`, `/signe`, `/acces`) devraient être exclues de l'indexation, sauf choix contraire. Pas de mentions légales (R1, en attente de la propriétaire).
- **B12** 2 avertissements ESLint `window.location` vers des pages internes (`SignatureExterneForm.tsx:42`).
- **B13** Pas de `.nvmrc` ; `engines` en plage. Chez CC, fixer `CC_NODE_VERSION`.

## Quick wins

1. **H1** : couper l'import du référentiel dans `prescriptions/schema.ts` et ajouter `server-only` au référentiel. −216 Ko gzip. (S)
2. **M3** : `import "server-only"` sur `prisma.ts`, `auth/*`, `email/*`, `*/queries.ts`. (S)
3. **M1** : `etablissements/[id]/loading.tsx`. (S)
4. **H2 (partiel)** : `cache()` sur `getEtablissement`, `getOptionalUserEtablissement`, `compterActions`. (S)
5. **M8** : import direct de `ChampBoard`. −67 Ko gzip sur `/login`. (S)
6. **M4** : `Promise.all` sur le registre et les équipements. (S)
7. **B1, B2** : sortir `regenererSansInvalider` du module `'use server'` et ajouter un `select` à `listerVersions`. (S)
8. **B7** : retirer `react-hook-form`, `@hookform/resolvers` et les fichiers morts. (S)

## Critères de recette de la bascule Clever Cloud + Better Auth

Ils s'ajoutent à B1-B16 de l'audit OWASP :

- Proxy optimiste par cookie, validation dans `requireUser`, 401 sur `/api` (H4).
- UUID conservés pour `userId` (H6).
- `migrate deploy` hors du build ; remplaçant de `VERCEL_ENV` ; `MCP_HOTES` ; `output: "standalone"` (H5).
- Exports PDF/ZIP bornés (sémaphore ou worker), timeout au reverse proxy, RAM dimensionnée (H3).
- Un seul `PrismaClient` côté web ; `connection_limit` fixé selon `max_connections` du plan ; retirer `pgbouncer=true` (M5, H2).
- `env.ts` validé au boot, `instrumentation.ts`, drain de logs (M6).
- Mémoïsation de la session hors RSC (M7) ; timeouts sortants (M9).
- Stockage S3 Cellar derrière l'interface `FileStorage` existante (`storage/index.ts` le prévoit déjà).

## Ce qui est bien fait

- **Contrôle d'accès centralisé et testé.** `requireUser` et `scope.ts`, les tests `tenancy-*`. Aucune IDOR dans le delta, et les oracles d'existence sont fermés (permis, plan, équipement, rapport).
- **La bascule d'auth est cadrée.** `requireUser(): {id, email}` est le seul point de lecture de l'identité côté serveur. Le couplage à Supabase tient dans une douzaine de fichiers.
- **Frontière server/client propre.** Aucune page ni aucun layout client. Les props sont des projections, jamais des modèles Prisma. `@react-pdf`, `xlsx`, `jszip` et `qrcode` restent côté serveur. Le stockage est protégé par `server-only` et un test.
- **Next 16 bien suivi.** `src/proxy.ts`, liste blanche par segment, `poweredByHeader: false`, en-têtes de sécurité fusionnés correctement pour les fichiers (`sandbox`), `no-store` sur toute réponse personnelle.
- **`cache()` déjà posé, avec la bonne justification de portée,** sur `requireUser`, `getDashboardData`, `fraicheur` et `marquesAConfirmerDuRendu`.
- **Bonnes pratiques de rendu.** Aucun N+1, index sur toutes les FK `etablissementId`, `next/font` auto-hébergé, un seul `<img>`, aucun script tiers.
- **Qualité.** TypeScript strict à 0 erreur, ESLint à 0 erreur, ≈ 5 000 tests. CI épinglée par SHA avec tsc, lint, vitest et dérive schéma ↔ migrations.

## Non vérifié / à confirmer

- **Pages authentifiées non mesurées** (pas de session ni de données dans le worktree) : temps de rendu réel, nombre exact de requêtes SQL du board (≈ 50 est une estimation par lecture), taille du payload RSC du board et du calendrier.
- **Exports** : durée et mémoire de `renderToBuffer` et du ZIP sur un vrai dossier.
- **Server actions** : l'absence de mémoïsation de la session dans le corps d'une action est déduite de la lecture de React, pas mesurée.
- **Better Auth** : nom exact de l'option de génération d'UUID, à lire dans la doc de la version qui sera installée.
- **Clever Cloud** : `max_connections` du plan PostgreSQL, plafond de corps du reverse proxy, en-têtes `X-Forwarded-*`.
- **Non lancés** : Lighthouse et l'analyseur de bundle Turbopack (`next experimental-analyze`, qui écrit dans `.next`). Les chunks ont été identifiés à la main.
- **Non couverts** : DAST, ReDoS, le détail des 86 exports inutilisés de knip.

## Plan de correction proposé

1. **Maintenant, avant toute nouvelle fonctionnalité (1 lot, S)** : H1, M3, M8, B1, B2, B7. Même thème : ce qui part au client, ce qui est exposé en action.
2. **Lot perf (M)** : H2, M1, M2, M4, M10. À mesurer avant et après, en comptant les requêtes avec le `log: ["query"]` de Prisma sur un dossier de démo.
3. **Bascule Clever Cloud + Better Auth** : H3, H4, H5, H6, M5, M6, M7, M9, M11, en suivant la liste de recette ci-dessus et B1-B16.
4. **Reste de la basse** au fil de l'eau.

Rien n'est corrigé : j'attends la validation avant de toucher au code.
