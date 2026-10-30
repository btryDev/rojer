# Plan — isolation des comptes par un client Prisma borné au compte

Branche `lot/isolation-rls` (le nom date du premier brief ; la voie retenue le
2026-10-30 n'est plus la RLS). Décision à prendre : ADR-051, **proposée**.
Écrit le 2026-10-30 sur `main` 9bdbb47d. **Aucun code n'est écrit : ce plan
attend le feu vert de la propriétaire.**

## 1. Ce qui existe

- L'app se connecte en propriétaire de la base ; la RLS est activée sans
  politique (`migrations-rls.test.ts`) : elle bloque un rôle lecteur, pas l'app.
- L'isolation est dans le code : `requireUser` (`auth/require-user.ts`, seule
  lecture de l'identité), les helpers de `auth/scope.ts` (prédicat
  `entreprise: { userId }` dans la requête, 404 sinon), `requireProprietaireSql`
  pour le SQL brut, et six gardes qui **relisent le code** (`tenancy-lectures`,
  `-ecritures`, `-enfants`, `-oracle`, `-routes`, `-sonde`).
- Ce que ces gardes ne garantissent pas : qu'une requête écrite correctement
  *en apparence* porte le bon prédicat sur la bonne table, ni qu'une
  écriture ne rattache pas une ligne à un parent d'un autre compte (clé
  étrangère croisée).
- Mesuré en appelant `git grep` le 2026-10-30, hors tests : **91** fichiers
  importent `@/lib/prisma`, environ **400** appels de modèle (102 `findFirst`,
  75 `findMany`, 38 `findUnique`, 37 `updateMany`, 36 `update`, 35 `count`,
  30 `create`, 18 `delete`, 9 `deleteMany`, 8 `createMany`, 4 `upsert`,
  2 `groupBy`, 1 `aggregate`, 1 `findUniqueOrThrow`), **103** appels de
  `requireUser()`. Les appels écrits sur plusieurs lignes ne sont pas comptés :
  c'est une borne basse.
- Vérifié dans les types générés (Prisma 6.19.3) : `WhereUniqueInput` accepte
  `AND` et les filtres de relation (`unite`, `entreprise`…). `findUnique`,
  `update`, `delete`, `upsert` et `connect` peuvent donc recevoir la borne au
  compte sans changer d'opération.

## 2. Inventaire des 34 modèles et de leur chemin vers `Entreprise.userId`

Relevé sur `prisma/schema.prisma` (relations `@relation(fields: …)`).

| Profondeur | Modèles | Chemin |
|---|---|---|
| racine | `Entreprise` | `userId` (colonne **nullable** : une entreprise sans compte n'est visible de personne) |
| 1 | `Etablissement` | `entreprise.userId` |
| 1 (direct) | `DemandeAssistance` | `userId` direct (`String`, pas `Uuid` — point 0.10 du plan de bascule) ; `etablissementId` facultatif |
| 2 — par `etablissement` (18) | `Duerp`, `Batiment`, `Equipement`, `Verification`, `PrescriptionParticuliere`, `RapportVerification`, `Action`, `Prestataire`, `Signature`, `AccessToken`, `RegistreAccessibilite`, `PermisFeu`, `PlanPrevention`, `CarnetSanitaire`, `FicheRegistre`, `Salarie`, `DeclarationEtatPermanent`, `Intervention` (morte, ADR-018) | `etablissement.entreprise.userId` |
| 3 (9) | `DuerpVersion`, `UniteTravail` (par `duerp`) ; `PiecePrestataire` (par `prestataire`) ; `LignePlanPrevention`, `PhaseDangereuse` (par `plan`) ; `PointReleve`, `AnalyseLegionelle` (par `carnet`) ; `TitreSalarie` (par `salarie`) ; `CommentaireIntervention` (morte) | parent → `etablissement.entreprise.userId` |
| 4 (2) | `Risque` (`unite.duerp`), `ReleveTemperature` (`pointReleve.carnet`) | idem |
| hors compte (2) | `QuotaEnvoiOtp`, `LimiteDebit` | aucune : compteurs techniques, refusés par le client borné |

1 + 1 + 1 + 18 + 9 + 2 + 2 = 34.

**Clés étrangères secondaires vers une ligne d'un compte** (là où une
écriture peut croiser deux comptes même si sa clé principale est juste) :
`Equipement.batimentId` ; `Verification.equipementId`, `salarieId`,
`prescriptionId`, `prestataireId` ; `PrescriptionParticuliere.equipementId` ;
`RapportVerification.verificationId` ; `Action.risqueId`, `verificationId`,
`rapportOrigineId`, `equipementId` ; `AccessToken.prestataireId` ;
`PermisFeu.prestataireId`, `batimentId` ; `PlanPrevention.prestataireId`,
`batimentId` ; `PointReleve.batimentId` ; `Intervention.risqueId`.

