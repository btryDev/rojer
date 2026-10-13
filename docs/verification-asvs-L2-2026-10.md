# Vérification OWASP ASVS 5.0.0 niveau 2 — Rojer — 2026-10-13

Ce document rend compte de la vérification de Rojer selon l'ASVS 5.0.0, niveau 2. Ce n'est pas une certification : l'application a été vérifiée selon ASVS 5.0.0 L2, exigence par exigence, avec la preuve que chacune a reçue.

**Deux lectures, à ne pas confondre.** Le **verdict** de chaque exigence est celui de la production actuelle, Vercel et Supabase Auth compris. La **classe de bascule** sert seulement à ordonner les corrections, puisque la propriétaire va migrer l'hébergement de l'application et de la base vers Clever Cloud, et l'authentification de Supabase Auth vers Better Auth. Il y a trois classes :

- **MAINTENANT** : l'écart se corrige dans le code actuel ;
- **DISPARAÎT** : l'écart tient à Supabase Auth, aux rôles ou à l'API Data de Supabase, ou à Vercel, et ne se corrige pas sur l'existant ;
- **À EXIGER** : l'écart devient un critère de recette de la bascule (voir les B1 à B16 de l'audit du 13/10, complétés ici par B17 à B31).

Un écart classé DISPARAÎT reste un FAIL aujourd'hui. Il faut le lire ainsi : la plupart des FAIL de V6, V7, V9 et V10 viennent de Supabase Auth, mais pas tous. Sur les 19 FAIL de ces quatre chapitres, 10 tiennent à Supabase Auth et disparaîtront avec lui, à condition que la recette les vérifie. 8 portent sur une décision ou une fonction qu'aucun fournisseur n'apporte seul (politique de limitation de débit, liste de mots de contexte, MFA, durées de session, `MCP_CLE`) : il faudra les exiger de la bascule, sans quoi ils reviendront. Le dernier, V6.3.4, est en partie dans le code de l'application : la signature en compte connecté se fait sans l'OTP que prévoit l'ADR-006. Une exception va dans l'autre sens. L'absence de RLS (E-1) tient à Supabase, mais elle est classée MAINTENANT, parce que le risque est sérieux d'ici la bascule et que le correctif est prêt.

## Périmètre et méthode

