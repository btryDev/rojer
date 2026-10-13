# ADR-005 — Authentification via Supabase Auth

- Statut : acceptée
- Date : 2026-04-22
- Étape V2 : insérée en étape 12 (polish) à la demande utilisateur, pour débloquer la persistance par compte avant ouverture aux utilisateurs test.

## Contexte

Le MVP a été construit sans authentification (cf. CLAUDE.md MVP : « auth reportée, Entreprise devient la racine »). La sélection de l'entreprise courante n'est actuellement liée à aucune session : toute instance d'application voit toutes les entreprises, et un utilisateur qui revient après avoir vidé son cookie / changé de machine ne retrouve pas ses données.

Ce fonctionnement est bloquant :
1. Un dirigeant TPE qui teste l'outil perd son DUERP s'il ferme son navigateur ou change d'appareil.
2. Les données de conformité ont une valeur légale (DUERP conservé 40 ans) — elles ne peuvent pas reposer sur un cookie anonyme.
3. Impossible d'ouvrir à un premier cercle d'utilisateurs test sans isolation par compte.

La base tourne déjà sur **Supabase Postgres** (voir `.env.example` lignes 10-16 : pooler en port 6543 pour le runtime, URL directe en 5432 pour les migrations). Prisma reste l'ORM.

## Décision

Ajouter l'authentification via **Supabase Auth** (email + password) avec `@supabase/ssr` pour l'intégration Next.js App Router.

Points clés :

1. **Supabase Auth uniquement, pas Supabase client pour la data.** Prisma reste l'unique couche d'accès data (branchée via le rôle `postgres` qui bypass RLS). Supabase Auth sert à créer/valider des JWT et à gérer `auth.users`.

2. **Pas de modèle `User` dans Prisma.** Les utilisateurs vivent dans `auth.users` (schéma Supabase managé). On ajoute une colonne `userId UUID` sur `Entreprise` qui stocke l'UUID du user Supabase, sans contrainte FK cross-schéma (Prisma ne la modélise pas, et Supabase peut renommer/versionner son schéma auth).

3. **Racine de tenancy = `Entreprise.userId`.** Une entreprise appartient à un utilisateur. L'unicité 1 user → N entreprises est conservée (un dirigeant peut gérer plusieurs structures). Les sous-entités (Etablissement, Duerp, etc.) héritent de l'autorisation via la chaîne `entity → entreprise.userId`.

4. **Middleware Next.js** protège les routes applicatives. Whitelist : `/`, `/login`, `/signup`, `/auth/*`, `/_next/*`, assets statiques. Le reste exige une session.

5. **Helper `requireUser()`** dans chaque server action et chaque Server Component accédant à des données. Il lit la session Supabase côté serveur et redirect vers `/login` sinon. Toute requête Prisma qui lit/écrit des données liées à une entreprise doit passer par ce helper et scoper par `userId`.

6. **Données existantes** (13 entreprises, 11 établissements, etc.) conservées avec `userId = NULL`. Elles deviennent invisibles après la migration (le scoping `WHERE userId = ?` les exclut). Elles peuvent être rattachées ou purgées ultérieurement via un script one-shot ; pas de backfill automatique dans cette migration.

7. **RLS sur `public.*`** reste en mode `deny all` (migration `enable_rls_deny_all` déjà en place). Prisma n'est pas affecté car le rôle `postgres` bypass RLS. Si l'app passait un jour à du client-side Supabase, il faudra écrire des policies par table.

## Conséquences

### Positives

- Persistance par compte, flux utilisateur fiable, prérequis pour ouvrir la V2 aux tests.
- Aucun schéma auth à maintenir (géré par Supabase : hashage argon2, reset password, email verification, rate limiting, SSO futur).
- Cohérent avec l'infra existante (Supabase Postgres déjà en place) : pas de 2e service à provisionner, pas de 2e source de vérité.
- `auth.users.id` est un UUID stable — pas de couplage avec un id technique Prisma.
- Migration vers OAuth (Google, Microsoft) triviale plus tard sans toucher au modèle data.