**Identifiants sans clé étrangère** (l'extension ne peut pas les suivre) :
`Signature.objetId` et `AccessToken.objetId` (polymorphes, `objetType`),
`Action.leveeRapportId`. Déjà vérifiés par du code nommé
(`signatures/appartenance.ts`…) : ils restent listés et vérifiés à la main.

## 3. Les accès sans utilisateur connecté

| Accès | Fichiers | Ce qu'il lit ou écrit | Portée proposée |
|---|---|---|---|
| Registre public d'accessibilité par slug | `app/accessibilite`, `lib/accessibilite/queries.ts`, `api/accessibilite/[slug]/affiche` | le registre publié et l'identité de l'établissement | une fonction nommée, client hors compte, lecture seule |
| Vérification de signature `/verifier/[id]` | `signatures/verification-publique.ts` | une `Signature` par id | idem |
| Prestataire par jeton + OTP | `access-tokens/verify.ts`, `signatures/actions.ts` (`poserSignatureAvecToken`, `renvoyerCodeOtp`), `contenu-a-signer`, `etat-signable`, `hash-objet`, `trace`, `verrou-contenu`, `statut-objet`, `libelle-document`, `appartenance` | le jeton par son empreinte, puis l'objet à signer de **son** établissement | jeton lu hors compte (une fonction), puis **client borné à l'établissement du jeton** |
| MCP par clé `/api/mcp/[cle]` et stdio | `mcp/acces-http.ts`, `mcp/db.ts`, `mcp/prisma.ts`, `mcp/queries.ts` | la clé désigne un `etablissementId` (configuration) | client borné à cet établissement |
| MCP OAuth `/api/mcp` | `mcp/acces-oauth*.ts` | jeton → `userId` → établissement | client borné au compte |
| Limitation de débit, quotas d'OTP | `securite/limite-debit.ts`, `verify.ts` | `LimiteDebit`, `QuotaEnvoiOtp` | client hors compte, ces deux modèles seulement |
| Scripts, graines, reprises | `prisma/seed.ts`, `scripts/*.ts` (seed-demo, seed-salaries-demo, seed-dossier-complet, regenerer-calendriers, reprise-ria, passage-a-blanc-echeances, corriger-libelles-demo, mesure-*…) | tout | client hors compte, hors `src/` |
| Régénération du calendrier | `calendrier/reconciliation.ts`, `regenererApresMutation` | appelée depuis une action d'un compte connecté | **client borné** (rien à changer) ; `scripts/regenerer-calendriers.ts` reste hors compte |
| Migrations | `prisma/migrations` | DDL et reprises de données | sans objet : SQL hors client |
| Better Auth (à venir) | son adaptateur | `user`, `session`, `account`, `verification` | client hors compte, passé à `betterAuth()` dans un seul module, `src/lib/auth/better-auth.ts` (ADR-052, PR #130), autorisé nommément par la garde d'import ; ces tables sont hors de la table de correspondance |

Aucun cron Vercel (`vercel.json`), aucun `after()` dans `src/`.

## 4. Transactions et SQL brut

52 occurrences de `$transaction` / `$queryRaw` / `$executeRaw` hors tests, dont
9 dans `calendrier/faux-prisma.ts` (doublure de test) et 3 dans les gardes.
Formes : **17** `$transaction(async tx => …)`, **3** `$transaction([…])`.

Avec une extension de requête, une transaction n'est **pas** un problème de
principe (contrairement à la RLS par `set_config`) : le client de transaction
est le client étendu, et l'extension ne pose rien en base. À constater au
lot 1 sur les deux formes.

SQL brut, 15 appels :
- **bornés par `requireProprietaireSql`** : `etablissements/modules.ts:104`,
  `rapports/joindre-realisations.ts:82`, `rapports/queries.ts:39` ;
- **verrous `SELECT 1 … FOR UPDATE` par id**, dans une transaction après une
  lecture bornée : `calendrier/recalcul-ligne.ts:101`, `entreprises/cycle-de-vie.ts:26`,
  `rapports/actions.ts:239` et `:399`, `salaries/suppression.ts:103`,
  `signatures/verrou-contenu.ts:55` et `:57` ;
- **écritures** : `duerps/ecrire-reponse-fermee.ts:74` et `:84`,
  `registre/actions.ts:191` ;
- **hors compte** : `securite/limite-debit.ts:102` et `:118`.

## 5. La conception (détail dans l'ADR-051)

1. **Une table de correspondance** `modèle → chemin vers le compte`, écrite une
   fois dans le code (pas dans un test). Un test lit les modèles dans
   `Prisma.dmmf` — pas une liste recopiée — et échoue si un modèle n'a ni
   chemin ni motif « hors compte », ou si un chemin ne mène pas à
   `Entreprise.userId` par les relations du schéma.
2. **Le client borné** : `prisma.$extends({ query: { $allModels: { $allOperations } } })`
   qui ajoute la borne au `where` de chaque lecture et de chaque écriture, et
   vérifie les clés de rattachement des créations. Deux portées : **le compte**
   (`userId`) et **un établissement** (jeton, MCP par clé). Pas de portée, pas
   de requête : il lève.
3. **Le client hors compte**, distinct, importable seulement depuis des
   modules nommés (garde d'import). Aucun drapeau : ce n'est pas un mode du
   client borné.
4. **L'identité** vient de `lireUserCourant` (Supabase aujourd'hui, Better Auth
   demain) : c'est le seul endroit qui change à la bascule.

## 6. Découpage en lots

Chaque lot : tests ciblés, gardes à la main, épreuve par mutation, revue
indépendante, CI verte, feu vert de la propriétaire avant merge.

| Lot | Contenu | Épreuve |
|---|---|---|
| **0** | Garde anti-DDL (point 0.13) : aucun `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`, `TRUNCATE` dans un gabarit SQL de `src/` (et de `scripts/`, question Q2) | injecter un `ALTER TABLE` dans un `$executeRaw` : la garde tombe. Indépendant du reste, peut partir tout de suite |
| **1** | **Essai, sans fusion dans l'app** : sur la base Docker locale, constater (a) la borne dans `findUnique`/`update`/`delete`/`upsert`/`connect` ; (b) l'extension dans `$transaction(async)` et `$transaction([])` ; (c) le coût d'une jointure de plus (EXPLAIN ANALYZE sur le gros dossier de `scripts/perf/grossir-dossier.ts`) ; (d) une clé scalaire réécrite en `connect` portant la borne, dans une transaction qui crée aussi le parent (cas de l'onboarding) ; (e) l'extension sur le client de transaction (`tx`), que la doc Prisma ne décrit pas | les résultats entrent dans l'ADR avant son acceptation |
| **2a** ✓ | [2026-10-30] Infrastructure : `auth/portee/correspondance.ts` (34 modèles), `borne.ts` (fonctions pures), `client.ts` (`clientBorne`), `lot-verifie.ts` (`creerEnLotVerifie`), `auth/compte.ts` (`requireCompte`), garde d'import en cliquet (`imports.test.ts`, 90 modules à migrer) ; un premier module migré (`equipements/etat-verifications.ts`). Les créations et `connect` y sont : le lot 3 se réduit à l'inventaire des `createMany` et des écritures imbriquées, fait module par module | 4 mutations de l'extension et 5 injections d'import, toutes tombées ; matrice d'intégration 17/17 sur PostgreSQL 17.11 |
| **2b** | Migration module par module vers `requireCompte()` : chaque module sort de la liste À MIGRER ; les accès sans compte du § 3 reçoivent leur portée ou deviennent des modules NOMMÉS | la garde d'import |
| ~~**2**~~ | ~~(découpé en 2a et 2b le 2026-10-30)~~ Table de correspondance + son test ; client borné pour **lectures et écritures par `where`** ; client hors compte + garde d'import ; bascule des accès du § 3 vers leur portée | retirer la borne d'un modèle de la table : le test tombe ; brancher un module non nommé sur le client hors compte : la garde tombe ; lire un établissement d'un autre compte par `findUnique` sans prédicat : `null` |
| **3** | Créations, `connect`, `upsert`, écritures imbriquées : clés de rattachement et clés secondaires du § 2 vérifiées ; identifiants polymorphes listés | créer une `Action` dont `equipementId` est d'un autre compte : refus |
| **4** | SQL brut : garde qui exige `requireProprietaireSql` ou une entrée nommée de la liste du § 4, avec son motif | ajouter un `$queryRaw` non borné : la garde tombe |
| **5** | **Matrice d'autorisation** (OWASP) sur la base locale avec deux comptes : chaque opération de chaque modèle, refusée d'un compte à l'autre, réussie dans le compte ; mesure avant/après : budget de requêtes en CI (`budget-requetes.yml`) et `scripts/perf/mesurer.mjs` ; sonde des clés croisées ajoutée à `scripts/sante-base.sql` (à lancer par la propriétaire, jamais par nous) ; sort des gardes `tenancy-*` (§ 7) | — |
| Better Auth | `lireUserCourant` lit `auth.api.getSession` : une ligne | la suite du lot 2 repasse |

## 6 ter. Revue du lot 2a (2026-10-30) — ce qui a été corrigé, ce qui reste

Corrigé avant la PR, chaque fois éprouvé en cassant la correction :
- **bloquant** : un `createMany` imbriqué posait la racine telle quelle — A
  écrivait une `DemandeAssistance` chez B. La racine y est posée ou refusée ;
- la **portée « établissement » est retirée** du lot : seul le `where` de tête
  est borné, un `include` descendait donc d'un établissement à ses frères du
  même compte, et `racineDe` laissait changer le `userId` d'une entreprise.
  `clientBorne` refuse toute autre portée que le compte ;
- la portée d'un client en cache est **figée** (un objet modifié après coup
  déplaçait le client) ;
