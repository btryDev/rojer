# État de la bascule vers Clever Cloud — passation du 2026-11-01

À lire avant toute session sur `main` ou sur `cc`. Ce fichier remplace la
mémoire locale des sessions, qui ne suit pas d'une machine à l'autre. Le
mettre à jour (rayer, dater) à chaque étape franchie.

## Deux branches, deux productions

| | `main` | `cc` |
|---|---|---|
| Rôle | Production actuelle (un testeur) | Future production |
| Hébergement | Vercel, déploie `main` à chaque fusion | Clever Cloud, déployé **par commande** (`scripts/deployer-cc.sh`) ; Vercel ne déploie jamais `cc` |
| Authentification | Supabase Auth (ADR-005) | Better Auth (ADR-052) : tables `User`, `Session`, `Account`, `AuthVerification`, `TwoFactor` dans notre base |
| Base | Supabase | PostgreSQL de Clever Cloud, **neuve** à la bascule (pas de reprise de données : la prod ne porte que des données factices) |

**Le flux va de `main` vers `cc`, jamais l'inverse.** Tout ce qui est fusionné
dans `main` se reporte dans `cc` par une PR de fusion (`main` → branche de
travail → PR vers `cc`). Conflits habituels au report : sur `cc`, le
connecteur MCP OAuth de Supabase n'existe plus — garder la suppression de
`src/lib/mcp/acces-oauth*.ts` et `route-oauth.test.ts`, ne pas réintroduire
`clientDuCompteVerifie` ni `ScopeMcp.userId`.

## Ce qui est sur `cc` (au 2026-11-01, e65ba81c)

- **Better Auth**, lots 1 à 3b (#133 à #139) : inscription, connexion,
  vérification d'adresse, mot de passe oublié, page « Sécurité du compte »
  (sessions, mot de passe, mots de passe divulgués refusés), double
  authentification (application TOTP + codes de secours ; pas de code par
  e-mail, décision du 2026-10-30).
- **Isolation des comptes (ADR-051)**, terminée : toutes les lectures et
  écritures passent par le client borné au compte (`requireCompte()` →
  `{ user, db }`, `src/lib/auth/portee/`) ; 9 modules nommés seulement
  touchent le client brut ; SQL brut par `requireLectureSqlProprietaire`,
  éprouvé sur base réelle (`auth/sql-proprietaire.integration.test.ts`).
- **Validation du 2026-10-31** sur une base neuve et un build de production :
  migrations rejouées depuis zéro sans écart, RLS sur les 39 tables ;
  75 routes × 2 comptes (B reçoit 404 sur tout ce qui est à A) ;
  23 écritures croisées sans effet ; réponse identique pour « à un autre
  compte » et « inexistant » ; 17 des 18 protections de la borne retirées une
  à une font tomber un test (la 18ᵉ vise une relation qui n'existe pas) ;
  13 pages au budget de requêtes, toutes sous 130 ms.

## Ce qui reste avant la bascule

Gestes de la propriétaire (Clever Cloud) :
1. Créer l'application et les add-ons : PostgreSQL, stockage Cellar (S3).
2. Poser les variables : `BETTER_AUTH_SECRET`, `PUBLIC_APP_URL`,
   `BASE_CA_PEM`, celles de Mailpace (nom exact à confirmer :
   `MAILPACE_API_TOKEN`), `STORAGE_DRIVER=s3` et celles du stockage. En
   production, `STORAGE_DRIVER=local` est refusé au démarrage, c'est voulu.
3. Questions au support : chiffrement au repos, restauration à un instant
   donné (PITR), durée de conservation des sauvegardes.

Documents à valider puis fusionner :
- PR #126 — `docs/plan-bascule-clever-cloud.md` : le plan et **l'ordre** de
  la bascule (couper Vercel avant de fusionner `cc`).
- PR #130 — ADR-052 (Better Auth).

Le jour J : suivre le plan de #126.

## Règles de travail qui valent ici

- Fusion : revue de code, simplification et sécurité faites et corrigées,
  **puis** CI verte. Jamais avant.
- Prouver une garantie en la cassant (mutation) avant de la dire tenue.
- Tests locaux ciblés ; la suite complète tourne en CI.
- Arrêtée par une limite d'usage, une session s'arrête et ne reprend pas
  d'elle-même : la propriétaire relance.

## Local

- Pile `cc` : `docker-compose.cc.yml`, `.env.cc-local.example`,
  `scripts/demarrer-cc.sh`.
- Tests d'intégration : `ISOLATION_INTEGRATION_URL` vers une base **locale**
  migrée, qu'ils vident (voir `.github/workflows/integration.yml`).
- Un `vitest` qui se fige en worktree : `perl -e 'alarm 300; exec @ARGV' pnpm exec vitest run … < /dev/null`, et rejouer (sortie 142).