### Négatives

- 32 fonctions de server action à modifier pour ajouter `requireUser()` et scoping par `userId` (chaîne `… → entreprise.userId = currentUser`).
- Tests existants (10 fichiers) ne sont pas impactés dans l'immédiat (ils testent des fonctions pures métier), mais les futurs tests e2e devront mocker la session Supabase.
- Couplage avec Supabase Auth : sortir de Supabase demanderait une migration d'auth (tolérable, `auth.users` export est documenté).
- Pas de RLS applicative côté Postgres sur `public.*` : l'isolation repose sur le code app. C'est un compromis MVP assumé (simplicité > défense en profondeur à ce stade). À reconsidérer si multi-user par entreprise.

### Coût de rétractation

Moyen. L'auth est un couloir central, mais :
- `requireUser()` isolé dans un helper : réécriture unique pour migrer vers un autre provider.
- Pas de model `User` Prisma → pas de migration data côté app si on change de provider.
- Les UUID `auth.users.id` peuvent être re-mappés sur un autre système d'identité.

## Alternatives rejetées

### NextAuth.js / Auth.js (mentionné dans CLAUDE.md V2)

- **Rejetée** parce que la DB est déjà sur Supabase, et Supabase fournit la stack auth native la plus intégrée (RLS, triggers, UI Auth, export user data). Utiliser NextAuth ajouterait une table `User` Prisma + un provider JWT custom + la gestion du hashage password côté app — sans valeur ajoutée.
- NextAuth aurait été le bon choix si la DB n'était pas sur Supabase.

### BetterAuth

- **Rejetée** pour le même motif : introduirait une 2e stack auth à maintenir en parallèle de `auth.users` déjà présent. Pertinent si on voulait contrôler 100 % du schéma auth ; pas notre cas.
- Évaluée comme sérieuse (TypeScript-first, schéma Prisma contrôlé, moderne), on la gardera en tête si un jour on migre hors de Supabase.

### Clerk / WorkOS / Auth0

- **Rejetées** : SaaS tiers payants, over-engineered pour un MVP TPE, hébergement hors UE possible (point RGPD — CLAUDE.md règle 9), vendor lock-in plus fort.

### Auth custom maison

- **Rejetée** : exigeant (hashage, reset, rate limiting, email verification), risqué sur un outil à valeur légale, inutile puisque Supabase est déjà là.

## Plan d'implémentation

1. Deps `@supabase/ssr` + `@supabase/supabase-js` ; vars `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans `.env.example`.
2. Prisma : `Entreprise.userId String?` + `@@index([userId])` ; migration DDL via Supabase MCP.
3. Clients `src/lib/supabase/{client,server,middleware}.ts`.
4. `middleware.ts` racine avec whitelist + refresh session. [2026-10-13 : renommé `src/proxy.ts`, export `proxy` — convention de Next 16, l'ancienne est dépréciée ; dans `src/`, au niveau de `app/`, seul emplacement où le build le détecte (un `proxy.ts` racine est ignoré en silence) ; le helper `src/lib/supabase/middleware.ts` garde son nom. La whitelist se compare désormais par segment entier.]
5. Helper `src/lib/auth/require-user.ts`.
6. Pages `/login`, `/signup`, `/auth/callback` + server actions `signIn`, `signUp`, `signOut`.
7. Scoping par `userId` : tous les reads/writes d'`Entreprise` et descendants. Création d'entreprise rattachée au user courant.
8. Header : email user + bouton logout.

## Notes post-implémentation

- Si Supabase email confirmation est activé (projet par défaut : oui), le signup ne log pas automatiquement : l'utilisateur doit cliquer un lien dans son mail. Pour le MVP dev, désactiver temporairement dans le dashboard Supabase (Authentication → Providers → Email → disable email confirmation) pour accélérer le flux de test.
- Les 13 entreprises existantes restent orphelines (`userId = NULL`). Décider plus tard : purge ou rattachement manuel.