- la garde d'import lit `require()`, `import()` à gabarit, les `.mjs`/`.cjs`,
  le client du MCP (`mcp/prisma.ts`, `dbMcp()` de `mcp/db.ts`), et réserve la
  VALEUR `PrismaClient` (alias, espace de noms, `require` compris) aux deux
  modules qui fabriquent un client ;
- contre-vérification : une portée à accesseur rendait deux comptes (clé du
  cache et client) — l'identifiant est lu une seule fois.

Reste ouvert, à traiter au lot 2b :
- **portée « établissement »** (jeton prestataire, MCP par clé) : à concevoir
  avec des `include`/`select` bornés eux aussi, ou un client qui les refuse ;
- **oracle d'existence par unicité** : un `upsert`/`connectOrCreate` qui laisse
  l'appelant fixer un identifiant ou un champ unique global (slug) révèle par
  P2002 qu'une ligne existe ailleurs — à vérifier à chaque module migré ;
- **SQL brut** : un module « migré » peut encore lire par le client brut au
  travers d'un helper (`etat-verifications` → `joindreDernieresRealisations`,
  `$queryRaw` borné par `requireProprietaireSql`) — garde du lot 4 ; `db`
  expose `$queryRaw` dans ses types ;
- garde d'import : un chemin calculé à l'exécution et `globalThis.prisma`
  (hors production) lui échappent ; la liste des portes vers un client brut
  (`PORTES_BRUTES`) est écrite à la main — un module À MIGRER qui se mettrait à
  rendre `prisma` (comme `dbMcp()`) en ouvrirait une sans être vu ; et une
  requête du client brut glissée dans `db.$transaction([...])` n'est pas
  bornée (le client brut lui-même reste gardé) ;