**Version vérifiée.** `origin/main` au commit `8f48889e` (8f48889eac3a…, merge de la PR #23), celui qui est déployé. La vérification a été faite le 2026-10-13, en lecture seule, sur le worktree détaché `rojer-asvs`.

**Référentiel.** La grille est celle du fichier `asvs-5.0.0-L2.md` du skill `owasp-checklist` : 253 exigences L1 et L2 sur les 345 de l'ASVS 5.0.0, texte officiel en anglais. Le rapport cite les identifiants et ne paraphrase pas les textes. Être conforme L2 suppose de satisfaire toutes les exigences L1 et L2 applicables.

**Organisation.** Six groupes ont produit chacun une grille. Le groupe Accès a couvert V8, V4 et V3.5, avec l'inventaire des points d'entrée : 109 Server Actions, 17 `route.ts` pour 22 méthodes, 69 pages et 3 layouts, le middleware. Le groupe Identité a couvert V6, V7, V9 et V10, le groupe Entrées V1, V2 et V5, le groupe Navigateur V3, le groupe Crypto et données V11, V12 et V14, et le groupe Plateforme V13, V15, V16 et V17. Une passe de réfutation a ensuite relu chaque verdict contesté contre le texte officiel et le code. **C'est elle qui fait foi** sur les verdicts finaux, les doublons et les compteurs. Quand une grille et la réfutation divergent, la ligne de la grille complète porte la mention « (réfuté : raison) ».

**Comment les preuves ont été obtenues.**

- En local, trois moyens. On a rejoué les tests du dépôt. On a écrit des sondes, qui appellent le vrai code (Server Actions, client `@supabase/ssr` et `auth-js` réels, vérificateur MCP réel, SheetJS réel). On a enfin fait des mutations : on retire le contrôle dans une copie privée, et le test doit échouer. Une mutation qui laisse les tests verts prouve que le contrôle n'est pas gardé, même quand le code est sain. Toutes les copies ont été supprimées, et `git status` du worktree est resté vide.
- Les bases ont été des Postgres jetables, dont une image Supabase, sur lesquels `prisma migrate deploy` a été rejoué. L'un imitait les rôles `anon` et `authenticated` de Supabase et ses privilèges par défaut (V8.4.1). D'autres servaient sans TLS ou avec un certificat auto-signé (V12.3).
- En production (`test-duerp-hazel.vercel.app`), seulement des requêtes GET et HEAD sans authentification, et des sondes TLS : 9 requêtes du groupe Navigateur vers 19:15 UTC, 10 sondes TLS et HTTP du groupe Crypto, 10 GET du groupe Plateforme. S'y ajoutent des lectures `gh api` sur le dépôt GitHub et un `pnpm audit --prod`.

**Ce qui n'a pas été fait, et pourquoi.**

- Aucun compte sonde, aucun serveur de développement authentifié : l'authentification locale pointe vers le Supabase de production. Les parcours connectés ont donc été éprouvés par des sondes sur le code, pas de bout en bout.
- Une sonde de lecture de l'API Data de Supabase a été refusée. **La RLS en production reste NON VÉRIFIÉE** : le constat E-1 est prouvé sur une base qui imite Supabase. En production, il dépend de deux défauts de Supabase, l'API Data exposée et les GRANT par défaut à `anon`, que personne n'a pu lire.

**Chapitres.** V1 à V16 sont vérifiés. Deux exclusions sont motivées :

- **V17 (WebRTC)**, 7 exigences, toutes N/A. Le code, `package.json` et le lockfile ne contiennent aucun WebRTC, aucun serveur TURN ni de signalisation, et la production répond `permissions-policy: camera=(), microphone=()`.
- **V10 (OAuth et OIDC)**, 25 exigences N/A sur 29. L'application n'est ni client OAuth/OIDC (aucun `signInWithOAuth`, `signInWithSSO` ni `signInWithIdToken`), ni serveur d'autorisation (ni route `/oauth/*`, ni page de consentement : les étapes 4 et 5 de l'ADR-013 n'ont jamais été faites), ni fournisseur OpenID. Elle est seulement **serveur de ressources** pour `/api/mcp`. Seules V10.1.1 et V10.3.1 à V10.3.3 s'appliquent ; V10.3.4 est N/A, puisque le serveur MCP n'exige ni force ni fraîcheur d'authentification.

Les autres N/A sont motivés ligne à ligne dans la grille complète : pas de LDAP, de XPath, de LaTeX, de JNDI ni de memcache, pas de GraphQL ni de WebSocket, pas de SMS, de SAML ni de fédération, pas de chiffrement applicatif, pas de mTLS ni de service HTTP interne.

**Légende des verdicts.** ✅ PASS · ❌ FAIL · ⚠️ PARTIEL · ➖ N/A · ❔ NON VÉRIFIÉ.

**Légende des niveaux de preuve.**

- 🔴 **prouvé en production** : une réponse réelle de `test-duerp-hazel.vercel.app`, sans authentification ;
- 🟠 **prouvé en local** : un test rejoué, une sonde sur le code réel, ou une mutation qui fait tomber un test ;
- ⚪ **lecture** : le code, la configuration, la documentation du fournisseur ou les ADR ont été lus, sans exécution ;
- « — » : aucune preuve possible dans le cadre fixé (exigences NON VÉRIFIÉES).

**Ce qui n'a pas pu être prouvé.**

- La RLS et les GRANT de `anon` et `authenticated` en production (E-1), et l'exposition de l'API Data.
- Les réglages du tableau de bord Supabase, que personne n'a lus. Ce sont : la longueur minimale du mot de passe (6 par défaut), « Leaked password protection » (V6.2.4, V6.2.12), « Secure password change » et « Secure email change » (V6.2.3, V7.5.1), la liste « Redirect URLs » (V6.4.3), « Inactivity timeout » et « Time-box user sessions » (V7.3.1, V7.3.2), la durée de vie des liens de confirmation, le type de clé JWT du projet (V7.4.1), la liste des utilisateurs (V6.3.2) et la procédure de révocation (V7.4.5).
- La vraie valeur de `DATABASE_URL` en production et le réglage « Enforce SSL » (V12.3.1).
- La durée de conservation réelle des journaux chez Vercel (V14.2.4 c, V16.1.1).
- La méthode TRACE au bord de Vercel (V13.4.4) et les frontières de messages HTTP (V4.2.1).
- La CSP `sandbox` des fichiers servis, sur Vercel (V3.2.1) : il aurait fallu une session et un fichier. Sous `next start`, elle est écrasée (annexe B de la grille Navigateur).
- La course sur les plafonds de zones et d'unités (V2.3.4), qui demande une base partagée par des requêtes parallèles.
- La taille de la clé RSA du certificat Vercel (V11.2.3).
- `pnpm audit` n'a pas été rejoué pendant la réfutation (V15.2.1), faute de commande `timeout` pour le borner. Le relevé du groupe Plateforme fait foi.

## Synthèse

**Conforme L2 : NON.** Sur les 187 exigences applicables, 53 sont en échec, 31 partielles et 6 non vérifiées. Il suffit d'une seule exigence L1 ou L2 applicable non satisfaite pour ne pas être conforme.

### Compteurs par chapitre (réfutation, § D)

| Chapitre | Total | Applicables | ✅ PASS | ❌ FAIL | ⚠️ PARTIEL | ➖ N/A | ❔ NV |
|---|---|---|---|---|---|---|---|
| V1 Encoding and Sanitization | 27 | 18 | 18 | 0 | 0 | 9 | 0 |
| V2 Validation and Business Logic | 11 | 11 | 5 | 3 | 3 | 0 | 0 |
| V3 Web Frontend Security | 19 | 17 | 11 | 6 | 0 | 2 | 0 |
| V4 API and Web Service | 10 | 4 | 1 | 1 | 1 | 6 | 1 |
| V5 File Handling | 9 | 9 | 4 | 4 | 1 | 0 | 0 |
| V6 Authentication | 35 | 29 | 15 | 8 | 4 | 6 | 2 |
| V7 Session Management | 18 | 16 | 3 | 8 | 4 | 2 | 1 |
| V8 Authorization | 7 | 7 | 3 | 2 | 2 | 0 | 0 |
| V9 Self-contained Tokens | 7 | 6 | 5 | 1 | 0 | 1 | 0 |
| V10 OAuth and OIDC | 29 | 4 | 2 | 2 | 0 | 25 | 0 |
| V11 Cryptography | 14 | 9 | 5 | 1 | 3 | 5 | 0 |
| V12 Secure Communication | 9 | 6 | 4 | 2 | 0 | 3 | 0 |
| V13 Configuration | 13 | 13 | 5 | 3 | 3 | 0 | 2 |
| V14 Data Protection | 9 | 9 | 3 | 3 | 3 | 0 | 0 |
| V15 Secure Coding and Architecture | 13 | 13 | 7 | 3 | 3 | 0 | 0 |
| V16 Security Logging and Error Handling | 16 | 16 | 6 | 6 | 4 | 0 | 0 |
| V17 WebRTC | 7 | 0 | 0 | 0 | 0 | 7 | 0 |
| **Total** | **253** | **187** | **97** | **53** | **31** | **66** | **6** |

Ces compteurs ont été recomptés sur la grille complète ci-dessous, ligne par ligne, par script : ils tombent juste, chapitre par chapitre et au total (97 + 53 + 31 + 6 = 187 applicables, 187 + 66 = 253).

### Les cinq écarts les plus graves

1. **E-1 — RLS absente sur 13 tables** (V8.4.1). La clé publique permet de lire et de modifier `Entreprise`, `Salarie`, `TitreSalarie` et `Duerp`, si l'API Data et les GRANT par défaut sont actifs en production. Critique. **MAINTENANT**, par exception à la règle Supabase.
2. **E-2 — adresse de retour du lien de réinitialisation tirée du formulaire** (V6.4.3). Elle permet de prendre un compte par PKCE si « Redirect URLs » admet un joker. Élevée sous cette condition. **MAINTENANT**, et la liste exacte des URL de retour est **À EXIGER**.
3. **E-3 — bombe XLSX** (V5.2.3). Tout compte inscrit peut porter le processus de 98 à 878 Mo avec un fichier de 4,31 Mo. Moyenne aujourd'hui, élevée chez Clever Cloud. **MAINTENANT**.
4. **E-4 — redirection ouverte après connexion** (V3.7.2). Un lien `/login?next=https://…` envoie la victime chez un tiers juste après qu'elle s'est authentifiée. Moyenne. **MAINTENANT**.
5. **E-5 — aucune limitation de débit** (V6.3.1, V2.4.1). Moyenne. La connexion relève de **DISPARAÎT + À EXIGER**, les fonctions publiques et les quotas (`/verifier`, import, appareils) de **MAINTENANT**.

### Écarts par classe de bascule

La réfutation donne une classe par exigence, mais pas de tableau par classe. Celui-ci est compté sur la grille complète, avec une règle simple. Quand une exigence porte deux classes, elle est comptée une fois, sous la plus urgente : MAINTENANT, puis DISPARAÎT, puis À EXIGER. Une mention « DISPARAÎT + À EXIGER » est comptée en DISPARAÎT, et « MAINTENANT + À EXIGER » en MAINTENANT. Quatre exigences sont mixtes et comptées en MAINTENANT : V3.3.1 et V3.3.3 (le cookie `etablissement-actif` est de l'application, les cookies `sb-*` disparaissent), V6.3.4 (signature connectée sans OTP) et V14.2.1 (`/acces/<jeton>` maintenant, `MCP_CLE` à exiger).

| Classe | ❌ FAIL | ⚠️ PARTIEL | ❔ NV | Total |
|---|---|---|---|---|
| MAINTENANT | 24 | 21 | 0 | 45 |
| DISPARAÎT | 13 | 4 | 5 | 22 |
| À EXIGER | 16 | 6 | 1 | 23 |
| **Total** | **53** | **31** | **6** | **90** |

Les 22 écarts DISPARAÎT se concentrent en V7 (9), V6 (5), V4, V10 et V13 (2 chacun), V3 et V9 (1 chacun). Parmi les 45 écarts MAINTENANT, 9 sont purement documentaires : V2.1.1 à V2.1.3, V5.1.1, V8.1.1, V8.1.2, V14.1.1, V14.1.2 et V15.1.3. Les écarts DISPARAÎT ne demandent aucune correction de code, mais chacun a son critère de recette : un écart qui disparaît sans être vérifié peut revenir sous Better Auth.

## Écarts (FAIL, PARTIEL, NON VÉRIFIÉ), du plus grave au moins grave

Chaque entrée décrit un écart distinct. Elle nomme l'exigence principale, puis celles qui ont le même écart pour cause. Celles-ci gardent leur verdict, mais l'écart n'est compté qu'une fois, comme dans la réfutation. Les numéros E-n sont ceux de la réfutation, qui n'en définit pas de E-7. Les entrées sans numéro sont des écarts propres à une exigence. Les 90 exigences FAIL, PARTIEL ou NON VÉRIFIÉES figurent toutes dans au moins une entrée.

### 1. E-1 — RLS absente sur 13 tables du schéma `public` · critique

- **Exigences.** V8.4.1 (L2, ❌ FAIL, principale). Doublons : V8.2.2 (L1, ❌ FAIL, accès par le rôle `anon`), V14.2.4 (a) (L2, ❌ FAIL, l'ADR-005 § 7 annonce une RLS « déjà en place »), V8.1.1 (L1, ⚠️, même affirmation), V13.2.2 (L2, ❌ FAIL, un seul rôle `postgres` partout).
- **Classe.** MAINTENANT. C'est une exception assumée à la règle Supabase : `Salarie`, `TitreSalarie` et `Entreprise` sont lisibles et modifiables depuis Internet si les défauts de Supabase sont en place, et le correctif est prêt. La bascule rendra la mesure caduque, puisque Clever Cloud n'a pas d'API Data. Le critère B15 (isolation sans RLS) prendra alors le relais.
- **Preuve.** 🟠 en local. `prisma/migrations` compte 31 tables vivantes et 18 `ENABLE ROW LEVEL SECURITY`. Sur un Postgres jetable qui imite Supabase, après `prisma migrate deploy`, on mesure `rls=18/31`. Avec `SET ROLE anon`, on obtient `anon lit Entreprise: 1 Sonde`, puis `UPDATE 1`, puis `apres: modifie-par-anon`, et `anon lit _prisma_migrations: 68`. En production, la mesure est ❔ (sonde refusée).
- **Où.** Les 13 tables sont `Batiment`, `DeclarationEtatPermanent`, `Duerp`, `DuerpVersion`, `Entreprise`, `FicheRegistre`, `PhaseDangereuse`, `PiecePrestataire`, `PrescriptionParticuliere`, `Risque`, `Salarie`, `TitreSalarie` et `UniteTravail`. La migration `enable_rls_deny_all` que cite l'ADR-005 § 7 n'existe pas.
- **Scénario.** La clé publishable est dans le bundle JavaScript. Quiconque la lit appelle l'API Data de Supabase en `anon`, ou en `authenticated` avec son propre compte, et lit ou modifie les lignes de tous les clients.
- **Correctif recommandé.** Fusionner la migration additive qui active la RLS sur les 13 tables et retire les droits de `anon` et `authenticated` sur `public`. Avant de la fusionner, vérifier en production que les 31 tables appartiennent au rôle des migrations, faute de quoi `ENABLE RLS` échoue et `migrate deploy` avec (requête en lecture seule donnée par l'audit du 13/10). Contrôler ensuite le Security Advisor de Supabase. Corriger l'ADR-005 § 7.
- **Test à écrire.** Le test `migrations-rls.test.ts` de la branche exige un `ENABLE RLS` par `CREATE TABLE`. Il ne tient pas le bloc `REVOKE` : le retirer ne fait échouer aucun test (audit du 13/10). Il faut un test qui échoue quand le `REVOKE` disparaît, et une sonde sur base jetable qui fait `SET ROLE anon` puis attend `permission denied`.
- **Corrigé sur** `lot/securite-owasp-1013` (3a6655a9, 4e3e5c15, migration `20261013120000_rls_tables_restantes`), non fusionnée. Mesuré après la migration : `rls=31/31`, `permission denied for table Entreprise` et `permission denied for table _prisma_migrations`.

### 2. E-2 — adresse de retour du lien de réinitialisation tirée du formulaire · élevée si la liste d'URL admet un joker, faible sinon

- **Exigences.** V6.4.3 (L2, ⚠️ PARTIEL). Elle absorbe la part « origine des liens d'e-mail » de V4.1.3, rabattue en PASS.
- **Classe.** MAINTENANT pour le code applicatif, dont le correctif est prêt. À EXIGER pour la liste exacte des URL de retour, sans joker (B2).
- **Preuve.** ⚪ lecture. La réinitialisation passe par un lien PKCE (`flowType: pkce`) et répond de la même façon, que le compte existe ou non. Mais l'adresse de retour vient d'un champ `origin` du formulaire. La seule borne est la liste « Redirect URLs » de Supabase, qui n'a pas été lue (❔).
- **Où.** `src/lib/auth/actions.ts:62` et `:98-100`, et `src/app/signup/page.tsx:16-17`, qui construit cette origine depuis `x-forwarded-host` et `x-forwarded-proto`.
- **Scénario.** En PKCE, le `code_verifier` est posé dans le cookie de celui qui poste l'action. Un attaquant poste l'action de réinitialisation avec l'e-mail de la victime et `origin=https://<hôte admis>`. Si la victime clique, il reçoit le `?code=` et l'échange avec son propre verifier : il prend le compte. Un joker du type `https://*.vercel.app/**`, fréquent pour les previews, suffit à admettre un hôte qu'il contrôle.
- **Correctif recommandé.** Construire l'adresse côté serveur, depuis `PUBLIC_APP_URL` (`publicAppUrl()`). Ramener tout de suite « Redirect URLs » à la liste exacte des origines de production.
- **Test à écrire.** L'action ignore un champ `origin` hostile, et le `redirectTo` transmis à Supabase commence toujours par `PUBLIC_APP_URL`.
- **Corrigé sur** `lot/audit-1013-auth` (ee747c33, constat C3), non fusionnée.

### 3. E-3 — bombe XLSX à l'import du DUERP · moyenne aujourd'hui, élevée chez Clever Cloud

- **Exigences.** V5.2.3 (L2, ❌ FAIL, principale). Doublons : V5.2.1 (L1, part XLSX) et V15.2.2 (L2).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠 sonde. Un `.xlsx` de 4,31 Mo se décompresse en 158 Mo de XML, puis 399 999 lignes sont construites en 3,7 s, et le RSS passe de 98 à 878 Mo.
- **Où.** `src/lib/duerps/import/parser.ts:278` et `:281` : `XLSX.read` sans contrôle de la taille décompressée ni du nombre d'entrées.
- **Scénario.** Tout compte peut le faire, et l'inscription est ouverte. Sur Vercel, une instance meurt seule. Chez Clever Cloud, un seul processus Node sert tout le monde : la bombe y fait tomber l'application entière.
- **Correctif recommandé.** Lire le répertoire central de l'archive avant `XLSX.read`, et refuser au-delà d'une taille décompressée et d'un nombre d'entrées bornés. Garder la borne de lignes de la branche.
- **Test à écrire.** Un classeur qui dépasse le plafond décompressé est refusé sans que `XLSX.read` soit appelé. La sonde `bombe.cjs` sert de référence de mesure.
- **Corrigé en partie sur** `lot/securite-owasp-1013` (78adfd1a : `sheetRows` à 5 000 lignes, `try/catch`). La décompression a toujours lieu : 465 Mo de RSS en 1 s mesurés par le groupe Entrées sur la même bombe. L'écart reste ouvert sur la branche.

### 4. E-4 — redirection ouverte après connexion · moyenne

- **Exigences.** V3.7.2 (L2, ❌ FAIL).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠. Le code de Next 16.3.5 (`assignLocation`, `isExternalURL`) a été rejoué (annexe C de la grille Navigateur). Les entrées `https://evil.tld/`, `//evil.tld`, `/\evil.tld` et `/\t/evil.tld` mènent à `https://evil.tld/`. Sans JavaScript, l'en-tête `Location` sort brut. Dans `auth/callback`, `@evil.tld`, `:443@evil.tld` et `.evil.tld` donnent un hôte étranger.
- **Où.** `src/lib/auth/actions.ts:44-46` (`redirect((formData.get("next") as string) || "/entreprises")`) et `src/app/auth/callback/route.ts:11,17` (``NextResponse.redirect(`${origin}${next}`)``).
- **Scénario.** Un lien `/login?next=https://evil.tld` envoyé à un client suffit. La victime s'authentifie sur le vrai site, puis arrive chez l'attaquant, qui peut lui afficher une fausse page de session expirée. La voie `callback` n'est atteinte qu'après un échange de code réussi, ce qui la rend moins exploitable.
- **Correctif recommandé.** Filtrer `next` par une fonction unique (`cheminDeRetour`) qui n'admet qu'un chemin interne.
- **Test à écrire.** Les 12 entrées hostiles de l'annexe D, dont `/.//evil.tld` et `/%2e%2e//evil.tld`, rendent `/entreprises`.
- **Corrigé sur** `lot/audit-1013-auth` (a947488c, 322a9ef9, constats C1 et C2), non fusionnée.

### 5. E-5 — aucune limitation de débit · moyenne

- **Exigences.** V6.3.1 (L1, ❌ FAIL, pour la connexion) et V2.4.1 (L2, ❌ FAIL, pour l'anti-automatisation fonctionnelle). Doublons : V15.2.2, et la part « renvoi d'OTP » de V6.6.3, traitée à l'écart 21.
- **Classe.** Pour V6.3.1 : DISPARAÎT + À EXIGER (B3). La limite doit tenir par compte et par IP de confiance, et être stockée en base : en mémoire, elle ne vaut rien en sans serveur. Pour V2.4.1 : MAINTENANT + À EXIGER, puisque Clever Cloud n'a pas de WAF par défaut.
- **Preuve.** 🟠. La sonde envoie 30 échecs de suite sur le même compte, et les 30 appels `grant_type=password` partent vers Supabase sans frein. Une autre sonde crée 5 000 appareils en un appel. La bombe XLSX est décrite à l'écart 3.
- **Où.** `src/lib/auth/actions.ts:39` (connexion) ; `requestPasswordResetAction` et `signUpAction`, non freinées non plus ; `/verifier/[id]` et l'action publique `verifierIntegriteSignature`, qui lit et hache jusqu'à 20 Mo à chaque affichage ; l'affiche QR ; `src/lib/equipements/actions.ts:376`.
- **Scénario.** La limite de Supabase par IP voit les IP de sortie de Vercel, puisque la connexion est appelée côté serveur (S10). Elle est donc soit partagée par tous les utilisateurs, et un attaquant peut bloquer tout le monde, soit contournable en répartissant les essais. Sur `/verifier`, chaque affichage coûte une lecture et un hachage de 20 Mo au plus, sans limite.
- **Correctif recommandé.** Maintenant : poser une limite de débit sur les fonctions publiques (`/verifier`, `verifierIntegriteSignature`, l'affiche, `renvoyerCodeOtp`) et des quotas par appel et par compte (nombre d'appareils créés en un appel). La limite doit être stockée en base, pour être partagée entre instances. À la bascule : le rate limiter de Better Auth sur la connexion, l'inscription et la réinitialisation (B3, B14).
- **Test à écrire.** Le N+1-ième appel d'une fonction publique dans la fenêtre est refusé, et le compteur survit à un changement d'instance (lu en base). Un appel qui crée plus d'appareils que le quota est refusé en entier.
- **Corrigé :** non.

### 6. E-6 — `MCP_CLE`, secret statique porté dans l'URL · moyenne

- **Exigences.** V7.2.2 (L1, ❌ FAIL, facette « statique ») et V14.2.1 (L1, ❌ FAIL, facette « dans l'URL » ; la part `/acces/<jeton>` est traitée à l'écart 7). Doublons : V6.3.4 (point 2), V13.3.1, V16.2.5, V11.2.2, V15.2.3 et V15.2.2.
- **Classe.** À EXIGER (B5 : retrait de la route et de la variable). La rotation, elle, est à faire tout de suite.
- **Preuve.** ⚪ lecture.
- **Où.** `src/app/api/mcp/[cle]/route.ts:3` et `:40-47`, `src/lib/mcp/acces-http.ts:10-16`, `:54` (seule la longueur est contrôlée) et `:103`. La rotation est inscrite au journal depuis le 2026-08-16 et n'a jamais été faite (`docs/journal-des-verifications.md:4219`).
- **Scénario.** Le secret est un segment du chemin. Il est donc recopié dans les journaux de requêtes de Vercel, l'historique et les en-têtes `Referer`. Il n'est lié à aucun compte et n'a pas de limite de débit : qui l'a lu une fois accède à l'établissement configuré jusqu'à sa rotation.
- **Correctif recommandé.** Tourner `MCP_CLE` maintenant. À la bascule, supprimer `/api/mcp/[cle]` et la variable, une fois l'OAuth de Better Auth en place.
- **Test à écrire.** À la recette, `/api/mcp/<n'importe quoi>` répond 404, et la variable n'est plus lue nulle part.
- **Corrigé :** non.

### 7. Jeton d'accès externe porteur dans l'URL, valable 72 h · moyenne

- **Exigences.** V14.2.1 (L1, ❌ FAIL, part `/acces/<jeton>`) et V6.5.5 (L2, ⚠️ PARTIEL, faible). La réfutation a retiré de V14.2.1 la part `sig_<uuid>`, qui est un lien public de vérification fait pour être partagé ; la faiblesse de l'UUID reste comptée en V11.5.1 (écart 30).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠. La sonde `sonde-asvs-jeton` prouve que l'expiration du lien est contrôlée. Aucun test du dépôt ne la garde : la mutation M2 reste verte.
- **Où.** `src/lib/access-tokens/mail.ts` (`urlAccesPourToken`) et la page `/acces/[token]`. Le jeton est haché en base, mais il circule en clair dans le chemin.
- **Scénario.** Le lien reste réutilisable pendant 72 h et donne à lui seul la consultation de l'acte à signer. L'OTP ne protège que la signature. Un lien transféré ou relevé dans un journal suffit donc à lire l'acte. Il faut y ajouter un aggravant hors grille : l'OTP part dans le même e-mail que le lien (ADR-007).
- **Correctif recommandé.** Exiger l'OTP dès la consultation, ou échanger le jeton contre une session courte à la première visite et retirer le jeton de l'URL. Réduire la durée de validité du lien. Le choix revient à la propriétaire, et l'ADR-007 est à mettre à jour.
- **Test à écrire.** Une consultation de l'acte sans OTP validé est refusée, si cette voie est retenue. Sinon, un jeton déjà échangé ne rouvre pas l'acte. Et un test du dépôt qui garde l'expiration du lien.
- **Corrigé :** non.

### 8. E-14 — CSP appliquée réduite à `frame-ancestors` · moyenne

- **Exigences.** V3.4.3 (L2, ❌ FAIL).
- **Classe.** MAINTENANT : le code reste après la bascule. L'audit du 13/10 (S7) proposait d'appliquer la CSP au moment de la bascule ; la réfutation la classe maintenant.
- **Preuve.** 🔴 en production, annexe A de la grille Navigateur. La seule CSP appliquée est `frame-ancestors 'none'`. La politique complète est en `Content-Security-Policy-Report-Only`, sans `report-uri` ni `report-to`, avec `script-src 'self' 'unsafe-inline'`, sans nonce (le HTML porte `"nonce":"$undefined"`), et avec `base-uri 'self'` au lieu de `'none'`.
- **Où.** `src/lib/securite/entetes.ts:46` et `:59`, `next.config.ts:36-47`.
- **Scénario.** Aucun puits XSS n'a été trouvé (V1.2.1, V3.2.2). Mais toute XSS future s'exécuterait sans frein et lirait le cookie de session, qui est lisible par le JavaScript (écart 9) : elle emporterait la session et l'accès MCP.
- **Correctif recommandé.** Appliquer une CSP à nonce par requête, posée par le proxy : `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, et `report-to` vers un point de collecte. Il faut aussi remplacer l'`onclick="window.print()"` en ligne de l'affiche (`affiche/route.ts:169`). L'argument de `entetes.ts:10-13` contre le nonce invoque le coût d'un rendu dynamique, qui est déjà payé : les pages sont dynamiques (`cache-control: private, no-store`, `x-vercel-cache: MISS`).
- **Test à écrire.** `entetes.test` exige un en-tête `Content-Security-Policy` (et non Report-Only), avec un nonce, sans `'unsafe-inline'` dans `script-src`, et avec `base-uri 'none'`.
- **Corrigé :** non.

### 9. E-9 — jetons de session Supabase dans un cookie lisible par le JavaScript · moyenne

- **Exigences.** V3.3.4 (L2, ❌ FAIL, principale). Doublon : V10.1.1 (L2, ❌ FAIL).
- **Classe.** DISPARAÎT + À EXIGER (B1). Le risque d'ici la bascule demande une XSS, et aucun puits n'a été trouvé.
- **Preuve.** ⚪ pour les options par défaut de `@supabase/ssr` 0.10.2 ; 🟠 pour la sonde `sonde-asvs-session`, qui relève `httpOnly: false`, l'absence de `secure` et une durée de 400 jours.
- **Où.** `node_modules/@supabase/ssr/dist/main/utils/constants.js:4-11`, jamais surchargé dans `src/lib/supabase/server.ts:12-31`, `middleware.ts:49-68` ni `client.ts:9-12`. Le défaut est structurel : `ResetPasswordForm.tsx:15-40` crée un client navigateur qui lit la session dans `document.cookie`.
- **Scénario.** Une XSS lit le jeton d'accès et le jeton de rafraîchissement. Ce dernier ne vit que par sa durée de 400 jours, et `/api/mcp` accepte le jeton d'accès comme jeton OAuth (sonde JWT).
- **Correctif recommandé.** Rien sur l'existant. À la bascule : un cookie `HttpOnly`, `Secure`, préfixé, et un jeton jamais exposé au JavaScript.
- **Test à écrire (recette).** Le `Set-Cookie` de session porte `HttpOnly`, `Secure`, `SameSite=Lax` et un préfixe `__Secure-` ou `__Host-`.
- **Corrigé :** sans objet (bascule).

### 10. E-10 — session sans fin · moyenne

- **Exigences.** V7.3.1 et V7.3.2 (L2, ❌ FAIL).
- **Classe.** DISPARAÎT + À EXIGER (B1, B20).
- **Preuve.** ⚪ lecture. Le cookie dure 400 jours (valeurs par défaut de `@supabase/ssr`, jamais surchargées), la sonde le confirme, et le jeton de rafraîchissement de Supabase n'expire pas par défaut. Les réglages « Inactivity timeout » et « Time-box user sessions » (offre Pro) n'ont pas été lus (❔).
- **Où.** `DEFAULT_COOKIE_OPTIONS`, `src/lib/supabase/server.ts:12`, `src/lib/supabase/middleware.ts:49`.
- **Scénario.** Une session ouverte sur un poste partagé, ou un cookie dérobé, reste valable sans limite, que l'utilisateur soit actif ou non.
- **Correctif recommandé.** À la bascule, fixer un délai d'inactivité et une durée maximale absolue, et les écrire (V7.1.1).
- **Test à écrire (recette).** Une session inactive au-delà du délai est refusée, et une session plus vieille que la durée maximale l'est aussi, même active.
- **Corrigé :** sans objet (bascule).

### 11. E-12 — mot de passe et e-mail changés sans réauthentification · moyenne

- **Exigences.** V6.2.3 (L1, ❌ FAIL, principale). Doublon : la part mot de passe de V7.5.1. Exigences liées : V7.5.1 (L2, ❌ FAIL, pour le changement d'e-mail) et V7.4.3 (L2, ❌ FAIL, pour la fermeture des autres sessions).
- **Classe.** DISPARAÎT + À EXIGER (B21).
- **Preuve.** ⚪ lecture.
- **Où.** `ResetPasswordForm.tsx:71` appelle `supabase.auth.updateUser({ password })` sans le mot de passe actuel. Le changement d'e-mail passe par l'API Supabase directe. Les options « Secure password change » et « Secure email change » n'ont pas été lues (❔).
- **Scénario.** Une session ouverte suffit, sur la page ou par l'API directe, à changer le mot de passe puis l'e-mail : le compte est pris. Les autres sessions restent ouvertes.
- **Correctif recommandé.** Sur l'existant, la propriétaire peut vérifier au tableau de bord que « Secure password change » et « Secure email change » sont actifs : c'est un réglage, pas du code. À la bascule : `changePassword` avec `currentPassword`, `revokeOtherSessions`, et une réauthentification avant tout changement d'e-mail.
- **Test à écrire (recette).** Un changement de mot de passe sans l'ancien est refusé, et les autres sessions tombent après un changement.
- **Corrigé :** sans objet (bascule).

### 12. Aucun MFA · moyenne

- **Exigences.** V6.3.3 (L2, ❌ FAIL). V6.4.4 en découle et reste N/A tant qu'il n'existe pas de facteur à perdre.
- **Classe.** À EXIGER (B22).
- **Preuve.** ⚪ lecture : aucun appel `auth.mfa.*`, aucun écran d'enrôlement, aucun contrôle `aal2`.
- **Scénario.** Le mot de passe seul ouvre l'application, et aucune justification n'est écrite. Le texte L2 exige l'une ou l'autre.
- **Correctif recommandé.** Activer le plugin `twoFactor` de Better Auth à la bascule, ou écrire la justification que le texte admet.
- **Test à écrire (recette).** Un compte enrôlé ne s'ouvre pas sans son second facteur.
- **Corrigé :** non.

### 13. Voies d'authentification non conformes à leurs ADR · moyenne

- **Exigences.** V6.3.4 (L2, ❌ FAIL). Les points 2 (`MCP_CLE`) et 4 (plafond d'OTP) sont des doublons, traités aux écarts 6 et 21. Exigence liée : V6.1.3 (écart 39).
- **Classe.** MAINTENANT pour le point 3, DISPARAÎT + À EXIGER pour le point 1.
- **Preuve.** ⚪ lecture. La sonde JWT montre que `/api/mcp` accepte le jeton de session du navigateur.
- **Où.** Point 3 : `signerEnCompteConnecte` (`src/lib/signatures/actions.ts:585-597`, `methode: "compte_connecte"`) signe sans l'OTP que prévoit l'ADR-006 (« Modal de confirmation → saisie OTP […] double facteur léger »). Point 1 : `src/app/api/mcp/route.ts` (OAuth) est en ligne, alors que l'ADR-013 (note du 2026-09-27) dit la route à clé « seul accès ».
- **Scénario.** Une session ouverte suffit à apposer une signature au nom du titulaire, sans second geste.
- **Correctif recommandé.** Ajouter l'OTP à la signature connectée, ou amender l'ADR-006 si la propriétaire y renonce. Pour l'OAuth MCP : décider si la route reste en ligne d'ici la bascule, et mettre l'ADR-013 en accord.
- **Test à écrire.** `signerEnCompteConnecte` refuse sans OTP valide.
- **Corrigé :** non.

### 14. Promesses RGPD non tenues : IP non masquée, journaux non vérifiés · moyenne

- **Exigences.** V14.2.4 (L2, ❌ FAIL), parts (b) et (c). La part (a), la RLS annoncée, relève de l'écart 1.
- **Classe.** MAINTENANT. La part (b) est réglementaire : c'est une rétention RGPD non tenue, dans le code applicatif.
- **Preuve.** 🟠 pour le groupe, ⚪ pour la lecture du code.
- **Où.** L'ADR-006, l. 47 et 85, promet une « IP masquée en /24 après 30 jours ». Aucun code ne le fait : l'adresse complète est conservée sans limite (`src/lib/signatures/actions.ts:337`, `:374`, `:554` et `:597`). `docs/rgpd.md` § 8 annonce des « journaux HTTP 30 jours » que personne n'a vérifiés chez Vercel (❔).
- **Scénario.** Une personne qui a signé en tant que prestataire voit son adresse IP complète conservée au-delà de la durée annoncée.
- **Correctif recommandé.** Masquer `Signature.ipAddress` en /24 au-delà de 30 jours, par une tâche périodique ou au moment des lectures, après avoir vérifié que l'IP n'entre pas dans l'empreinte scellée (ADR-008). Relever la durée réelle des journaux chez Vercel, et corriger `rgpd.md`.
- **Test à écrire.** Une signature de plus de 30 jours ne porte plus qu'un /24 après le passage de la tâche, et son empreinte reste vérifiable.
- **Corrigé :** non.

### 15. `next` 16.3.5 et dépendances de production · moyenne

- **Exigences.** V15.2.1 (L1, ❌ FAIL). Exigences liées : V15.2.3 (part `shadcn`, écart 38) et V15.1.1 (Dependabot, écart 38).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠. `pnpm audit --prod` relève 84 avis : 2 critiques, 32 élevés, 44 moyens et 6 faibles. `next` 16.3.5 (`package.json:47`) en porte 7. La réfutation a revu la gravité à la baisse : `next/og` et `ImageResponse` sont absents de `src/`, et `express` n'arrive que par la CLI `shadcn`, inutilisée à l'exécution.
- **Scénario.** Chez Clever Cloud, en auto-hébergement, l'optimisation d'images et le cache passeront par notre serveur. Le cache poisoning « self-hosted » nous concernera alors (B24).
- **Correctif recommandé.** Fusionner la montée de version, puis laisser Dependabot proposer les montées amont des 10 avis transitifs restants, sans `overrides`.
- **Test à écrire.** Une étape de CI qui échoue sur un avis élevé ou critique de `pnpm audit --prod`.
- **Corrigé sur** `lot/securite-owasp-1013` : e5d52827 (next 16.3.8), d83fae3c (`shadcn` en devDependencies) et 48a25a02 (Dependabot). D'après l'audit du 13/10, les avis passent de 84 à 77, puis à 10 ; ce chiffre n'a pas été rejoué ici.

### 16. Type de fichier déposé lu sur la seule déclaration du navigateur · moyenne

- **Exigences.** V5.2.2 (L1, ❌ FAIL).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠 sonde. Un HTML nommé `facture.html` et déclaré `application/pdf` est accepté, de même qu'un exécutable `MZ` nommé `rapport.exe` et déclaré `image/png`.
- **Où.** `src/lib/rapports/validator.ts:52`. Le même validateur sert aux pièces des prestataires (`prestataires/actions.ts:106`) et aux analyses (`carnet-sanitaire/actions.ts:318`). Pour l'import, l'extension ou le type suffit (`duerps/import/format.ts:56`). Le ZIP de contrôle transmet les fichiers sous leur extension (`controle/fichiers-zip.ts:39`).
- **Scénario.** Le titulaire, ou un prestataire par son lien, dépose un `facture.html`. L'application le sert sans risque (V3.2.1), mais le ZIP de contrôle le remet à un tiers (inspection, assureur) sous l'extension `.html`, et ce tiers l'ouvre dans son navigateur.
- **Correctif recommandé.** Vérifier l'extension contre la liste blanche et les octets magiques, et dériver l'extension du type détecté dans la clé de stockage et dans le nom d'entrée du ZIP.
- **Test à écrire.** La sonde `fichiers.test`, recopiée sous `src/` : HTML déclaré PDF refusé, `MZ` déclaré PNG refusé.
- **Corrigé :** non. `segmentCleStockage`, sur `lot/audit-1013-robustesse`, garde l'extension.

### 17. Fichiers traités sans borne mémoire ni session préalable · moyenne

- **Exigences.** V5.2.1 (L1, ⚠️ PARTIEL). La part XLSX relève de l'écart 3.
- **Classe.** MAINTENANT.
- **Preuve.** 🟠.
- **Où.** Le ZIP de contrôle charge tous les fichiers en mémoire (`controle/fichiers-zip.ts:68`, `maxDuration = 300` dans `controle-zip/route.ts:48`). `uploadRapport` valide le fichier avant l'appartenance (`rapports/actions.ts:105-136`).
- **Scénario.** Un établissement aux nombreux rapports fait gonfler le processus à chaque export, ce qui pèse davantage sur un processus Node partagé chez Clever Cloud (B12). Un anonyme fait traiter jusqu'à 25 Mo par `uploadRapport` avant toute vérification de session.
- **Correctif recommandé.** Streamer le ZIP de contrôle, et contrôler la session en tête de `uploadRapport`. Next reçoit encore le corps avant d'appeler l'action : le correctif supprime le traitement, pas la réception.
- **Test à écrire.** Sans session, `uploadRapport` ne lit ni les champs, ni le fichier, ni la base (ce test existe sur la branche). Le ZIP de contrôle reste sous un plafond mémoire mesuré.
- **Corrigé en partie sur** `lot/securite-owasp-1013` (ed3676da, `requireUser()` en tête de `uploadRapport`). Le ZIP en mémoire reste ouvert.

### 18. Journal de sécurité applicatif absent · moyenne pour V16.3.1, faible pour les autres

- **Exigences.** V16.3.1 (L2, ❌ FAIL), V16.3.2 (L2, ❌ FAIL), V16.3.3 (L2, ❌ FAIL), V16.2.1 (L2, ⚠️), V16.2.4 (L2, ⚠️), V16.2.5 (L2, ❌ FAIL ; la part `MCP_CLE` relève de l'écart 6) et V16.4.1 (L2, ⚠️).
- **Classe.** MAINTENANT. L'audit du 13/10 (R3) proposait de concevoir le journal d'audit avec Better Auth ; les événements applicatifs (jeton, OTP, refus de portée) restent dans notre code de toute façon.
- **Preuve.** ⚪ lecture.
- **Où.**
  - Les vérifications de jeton et d'OTP de `/acces` et `/signe` ne laissent aucune trace.
  - Le refus MCP OAuth est silencieux (`src/lib/mcp/acces-oauth.ts:231`).
  - Les refus d'autorisation passent par `notFound()` sans journal (`src/lib/auth/scope.ts:21,36,52`).
  - Les 33 `console.*` ne portent jamais l'auteur de l'action et utilisent des préfixes hétérogènes.
  - Plusieurs journaux contiennent la clé de stockage, qui contient le nom d'origine du fichier, parfois nominatif : `storage/servir.ts:38`, `rapports/actions.ts:203`, `carnet-sanitaire/actions.ts:329` et `suppression/fichiers.ts:153`.
  - Prisma journalise `error` en production (`src/lib/prisma.ts:10`).
  - Des noms issus de dépôts sont interpolés sans encodage (`controle-zip/route.ts:402,419`).
- **Scénario.** Une attaque par force brute sur un OTP, ou une suite de refus de portée, ne laisse rien à lire. Une fuite des journaux expose des noms de personnes.
- **Correctif recommandé.** Un seul helper de journal de sécurité, en JSON structuré (événement, auteur, cible, résultat), appelé sur les événements d'authentification, les refus et l'épuisement d'OTP. Masquer les clés de stockage. Ne journaliser des erreurs Prisma que le code.
- **Test à écrire.** L'épuisement des trois essais d'OTP émet un événement. Un refus de `scope.ts` en émet un. Aucune ligne de journal ne contient une clé de stockage.
- **Corrigé :** non.

### 19. Rôles et identifiants de service trop larges · moyenne pour V13.2.2, faible pour V13.2.1

- **Exigences.** V13.2.2 (L2, ❌ FAIL, qui aggrave l'écart 1) et V13.2.1 (L2, ❌ FAIL).
- **Classe.** À EXIGER (B6, B7, B9).
- **Preuve.** ⚪ lecture.
- **Où.** Un seul rôle `postgres`, propriétaire des tables et qui contourne la RLS, sert à l'exécution et aux migrations : `package.json:7` lance `prisma migrate deploy` dans le build. Ce rôle s'authentifie par un mot de passe statique (ADR-005 l. 24, `.env.example`). Le stockage passe par la clé `SUPABASE_SERVICE_ROLE_KEY` (`src/lib/storage/index.ts:102`), qui donne accès à tout le projet Supabase pour un usage limité à un bucket.
- **Scénario.** Un seul secret divulgué donne la base entière, en écriture et en schéma, ou tous les buckets.
- **Correctif recommandé.** Chez Clever Cloud : un rôle d'exécution distinct du rôle de migration, sans propriété des tables ; les migrations en étape de déploiement distincte ; des clés de stockage limitées au bucket.
- **Test à écrire (recette).** Le rôle applicatif ne peut ni `ALTER` ni `DROP` une table.
- **Corrigé :** sans objet (bascule).

### 20. Aucun antivirus sur les pièces déposées · faible à moyenne

- **Exigences.** V5.4.3 (L2, ❌ FAIL).
- **Classe.** À EXIGER (B29).
- **Preuve.** ⚪ lecture : aucun `clam`, `virus` ou `scan`, et pas de service de ce type dans la pile.
- **Scénario.** Les pièces déposées (rapports d'organismes, attestations URSSAF, RC Pro, Kbis, rapports de laboratoire) sont resservies au titulaire et remises à des tiers dans le ZIP de contrôle.
- **Correctif recommandé.** Analyser les pièces au dépôt, avec un service disponible chez Clever Cloud, ou décider par écrit de ne pas le faire.
- **Test à écrire (recette).** Le fichier de test EICAR est refusé au dépôt.
- **Corrigé :** non.

### 21. E-8 — le renvoi d'OTP remet les essais à zéro · faible à moyenne

- **Exigences.** V6.6.3 (L2, ⚠️ PARTIEL, principale). Doublons : V2.4.1 et V6.3.4 (point 4).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠. Les trois essais par code sont réservés de façon atomique, puis le jeton est révoqué : les mutations M5 et M7 tombent.
- **Où.** Un renvoi est possible toutes les 60 s (`otp.ts:29`), et chaque renvoi remet le compteur à 3 (`access-tokens/verify.ts:120`). Le plafond « max 5 envois d'OTP / heure / email » de l'ADR-006 n'est pas implémenté.
- **Scénario.** Qui détient le lien éprouve environ 2 codes par minute pendant les 72 h de validité, soit à peu près 8 600 codes sur 10⁶ (≈ 0,9 %). L'OTP partant dans le même e-mail que le lien, il ne protège pas d'une boîte compromise.
- **Correctif recommandé.** Un plafond total d'essais par jeton, que le renvoi ne remet pas à zéro, et le plafond horaire de renvois de l'ADR-006.
- **Test à écrire.** Après le plafond d'essais cumulés, le jeton est révoqué, renvois compris. Au-delà du plafond horaire, `renvoyerCodeOtp` refuse.
- **Corrigé :** non.

### 22. E-11 — audience des jetons MCP non vérifiée · faible

- **Exigences.** V10.3.1 (L2, ❌ FAIL, principale). Doublon : V9.2.3 (L2, ❌ FAIL). V9.2.2 a été rabattu en PASS.
- **Classe.** DISPARAÎT + À EXIGER (B5, B23).
- **Preuve.** 🟠 sonde JWT. Un jeton portant `aud: https://un-autre-service.example` est accepté. La sonde accepte aussi un `iss` étranger signé par la clé du projet.
- **Où.** `src/lib/mcp/acces-oauth.ts:37-40` et `acces-oauth-deps.ts:48`. Ce choix est écrit (ADR-013 § 8), mais rien ne le compense.
- **Scénario.** La gravité est faible : seul ce projet signe avec ces clés, et il n'émet qu'une audience. Le risque naîtra avec le serveur OAuth de Better Auth, qui émettra plusieurs audiences.
- **Correctif recommandé.** À la bascule, vérifier que `aud` vaut l'URL de la ressource MCP, comparer `iss`, et lire `scope`.
- **Test à écrire (recette).** Un jeton d'une autre audience, ou d'un autre émetteur, est refusé.
- **Corrigé :** sans objet (bascule).

### 23. Cookies sans `Secure` ni préfixe · faible

- **Exigences.** V3.3.1 (L1, ❌ FAIL) et V3.3.3 (L2, ❌ FAIL). La même cause est rattachée à E-9.
- **Classe.** Mixte. Le cookie `etablissement-actif` est MAINTENANT. Les cookies `sb-*` relèvent de DISPARAÎT + À EXIGER (B1).
- **Preuve.** ⚪ lecture.
- **Où.** Les cookies `sb-<ref>-auth-token` n'ont ni `secure` ni préfixe (`constants.js:4-11`). `etablissement-actif` est `secure` en production, mais sans préfixe (`src/lib/etablissements/actions.ts:243-249`).
- **Scénario.** HSTS sur l'hôte limite le risque réel : un cookie sans `Secure` ne partirait en clair que sur une requête HTTP que HSTS empêche déjà.
- **Correctif recommandé.** Renommer le cookie en `__Host-etablissement-actif`, avec `Secure`, `Path=/` et sans `Domain`.
- **Test à écrire.** Les options du cookie posé par `choisirEtablissementActif` portent le préfixe et `secure`.
- **Corrigé :** non.

### 24. HSTS sans `includeSubDomains` · faible

- **Exigences.** V3.4.1 (L1, ❌ FAIL sur la clause L2).
- **Classe.** MAINTENANT.
- **Preuve.** 🔴. L'en-tête `strict-transport-security: max-age=63072000` est présent sur les 9 réponses, sans `includeSubDomains`.
- **Où.** `src/lib/securite/entetes.ts:81-84`. Le motif écrit est faux : HSTS ne couvre que l'hôte qui l'émet et ses sous-domaines, jamais le parent `rojer.fr`.
- **Scénario.** Un sous-domaine de l'hôte servi peut être visité en HTTP.
- **Correctif recommandé.** Ajouter `includeSubDomains`, sans `preload` tant que le domaine définitif n'est pas arrêté, et corriger le commentaire.
- **Test à écrire.** `entetes.test` exige `includeSubDomains`.
- **Corrigé :** non.

### 25. Redirection HTTP vers HTTPS forcée sur `/api/mcp` · faible

- **Exigences.** V4.1.2 (L2, ❌ FAIL).
- **Classe.** DISPARAÎT + À EXIGER (B26).
- **Preuve.** ⚪. La documentation de Vercel indique que tout HTTP est redirigé en 308 au bord, sans désactivation possible par chemin. Le 308 sur `/` est relevé en production par le groupe Crypto (V12.2.1).
- **Scénario.** Un client MCP mal configuré en `http://` envoie son jeton en clair avant d'être redirigé, au lieu d'être refusé.
- **Correctif recommandé.** Chez Clever Cloud, refuser `/api/mcp*` en clair au lieu de rediriger.
- **Test à écrire (recette).** Une requête `http://…/api/mcp` reçoit une erreur, pas un 30x.
- **Corrigé :** sans objet (bascule).

### 26. Charset absent de deux types de réponse · faible

- **Exigences.** V4.1.1 (L1, ⚠️ PARTIEL).
- **Classe.** MAINTENANT.
- **Preuve.** ⚪ et 🔴 (annexe A de la grille Navigateur, n° 5 et 8).
- **Où.** `text/event-stream` sans charset (`src/lib/mcp/http.ts:213`), et les 307 du middleware en `content-type: text/plain`. Pour `text/event-stream`, l'enregistrement IANA admet l'absence de charset, ce qui affaiblit ce point.
- **Correctif recommandé.** Ajouter `charset=utf-8` aux deux.
- **Test à écrire.** La réponse SSE du MCP porte `charset=utf-8`.
- **Corrigé :** non.

### 27. Entrées non bornées côté serveur · faible

- **Exigences.** V2.2.1 (L1, ❌ FAIL).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠, sonde `validation.test`.
- **Où.**
  - `renommerUnite` (`duerps/actions.ts:217`) accepte un nom de 1 Mo, alors que la création le borne à 100 caractères.
  - `declarerAucunRisque` (`:245`) accepte aussi 1 Mo.
  - `creerEquipementsDepuisPreRemplissage` (`equipements/actions.ts:376`) accepte 5 000 appareils et un libellé de 1 Mo, et laisse la catégorie à Prisma.
  - `entrepriseSchema` en modification n'a ni borne sur l'adresse (`entreprises/schema.ts:42`) ni maximum sur l'effectif (`:34-40`) : 10^12 est accepté.
  - `poserSignatureAvecToken` (`signatures/actions.ts:219`) ne borne pas le rôle du signataire et ne filtre pas les caractères de contrôle, alors que la demande le borne à 120.
  - `leverPrescription` (`prescriptions/actions.ts:121`) laisse passer « 2026-13-45 », qui devient le 2027-02-14.
- **Scénario.** Pour l'essentiel, c'est le titulaire qui se nuit à lui-même. Mais le porteur d'un jeton externe atteint aussi `poserSignatureAvecToken`. Le corps est borné à 4,5 Mo sur Vercel.
- **Correctif recommandé.** Des schémas zod avec les mêmes bornes qu'à la création, une validation stricte des dates et un quota par appel.
- **Test à écrire.** La sonde `validation.test`, recopiée sous `src/`.
- **Corrigé :** non.

### 28. Plafonds métier comptés puis écrits sans verrou · faible

- **Exigences.** V2.3.4 (L2, ⚠️ PARTIEL).
- **Classe.** MAINTENANT.
- **Preuve.** ⚪ lecture. Le scénario n'a pas été rejoué, faute de base partagée.
- **Où.** `creerBatiment` (`batiments/actions.ts:77-94`, seule contrainte `@@unique([etablissementId, nom])`), `ajouterUnite` (`duerps/actions.ts:193-205`) et le commit d'import, dont le contrôle a lieu avant la transaction (`duerps/import/actions.ts:166`).
- **Scénario.** N requêtes parallèles, avec des noms distincts, dépassent les 3 zones (ADR-029) ou les 5 unités (ADR-033). Seul le titulaire peut dépasser ses propres plafonds.
- **Correctif recommandé.** Verrouiller la ligne parente (`FOR UPDATE`) dans la transaction qui compte puis écrit.
- **Test à écrire.** Sur base jetable, des créations parallèles s'arrêtent au plafond.
- **Corrigé :** non.

### 29. Déconnexion absente d'une page · faible

- **Exigences.** V7.4.4 (L2, ⚠️ PARTIEL).
- **Classe.** MAINTENANT.
- **Preuve.** ⚪ lecture.
- **Où.** `AppHeaderGate.tsx:14` masque l'en-tête sous le préfixe `/etablissements/`, et `etablissements/nouveau/page.tsx` n'importe ni `BarreCompte` ni `signOutAction`.
- **Correctif recommandé.** Ajouter la déconnexion à cette page.
- **Test à écrire.** Le rendu de `/etablissements/nouveau` contient le bouton de déconnexion.
- **Corrigé :** non.

### 30. Identifiants de capacité trop faibles · faible

- **Exigences.** V11.5.1 (L2, ⚠️ PARTIEL).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠 par mutation : passer `generateToken` et `generateOtp` en `Math.random`, et `verifyOtp` en `===`, laisse les 97 tests verts.
- **Où.** `sig_${randomUUID()}` (`signatures/actions.ts:360,585`) sert de capacité non devinable aux pages publiques `/verifier/[id]` et `/signe/[id]`, qui affichent le nom et l'e-mail du signataire (`signatures/queries.ts:25-34`). Le texte de V11.5.1 exclut nommément les UUID. Pour `MCP_CLE`, seule la longueur est contrôlée (`acces-http.ts:54`).
- **Correctif recommandé.** Un identifiant public tiré de `randomBytes` (au moins 128 bits), distinct de la clé primaire, ou la décision écrite de garder l'UUID. L'audit du 13/10 (R7) pose la même question sur l'e-mail affiché.
- **Test à écrire.** Les gardes de l'écart 41 (CSPRNG et temps constant).
- **Corrigé :** non.

### 31. Empreinte stockée sans nom d'algorithme · faible

- **Exigences.** V11.2.2 (L2, ⚠️ PARTIEL). La part `MCP_CLE` relève de l'écart 6.
- **Classe.** MAINTENANT.
- **Preuve.** ⚪ lecture.
- **Où.** Le point de hachage est unique (`src/lib/signatures/hash.ts:8`), mais `versionDeHash` lit `"v1"` ou `"v2:"` (`hash-objet.ts:59`), ce qui désigne la forme d'entrée et non la fonction.
- **Scénario.** Un passage à SHA-512 ou SHA-3 rendrait les anciennes empreintes incomparables, sans marqueur pour les distinguer.
- **Correctif recommandé.** Nommer l'algorithme dans la prochaine version de forme (par exemple `v3:sha256:`).
- **Test à écrire.** Une empreinte relue sans préfixe d'algorithme connu est refusée.
- **Corrigé :** non.

### 32. Un PDF de DUERP gardé 60 s dans le cache du navigateur · faible

- **Exigences.** V14.3.2 (L2, ⚠️ PARTIEL).
- **Classe.** MAINTENANT.
- **Preuve.** 🟠 pour `servir.test`, qui tient le `no-store` des fichiers déposés. Celui des PDF, du ZIP et de l'export n'est tenu par aucun test.
- **Où.** `src/app/duerp/[id]/versions/[numero]/pdf/route.ts:41` (`private, max-age=60`).
- **Correctif recommandé.** Passer en `no-store`.
- **Test à écrire.** Une sonde qui parcourt les `route.ts` servant un document personnel et exige `no-store`, plutôt qu'une liste écrite à la main.
- **Corrigé :** non.

### 33. Pas de nettoyage côté client à la déconnexion · faible

- **Exigences.** V14.3.1 (L1, ⚠️ PARTIEL).
- **Classe.** À EXIGER (B30).
- **Preuve.** ⚪ lecture. `signOutAction` (`auth/actions.ts:111-116`) appelle `signOut()`, revalide et redirige, sans `Clear-Site-Data`. Le `localStorage` ne contient que des préférences d'affichage.
- **Correctif recommandé.** Poser `Clear-Site-Data` à la déconnexion, à la bascule.
- **Test à écrire (recette).** La réponse de déconnexion porte `Clear-Site-Data`.
- **Corrigé :** non.

### 34. Oracle d'existence sur 14 points d'entrée · faible (réserve de V8.2.2)

- **Exigences.** V8.2.2 (L1). Son FAIL vient de l'écart 1, et l'oracle n'en est qu'une réserve faible.
- **Classe.** MAINTENANT.
- **Preuve.** 🟠. Les tests des branches, rejoués contre le code de `main`, tombent : `permis-feu/perimetre.test.ts` 4 échecs, `plan-prevention/perimetre.test.ts` 5, la sonde `tenancy-oracle.test.ts` liste 13 fonctions. Le test `anonyme-asvs.test.ts` montre qu'un anonyme fait lire la base et distingue un identifiant absent d'un identifiant existant.
- **Où.** Les 14 points d'entrée qui lisent par l'identifiant seul avant le contrôle : `equipements/actions.ts` (l. 110-120, 420-433), `permis-feu/actions.ts` (l. 170-175, 286-292, 323-328), `plan-prevention/actions.ts` (l. 273-278, 373-378, 395-400, 450-455, 511-521) et `rapports/actions.ts` (`uploadRapport` l. 75-136, `supprimerRapport` l. 332-344).
- **Scénario.** La réponse distingue « pas à toi » de « n'existe pas ». L'objet d'autrui n'est ni lu ni modifié, et les identifiants (`cuid`, `prefix_uuid`) ne s'énumèrent pas.
- **Correctif recommandé.** Lire par identifiant et appartenance dans le même `where`, et répondre `notFound()` dans les deux cas.
- **Test à écrire.** La garde `tenancy-oracle` (e260a136).
- **Corrigé sur** `lot/audit-1013-robustesse` (cb220d5f, permis de feu), `lot/audit-1013-perimetre` (f9d94068, 572b8e06, 2edaaa01, garde e260a136) et, pour `uploadRapport`, `lot/securite-owasp-1013` (ed3676da). Un conflit est attendu au merge, à résoudre en gardant un seul `requireUser()` en tête.

### 35. Connexion à la base sans TLS vérifié · faible

- **Exigences.** V12.3.1 et V12.3.2 (L2, ❌ FAIL).
- **Classe.** À EXIGER (B19, qui renforce B6).
- **Preuve.** 🟠 sur Postgres jetables. Sans paramètre, contre un serveur sans TLS : `CONNECTE ssl=false`, un repli silencieux en clair. Avec `sslmode=require` contre un certificat auto-signé : `CONNECTE ssl=true TLSv1.2`. Seul `sslmode=require&sslaccept=strict` refuse (« The certificate was not trusted »).
- **Où.** Le gabarit de prod de `.env.example` ne porte aucun `sslmode`. La vraie valeur de `DATABASE_URL` n'a pas été lue.
- **Scénario.** Un attaquant actif entre l'application et la base force le repli en clair. L'option « Enforce SSL » côté serveur n'empêche pas ce repli.
- **Correctif recommandé.** Chez Clever Cloud, `sslmode=verify-full`, ou `require` avec `sslaccept=strict`. Le B6 de l'audit, qui ne demande que `require`, ne suffit pas.
- **Test à écrire (recette).** La connexion échoue contre un certificat non reconnu.
- **Corrigé :** sans objet (bascule).

### 36. Configuration de plateforme · faible

- **Exigences.**
  - V13.1.1 (L2, ⚠️) : fournisseurs nommés dans `rgpd.md` § 6, flux non inventoriés.
  - V13.2.4 (L2, ⚠️) : destinations figées dans le code, liste blanche jamais déclarée ni testée.
  - V13.2.3 (L2, ❔) : identifiants de production illisibles par cadrage.
  - V13.3.1 (L2, ⚠️) : secrets dans les variables Vercel, sans coffre ni procédure de rotation.
  - V13.2.5 (L2, ❌ FAIL) : aucun contrôle de sortie réseau, que Vercel Hobby n'offre pas.
  - V13.4.4 (L2, ❔) : TRACE non sondé.
- **Classe.** À EXIGER pour V13.1.1, V13.2.3, V13.2.4 et V13.3.1. DISPARAÎT + À EXIGER pour V13.2.5 et V13.4.4.
- **Preuve.** ⚪ lecture. L'historique Git est propre (`git log --all -S` : aucun secret réel).
- **Correctif recommandé.** À la bascule : un inventaire des flux, un contrôle de sortie, une procédure de rotation et de destruction des secrets, et la vérification des identifiants par défaut et de TRACE (B28, B31).
- **Test à écrire (recette).** `TRACE /` est refusé. Une requête sortante vers un hôte hors liste échoue.
- **Corrigé :** non.

### 37. Comportements propres à Supabase Auth et à l'infrastructure actuelle · faible ou inconnue

- **Exigences.**
  - V6.2.1 (L1, ⚠️) : la réinitialisation ne vérifie le minimum de 8 caractères qu'en HTML (`ResetPasswordForm.tsx:124,134`). Le minimum réel est celui de Supabase (❔, 6 par défaut).
  - V6.2.4 et V6.2.12 (❔) : réglage « Leaked password protection ».
  - V7.2.4 (L1, ⚠️) : une reconnexion ne révoque pas l'ancienne session (`auth/actions.ts:39`).
  - V7.4.1 et V7.4.2 (L1, ⚠️) : sur la voie MCP OAuth, un JWT reste accepté sans appel au serveur Auth jusqu'à son `exp`, après déconnexion ou suppression du compte (sonde, `appelsUser = 0`).
  - V7.4.5 (L2, ❔) : la révocation par un administrateur n'existe que depuis le tableau de bord, et sa procédure n'est pas écrite.
  - V7.5.2 (L2, ❌ FAIL) : aucune liste des sessions actives.
  - V4.2.1 (L2, ❔) : frontières de messages HTTP.
- **Classe.** DISPARAÎT + À EXIGER (B4, B20, B21, B23, B27, B28).
- **Preuve.** 🟠 pour les sondes de session et JWT, ⚪ pour le reste.
- **Correctif recommandé.** Rien sur l'existant. À la bascule : `minPasswordLength` vérifié côté serveur, la vérification des mots de passe divulgués, la révocation de l'ancienne session à la connexion, `listSessions` et `revokeSession(s)`, le plugin admin `revokeUserSessions`, et des jetons MCP de courte durée ou révocables.
- **Test à écrire (recette).** Un par critère, voir la liste de recette.
- **Corrigé :** sans objet (bascule).

### 38. Chaîne d'approvisionnement et surface résiduelle · faible

- **Exigences.**
  - V15.1.1 (L1, ❌ FAIL) : aucun délai de remédiation écrit, et Dependabot absent de `main`.
  - V15.1.2 (L2, ⚠️) : pas de SBOM ; `xlsx` est installé depuis `https://cdn.sheetjs.com/…` (`package.json:55`), hors registre, et ni `pnpm audit` ni Dependabot ne le suivent.
  - V15.1.3 (L2, ❌ FAIL) : les fonctions coûteuses ne sont pas documentées (ZIP de contrôle, PDF, import, `verifierIntegriteSignature`, dépôts de 25 Mo, MCP).
  - V15.2.3 (L2, ⚠️) : la CLI `shadcn` est en dépendance de production, et les SVG de create-next-app ainsi que `building.png` et `store.png` ne sont référencés nulle part.
  - V15.2.2 (L2, ⚠️) : entièrement doublon des écarts 3, 5 et 17.
- **Classe.** MAINTENANT.
- **Preuve.** ⚪ lecture, et 🔴 pour les fichiers servis.
- **Correctif recommandé.** Écrire le délai de remédiation par gravité, suivre `xlsx` à la main tant qu'il vient d'une URL, et retirer les fichiers d'exemple.
- **Test à écrire.** Aucun test de code ; une étape de CI `pnpm audit` (écart 15).
- **Corrigé en partie sur** `lot/securite-owasp-1013` : 48a25a02 (`.github/dependabot.yml`) et d83fae3c (`shadcn` en devDependencies).

### 39. Décisions documentaires manquantes · faible

- **Exigences.** Classées MAINTENANT (doc) : V2.1.1 (❌), V2.1.2 (⚠️), V2.1.3 (⚠️), V5.1.1 (❌), V8.1.1 (⚠️), V8.1.2 (⚠️), V14.1.1 (⚠️), V14.1.2 (❌). Classées À EXIGER, parce qu'elles s'écriront avec Better Auth et l'inventaire refait à la bascule : V6.1.1 (❌), V6.1.2 (❌), V6.1.3 (❌), V6.2.11 (❌, il n'existe pas de liste, et rien ne la consulte), V7.1.1 (❌), V7.1.2 (❌), V11.1.1 (❌), V11.1.2 (⚠️).
- **Preuve.** ⚪ lecture.
- **Correctif recommandé.** Voir la section « Exigences documentaires », qui regroupe les textes par document cible.
- **Corrigé :** non.

### 40. Inventaire, destination et conservation des journaux · faible

- **Exigences.** V16.1.1 (L2, ❌ FAIL), V16.2.3 (L2, ⚠️ PARTIEL, rabattu de FAIL par la réfutation) et V16.4.3 (L2, ❌ FAIL).
- **Classe.** À EXIGER (B10, B25).
- **Preuve.** ⚪ lecture. `docs/rgpd.md` § 8 (l. 656-663) tient en deux phrases. L'application n'écrit que sur la sortie standard, vers la seule destination nommée, mais l'inventaire n'existe pas, et les journaux restent chez l'hébergeur de l'application. Sur l'offre Hobby, les journaux d'exécution de Vercel se gardent moins longtemps que les 30 jours annoncés (à confirmer au tableau de bord).
- **Correctif recommandé.** À la bascule, un drain de journaux vers un système séparé, avec une durée de conservation décidée, et un inventaire par couche et par événement.
- **Test à écrire (recette).** Un événement de sécurité émis par l'application arrive dans le système séparé.
- **Corrigé :** non.

### 41. Gardes de test absentes sur des contrôles sains

Cette entrée ne correspond à aucun verdict FAIL. Elle est rappelée ici parce que plusieurs PASS reposent sur du code que rien ne garde : la section « Garde-fous de test manquants » en donne le détail.

## Exigences documentaires

Plusieurs exigences L1 et L2 demandent une décision écrite. Les textes ci-dessous sont regroupés par document cible. **Chacun est une proposition à valider par la propriétaire ; aucun n'est adopté.** Quand un groupe a rédigé un texte, il est cité tel quel. Trois groupes annoncent un texte que leur grille ne contient pas (Identité pour V6.1.1, Entrées pour V2.1.1 et V5.1.1, Crypto et données pour V11.1.1 et V14.1.2). Pour ceux-là, la liste donne ce que le document doit couvrir d'après la grille, sans inventer de rédaction.

### `docs/securite/autorisation.md`, ou un ADR au prochain numéro libre (V8.1.1, V8.1.2)

Texte proposé par le groupe Accès, proposition à valider par la propriétaire :

> **Autorisation dans Rojer**
>
> 1. **Consommateurs.** Quatre, et quatre seulement : le *titulaire* (session Supabase ; un compte = une entreprise, ADR-005/028) ; le *porteur d'un jeton d'accès* (ADR-007 : scope, objet et établissement fixés par le jeton, OTP pour `signature`) ; le *client MCP* (ADR-013 : jeton OAuth ou secret d'URL, un établissement) ; l'*anonyme* (pages et actions publiques listées au § 4).
> 2. **Règle de données.** Toute ligne se rattache à `Entreprise.userId`. Une lecture ou une écriture porte ce prédicat **dans le `where` de la requête**, ou part d'un identifiant rendu par un helper de `src/lib/auth/scope.ts`. Un identifiant enfant reçu du client est borné à l'établissement vérifié dans le même `where`. `requireUser` prouve l'authentification, jamais l'appartenance.
> 3. **Refus.** Un identifiant absent et un identifiant d'un autre compte reçoivent la même réponse (`notFound()` ; 403 identique pour les routes de fichiers). La session est exigée avant toute lecture en base et avant le traitement du corps.
> 4. **Points d'entrée sans session** — liste fermée, tenue par un test : `/`, `/login`, `/signup`, `/auth/*`, `/acces/[token]`, `/signe/[id]`, `/verifier/[id]` et l'action `verifierIntegriteSignature`, `/accessibilite/[slug]` et son affiche, `/api/mcp*`, `/.well-known/oauth-protected-resource/api/mcp`, les quatre actions de `lib/auth/actions.ts`, `poserSignatureAvecToken` et `renvoyerCodeOtp`.
> 5. **Le middleware n'autorise rien** : il rafraîchit la session et redirige. Toute action, route et requête se garde elle-même.
> 6. **Champs (lecture).** Le titulaire voit tous les champs de son tenant. Un consommateur externe ne reçoit qu'une projection nommée : signature → `SELECT_PREUVE` (ni IP, ni user-agent, ni établissement, ni objet) ; registre d'accessibilité → `getRegistrePublicParSlug` ; jeton → nom et adresse du destinataire, échéance, contenu de l'objet visé ; MCP → jamais `Action.responsable` (cf. `docs/rgpd.md`). Les composants clients reçoivent des DTO, jamais une ligne Prisma entière.
> 7. **Champs (écriture).** Jamais acceptés du client : `userId`, `entrepriseId`, `etablissementId` d'une ligne existante, `statut` hors transitions prévues, `hashDocument`, `ipAddress`, champs de jeton. Les champs d'un acte signé sont scellés (ADR-008) : une modification qui les touche est refusée ou révoque les liens en vol.

Le même document doit corriger l'ADR-005 § 7, qui annonce une RLS « déjà en place », et son § 5, qui présente `requireUser` comme suffisant.

### En-têtes HTTP : commentaire de `src/lib/securite/entetes.ts` et document de sécurité (V3.4.1, V3.4.3)

V3 n'a aucune exigence documentaire aux niveaux L1 et L2, mais deux décisions y sont écrites sur un motif faux ou sans échéance. Textes proposés par le groupe Navigateur, propositions à valider par la propriétaire :

> HSTS : `max-age=63072000; includeSubDomains`. L'en-tête ne vaut que pour l'hôte servi et ses sous-domaines (aujourd'hui `*.test-duerp-hazel.vercel.app`) ; il n'engage pas `rojer.fr`. Pas de `preload` tant que l'application n'a pas son domaine définitif.

> CSP appliquée à nonce par requête (proxy), `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, `report-to` vers un point de collecte. Report-Only toléré jusqu'au <date>, critère de bascule : zéro violation sur une semaine de prod.

### Cookies et sessions : document à créer (V7.1.1, V7.1.2, et la politique des cookies)

Texte proposé par le groupe Navigateur pour les cookies, proposition à valider par la propriétaire :

> Tout cookie de l'application porte `Secure`, `HttpOnly` (sauf justification écrite) et `SameSite=Lax`, et un nom en `__Host-` avec `Path=/` sans `Domain`. La session dure au plus N jours. Exception tolérée jusqu'à la bascule vers Better Auth : les cookies `sb-*` de `@supabase/ssr` (non `HttpOnly`, sans `Secure`, 400 jours). Le risque est accepté par <propriétaire> le <date>.

Pour V7.1.1 et V7.1.2, le groupe Identité a rédigé un texte dans son rapport final. Le document doit donner le délai d'inactivité, la durée maximale absolue, et la justification de tout écart à NIST SP 800-63B. Il doit aussi dire combien de sessions simultanées un compte peut tenir, et ce qui se passe au-delà. Il s'écrira avec Better Auth (À EXIGER, B20).

Texte repris du rapport final du groupe Identité, absent de sa grille. Proposition à valider par la propriétaire :

> **V7.1.1** — Une session expire après 12 h d'inactivité, et au plus tard 7 jours après la connexion ; il faut alors se reconnecter. C'est un écart assumé avec NIST AAL2 (30 min / 12 h) : les données sont réglementaires mais ne touchent pas à la santé, et il n'y a pas de MFA à ce jour. Cookie `httpOnly`, `secure`, `SameSite=Lax`.
>
> **V7.1.2** — Un compte peut tenir autant de sessions simultanées qu'il veut. Chaque session est listée dans le compte et peut être fermée. Un changement de mot de passe propose de fermer toutes les autres.

### Authentification : document à créer avec Better Auth (V6.1.1, V6.1.2, V6.1.3, V6.2.11)

Le texte du groupe Identité, absent de sa grille, figure dans son rapport final ; il est reproduit après la liste. D'après la grille, le document doit couvrir les points suivants.

- **La limitation de débit, l'anti-automatisation et le verrouillage abusif** (V6.1.1) : où ils s'appliquent, avec quels seuils, et comment un attaquant est empêché de verrouiller le compte d'un autre. L'ADR-005 dit seulement que « Supabase gère […] rate limiting ».
- **La liste des mots propres au contexte** (V6.1.2, V6.2.11) : rojer, duerp, btry, la raison sociale, entre autres. Le document dit aussi où cette liste est consultée.
- **L'inventaire des voies d'authentification** (V6.1.3), avec la force et les contrôles de chacune. Il y en a quatre : le mot de passe, le lien magique avec OTP, le MCP à clé dans l'URL et le MCP à jeton porteur. Elles sont décrites dans quatre ADR (005, 006/007 et 013), jamais ensemble.

Texte repris du rapport final du groupe Identité, absent de sa grille. Proposition à valider par la propriétaire :

> **V6.1.1** — La connexion, l'inscription et la réinitialisation sont limitées par l'application, et pas seulement par Supabase, qui ne voit que les IP de Vercel. Seuils : 5 échecs par compte en 15 min, puis un délai croissant, sans jamais de blocage définitif ; 20 tentatives par IP réelle en 15 min (IP prise dans `X-Forwarded-For` de confiance). Les compteurs sont en base. Le verrouillage par compte ne bloque que le mot de passe : le lien de réinitialisation reste utilisable, pour qu'un tiers ne puisse pas fermer le compte d'un autre.
>
> **V6.1.2** — Mots refusés dans un mot de passe, variantes de casse et leetspeak comprises : rojer, duerp, btry, prevention, securite, la raison sociale et l'adresse e-mail du compte.
>
> **V6.1.3** — Un tableau des quatre voies d'authentification : mot de passe ; lien et OTP du prestataire ; MCP à clé ; MCP OAuth. Pour chacune : facteur, durée, limite de débit, révocation et statut (active ou suspendue). La route `/api/mcp` OAuth y est déclarée active, ou bien retirée.

### Validation des données : document à créer, et correction de l'ADR-004 (V2.1.1, V2.1.2, V2.1.3)

Le texte du groupe Entrées, absent de sa grille, figure dans son rapport final ; il est reproduit après la liste. D'après la grille, le document doit couvrir les points suivants.

- **Les règles par champ** : longueurs, formats SIRET, NAF et adresse, plages. Elles n'existent aujourd'hui que dans les schémas zod, et `docs/charte-board.md:422` ne nomme que le mécanisme.
- **Les règles combinées.** Celles qui sont déjà écrites : ERP ⇔ type et catégorie (ADR-004 § Invariants), ERP en IGH refusé et plus de 50 travailleurs refusé (ADR-031). Celles qui ne le sont pas : date de fin après la date de début, levée postérieure à l'acte, titres. L'ADR-004, l. 148, dit encore « peut être `estERP && estIGH` simultanément » sans renvoi à l'ADR-031. Il faut l'amender.
- **Les limites.** Celles qui sont déjà écrites : 5 unités (ADR-033), 3 zones (ADR-029), 50 travailleurs (ADR-031), OTP de 6 chiffres, valable 10 minutes, 3 essais (ADR-006, ADR-007), 20 Mo (`rgpd.md:524`). Celles qui manquent : les quotas par utilisateur (appareils, salariés, prestataires, rapports, volume stocké), les limites globales, les renvois d'OTP et le débit.

Texte repris du rapport final du groupe Entrées, absent de sa grille. Proposition à valider par la propriétaire :

> **V2.1.1** — Toute Server Action et toute route valide ses entrées côté serveur, par un schéma zod (`z.object`, mode strip) ou par une liste fermée. Cette validation a lieu avant toute lecture du fichier et avant toute écriture. Règles :
> - texte libre : borne explicite (nom ≤ 120, libellé ≤ 200, note ≤ 500, description ≤ 2 000), et aucun caractère de contrôle dans un champ d'une seule ligne ;
> - entier : minimum et maximum explicites ;
> - date : un jour civil réel (une date AAAA-MM-JJ qui existe au calendrier) ;
> - identifiant reçu : résolu sous le périmètre de l'utilisateur, jamais cru tel quel ;
> - formats : SIRET à 14 chiffres, NAF `NN.NNX`, adresse « Rue, 75000 Ville ».
>
> Le schéma fait foi ; l'écran n'en est que le reflet.
>
> **V2.1.2** — En tête de l'ADR-004 : « Amendée par l'ADR-031 : un ERP situé dans un IGH est refusé à la création ; le cumul ERP + IGH reste lisible sur un dossier existant. » Combinaisons refusées : ERP sans type ou sans catégorie ; type ou catégorie sans ERP ; ERP en IGH à la création ; plus de 50 travailleurs à la création ; fin du permis avant son début ; levée d'une prescription avant l'acte.
>
> **V2.1.3** — Limites par établissement : 3 zones, 5 unités hors « Risques transverses », N appareils, N salariés, N prestataires, N Mo stockés. Par utilisateur : N créations par minute et N dépôts par heure. Global : N requêtes par minute et par IP sur les pages publiques (`/acces`, `/signe`, `/verifier`, affiche). OTP : 3 essais par code, un renvoi par minute, au plus N renvois par lien. Chaque plafond est tenu côté serveur, sous verrou ou par une contrainte en base. Les valeurs N sont à trancher par la propriétaire.

### Fichiers : document à créer, ou section de `docs/rgpd.md` (V5.1.1)

Le texte du groupe Entrées, absent de sa grille, figure dans son rapport final ; il est reproduit après la liste. D'après la grille, le document doit donner, pour chaque fonction de dépôt (rapports, pièces de prestataires, analyses, import du DUERP) :

- les extensions et les types attendus ;
- la taille maximale avant et après décompression (DOCX et XLSX sont des archives, contrairement à la mention « pas d'archives » de `rgpd.md:524`) ;
- les 5 Mo de l'import ;
- le plafond réel de 4,5 Mo sur Vercel, alors que `next.config.ts:31` annonce 25 Mo ;
- le comportement face à un fichier malveillant, y compris la décision sur l'antivirus (V5.4.3).

Texte repris du rapport final du groupe Entrées, absent de sa grille. Proposition à valider par la propriétaire :

> | Dépôt | Types | Extensions | Taille | Décompressé |
> |---|---|---|---|---|
> | Rapport de vérification, pièce de prestataire, rapport de laboratoire | PDF, PNG, JPEG, DOCX | `.pdf .png .jpg .jpeg .docx` | 4 Mo (le plafond Vercel est de 4,5 Mo par requête) | DOCX non décompressé par Rojer |
> | Import du DUERP | XLSX, XLS, CSV | `.xlsx .xls .csv` | 5 Mo | ≤ 20 Mo et ≤ N entrées, contrôlés avant l'analyse ; 5 000 lignes au plus |
>
> L'extension et les octets magiques doivent correspondre au type annoncé ; sinon le dépôt est refusé. Le fichier n'est servi que par une route qui contrôle l'appartenance, avec `nosniff`, `CSP: sandbox`, et `attachment` hors des quatre types. Un fichier suspect est refusé avec son motif : rien n'est stocké et l'événement est journalisé. Il n'y a pas d'antivirus aujourd'hui. La décision est à prendre avant d'accepter des dépôts externes ou de remettre des pièces à un tiers.

### Clés et cryptographie : document à créer (V11.1.1, V11.1.2)

Le texte du groupe Crypto et données, absent de sa grille, figure dans son rapport final ; il est reproduit plus bas. D'après la grille, le document doit tenir l'inventaire de chaque clé et de chaque secret : à quoi il sert, ce qu'il protège et ne protège pas, où il est rangé, qui le tourne, quand et comment. Les clés à inventorier sont `MCP_CLE` (rotation au journal depuis le 2026-08-16, jamais faite), `SUPABASE_SERVICE_ROLE_KEY`, le secret PISTE, le mot de passe de la base et les clés de signature JWT du projet Supabase. Le document dit aussi quels algorithmes sont employés, et pour quoi (SHA-256 pour les empreintes de signature, ADR-006 et ADR-008). Il sera refait à la bascule (À EXIGER, B31).

Texte repris du rapport final du groupe Crypto et données, absent de sa grille. Proposition à valider par la propriétaire :

> **V11.1.1** — Chaque secret a un propriétaire unique, la propriétaire du compte. Il ne vit que dans les variables chiffrées de l'hébergeur. Il n'est jamais copié dans un poste, un journal, un document ni une session d'agent. Les secrets sont : `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` et `DIRECT_URL` (mot de passe de la base), `LEGIFRANCE_CLIENT_SECRET`, `MCP_CLE` jusqu'à son retrait, et les clés de signature JWT du projet d'authentification.
> - **Création** : 256 bits tirés d'un CSPRNG (`openssl rand -base64 32`).
> - **Partage** : au plus deux entités pour un secret partagé (l'application et le fournisseur), une seule pour une clé privée.
> - **Rotation** : tous les 12 mois, et immédiatement si le secret a été vu hors de son coffre (journal, URL, capture, sortie d'outil). Pendant une rotation, l'ancienne et la nouvelle valeur sont acceptées 24 h au plus.
> - **Destruction** : révocation chez le fournisseur, puis suppression de la variable.
> - **Traçabilité** : chaque rotation est consignée dans `docs/journal-des-verifications.md`, avec la date, le motif et l'auteur.
>
> Référence : NIST SP 800-57 partie 1, § 5.3.
>
> **V11.1.2** — Algorithmes :
> - **SHA-256** : intégrité des documents signés, hachage des jetons d'accès et des OTP, comparaison de `MCP_CLE` ;
> - **CSPRNG** : `randomBytes(32)` pour les jetons, `randomInt` pour les OTP. `randomUUID` sert pour les identifiants, jamais comme capacité ;
> - **TLS 1.2 et 1.3** : géré par l'hébergeur ;
> - **JWT** : signés par Supabase, à remplacer par Better Auth.
>
> Clés :
> - `service_role` : stockage seulement, jamais côté client ni pour l'API Data ;
> - la clé publishable : publique par nature, elle ne protège rien ;
> - certificats TLS : Vercel et Supabase.
>
> Toute empreinte stockée nomme désormais son algorithme (`sha256:`).

### Protection des données : `docs/rgpd.md` (V14.1.1, V14.1.2)

Le texte du groupe Crypto et données pour V14.1.1 et V14.1.2, absent de sa grille, figure dans son rapport final ; il est reproduit plus bas. D'après la grille, `docs/rgpd.md` doit d'abord attribuer un **niveau de protection** à chaque catégorie de données. Il doit ensuite ajouter à l'inventaire ce qui y manque :

- `Signature.ipAddress` et `userAgent` ;
- le contenu du JWT Supabase, en cookie non `httpOnly` ;
- les jetons d'accès en clair dans les URL ;
- les noms de fichiers dans les clés de stockage.

Pour chaque niveau, il doit écrire les exigences : chiffrement, chiffrement en base, journalisation et accès aux journaux. Il doit enfin corriger les § 3 et § 7, qui décrivent encore un stockage « local », et le § 8 (voir ci-dessous).

Texte repris du rapport final du groupe Crypto et données, absent de sa grille. Proposition à valider par la propriétaire :

> **N3, santé et capacités.** L'existence et les dates des visites médicales, et les échéances des titres d'un salarié nommé. Accès : le dirigeant de l'entreprise seulement. Ces données ne vont jamais vers le MCP ni dans un document remis à un tiers (`frontiere-medicale.test.ts`), et jamais dans un journal. Cache : `no-store`. Suppression : sur geste de l'employeur, et définitive.
>
> **N2, données personnelles.** Les noms et e-mails des salariés, des signataires, des contacts et des destinataires ; l'IP et le user-agent de signature ; les rapports déposés.
> - **Accès** : limité au compte par `Entreprise.userId`, avec la RLS en défense en profondeur.
> - **En transit** : TLS avec certificat vérifié, y compris vers la base.
> - **Au repos** : le chiffrement de l'hébergeur.
> - **IP** : tronquée en /24 ou /64 après 30 jours.
> - **Fichiers** : servis en `no-store`.
> - **Journaux** : aucun nom ni nom de fichier, seulement des identifiants.
>
> **N1, secrets d'accès.** Jetons, OTP et clés. Ils ne sont stockés qu'en empreinte SHA-256. Ils n'apparaissent jamais dans une URL, sauf un jeton à usage unique valable 72 h au plus, et jamais dans un journal.
>
> **N0, données publiques d'entreprise.** SIRET, registre d'accessibilité publié.
>
> **Journaux.** Conservés 30 jours, consultables par la propriétaire seule. Une valeur encodée (JWT, base64) relève du niveau de ce qu'elle contient.

### Journaux : `docs/rgpd.md` § 8 (V16.1.1)

Le § 8 (l. 656-663) tient en deux phrases. Il doit devenir un inventaire, couche par couche (application, Next, hébergeur, Supabase Auth) et événement par événement, avec le format, la destination, qui peut lire, l'usage et la durée de conservation. Cette durée doit être vérifiée, et non supposée : les 30 jours annoncés ne sont pas vérifiés. Le document s'écrit avec le drain de journaux de la bascule (À EXIGER, B10, B25).

Texte repris du rapport final du groupe Plateforme, absent de sa grille. Proposition à valider par la propriétaire :

> **V16.1.1, V16.2.3 et V16.3.3**, à substituer au § 8 de `rgpd.md`.
> - **Couches** : exécution Vercel (stdout), Supabase Auth, GitHub.
> - **Événements** : connexion réussie ou échouée, OTP échoué ou épuisé, jeton externe refusé ou consommé, refus d'autorisation (`notFound` de portée), suppression d'un salarié, d'un établissement ou d'une entreprise, export ZIP ou PDF, accès aux données d'un salarié.
> - **Format** : du JSON sur une ligne, `{ts UTC, evenement, userId, etablissementId, ip, requestId, resultat}`.
> - **Exclus** : mots de passe, OTP, jetons, `MCP_CLE`, contenu des fichiers.
> - **Destination** : un drain vers un service séparé.
> - **Accès** : la propriétaire seule.
> - **Conservation** : 6 mois à 1 an (fourchette de la CNIL pour les traces d'accès), à confirmer.

### Dépendances et fonctions coûteuses : document de sécurité (V15.1.1, V15.1.3)

Le document doit donner les délais de remédiation par gravité d'avis, que l'outil d'alerte les rapporte (Dependabot) ou qu'il faille les relever à la main (`xlsx`, installé depuis une URL). Il doit aussi lister les fonctions coûteuses et leurs bornes :

- le ZIP de contrôle (`maxDuration = 300`, tout en mémoire) ;
- les PDF ;
- l'import XLSX ;
- `verifierIntegriteSignature`, publique, qui hache jusqu'à 20 Mo par appel ;
- les dépôts de 25 Mo ;
- le MCP (`maxDuration = 60`).

Texte repris du rapport final du groupe Plateforme, absent de sa grille. Proposition à valider par la propriétaire :

> **V15.1.1 et V15.2.1** — Toute vulnérabilité d'une dépendance de production est corrigée dans un délai compté depuis la publication de l'avis :
> - critique : 72 h ;
> - élevée : 7 jours ;
> - moyenne : 30 jours ;
> - faible : au prochain lot.
>
> Le délai double si l'avis n'est pas atteignable et que la justification est écrite dans la PR. Hors avis, les dépendances directes sont mises à jour au moins une fois par mois, par les PR Dependabot. Une dépendance installée hors du registre (`xlsx`) est vérifiée à la main chaque mois. `pnpm audit --prod` tourne en CI et bloque à partir de « high ».
>
> **V15.1.2** — L'inventaire fait foi par `pnpm-lock.yaml`. Un SBOM CycloneDX est produit à chaque release. Source admise : le registre npm. Seule exception aujourd'hui : `xlsx`, installé depuis `cdn.sheetjs.com`.
>
> **V15.1.3 et V15.2.2** — Un tableau des fonctions coûteuses, avec pour chacune son coût, sa borne et sa défense : ZIP de contrôle, import xlsx, `verifierIntegriteSignature`, dépôts, MCP, génération PDF. Phrase de tête : « Aucune réponse ne doit dépasser le délai du client ; au-delà de 60 s, le traitement passe en tâche de fond. »

### Flux de configuration : document d'architecture (V13.1.1, V13.2.4)

Le document doit inventorier les flux :

- le pooler Postgres 6543 à l'exécution, et le 5432 pour les migrations au build ;
- l'API Auth de Supabase, que le middleware appelle à chaque requête ;
- le stockage Supabase, par `service_role` ;
- le JWKS pour l'OAuth MCP ;
- les clients MCP entrants ;
- PISTE et Légifrance, depuis des scripts hors exécution.

Il doit aussi écrire ce qui n'existe pas : aucun appel serveur vers une URL fournie par un utilisateur. La liste des destinations doit être déclarée comme liste blanche et testée. Le document est à refaire pour Clever Cloud (À EXIGER).

Texte repris du rapport final du groupe Plateforme, absent de sa grille. Proposition à valider par la propriétaire :

> **V13.1.1** — Flux de l'application.
> - **Sortants** : Postgres (pooler 6543 ; 5432 pour les migrations), Supabase Auth, Supabase Storage, JWKS OAuth pour le MCP. Légifrance (PISTE) n'est appelé que par des scripts, jamais à l'exécution.
> - **Entrants** : navigateurs, clients MCP (OAuth), liens d'accès externes.
>
> Aucun utilisateur ne fournit d'URL que le serveur appelle. Toute nouvelle destination sortante passe par un ADR. Cette liste vaut liste blanche (V13.2.4).
>
> **V13.2.2 et V13.3.1** — Deux rôles de base de données : un rôle de migration, propriétaire, utilisé seulement à l'étape de déploiement, et un rôle applicatif réduit au DML. Chaque secret a un propriétaire et une procédure de rotation. Aucun secret ne circule dans une URL.

## Écarts entre décisions écrites et code

Ces écarts ne sont pas tous des failles. Mais un document qui affirme un contrôle absent fait croire à une protection, et le dernier de la liste a déjà trompé un audit. Chaque ligne est à corriger dans le document ou dans le code, selon la décision de la propriétaire.

- **ADR-005.** Elle annonce un hachage « argon2 », alors que Supabase emploie bcrypt (coût 10 par défaut, d'après le code public de GoTrue). Son § 7 affirme une « RLS deny all (migration `enable_rls_deny_all` déjà en place) » : cette migration n'existe pas, et 13 tables n'ont pas de RLS (écart 1). Son § 5 présente `requireUser` comme suffisant, alors que le code exige un helper d'appartenance.
- **ADR-006.**
  - L. 47 et 85 : elle promet une « IP masquée en /24 après 30 jours ». Aucun code ne le fait, et l'IP complète est conservée sans limite (écart 14).
  - Elle prévoit « max 5 envois d'OTP / heure / email », mais seul un délai de 60 s existe (écart 21).
  - Elle prévoit un OTP pour la signature en compte connecté (« Modal de confirmation → saisie OTP »), absent de `signerEnCompteConnecte` (écart 13).
  - Elle prévoit des « logs de tentatives 90 jours », absents eux aussi.
- **ADR-007.** Elle décrit le jeton comme un « ULID 128 bits ». C'est en réalité `randomBytes(32)`, soit 256 bits : le code fait mieux que la décision, et c'est la décision qu'il faut corriger. Elle annonce un « rate limit et logging renforcés » sur `/acces/*`, qui sont absents. Elle dit l'OTP « envoyé au premier accès », alors qu'il part dans le même e-mail que le lien.
- **ADR-013.** Sa note du 2026-09-27 dit la route à clé « seul accès » MCP, alors que `/api/mcp` en OAuth reste déployée et accepte le jeton de session du navigateur. Son § 8 écrit le choix de ne pas vérifier `aud`, sans rien qui le compense (écart 22).
- **ADR-004 et ADR-031.** L'ADR-004, l. 148, dit qu'un établissement « peut être `estERP && estIGH` simultanément », sans renvoi à l'ADR-031, qui refuse l'ERP en IGH. Le code applique l'ADR-031 (`etablissements/schema.ts:412-440`, `:506`).
- **`docs/rgpd.md`.**
  - Les § 3 et § 7 décrivent encore un stockage « local », périmé depuis le passage au stockage Supabase.
  - Le § 8 annonce des « journaux HTTP 30 jours » que personne n'a vérifiés chez Vercel ; sur l'offre Hobby, la conservation est vraisemblablement plus courte.
  - La l. 524 dit « pas d'archives », alors que DOCX et XLSX en sont.
- **Journal « servi en sandbox ».** `docs/journal-des-verifications.md` (l. 4351) et l'audit du 13/10 (« Les fichiers déposés sont servis en `sandbox` ») l'affirment. C'est faux sous `next start` : la CSP `frame-ancestors 'none'` de `next.config.ts` écrase la CSP `sandbox` de la route (annexe B de la grille Navigateur). L'affirmation repose sur `servir.test`, qui lit l'objet `Response` et non la réponse du serveur. Le PASS de V3.2.1 et de V1.3.4 tient sans la sandbox, mais la phrase et la preuve sont à corriger. Le défaut deviendra réel chez Clever Cloud, qui sert par `next start` (B18).
- **Commentaires du code.** `src/lib/securite/entetes.ts:81-83` justifie l'absence d'`includeSubDomains` par un motif faux (écart 24). `entetes.ts:10-13` écarte le nonce au nom d'un coût de rendu dynamique déjà payé (écart 8). `next.config.ts:31` annonce des dépôts de 25 Mo, alors que Vercel plafonne le corps à 4,5 Mo (B11).

## Grille complète

Une ligne par exigence L1 et L2 de l'ASVS 5.0.0, N/A compris, dans l'ordre des identifiants : 253 lignes. Le verdict est le verdict final, après réfutation. La mention « (réfuté : …) » signale une ligne où la grille du groupe et la réfutation divergeaient ; c'est la réfutation qui l'emporte. La colonne « Classe » n'est remplie que pour les écarts. Les renvois « → E-n » marquent une exigence qui garde son verdict, mais dont l'écart est compté sous une autre.

| V-id | Niveau | Verdict final | Preuve courte | Classe |
|---|---|---|---|---|
| V1.1.1 | L2 | ✅ PASS | ⚪ Un seul décodage applicatif (`api/mcp/[cle]/route.ts:47`) ; réserve : un `%` malformé donne 500 |  |
| V1.1.2 | L2 | ✅ PASS | 🟠 Encodage au point de sortie (JSX, `escapeHtml` de l'affiche, `Content-Disposition`) ; M1 et M4 tombent |  |
| V1.2.1 | L1 | ✅ PASS | 🟠 Affiche publique encodée (`affiche/route.ts:186`) ; sonde `encodage.test`, M1 |  |
| V1.2.2 | L1 | ✅ PASS | ⚪ URL bâties sur `PUBLIC_APP_URL`, slug `[a-z0-9-]`, jeton base64url |  |
| V1.2.3 | L1 | ✅ PASS | ⚪ JSON par `NextResponse.json` ; aucun `<script>` inline de données |  |
| V1.2.4 | L1 | ✅ PASS | 🟠 `$queryRaw` en gabarits balisés ; seul `Prisma.raw` sur liste fermée ; M2 |  |
| V1.2.5 | L1 | ✅ PASS | ⚪ Aucun `child_process` à l'exécution |  |
| V1.2.6 | L2 | ➖ N/A | ⚪ Aucun annuaire LDAP |  |
| V1.2.7 | L2 | ➖ N/A | ⚪ Aucune requête XPath |  |
| V1.2.8 | L2 | ➖ N/A | ⚪ Aucun processeur LaTeX |  |
| V1.2.9 | L2 | ✅ PASS | ⚪ Seul `new RegExp` bâti sur des constantes |  |
| V1.3.1 | L1 | ➖ N/A | ⚪ Aucun éditeur WYSIWYG ni champ HTML |  |
| V1.3.2 | L1 | ✅ PASS | ⚪ Aucun `eval` ni `new Function` |  |
| V1.3.3 | L2 | ✅ PASS | 🟠 Clés de stockage, noms de ZIP et d'en-tête assainis ; sondes de traversée, M3 |  |
| V1.3.4 | L2 | ✅ PASS | 🟠 SVG hors liste au dépôt ; au service `octet-stream` + `attachment` + `nosniff` ; M4 (la mention « sandbox » est à retirer de la preuve, cf. V3.2.1) |  |
| V1.3.5 | L2 | ➖ N/A | ⚪ Aucun gabarit, Markdown, CSS ou XSL fourni par l'utilisateur |  |
| V1.3.6 | L2 | ✅ PASS | ⚪ Aucun `fetch` serveur vers une URL fournie |  |
| V1.3.7 | L2 | ✅ PASS | 🟠 Gabarit fixe, entrée encodée ; sonde, M1 |  |
| V1.3.8 | L2 | ➖ N/A | ⚪ Pas de pile Java (JNDI) |  |
| V1.3.9 | L2 | ➖ N/A | ⚪ Aucun memcache |  |
| V1.3.10 | L2 | ✅ PASS | ⚪ Aucune chaîne de format bâtie sur une entrée |  |
| V1.3.11 | L2 | ✅ PASS | ⚪ Aucun transport SMTP ; sujets multilignes refusés (`access-tokens/mail.ts:32`) |  |
| V1.4.1 | L2 | ➖ N/A | ⚪ TypeScript sur Node, mémoire gérée |  |
| V1.4.2 | L2 | ✅ PASS | ⚪ Entiers bornés par zod ; l'exception (effectif) est comptée en V2.2.1 |  |
| V1.4.3 | L2 | ➖ N/A | ⚪ Ramasse-miettes, pas de pointeurs |  |
| V1.5.1 | L1 | ✅ PASS | 🟠 SheetJS 0.20.3 ignore la DTD ; sondes XXE et « billion laughs » |  |
| V1.5.2 | L2 | ✅ PASS | 🟠 Colonnes `__proto__` d'un CSV sans effet ; sonde |  |
| V2.1.1 | L1 | ❌ FAIL | ⚪ Aucune règle de validation écrite (`charte-board.md:422` ne nomme que zod) | MAINTENANT (doc) |
| V2.1.2 | L2 | ⚠️ PARTIEL | ⚪ ADR-004 l. 148 contredit l'ADR-031 ; autres combinaisons non écrites | MAINTENANT (doc) |
| V2.1.3 | L2 | ⚠️ PARTIEL | ⚪ Quotas, renvois d'OTP, débit non écrits | MAINTENANT (doc) |
| V2.2.1 | L1 | ❌ FAIL | 🟠 Six actions sans borne serveur (sonde `validation.test`) | MAINTENANT |
| V2.2.2 | L1 | ✅ PASS | 🟠 Validation dans la couche serveur ; M5, M6 |  |
| V2.2.3 | L2 | ✅ PASS | 🟠 `combinaisons.test` ; réserve : M8, la suite existante ne tient pas deux règles |  |
| V2.3.1 | L1 | ✅ PASS | 🟠 Ordre du flux de signature imposé côté serveur ; M5, M6 |  |
| V2.3.2 | L2 | ✅ PASS | 🟠 Plafonds documentés appliqués ; M7 |  |
| V2.3.3 | L2 | ✅ PASS | ⚪ Transactions sur les écritures multi-lignes |  |
| V2.3.4 | L2 | ⚠️ PARTIEL | ⚪ Plafonds comptés puis écrits sans verrou (`batiments/actions.ts:77-94`, `duerps/actions.ts:193-205`) | MAINTENANT |
| V2.4.1 | L2 | ❌ FAIL | 🟠 Aucune limitation de débit ; 5 000 appareils par appel ; `/verifier` public | MAINTENANT + À EXIGER |
| V3.2.1 | L1 | ✅ PASS | 🟠🔴 Liste blanche, `attachment` et `nosniff` suffisent (réfuté : PARTIEL → PASS ; la CSP `sandbox` est écrasée sous `next start` mais n'est pas nécessaire ; preuve et journal à corriger) |  |
| V3.2.2 | L1 | ✅ PASS | ⚪ Aucun puits DOM dangereux ; rendu React échappé |  |
| V3.3.1 | L1 | ❌ FAIL | ⚪ `sb-*` sans `Secure` ni préfixe ; `etablissement-actif` sans préfixe | MAINTENANT (`etablissement-actif`) / DISPARAÎT + À EXIGER (`sb-*`) |
| V3.3.2 | L2 | ✅ PASS | ⚪ `SameSite=Lax` sur les deux familles de cookies |  |
| V3.3.3 | L2 | ❌ FAIL | ⚪ Aucun cookie en `__Host-` | MAINTENANT (`etablissement-actif`) / DISPARAÎT + À EXIGER (`sb-*`) |
| V3.3.4 | L2 | ❌ FAIL | ⚪ Jeton de session Supabase en `httpOnly:false` | DISPARAÎT + À EXIGER |
| V3.4.1 | L1 | ❌ FAIL | 🔴 HSTS sans `includeSubDomains`, motif écrit erroné | MAINTENANT |
| V3.4.2 | L1 | ✅ PASS | 🔴 CORS `*` seulement sur métadonnées publiques et statiques |  |
| V3.4.3 | L2 | ❌ FAIL | 🔴 CSP complète en Report-Only, `'unsafe-inline'`, `base-uri 'self'` | MAINTENANT |
| V3.4.4 | L2 | ✅ PASS | 🔴 `nosniff` sur les 9 réponses |  |
| V3.4.5 | L2 | ✅ PASS | 🔴 `strict-origin-when-cross-origin` partout |  |
| V3.4.6 | L2 | ✅ PASS | 🔴🟠 `frame-ancestors 'none'` appliqué, `X-Frame-Options: DENY` |  |
| V3.5.1 | L1 | ✅ PASS | ⚪ Contrôle d'`Origin` des Server Actions, `SameSite=Lax` |  |
| V3.5.2 | L1 | ➖ N/A | ⚪ L'application ne s'appuie pas sur le preflight CORS |  |
| V3.5.3 | L1 | ✅ PASS | ⚪ Toutes les mutations en POST |  |
| V3.5.4 | L2 | ✅ PASS | ⚪ Une seule application par origine (doublon de grille : une ligne) |  |
| V3.5.5 | L2 | ➖ N/A | ⚪ Aucun `postMessage` (doublon de grille : une ligne) |  |
| V3.7.1 | L2 | ✅ PASS | ⚪🔴 Aucun plugin ni script tiers |  |
| V3.7.2 | L2 | ❌ FAIL | 🟠 Redirection ouverte par `next` (`auth/actions.ts:44-46`, `auth/callback/route.ts:17`) | MAINTENANT |
| V4.1.1 | L1 | ⚠️ PARTIEL | ⚪ `text/event-stream` et 307 `text/plain` sans charset | MAINTENANT |
| V4.1.2 | L2 | ❌ FAIL | ⚪ Redirection HTTP→HTTPS forcée par Vercel, `/api/mcp` compris (réfuté : NON VÉRIFIÉ → FAIL, sur la documentation Vercel) | DISPARAÎT + À EXIGER |
| V4.1.3 | L2 | ✅ PASS | ⚪ `X-Forwarded-*` réécrits par Vercel (réfuté : PARTIEL → PASS ; origine des liens comptée en V6.4.3, IP en V15.3.4 ; critère de bascule B17) |  |
| V4.2.1 | L2 | ❔ NON VÉRIFIÉ | — Frontières de messages tenues par l'edge Vercel et Node, invérifiables en local | DISPARAÎT + À EXIGER |
| V4.3.1 | L2 | ➖ N/A | ⚪ Pas de GraphQL |  |
| V4.3.2 | L2 | ➖ N/A | ⚪ Pas de GraphQL |  |
| V4.4.1 | L1 | ➖ N/A | ⚪ Aucun WebSocket (MCP en HTTP + SSE) |  |
| V4.4.2 | L2 | ➖ N/A | ⚪ Aucun WebSocket |  |
| V4.4.3 | L2 | ➖ N/A | ⚪ Aucun WebSocket |  |
| V4.4.4 | L2 | ➖ N/A | ⚪ Aucun WebSocket |  |
| V5.1.1 | L2 | ❌ FAIL | ⚪ Pas de documentation des dépôts (seul `rgpd.md:524`) | MAINTENANT (doc) |
| V5.2.1 | L1 | ⚠️ PARTIEL | 🟠 ZIP de contrôle tout en mémoire ; `uploadRapport` lit le corps avant la session | MAINTENANT |
| V5.2.2 | L1 | ❌ FAIL | 🟠 Seul le type déclaré est lu ; `facture.html` et `MZ` acceptés (sonde) | MAINTENANT |
| V5.2.3 | L2 | ❌ FAIL | 🟠 Bombe XLSX : 4,31 Mo → 878 Mo de RSS (sonde) | MAINTENANT |
| V5.3.1 | L1 | ✅ PASS | ⚪ Fichiers hors de `public/`, bucket privé, jamais exécutés |  |
| V5.3.2 | L1 | ✅ PASS | 🟠 Chemins générés, double garde ; M3 |  |
| V5.4.1 | L2 | ✅ PASS | 🟠 Nom d'origine jamais utilisé comme chemin ; `servir.test` |  |
| V5.4.2 | L2 | ✅ PASS | 🟠 `Content-Disposition` RFC 6266/5987 ; `servir.test`, M4 |  |
| V5.4.3 | L2 | ❌ FAIL | ⚪ Aucun antivirus | À EXIGER |
| V6.1.1 | L1 | ❌ FAIL | ⚪ Aucune politique écrite de limitation de débit ni de verrouillage | À EXIGER |
| V6.1.2 | L2 | ❌ FAIL | ⚪ Aucune liste de mots propres au contexte | À EXIGER |
| V6.1.3 | L2 | ❌ FAIL | ⚪ Quatre voies d'authentification jamais décrites ensemble | À EXIGER |
| V6.2.1 | L1 | ⚠️ PARTIEL | 🟠 `min(8)` serveur à l'inscription ; HTML seul à la réinitialisation | DISPARAÎT + À EXIGER |
| V6.2.2 | L1 | ✅ PASS | ⚪ Changement possible par `/auth/reinitialisation` |  |
| V6.2.3 | L1 | ❌ FAIL | ⚪ `updateUser({ password })` sans le mot de passe actuel (`ResetPasswordForm.tsx:71`) | DISPARAÎT + À EXIGER |
| V6.2.4 | L1 | ❔ NON VÉRIFIÉ | — Réglage Supabase « Leaked password protection » non lu | DISPARAÎT + À EXIGER |
| V6.2.5 | L1 | ✅ PASS | 🟠 Aucune règle de composition ; sonde |  |
| V6.2.6 | L1 | ✅ PASS | ⚪ `type="password"` sur les 5 champs |  |
| V6.2.7 | L1 | ✅ PASS | ⚪ Collage et gestionnaires de mots de passe permis |  |
| V6.2.8 | L1 | ✅ PASS | 🟠 Mot de passe transmis sans modification ; sonde |  |
| V6.2.9 | L2 | ✅ PASS | 🟠 128 caractères acceptés ; GoTrue refuse au-delà de 72 octets (réserve) |  |
| V6.2.10 | L2 | ✅ PASS | ⚪ Aucune rotation périodique imposée |  |
| V6.2.11 | L2 | ❌ FAIL | ⚪ Aucune liste de mots de contexte consultée | À EXIGER |
| V6.2.12 | L2 | ❔ NON VÉRIFIÉ | — Même réglage que V6.2.4 | DISPARAÎT + À EXIGER |
| V6.3.1 | L1 | ❌ FAIL | 🟠 30 échecs de suite sans frein (sonde) | DISPARAÎT + À EXIGER |
| V6.3.2 | L1 | ✅ PASS | ⚪ Aucun compte par défaut dans le code |  |
| V6.3.3 | L2 | ❌ FAIL | ⚪ Aucun MFA, aucune justification écrite | À EXIGER |
| V6.3.4 | L2 | ❌ FAIL | ⚪ `/api/mcp` OAuth en ligne malgré l'ADR-013 ; signature en compte connecté sans OTP | MAINTENANT (signature) / DISPARAÎT + À EXIGER (OAuth MCP) |
| V6.4.1 | L1 | ✅ PASS | ⚪ Liens tirés du CSPRNG, expirants |  |
| V6.4.2 | L1 | ✅ PASS | ⚪ Ni indice ni question secrète |  |
| V6.4.3 | L2 | ⚠️ PARTIEL | ⚪ Adresse de retour du lien de réinitialisation tirée du formulaire (`auth/actions.ts:98-100`) | MAINTENANT + À EXIGER |
| V6.4.4 | L2 | ➖ N/A | ⚪ Aucun facteur MFA à perdre |  |
| V6.5.1 | L2 | ✅ PASS | 🟠 Usage unique du lien et de l'OTP ; M5, M6 |  |
| V6.5.2 | L2 | ➖ N/A | ⚪ (réfuté : FAIL → N/A ; l'OTP envoyé par e-mail n'est pas un « lookup secret ») |  |
| V6.5.3 | L2 | ✅ PASS | ⚪ `randomInt` et `randomBytes` (aucun test ne le tient : M8 reste vert) |  |
| V6.5.4 | L2 | ✅ PASS | ⚪ OTP de 6 chiffres aléatoires, lien de 256 bits |  |
| V6.5.5 | L2 | ⚠️ PARTIEL | 🟠 Le lien de 72 h donne seul la consultation de l'acte | MAINTENANT |
| V6.6.1 | L2 | ➖ N/A | ⚪ Ni SMS ni téléphone |  |
| V6.6.2 | L2 | ✅ PASS | ⚪ OTP lié à une ligne `AccessToken`, l'ancien meurt au renvoi |  |
| V6.6.3 | L2 | ⚠️ PARTIEL | 🟠 Le renvoi remet 3 essais, aucun plafond horaire | MAINTENANT |
| V6.8.1 | L2 | ➖ N/A | ⚪ Un seul fournisseur d'identité |  |
| V6.8.2 | L2 | ✅ PASS | 🟠 JWT toujours vérifiés ; P2, sonde `alg: none` |  |
| V6.8.3 | L2 | ➖ N/A | ⚪ Pas de SAML |  |
| V6.8.4 | L2 | ➖ N/A | ⚪ Aucune fonction n'exige un niveau d'authentification |  |
| V7.1.1 | L2 | ❌ FAIL | ⚪ Délai d'inactivité et durée maximale non documentés | À EXIGER |
| V7.1.2 | L2 | ❌ FAIL | ⚪ Sessions simultanées non documentées | À EXIGER |
| V7.1.3 | L2 | ➖ N/A | ⚪ Pas de fédération ni de SSO |  |
| V7.2.1 | L1 | ✅ PASS | 🟠 `getUser()` côté serveur ; P2 |  |
| V7.2.2 | L1 | ❌ FAIL | ⚪ `/api/mcp/[cle]` authentifié par un secret statique | À EXIGER (B5) ; rotation immédiate |
| V7.2.3 | L1 | ✅ PASS | ⚪ Jetons de référence de 256 bits, uniques |  |
| V7.2.4 | L1 | ⚠️ PARTIEL | 🟠 Une reconnexion ne révoque pas l'ancienne session | DISPARAÎT + À EXIGER |
| V7.3.1 | L2 | ❌ FAIL | ⚪ Cookie de 400 jours, aucun délai d'inactivité | DISPARAÎT + À EXIGER |
| V7.3.2 | L2 | ❌ FAIL | ⚪ Aucune durée maximale absolue | DISPARAÎT + À EXIGER |
| V7.4.1 | L1 | ⚠️ PARTIEL | 🟠 Voie MCP OAuth : JWT accepté après déconnexion jusqu'à `exp` | DISPARAÎT + À EXIGER |
| V7.4.2 | L1 | ⚠️ PARTIEL | 🟠 Même mécanisme pour un compte supprimé ou banni | DISPARAÎT + À EXIGER |
| V7.4.3 | L2 | ❌ FAIL | ⚪ Aucune fermeture des autres sessions après changement de mot de passe | DISPARAÎT + À EXIGER |
| V7.4.4 | L2 | ⚠️ PARTIEL | ⚪ Pas de déconnexion sur `/etablissements/nouveau` (`AppHeaderGate.tsx:14`) | MAINTENANT |
| V7.4.5 | L2 | ❔ NON VÉRIFIÉ | — Révocation par un administrateur : procédure Supabase non écrite | DISPARAÎT + À EXIGER |
| V7.5.1 | L2 | ❌ FAIL | ⚪ Changement d'e-mail par l'API Supabase sans réauthentification | DISPARAÎT + À EXIGER |
| V7.5.2 | L2 | ❌ FAIL | ⚪ Aucune liste des sessions actives | DISPARAÎT + À EXIGER |
| V7.6.1 | L2 | ➖ N/A | ⚪ Pas de couple RP/IdP fédéré |  |
| V7.6.2 | L2 | ✅ PASS | ⚪ Une session ne naît que d'un geste de l'utilisateur |  |
| V8.1.1 | L1 | ⚠️ PARTIEL | ⚪ Règles éparses ; ADR-005 § 7 annonce une RLS absente | MAINTENANT (doc) |
| V8.1.2 | L2 | ⚠️ PARTIEL | ⚪ Aucune règle d'écriture par champ | MAINTENANT (doc) |
| V8.2.1 | L1 | ✅ PASS | 🟠 L'anonyme est redirigé avant toute écriture (réfuté : PARTIEL → PASS ; la fuite d'existence relève de V8.2.2) |  |
| V8.2.2 | L1 | ❌ FAIL | 🟠 13 tables sans RLS ouvertes au rôle `anon` → E-1 (compté sous V8.4.1) ; oracle d'existence en réserve faible (réfuté : PARTIEL → FAIL) | MAINTENANT |
| V8.2.3 | L2 | ✅ PASS | 🟠 Projections externes ; M6b et M7 tombent |  |
| V8.3.1 | L1 | ✅ PASS | 🟠 Contrôle hors middleware ; M4 tombe |  |
| V8.4.1 | L2 | ❌ FAIL | 🟠 13 tables sur 31 sans RLS ; `SET ROLE anon` lit et modifie `Entreprise` (réfuté : PASS du groupe Accès → FAIL) | MAINTENANT |
| V9.1.1 | L1 | ✅ PASS | 🟠 Signature d'une autre clé refusée ; sonde JWT |  |
| V9.1.2 | L1 | ✅ PASS | 🟠 RS256 et ES256 seulement ; `alg: none` refusé |  |
| V9.1.3 | L1 | ✅ PASS | 🟠 JWKS à URL fixe ; `jku`/`jwk` tiers ignorés |  |
| V9.2.1 | L1 | ✅ PASS | 🟠 `exp` vérifié (réfuté : PARTIEL → PASS ; Supabase n'émet pas de `nbf`) |  |
| V9.2.2 | L2 | ✅ PASS | 🟠 (réfuté : FAIL → PASS ; un seul type de jeton émis, la destination est l'audience comptée en V10.3.1) |  |
| V9.2.3 | L2 | ❌ FAIL | 🟠 `aud` non vérifié → E-11 (compté sous V10.3.1) | DISPARAÎT + À EXIGER |
| V9.2.4 | L2 | ➖ N/A | ⚪ L'application n'émet aucun jeton autonome |  |
| V10.1.1 | L2 | ❌ FAIL | 🟠 Jetons Supabase en cookie lisible par le JS → E-9 (compté sous V3.3.4) | DISPARAÎT + À EXIGER |
| V10.1.2 | L2 | ➖ N/A | ⚪ Pas de flux client OAuth/OIDC |  |
| V10.2.1 | L2 | ➖ N/A | ⚪ Pas de client OAuth à code d'autorisation |  |
| V10.2.2 | L2 | ➖ N/A | ⚪ Pas de client face à plusieurs serveurs d'autorisation |  |
| V10.3.1 | L2 | ❌ FAIL | 🟠 Serveur de ressources MCP : jeton de toute audience accepté (`acces-oauth.ts:37-40`) | DISPARAÎT + À EXIGER |
| V10.3.2 | L2 | ✅ PASS | ⚪ `sub` décide (réfuté : PARTIEL → PASS ; aucun `scope` dans les jetons de session) |  |
| V10.3.3 | L2 | ✅ PASS | 🟠 `sub` et un seul JWKS de confiance |  |
| V10.3.4 | L2 | ➖ N/A | ⚪ Aucune exigence de force ou de fraîcheur côté MCP |  |
| V10.4.1 | L1 | ➖ N/A | ⚪ L'application n'est pas serveur d'autorisation |  |
| V10.4.2 | L1 | ➖ N/A | ⚪ Idem |  |
| V10.4.3 | L1 | ➖ N/A | ⚪ Idem |  |
| V10.4.4 | L1 | ➖ N/A | ⚪ Idem |  |
| V10.4.5 | L1 | ➖ N/A | ⚪ Idem |  |
| V10.4.6 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.4.7 | L2 | ➖ N/A | ⚪ Idem (DCR jamais activé) |  |
| V10.4.8 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.4.9 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.4.10 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.4.11 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.5.1 | L2 | ➖ N/A | ⚪ Pas de client OIDC |  |
| V10.5.2 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.5.3 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.5.4 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.5.5 | L2 | ➖ N/A | ⚪ Idem (pas de back-channel logout) |  |
| V10.6.1 | L2 | ➖ N/A | ⚪ L'application n'est pas fournisseur OpenID |  |
| V10.6.2 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.7.1 | L2 | ➖ N/A | ⚪ Pas de consentement (pas de serveur d'autorisation) |  |
| V10.7.2 | L2 | ➖ N/A | ⚪ Idem |  |
| V10.7.3 | L2 | ➖ N/A | ⚪ Idem |  |
| V11.1.1 | L2 | ❌ FAIL | ⚪ Aucune politique de gestion des clés | À EXIGER |
| V11.1.2 | L2 | ⚠️ PARTIEL | ⚪ Seul SHA-256 des signatures documenté, pas d'inventaire des clés | À EXIGER |
| V11.2.1 | L2 | ✅ PASS | ⚪ Primitives de `node:crypto` seulement |  |
| V11.2.2 | L2 | ⚠️ PARTIEL | ⚪ L'empreinte stockée ne nomme pas son algorithme | MAINTENANT |
| V11.2.3 | L2 | ✅ PASS | ⚪ SHA-256, jetons de 256 bits, TLS AES-GCM/ECDHE |  |
| V11.3.1 | L1 | ➖ N/A | ⚪ Aucun chiffrement applicatif |  |
| V11.3.2 | L1 | ➖ N/A | ⚪ Idem |  |
| V11.3.3 | L2 | ➖ N/A | ⚪ Idem |  |
| V11.4.1 | L1 | ✅ PASS | 🟠 SHA-256 seul ; mutation `md5` : 4 tests tombent |  |
| V11.4.2 | L2 | ✅ PASS | ⚪ bcrypt de Supabase Auth, coût 10 (réfuté : NON VÉRIFIÉ → PASS, sur la documentation du fournisseur) |  |
| V11.4.3 | L2 | ✅ PASS | 🟠 Empreinte SHA-256 en JSON canonique ; mutation `md5` |  |
| V11.4.4 | L2 | ➖ N/A | ⚪ Aucune clé dérivée d'un mot de passe |  |
| V11.5.1 | L2 | ⚠️ PARTIEL | 🟠 `sig_<uuid>` sert de capacité ; entropie de `MCP_CLE` non contrôlée | MAINTENANT |
| V11.6.1 | L2 | ➖ N/A | ⚪ Ni génération de clé ni signature asymétrique |  |
| V12.1.1 | L1 | ✅ PASS | 🔴 TLS 1.0 et 1.1 refusés, 1.2 et 1.3 négociés |  |
| V12.1.2 | L2 | ✅ PASS | 🔴 CBC, 3DES et suites sans forward secrecy refusés |  |
| V12.1.3 | L2 | ➖ N/A | ⚪ Pas de mTLS |  |
| V12.2.1 | L1 | ✅ PASS | 🔴 HTTP → 308 → HTTPS, HSTS |  |
| V12.2.2 | L1 | ✅ PASS | 🔴 Chaîne Google Trust Services valide |  |
| V12.3.1 | L2 | ❌ FAIL | 🟠 Prisma en `sslmode=prefer` : repli en clair (sonde) | À EXIGER |
| V12.3.2 | L2 | ❌ FAIL | 🟠 Certificat de la base non validé sans `sslaccept=strict` (sonde) | À EXIGER |
| V12.3.3 | L2 | ➖ N/A | ⚪ Pas de service HTTP interne |  |
| V12.3.4 | L2 | ➖ N/A | ⚪ Idem |  |
| V13.1.1 | L2 | ⚠️ PARTIEL | ⚪ Fournisseurs nommés, flux non inventoriés | À EXIGER |
| V13.2.1 | L2 | ❌ FAIL | ⚪ Mot de passe statique du rôle `postgres`, clé `service_role` statique | À EXIGER |
| V13.2.2 | L2 | ❌ FAIL | ⚪ Un seul rôle `postgres` pour l'exécution et les migrations ; aggrave E-1 | À EXIGER |
| V13.2.3 | L2 | ❔ NON VÉRIFIÉ | ⚪ Identifiants de prod illisibles par cadrage | À EXIGER |
| V13.2.4 | L2 | ⚠️ PARTIEL | ⚪ Destinations figées, liste blanche jamais déclarée ni testée | À EXIGER |
| V13.2.5 | L2 | ❌ FAIL | ⚪ Aucun contrôle de sortie réseau (Vercel Hobby) | DISPARAÎT + À EXIGER |
| V13.3.1 | L2 | ⚠️ PARTIEL | 🟠⚪ Secrets en variables Vercel, sans coffre ni rotation | À EXIGER |
| V13.3.2 | L2 | ✅ PASS | 🟠⚪ `service_role` en modules `server-only` ; `serveur-seul.test` |  |
| V13.4.1 | L1 | ✅ PASS | 🔴 `/.git/config` non servi |  |
| V13.4.2 | L2 | ✅ PASS | 🔴🟠 Pas de route de dev ni de sourcemap en prod |  |
| V13.4.3 | L2 | ✅ PASS | 🔴 Aucun listing de répertoire |  |
| V13.4.4 | L2 | ❔ NON VÉRIFIÉ | — TRACE non sondé (GET seulement) | DISPARAÎT + À EXIGER |
| V13.4.5 | L2 | ✅ PASS | 🔴⚪ Seules métadonnées : RFC 9728, publiques par nature |  |
| V14.1.1 | L2 | ⚠️ PARTIEL | ⚪ Inventaire RGPD sans niveaux ni IP, user-agent, jetons, noms de fichiers | MAINTENANT (doc) |
| V14.1.2 | L2 | ❌ FAIL | ⚪ Aucune exigence de protection par niveau | MAINTENANT (doc) |
| V14.2.1 | L1 | ❌ FAIL | ⚪ `MCP_CLE` dans le chemin ; `/acces/<jeton>` porteur réutilisable 72 h (part `sig_<uuid>` retirée par la réfutation) | MAINTENANT (`/acces`) / À EXIGER (`MCP_CLE`, B5) |
| V14.2.2 | L2 | ✅ PASS | ⚪ Aucun cache serveur de données personnelles |  |
| V14.2.3 | L2 | ✅ PASS | 🟠 Aucun traceur ; `frontiere-medicale.test` vert |  |
| V14.2.4 | L2 | ❌ FAIL | 🟠 RLS annoncée et absente ; IP jamais masquée en /24 ; journaux de 30 jours non vérifiés | MAINTENANT |
| V14.3.1 | L1 | ⚠️ PARTIEL | ⚪ Pas de `Clear-Site-Data` à la déconnexion | À EXIGER |
| V14.3.2 | L2 | ⚠️ PARTIEL | 🟠 PDF de version de DUERP en `private, max-age=60` | MAINTENANT |
| V14.3.3 | L2 | ✅ PASS | ⚪ `localStorage` limité aux préférences d'affichage |  |
| V15.1.1 | L1 | ❌ FAIL | ⚪ Aucun délai de remédiation écrit ; Dependabot absent de `main` | MAINTENANT |
| V15.1.2 | L2 | ⚠️ PARTIEL | ⚪ Pas de SBOM ; `xlsx` installé depuis une URL, non suivi | MAINTENANT |
| V15.1.3 | L2 | ❌ FAIL | ⚪ Fonctions coûteuses non documentées | MAINTENANT (doc) |
| V15.2.1 | L1 | ❌ FAIL | 🟠 `next` 16.3.5 : 7 avis ; `pnpm audit --prod` : 84 avis | MAINTENANT |
| V15.2.2 | L2 | ⚠️ PARTIEL | ⚪ Entièrement doublon (E-5, E-3, V5.2.1) | MAINTENANT |
| V15.2.3 | L2 | ⚠️ PARTIEL | 🔴🟠⚪ CLI `shadcn` en dépendance de prod, SVG d'exemple | MAINTENANT |
| V15.3.1 | L1 | ✅ PASS | ⚪ Projection `SELECT_PREUVE` sur la page publique |  |
| V15.3.2 | L2 | ✅ PASS | ⚪ Aucun appel sortant vers une URL fournie |  |
| V15.3.3 | L2 | ✅ PASS | ⚪ `Object.fromEntries(formData)` toujours passé par zod (strip) |  |
| V15.3.4 | L2 | ✅ PASS | ⚪ `X-Forwarded-For[0]` juste sur Vercel (réfuté : PARTIEL → PASS ; E-13 devient le critère B17) |  |
| V15.3.5 | L2 | ✅ PASS | ⚪ TS `strict`, pas de comparaison lâche |  |
| V15.3.6 | L2 | ✅ PASS | ⚪ Ni merge profond ni `__proto__` sur entrée |  |
| V15.3.7 | L2 | ✅ PASS | ⚪ Sources de paramètres séparées, première valeur retenue |  |
| V16.1.1 | L2 | ❌ FAIL | ⚪ Aucun inventaire des journaux (`rgpd.md` § 8, deux phrases) | À EXIGER |
| V16.2.1 | L2 | ⚠️ PARTIEL | ⚪ Aucun « qui » dans les 33 `console.*` | MAINTENANT |
| V16.2.2 | L2 | ✅ PASS | ⚪ Horodatage UTC de la plateforme |  |
| V16.2.3 | L2 | ⚠️ PARTIEL | ⚪ Destination unique et nommée, inventaire absent (réfuté : FAIL → PARTIEL) | À EXIGER |
| V16.2.4 | L2 | ⚠️ PARTIEL | ⚪ Texte libre aux préfixes hétérogènes | MAINTENANT |
| V16.2.5 | L2 | ❌ FAIL | ⚪ Clés de stockage nominatives et erreurs Prisma journalisées | MAINTENANT |
| V16.3.1 | L2 | ❌ FAIL | ⚪ Aucune opération d'authentification journalisée par l'application | MAINTENANT |
| V16.3.2 | L2 | ❌ FAIL | ⚪ Refus d'autorisation sans journal (`scope.ts:21,36,52`) | MAINTENANT |
| V16.3.3 | L2 | ❌ FAIL | ⚪ Aucun événement de sécurité journalisé | MAINTENANT |
| V16.3.4 | L2 | ✅ PASS | ⚪ Exceptions non capturées journalisées par Next |  |
| V16.4.1 | L2 | ⚠️ PARTIEL | ⚪ Aucun encodage avant journal | MAINTENANT |
| V16.4.2 | L2 | ✅ PASS | ⚪ Journaux en sortie standard, non modifiables par l'application |  |
| V16.4.3 | L2 | ❌ FAIL | ⚪ Pas de drain ni de système séparé | À EXIGER |
| V16.5.1 | L2 | ✅ PASS | ⚪ Erreurs serveur masquées en prod |  |
| V16.5.2 | L2 | ✅ PASS | ⚪ Dégradation explicite des services externes |  |
| V16.5.3 | L2 | ✅ PASS | ⚪ Fermé par défaut |  |
| V17.1.1 | L2 | ➖ N/A | ⚪🔴 Aucun WebRTC (grep vide, `permissions-policy: camera=(), microphone=()`) |  |
| V17.2.1 | L2 | ➖ N/A | ⚪ Pas de DTLS ni de serveur média |  |
| V17.2.2 | L2 | ➖ N/A | ⚪ Idem |  |
| V17.2.3 | L2 | ➖ N/A | ⚪ Idem |  |
| V17.2.4 | L2 | ➖ N/A | ⚪ Idem |  |
| V17.3.1 | L2 | ➖ N/A | ⚪ Pas de serveur de signalisation |  |
| V17.3.2 | L2 | ➖ N/A | ⚪ Idem |  |

## Faux positifs écartés (réfutation)

La réfutation a écarté ou requalifié douze verdicts des grilles. Chacun a été relu contre le texte officiel de l'exigence.

1. **V6.5.2**, FAIL → N/A. L'exigence vise les « lookup secrets », c'est-à-dire des listes de codes pré-générés. L'OTP envoyé par e-mail est un code hors bande, régi par V6.5.4 à V6.6.3, et l'application n'a aucun lookup secret. Le stockage de l'OTP en SHA-256 nu reste à durcir hors grille, par un HMAC avec un secret serveur, sur ses 10 minutes de validité.
2. **V9.2.1**, PARTIEL → PASS. Le texte dit « *if* a validity time span is present in the token data ». Supabase n'émet pas de `nbf`, et un attaquant ne peut pas en introduire un sans la clé. La sonde avait forgé un jeton qui n'existe pas en production. `exp` est vérifié.
3. **V9.2.2**, FAIL → PASS. Le texte donne le type de jeton pour exemple : un jeton d'accès contre un ID token. Supabase n'émet aujourd'hui qu'un type de jeton signé, le jeton d'accès. « Destiné à ce service », c'est l'audience, comptée en V9.2.3 et V10.3.1.
4. **V10.3.2**, PARTIEL → PASS. Les jetons de session Supabase ne portent pas de revendication `scope`, et `sub` décide. Les `scopes_supported` des métadonnées ne sont pas des revendications du jeton.
5. **V3.2.1**, PARTIEL → PASS. Même sans la sandbox, la liste blanche de 4 types, `attachment` pour tout autre type et `nosniff` suffisent. Un HTML déclaré PDF sort en `application/pdf` avec `nosniff` et n'est pas interprété. Reste une preuve fausse à corriger.
6. **V4.1.3** et **V15.3.4**, PARTIEL → PASS. Sur Vercel, `X-Forwarded-For` et `X-Forwarded-Host` sont réécrits par la plateforme, et l'utilisateur ne peut pas les surcharger. L'origine des liens d'e-mail passe par un champ de formulaire, et elle est comptée en V6.4.3. L'écart devient un critère de recette (B17).
7. **V8.2.1**, PARTIEL → PASS. Pour un anonyme, aucune des 14 fonctions ne s'exécute : `requireUser` redirige avant toute écriture. Ce qui fuit, c'est l'existence d'un identifiant, qui relève de V8.2.2.
8. **V16.2.3**, FAIL → PARTIEL. L'application n'écrit que sur la sortie standard, vers la seule destination nommée. C'est l'inventaire qui manque, et il est déjà compté en V16.1.1.
9. **V14.2.1**, part `sig_<uuid>`, retirée du constat. C'est un lien public de vérification, fait pour être partagé, et non un secret au sens de l'exigence. Le FAIL tient sur `MCP_CLE` et `/acces/<jeton>`, et la faiblesse de l'UUID reste comptée en V11.5.1.
10. **V15.2.1**, les deux avis « critiques ». `next/og` est absent du code, et `express` est absent de l'exécution. Le verdict reste FAIL, mais la gravité est revue à la baisse.
11. **V11.4.2**, NON VÉRIFIÉ → PASS, sur la documentation du fournisseur : bcrypt, coût 10.
12. **V4.1.2**, NON VÉRIFIÉ → FAIL, sur la documentation de Vercel, qui redirige tout HTTP sur tous les chemins. Ce n'est pas un faux positif mais un faux « inconnu ».

La réfutation a aussi résolu trois doublons de grille, c'est-à-dire des identifiants notés par deux groupes. V3.5.4 et V3.5.5 avaient le même verdict des deux côtés. V8.4.1 avait deux verdicts contraires : PASS au groupe Accès, qui jugeait la couche applicative, et FAIL conditionnel au groupe Crypto et données, qui jugeait la RLS. Le FAIL l'emporte, parce que l'exigence porte sur le contrôle inter-tenant, quelle que soit la couche.

## Garde-fous de test manquants

Une mutation qui laisse les tests verts prouve que le contrôle n'est pas gardé, même quand le code est sain. Les cas ci-dessous ne changent aucun verdict, mais chacun peut régresser sans qu'aucun test ne le voie. Chaque test proposé doit être éprouvé en retirant le contrôle qu'il garde.

**Groupe Accès.**

- **M2.** On retire le `userId` du `where` de `getEtablissement`. `tenancy-lectures` reste vert, de même que 17 fichiers et 183 tests de `src/lib/etablissements`, `src/lib/auth` et `src/lib/rgpd`. En cause : `tenancy-lectures.test.ts` n'examine que les fonctions de `*/queries.ts` dont le corps contient `etablissementId`, et 103 lectures exportées échappent aux deux sondes de portée.
- **M3.** Une lecture non bornée et sans session dans l'action `lignesEtatsPermanentsPourWidget` laisse 9 fichiers et 122 tests verts. Les actions qui ne font que lire ne sont tenues par aucune sonde.
- **M5.** On retire `requireEtablissement` de la route d'export RGPD d'un salarié : 21 fichiers et 230 tests restent verts. On le retire du ZIP de contrôle : 8 fichiers et 40 tests restent verts.
- **M8.** On retire la borne `etablissementId` de `modifierSalarie` : les 19 tests restent verts.
- **M9.** On retire les bornes des identifiants enfants. `prescriptions` reste vert (46 tests), `access-tokens` aussi (21), et `salaries` aussi (174). Seuls `prestataires` et `carnet-sanitaire` tombent.
- **Test à écrire :** étendre la sonde de `tenancy-sonde.ts` aux actions qui lisent, aux routes et à toutes les lectures exportées, plutôt que d'ajouter une liste écrite à la main. C'est aussi le critère B15 : après la bascule, sans RLS, c'est la seule garde.

**Réfutation, R1.** On retire le prédicat `entreprise: { userId: user.id }` de `requireEtablissement` et d'`assertEtablissementOwnership` (`src/lib/auth/scope.ts:32,166`). Les 12 fichiers de `src/lib/auth`, `src/lib/carnet-sanitaire` et `src/lib/permis-feu` restent verts (108 tests), y compris les tests de tenancy dédiés. Seule la suite complète tombe : `calendrier/actions.test.ts` (3 échecs) et `salaries/suppression.test.ts` (7). **Test à écrire :** un test direct de `scope.ts`, qui appelle chaque helper avec l'identifiant d'un autre compte et attend `notFound()`.

**Temps constant et CSPRNG (groupes Identité et Crypto).**

- On passe la comparaison `timingSafeEqual` de `verifyOtp` (`otp.ts:48`) à `===` : 121 tests sur 121 restent verts.
- On passe `clesEgales` (`acces-http.ts:90`) à `===` : 152 tests sur 152 restent verts.
- On passe `randomInt` (`otp.ts:33`) à `Math.random` : 51 tests sur 51 restent verts.
- On passe `generateToken` et `generateOtp` à `Math.random`, et `verifyOtp` à `===` : les 97 tests de `access-tokens/` et `signatures/` restent verts.
- **Test à écrire :** un test qui exige que ces fonctions passent par `node:crypto` (`timingSafeEqual`, `randomInt`, `randomBytes`), par espion sur le module ou par analyse du source, et qu'il échoue sur chacune des quatre mutations.

**Jeton d'accès.** Retirer le contrôle d'expiration du lien (M2, `verify.ts:29`) ou le contrôle `utiliseLe` de `verifierAccessToken` (M3, `verify.ts:33`) laisse les tests du dépôt verts. Seule la sonde `sonde-asvs-jeton` tombe. **Test à écrire :** recopier cette sonde sous `src/`.

**Groupe Entrées, M8 (test IGH).** On retire le refus « ERP en IGH » et le refus « fin avant début » du permis de feu : la suite existante (`etablissements/schema.test`, `permis-feu/schema.test`) ne tombe pas. La fixture de l'IGH échoue pour une autre raison, et il n'existe aucun test « fin avant début ». Seule la sonde `combinaisons.test` tombe (2 échecs). **Test à écrire :** recopier `combinaisons.test` sous `src/`, avec une fixture dont l'IGH est la seule cause de refus.

**Autres gardes absentes.**

- `servir.test` lit l'objet `Response` et non la réponse du serveur. Il n'a donc pas vu la CSP `sandbox` écrasée (B18).
- Le `no-store` des PDF, du ZIP de contrôle et de l'export RGPD n'est tenu par aucun test (écart 32).
- Le test RLS de `lot/securite-owasp-1013` ne tient pas le bloc `REVOKE` (écart 1).
- Le CSPRNG de l'OTP n'est tenu par rien (V6.5.3 reste PASS par lecture).

## Constats hors ASVS

La checklist pratique est traitée dans l'audit du 13/10 (`docs/revues/audit-owasp-2026-10-13.md`), auquel ce rapport renvoie sans le recopier :

- **S4** : le dépôt est public, `main` n'est pas protégée et aucun ruleset n'existe. Les alertes Dependabot sont désactivées, et il n'y a pas de code scanning. Le secret scanning et la push protection sont actifs. Le fichier Dependabot est corrigé sur `lot/securite-owasp-1013` ; le reste dépend de gestes de la propriétaire sur GitHub.
- **R1** : mentions légales et politique de confidentialité (LCEN art. 6, RGPD art. 13).
- **R2** : procédure de violation de données, avec la notification à la CNIL sous 72 h (RGPD art. 33).
- **R3** : journal d'audit (écart 18). **R4** : DPA des sous-traitants. **R5** : la CI ne lance ni `tsc`, ni `eslint`, ni `next build`, et n'a ni SAST ni SCA. **R7** : e-mail du signataire affiché sur `/verifier` et `/signe`.

Les groupes ont aussi relevé, en passant, des points hors grille ou de niveau L3 :

- `x-powered-by: Next.js` est présent en production (🔴), et corrigé sur `lot/audit-1013-robustesse` (51ea76f8).
- `/robots.txt` répond par un 307 vers `/login`, parce que le matcher du middleware n'exclut pas `.txt`. C'est sans risque.
- `Cross-Origin-Opener-Policy`, CORP et COEP sont absents. ASVS L2 ne les exige pas, mais `Cross-Origin-Opener-Policy: same-origin` est conseillé.
- Le matcher du middleware exclut tout chemin finissant par une extension d'image, `/api` compris, et `favicon.ico` n'y est pas échappé. Il n'y a pas de conséquence d'autorisation, puisque chaque cible se garde elle-même, mais ces chemins échappent au rafraîchissement de session.
- `/.well-known/security.txt` répond 404. Les `README.md` de `public/illustrations` et `public/photos` sont déployés.
- L'inscription renvoie tel quel le message d'erreur de Supabase (`auth/actions.ts:71`, S12). Il disparaît avec la bascule.
- Concurrence (V15.4, niveau L3) : `SELECT … FOR UPDATE` est présent dans `rapports/actions.ts:218,359`, `calendrier/recalcul-ligne.ts:101` et `signatures/verrou-contenu.ts:55,57`, et le jeton se consomme sous condition.

## Critères de recette de la bascule Better Auth / Clever Cloud

Les critères B1 à B16 de l'audit du 13/10 restent valables. Voici les exigences ASVS que chacun doit tenir :

- **B1** (cookies) : V3.3.1, V3.3.3, V3.3.4, V10.1.1, V7.3.1, V7.3.2.
- **B2** (origine) : V6.4.3 et V3.7.2. À ajouter : la liste des URL de retour, ou `trustedOrigins`, est exacte et sans joker.
- **B3** (limitation de débit) : V6.3.1, V2.4.1 et le plafond de renvois d'OTP de V6.6.3.
- **B4** (mots de passe et sessions) : V6.2.1 et V7.4.3, complété par B21, B22 et B27.
- **B5** (MCP) : V7.2.2, V14.2.1, V6.3.4 (point 1), V10.3.1 et V9.2.3, complété par B23.
- **B6** (base) : V13.2.2, renforcé par B19 sur le TLS.
- **B7** (migrations hors du build) : V13.2.2, V15.2.3.
- **B8** (en-têtes) : V3.4.3, V3.4.1.
- **B9** (stockage) : V13.2.1.
- **B10** (journaux) : V16.4.3, complété par B25.
- **B11** (taille des dépôts) : V5.1.1.
- **B12** (exécution) : V5.2.1 et le ZIP de contrôle en mémoire. La bombe XLSX (écart 3) doit être close avant la bascule : chez Clever Cloud, elle fait tomber l'application entière.
- **B14** (comptes et limites publiques) : V2.4.1, V11.4.2 (import des hachés bcrypt ou réinitialisation forcée).
- **B15** (isolation sans RLS) : V8.4.1 après la bascule. Les mutations R1, M2, M3 et M5 montrent que les gardes actuelles ne suffisent pas.

Nouveaux critères, issus de cette vérification :

- **B17 — IP du client derrière le proxy de confiance** (V15.3.4, V4.1.3, E-13). Un seul helper lit l'IP, en prenant l'entrée ajoutée par le dernier proxy de confiance de Clever Cloud, jamais `X-Forwarded-For[0]`, que le client écrit lui-même derrière un proxy qui ajoute. Il sert à la preuve de signature (`signatures/actions.ts:337,554`) et à la limitation de débit (B3). Test : une requête qui forge `X-Forwarded-For` n'inscrit pas l'adresse forgée.
- **B18 — CSP des fichiers servis sous `next start`** (V3.2.1, V1.3.4). Sous `next start`, la CSP `frame-ancestors 'none'` de `next.config.ts` écrase la CSP `sandbox` de la route. Il faut poser les deux directives ensemble sur les routes de fichiers. Test : sur la réponse réelle du serveur, et non sur l'objet `Response`, un fichier servi porte `sandbox` et `frame-ancestors 'none'`.
- **B19 — TLS de la base vérifié** (V12.3.1, V12.3.2). `sslmode=verify-full`, ou `require` avec `sslaccept=strict`. `require` seul, que demande le B6, accepte un certificat auto-signé. Test : la connexion échoue contre un certificat non reconnu.
- **B20 — Sessions bornées** (V7.1.1, V7.1.2, V7.2.4, V7.3.1, V7.3.2, V7.4.5, V7.5.2). Un délai d'inactivité et une durée maximale absolue, écrits et appliqués. Une politique de sessions simultanées. Une nouvelle connexion révoque l'ancienne session. Le titulaire peut lister ses sessions et en fermer une, et un administrateur peut révoquer toutes celles d'un compte.
- **B21 — Réauthentification avant les changements sensibles** (V6.2.3, V7.5.1, V7.4.3). `changePassword` exige `currentPassword` et propose `revokeOtherSessions`, et un changement d'e-mail exige une réauthentification.
- **B22 — MFA** (V6.3.3) : le plugin `twoFactor`, ou une justification écrite. Une fois le MFA en place, V6.4.4 devient applicable : il faudra une procédure de perte de facteur.
- **B23 — Jetons MCP** (V10.3.1, V9.2.3, V10.3.2, V10.3.3, V9.2.1, V7.4.1, V7.4.2, V6.3.4). La vérification porte sur :
  - `aud` = URL de la ressource MCP ;
  - `iss`, comparé à l'émetteur attendu ;
  - `scope`, lu dès que les jetons de Better Auth le porteront ;
  - `nbf`, vérifié ;
  - le jeton de session du navigateur, refusé comme jeton d'accès ;
  - les jetons, de durée courte ou révocables, pour qu'une déconnexion ou une suppression de compte prenne effet.
- **B24 — Cache et images en auto-hébergement** (S2 de l'audit, V14.2.2). `next` au moins en 16.3.8, puisque les avis de cache poisoning « self-hosted » et l'optimisation d'images (`sharp`, librsvg) concerneront le serveur. Pas de `remotePatterns`. Sous `next start`, revérifier qu'aucune réponse personnelle n'est mise en cache.
- **B25 — Journal de sécurité** (V16.1.1, V16.2.3, V16.3.1 à V16.3.3). Les événements d'authentification de Better Auth et ceux de l'application (jetons, OTP, refus de portée) arrivent au drain de B10, avec un inventaire écrit.
- **B26 — Pas de redirection forcée sur `/api/mcp*`** (V4.1.2). Une requête en clair est refusée, et non redirigée.
- **B27 — Mots de passe** (V6.2.1, V6.2.4, V6.2.12, V6.1.2, V6.2.11, V11.4.2).
  - La longueur minimale est vérifiée côté serveur à toutes les étapes, réinitialisation comprise. L'ASVS demande au moins 8 caractères, B4 en retient 12.
  - Les mots de passe divulgués sont refusés.
  - La liste des mots de contexte est consultée.
  - Les paramètres de scrypt de Better Auth sont relevés et écrits.
- **B28 — Réseau et plateforme** (V13.2.5, V13.4.4, V13.2.3, V4.2.1, V13.1.1, V13.2.4, V2.4.1).
  - Un contrôle de sortie réseau est en place.
  - TRACE est refusé.
  - Aucun identifiant par défaut ne subsiste.
  - Le reverse proxy fixe les frontières des messages HTTP.
  - Une limite de débit ou un WAF est posé en amont, puisque Clever Cloud n'en a pas par défaut.
  - L'inventaire des flux, avec sa liste blanche de destinations, est écrit.
- **B29 — Antivirus** (V5.4.3) : les pièces sont analysées au dépôt, ou la décision de ne pas le faire est écrite.
- **B30 — `Clear-Site-Data` à la déconnexion** (V14.3.1).
- **B31 — Clés et secrets** (V11.1.1, V11.1.2, V13.3.1, V13.2.1). L'inventaire des clés est refait pour la nouvelle pile, avec une procédure de rotation et de destruction, des comptes de service individuels et, si l'offre le permet, un coffre.

## Ordre de correction recommandé

1. **Gestes de la propriétaire, sans code.**
   - Au tableau de bord Supabase : ramener « Redirect URLs » à une liste exacte, sans joker, ce qui ferme la condition de l'écart 2 ; lire le Security Advisor, les schémas exposés et les GRANT de `anon` (écart 1) ; vérifier « Secure password change » et « Secure email change » (écart 11).
   - Tourner `MCP_CLE` (écart 6).
   - Lancer, en lecture seule, la requête de l'audit sur les propriétaires des 31 tables, préalable à la migration RLS.
2. **Fusionner ce qui est prêt, après revue indépendante.**
   - `lot/securite-owasp-1013` : RLS, next 16.3.8, `shadcn` en devDependencies, Dependabot, borne d'import XLSX, session avant fichier dans `uploadRapport`.
   - `lot/audit-1013-auth` : redirection `next`, origine des liens d'e-mail, liste blanche par segment.
   - `lot/audit-1013-robustesse` : pages d'erreur, `poweredByHeader`, permis de feu.
   - `lot/audit-1013-perimetre` : oracle d'existence.

   Un conflit est attendu sur `uploadRapport` : il faut garder un seul `requireUser()` en tête. Ces quatre branches ferment, en tout ou en partie, les écarts 1 à 4, 15, 17, 34 et 38.
3. **Écarts MAINTENANT de gravité moyenne, non couverts par les branches.**
   - La borne de taille décompressée de l'import XLSX (écart 3), à fermer avant la bascule.
   - La limitation de débit des fonctions publiques et les quotas (écart 5).
   - Les octets magiques des dépôts (écart 16).
   - Le masquage des IP en /24, qui est réglementaire (écart 14).
   - La CSP à nonce (écart 8).
   - L'OTP de la signature connectée, ou l'amendement de l'ADR-006 (écart 13).
   - Le plafond d'OTP (écart 21).
   - Le jeton `/acces` (écart 7).
   - Le journal de sécurité (écart 18).
   - Le ZIP de contrôle en flux (écart 17).
4. **Écarts MAINTENANT de faible gravité** : écarts 23 (`__Host-etablissement-actif`), 24, 26 à 32, et le masquage des clés de stockage dans les journaux (écart 18).
5. **Gardes de test** (section précédente), en même temps que chaque correction. Chaque nouveau test est éprouvé en retirant le contrôle qu'il garde.
6. **Exigences documentaires**, une fois les propositions validées par la propriétaire. Les décisions écrites qui contredisent le code se corrigent en même temps.
7. **Bascule** : la recette vérifie B1 à B31. Les écarts DISPARAÎT ne sont clos qu'une fois leur critère vérifié sur la nouvelle pile.

## Corrections en cours

À compléter.