- disponibilité : le plafond du relevé des identifiants vus peut faire refuser
  à tort un `creerEnLotVerifie` concurrent de la même portée.

## 6 bis. Branches (organisation du 2026-10-30, décision de la propriétaire)

Les lots de ce plan vont dans `main` (prod Vercel). La migration Clever Cloud
vit sur la branche `cc`, que la session de la bascule alimente par fusion de
`main` après chaque merge ; `cc` ne revient dans `main` qu'à la bascule. Le
lot 2 entre dans `require-user.ts` par `main`, Better Auth le modifie sur
`cc` : les conflits se règlent à la fusion de `main` dans `cc`, côté bascule.
**Prévenir la session de la bascule quand le lot 2 est mergé.**

## 7. Ce qui devient redondant, ce qui reste

- **Restent** : `requireUser` et les helpers de `scope.ts` — ils résolvent un
  identifiant reçu et rendent le 404 sans oracle ; `tenancy-oracle`,
  `tenancy-routes` ; `migrations-rls.test.ts` ; la RLS sans politique.
- **Deviennent redondantes en partie** : les prédicats `entreprise: { userId }`
  écrits à la main (le client borné les ajoute une seconde fois — coût mesuré
  au lot 5), et `tenancy-lectures`, `-ecritures`, `-enfants`, qui vérifient la
  présence textuelle du prédicat. **Proposition : ne rien retirer avant le
  lot 5**, quand l'extension aura été cassée et aura fait tomber ses tests ;
  la décision viendra alors, chiffrée.

## 8. Sources

Lues le 2026-10-30, citées dans l'ADR-051 (§ « Sources ») : doc Prisma v6
(limitations des extensions, extension `query`, extensions partagées),
exemple RLS officiel, guide Authentication de Next.js, OWASP Multi-Tenant
Security Cheat Sheet.

## 9. Questions à la propriétaire

[2026-10-30 : **tranchées** par la propriétaire — Q1 client explicite, Q2 oui
(sauf `sante-base.sql`), Q3 oui ; le lot 1 part aussi, et pour les clés
réécrites en `connect` : « si l'essai montre que l'automatique est fragile,
l'écrire, et proposer une vérification nommée à la main plutôt que de
forcer ». Les lots 2 à 5 ne bloquent pas la bascule.]

- **Q1 — client implicite ou explicite.** ~~(a) Implicite, recommandé~~
  [2026-10-30, après lecture de la doc Next.js : `cache()` de React est sans
  effet dans les actions serveur et les routes, et Next n'offre aucun point
  d'entrée où poser un contexte de requête ; le client implicite relirait la
  session à chaque requête SQL d'une action.] **(b) Explicite, recommandé** :
  `const { user, db } = await requireCompte()`, le patron « Data Access
  Layer » de la doc Next.js ; ~400 appels dans 91 fichiers, réécrits module
  par module ; une garde interdit `@/lib/prisma` hors des modules nommés, si
  bien qu'un module oublié ne compile pas sa requête sans borne : il tombe
  en CI.
- **Q2 — garde anti-DDL étendue à `scripts/`.** Les scripts se connectent avec
  le même rôle propriétaire ; le plan de bascule ne nomme que `src/`.
  Proposition : oui, sauf `scripts/sante-base.sql` (lecture seule, lancé à la
  main).
- **Q3 — le lot 0 part-il tout de suite**, avant l'acceptation de l'ADR ? Il
  ne dépend d'aucune décision.
