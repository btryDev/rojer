# ADR-051 — Chaque requête Prisma est bornée au compte par le client lui-même

- **Statut** : **acceptée**, 2026-10-30 (feu vert de la propriétaire, après
  les constats du lot 1). ~~Proposée~~ le même jour. Décisions de la propriétaire du même
  jour (transmises par la session de la bascule) : Q1 client explicite, Q2
  garde anti-DDL étendue à `scripts/`, lot 0 et lot 1 tout de suite ; les
  lots 2 à 5 ne bloquent pas la bascule. Reste à acceptation : les constats
  du lot 1 (`docs/plan-isolation-comptes.md` § 6), qui entreront ici.
  [Entrés : « Constats du lot 1 ».]
- **Origine** : « Je veux qu'on solidifie l'isolation » (propriétaire,
  2026-10-30) ; voie retenue le même jour : l'isolation applicative par une
  extension Prisma, la RLS par compte n'étant qu'une option comparée (§ 6).
- **Amende** l'ADR-005 (l'isolation ne repose plus sur le seul prédicat écrit
  dans chaque requête) ; ne touche ni l'ADR-007 (accès par jeton) ni
  l'ADR-013 (MCP).

## Contexte

L'app se connecte en propriétaire de la base, seul rôle que Clever Cloud
fournira (plan de bascule, § 9 bis). L'isolation des comptes tient dans le
code : chaque requête porte `entreprise: { userId }`, et six gardes relisent
le code pour vérifier que le prédicat est écrit. Elles ont fait tomber deux
mutations le 2026-10-30. Mais une garde textuelle ne vérifie pas que le
prédicat porte sur la bonne table, et rien ne vérifie qu'une écriture ne
rattache pas une ligne à l'équipement, au prestataire ou au salarié d'un
autre compte.

## Décision

1. **Une table de correspondance, écrite une fois.** Pour chacun des 34
   modèles, le chemin vers `Entreprise.userId` (inventaire au § 2 du plan),
   ou le motif qui le met hors compte (`QuotaEnvoiOtp`, `LimiteDebit`, et
   demain les tables de Better Auth). Un test lit la liste des modèles dans
   `Prisma.dmmf` et échoue si un modèle n'a ni chemin ni motif, ou si un
   chemin ne suit pas les relations du schéma jusqu'à `Entreprise.userId`.
2. **Le client borné.** `prisma.$extends({ query: { $allModels: { $allOperations } } })`.
   - Lectures (`findMany`, `findFirst`, `findUnique` et leurs `OrThrow`,
     `count`, `aggregate`, `groupBy`) et écritures par `where` (`update`,
     `updateMany`, `delete`, `deleteMany`, `upsert`) : la borne est ajoutée
     au `where` par `AND`. Les `WhereUniqueInput` de Prisma 6 l'acceptent
     (vérifié dans les types générés de la 6.19.3) : une ligne d'un autre
     compte est absente, jamais une erreur différente.
   - Créations (`create`, `createMany`, `upsert`), `connect` et écritures
     imbriquées : chaque clé étrangère vers une ligne d'un compte — la clé de
     rattachement et les clés secondaires (`Action.equipementId`…) — désigne
     une ligne du même compte, sinon la requête est refusée. Les identifiants
     sans clé étrangère (`Signature.objetId`, `AccessToken.objetId`,
     `Action.leveeRapportId`) restent vérifiés par leur code nommé, et listés.
   - **Ce que Prisma ne fait pas pour nous** (doc v6, « Limitations ») : « The
     `query` extension type does not support nested read and write
     operations ». L'extension ne reçoit que l'opération de tête. Elle
     **parcourt donc elle-même** le `data` reçu (créations et `connect`
     imbriqués) ; elle ne peut pas modifier `include` ni `select` (doc
     `query`). Les lectures imbriquées restent sûres **seulement** parce que
     les écritures interdisent les clés croisées : c'est la raison d'être du
     point précédent, et la sonde des clés croisées (lot 5) le vérifie sur
     les données.
   - **L'extension n'émet aucune requête à elle.** Doc « Shared extensions » :
     une requête lancée par une extension pendant une transaction part sur
     une autre connexion et ignore la transaction. Une vérification « le
     parent est-il du compte ? » faite par une requête à part ne verrait donc
     pas un parent créé dans la même transaction (l'onboarding crée
     entreprise et établissement ensemble). La vérification passe par la
     requête elle-même : une clé scalaire devient un `connect` portant la
     borne, qui échoue dans la même requête. `createMany` n'accepte pas
     `connect` : ses huit appels sont listés et vérifiés au lot 3.
   - Un modèle hors compte est refusé par ce client.
   - **Deux portées**, et seulement deux : le compte (`userId`), et un
     établissement (`etablissementId`) pour le prestataire porteur d'un jeton
     et le MCP par clé. Sans portée, le client lève : il échoue fermé.
3. **Le client hors compte** est un autre module, importable seulement par
   des modules nommés (garde d'import qui relit le code) : la résolution d'un
   jeton par son empreinte, le registre public par slug, la vérification
   publique d'une signature, la limitation de débit et les quotas d'OTP,
   l'adaptateur de Better Auth, les scripts et les graines. Ce n'est pas un
   mode du client borné : aucun drapeau ne fait passer l'un pour l'autre.
4. **L'identité** est celle de `requireUser`, lue par `lireUserCourant` —
   Supabase aujourd'hui, `auth.api.getSession` demain : c'est le seul
   endroit qui change à la bascule. **Le client se reçoit avec l'identité** :
   `requireCompte()` rend `{ user, db }`, et `db` est le client borné à ce
   compte. C'est la « Data Access Layer » que recommande la doc Next.js
   (guide Authentication) : une fonction vérifie la session et les lectures
   passent par ce qu'elle rend. Le client n'est jamais borné « par
   ambiance » (variable globale ou contexte implicite) : la doc Next.js dit
   que `cache()` de React « does nothing » dans les actions serveur et les
   routes — une identité relue à chaque requête du client y coûterait un
   appel au serveur d'authentification par requête SQL.
5. **SQL brut** : l'extension ne le voit pas. Une garde exige qu'un
   `$queryRaw` / `$executeRaw` interpole `requireProprietaireSql`, ou figure
   nommément dans une liste avec son motif (verrous `FOR UPDATE` après une
   lecture bornée, limitation de débit).
6. **Aucun DDL hors des migrations** : une garde refuse `CREATE`, `ALTER`,
   `DROP`, `GRANT`, `REVOKE`, `TRUNCATE` dans un gabarit SQL du code (point
   0.13 du plan de bascule).
7. **Ce qui reste** : `requireUser`, les helpers de `scope.ts` (résolution
   d'un identifiant reçu, 404 sans oracle), `tenancy-oracle`,
   `tenancy-routes`, la RLS activée sans politique et sa garde. Les
   prédicats écrits à la main et les gardes `tenancy-lectures`, `-ecritures`,
   `-enfants` deviennent redondants en partie ; leur sort se décide après
   l'épreuve de l'extension, pas avant.

## Ce que cette décision ne protège pas

- Un identifiant de base volé : le propriétaire lit tout.
- Le SQL brut hors de la garde, et le client hors compte importé par un
  module nommé qui lirait trop : ces deux portes sont étroites et listées,
  pas fermées.
- Un défaut de l'extension elle-même : c'est pourquoi chaque règle est
  éprouvée en la cassant.
- Le croisement de deux établissements **du même compte** (une action qui
  pointerait l'équipement d'un autre établissement du même dirigeant) : ce
  n'est pas une fuite entre comptes. À instruire à part si on le veut.

## Questions ouvertes

- **Q1** — ~~client implicite recommandé~~ [2026-10-30, après lecture de la
  doc Next.js : `cache()` est sans effet dans les actions et les routes, et
  Next ne donne aucun point d'entrée où poser un contexte de requête. Le
  client implicite relirait la session à chaque requête SQL d'une action.]
  **Client explicite recommandé** (`requireCompte()` → `{ user, db }`,
  91 fichiers à réécrire, lot par module), avec une garde qui interdit
  `@/lib/prisma` hors des modules nommés. [2026-10-30 : **tranché, client
  explicite** — décision de la propriétaire.]
- ~~**Q2** — la garde anti-DDL couvre-t-elle aussi `scripts/` ?~~
  [2026-10-30 : **oui**, sauf `scripts/sante-base.sql` — décision de la
  propriétaire ; garde `src/lib/ddl-hors-migrations.test.ts`, branche
  `lot/garde-ddl`, 506f7cd1.]
- **Coordination avec la bascule** : `lireUserCourant` est le seul point de
  contact avec le lot Better Auth. Ce lot la crée en déléguant à l'existant,
  sans changer sa source ; le lot Better Auth ne change que sa source.
  Chacun prévient l'autre avant de toucher `src/lib/auth/`.

## Sources lues le 2026-10-30

- Prisma v6, Client extensions, « Limitations » : pas d'opérations imbriquées
  dans les extensions `query` — https://www.prisma.io/docs/orm/v6/prisma-client/client-extensions
- Prisma, extension `query` : `$allModels`, `$allOperations` (modèles et SQL
  brut, `model` vaut `undefined`), `include`/`select` non modifiables —
  https://www.prisma.io/docs/orm/prisma-client/client-extensions/query
- Prisma, « Shared extensions » : une requête émise par l'extension pendant
  une transaction ignore la transaction —
  https://www.prisma.io/docs/orm/v6/prisma-client/client-extensions/shared-extensions
- Exemple RLS officiel : « wraps every query in a new batch transaction »,
  « not intended to be used in production environments » —
  https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security
- Next.js, guide Authentication (2026-09-16) : Data Access Layer, et
  `cache()` sans effet dans les actions et les routes —
  https://nextjs.org/docs/app/guides/authentication
- OWASP, Multi-Tenant Security Cheat Sheet : contrôle « at a boundary
  traversed by every tenant-owned access path » ; le scoping par l'ORM est
  « defense in depth, not complete enforcement », le SQL brut et les
  opérations en masse demandent des contrôles à part ; propriété posée à
  l'insertion depuis la session ; matrice d'autorisation (refus entre
  comptes, succès dans le compte) ; tables classées depuis le schéma, échec
  sur une table non classée ; en base, un rôle sans `BYPASSRLS` —
  https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html
- Écartée : `prisma-extension-nested-operations` (7 commits, aucune version
  publiée, Prisma 6 non mentionné) — on ne fait pas dépendre l'isolation
  d'un paquet peu tenu.

## Constats du lot 1 (essai, 2026-10-30)

Prototype jetable (`.essai-lot1/essai.ts`, non versionné) sur une base locale
dédiée (`rojer_essai_isolation`, PostgreSQL 17.11 du conteneur `duerp-db` — la version du plan XS de Clever Cloud —, toutes les
migrations appliquées), deux comptes A et B, client borné à A.
**28 cas sur 28** conformes. Relevé de la sortie :

| Cas | Obtenu |
|---|---|
| `findUnique` / `findUniqueOrThrow` d'une ligne de B (jusqu'à `Risque`, quatre niveaux) | `null` / P2025 |
| `findMany`, `count`, `groupBy` | les lignes de A seulement |
| `update`, `delete` d'une ligne de B | P2025 ; `updateMany` sans `where` : 1 ligne (celle de A) |
| `upsert` sur l'id d'une ligne de B | crée une ligne **chez A** ; B intact |
| `create` dont la clé principale (`etablissementId`) ou secondaire (`Equipement.batimentId`, `Action.equipementId`) vise B | P2025, par la réécriture en `connect` borné |
| `connect` explicite vers B, `update` qui déplace une clé vers B, `connect` imbriqué dans un `update` | P2025 / P2018 |
| `Entreprise` créée avec le `userId` de B | refus de l'extension |
| **Transaction interactive** : lecture de B par `tx` | `null` — l'extension s'applique au client de transaction (la doc ne le dit pas : constaté) |
| **Onboarding** : entreprise puis établissement créés dans la même transaction | réussi — le `connect` borné voit le parent non validé, parce qu'il est dans la même requête |
| Même transaction, établissement rattaché à l'entreprise de B | P2025 |
| Transaction par lot `[findMany, findUnique(B)]` | `2`, `null` |
| `include` des bâtiments de A | identique au client brut |
| `createMany` | **refusé** : Prisma n'accepte pas de `connect` dans un `createMany` |
| Client sans portée | refus |

**Coût**, 100 exécutions après 20 de chauffe, médiane (p95) :
- une ligne (`findFirst` d'un établissement) : 0,73 ms (1,94) brut, 1,00 ms (1,77)
  borné ;
- 5 000 actions : 42,5 ms (47,0) brut avec le prédicat écrit, 46,2 ms (48,9)
  borné avec le prédicat écrit en double, 48,4 ms (58,4) borné seul.
- ~~Le SQL produit reste **une seule instruction** : la borne devient deux
  `LEFT JOIN` (`Etablissement`, `Entreprise`) et un `"userId" = $2` dans le
  `WHERE`. Aucune requête de plus, ni en lecture ni en écriture : le budget de
  requêtes de la CI ne bouge pas par construction.~~ [2026-10-30 : **faux pour
  les écritures et pour le regroupement**, relevé par l'audit indépendant puis
  mesuré — voir « Coût mesuré » plus bas. Vrai pour une lecture seule.] Les
  écarts de temps sont de l'ordre du bruit d'une machine partagée ; la mesure
  de référence reste celle du lot 5 (`mesurer.mjs`).

**Coût mesuré** (2026-10-30, PostgreSQL 17.11 local, Prisma 6.19.3, vrai
`clientBorne`, instructions SQL comptées par l'événement `query` — `BEGIN` et
`COMMIT` compris — et recoupées par `log_statement` ; médiane de 100 essais
après 20 de chauffe, deux passages) :

| Cas | Instructions brut → borné | Médiane brut → borné |
|---|---|---|
| `findUnique` Etablissement | 1 → 1 | 0,412 → 0,509 ms |
| `findUnique` Risque (quatre crans) | 1 → 1 | 0,274 → 0,385 ms |
| `findMany` de 5 000 actions | 1 → 1 | 43,005 → 45,576 ms |
| `findFirst` + `include` | 2 → 2 | 0,504 → 0,639 ms |
| trois `findUnique` concurrents | **1 → 3** | 0,552 → 0,938 ms |
| `create` à 1 clé (Batiment) | **1 → 5** | 0,277 → 0,811 ms |
| `create` à 2 clés (Equipement) | **1 → 6** | 0,433 → 1,057 ms |
| `create` à 3 clés (Action) | **1 → 7** | 0,335 → 1,555 ms |
| `update` qui change une clé | **1 → 5** | 0,300 → 0,925 ms |
| `update` d'un champ simple, `delete`, `deleteMany` | 1 → 1 | +0,06 à +0,14 ms |
| `upsert` (mise à jour / création) | 5 → 5 / 5 → 6 | 0,655 → 0,849 ms |
| 100 lignes : `createMany` / `creerEnLotVerifie` | 3 → 6 | 3,696 → 5,025 ms |
| transaction interactive, trois écritures | **5 → 10** | 1,290 → 2,548 ms |

D'où vient l'écart : un `connect` fait passer Prisma en écriture imbriquée —
`BEGIN`, un `SELECT` de vérification par clé réécrite, l'`INSERT … RETURNING
id`, la relecture de la ligne, `COMMIT` (+3 fixes, +1 par clé). Le
regroupement des `findUnique` concurrents (`WHERE id IN (…)`) est perdu dès
que le `where` porte un `AND`. Lectures : aucune instruction de plus. En
local, un aller-retour coûte moins de 0,1 ms ; derrière un réseau, c'est le
NOMBRE d'instructions qui compte. Le budget de requêtes par page (CI) le
dira page par page à chaque module migré (grille de seconde lecture, point 6).

**Ce que l'essai tranche** (consigne de la propriétaire : écrire ce qui est
fragile plutôt que forcer) :
- la réécriture automatique en `connect` borné **tient** pour `create`,
  `update`, `upsert` et les `connect` imbriqués — y compris l'onboarding en une
  transaction. Elle repose sur l'API publique de Prisma (`WhereUniqueInput`
  accepte la borne) ; aucune clé étrangère composée dans le schéma ;
- **`createMany` ne peut pas être borné automatiquement** : le client borné le
  refuse, et ses huit appels passent par une **vérification nommée** — les
  parents comptés par le client de la transaction (`tx`, donc dans la même
  transaction) avant l'insertion. Inventaire au lot 3 ;
  [2026-10-30, lot 2a : **le mécanisme a changé à l'épreuve.** Un jeton
  (`Symbol`) ou l'identité d'un objet ne survivent pas : Prisma recopie les
  arguments en profondeur avant l'extension (constaté : « tableau identique :
  false »). Ce qui survit, ce sont les valeurs. Le client borné retient les
  identifiants rendus par une lecture bornée `select: { id: true }` — elle
  prouve qu'ils sont dans la portée — et n'accepte un `createMany` que si
  chacune de ses clés étrangères vers une ligne d'un compte en fait partie.
  `creerEnLotVerifie(tx, modèle, lignes)` fait cette lecture puis insère ; un
  parent créé dans la même transaction est vu. Ni drapeau ni jeton : seule une
  lecture réellement bornée ouvre la porte, pour les identifiants qu'elle a
  rendus. Relevé par portée, borné en taille.]
- les écritures imbriquées autres que `create`, `connect` et `disconnect`
  (`update`, `upsert`, `delete`, `set` sous une relation) sont refusées par le
  prototype : leur usage dans le code est à inventorier au lot 3, chacune
  bornée ou réécrite ;
- une ligne d'un autre compte rend P2025 / P2018, comme une ligne absente : à
  vérifier au lot 2 que chaque appelant le traduit en 404, sans oracle.

## Corrections de l'audit indépendant (2026-10-30)

- **Identité** (`User`, sur cc) : une relation vers elle ne désigne que le
  compte de la portée (clé égale à `userId`, cible réduite à `{ id }`, toute
  autre écriture refusée) ; tout `include`/`select` qui traverse vers un modèle
  hors compte ou l'identité est refusé, à toute profondeur, `_count` compris.
  Le trou : `Signature.userId` et `AccessToken.createdByUserId` acceptaient
  n'importe quel utilisateur, et un `include` remontait à ses sessions et à
  son secret TOTP. Rien dans le code ne l'exploitait ; c'est ce que la borne
  doit arrêter quand même. L'affirmation du § 2 — les lectures imbriquées sont
  sûres parce que les clés croisées sont interdites — ne valait pas pour cette
  clé-là.
- **Formes servies** : seules celles que le dépôt emploie. Écritures
  imbriquées : `create`, `connect`, `disconnect` (booléen), `deleteMany` ;
  `cursor` refusé.
- **Oracles d'existence restants**, à vérifier à chaque module migré : `upsert`
  ou `createMany` à identifiant fourni et `skipDuplicates` sur un champ unique
  global (P2002 révèle une ligne d'un autre compte).
- **Tests d'intégration en CI** (`.github/workflows/integration.yml`, service
  PostgreSQL 17) ; le job tombe si un test saute faute de sa variable.

## Accès sans session : jetons, MCP, pages publiques (décision du 2026-10-30)

Décision de la propriétaire, lot 2b : la portée « établissement » du § 2 n'est
pas construite maintenant.
- **Prestataire porteur d'un jeton, MCP par clé** : le client est borné au
  **compte propriétaire de l'établissement**, résolu côté serveur (jeton →
  établissement → `Entreprise.userId` ; clé MCP → établissement configuré →
  son propriétaire). Aucun accès à un autre compte. À l'intérieur du compte,
  les filtres par établissement déjà écrits dans le code restent ; le moindre
  privilège entre établissements d'un même compte reste une amélioration
  possible (portée « établissement », avec `include` et `select` bornés).
- **Accès publics** (registre d'accessibilité par slug, vérification publique
  d'une signature), **compteurs techniques** (limite de débit, quotas d'OTP) et
  **recherche d'un jeton par son empreinte** : modules NOMMÉS hors compte, avec
  leur motif (`imports.test.ts`).

## Relecture par la session GestBAT (2026-10-30)

Demandée par la propriétaire. Verdict : conception juste, RLS écartée à
raison. Ses réserves, et ce qu'il en est fait :

1. **Relevé des identifiants vus global et purgé par plafond** : refus au
   hasard sous charge. **Corrigé** (lot 2a bis) : le relevé ne vit plus que le
   temps d'un appel à `creerEnLotVerifie` (`AsyncLocalStorage`, `dansUnLot`) ;
   hors d'un lot, rien n'est retenu.
2. **Clé étrangère composée** : passerait sans borne. **Corrigé** : refus
   explicite dans `borne.ts`, et `correspondance.test.ts` vérifie que le
   schéma n'en porte aucune vers un modèle du compte.
   [Revue du lot 2a bis : le refus ne jouait qu'en tête — une création
   imbriquée le contournait. Il est aussi appelé à chaque niveau de
   `reecrireDonnees`.] Deux limites écrites : `createManyAndReturn` n'est pas
   servi par `creerEnLotVerifie` (aucun appelant) ; un minuteur né dans un lot
   en garderait le relevé — sans effet tant que `dansUnLot` n'exécute que le
   code de `creerEnLotVerifie`, jamais un rappel fourni par l'appelant.
3. **`include`/`select` non bornés** : tient au niveau du compte, pas d'un
   établissement — déjà la raison du retrait de la portée « établissement ».
4. **Une seule réponse au refus** : P2025, P2018 et `ErreurPortee` doivent
   rendre le même 404 qu'une ligne absente. Le client rend déjà la même
   erreur pour une ligne absente et pour une ligne d'un autre compte ; la
   traduction en 404 se vérifie à chaque module migré (lot 2b). L'oracle par
   unicité (`upsert` à identifiant fourni) est au plan.
5. **Coût croissant avec la profondeur** (`ReleveTemperature` : quatre
   jointures) : mesuré au lot 5 ; si une page ralentit, recopier
   `entrepriseId` sur les modèles profonds.
6. **Méthode de migration** : liste qui ne fait que raccourcir (déjà le
   cliquet de `imports.test.ts`) et, pour chaque module, un test qui tombe
   quand on retire la borne.

À retenir de leur expérience : jamais de rôle ni de drapeau qui court-circuite
le verdict — un `SUPER_ADMIN` qui passait le contrôle leur a valu un accès
entre organisations en production. Rien de tel ici : le seul accès hors compte
est le client brut, réservé à des modules nommés.

### Option proposée, non décidée : des clés étrangères composées en base

`Enfant(parentId, entrepriseId) → Parent(id, entrepriseId)`, avec
`@@unique([id, entrepriseId])` sur le parent : PostgreSQL refuse toute ligne
qui pointe vers un autre compte, même avec un seul rôle. Elle remplacerait le
relevé de `creerEnLotVerifie`, et `createMany` deviendrait sûr par
construction. Prix : recopier `entrepriseId` sur une trentaine de tables
(migration de données en production), des relations plus lourdes à écrire,
lever le refus des clés composées (point 2). Elle ne protège que les
écritures : les lectures restent bornées par le client. ~~**À trancher par la
propriétaire** ; pas engagée.~~ [2026-10-30 : **écartée** par la propriétaire
(« on ne la met pas en place »). Le contrôle des clés à l'écriture reste celui
du client borné.]

## Option comparée, non retenue : la RLS par compte en base

`FORCE ROW LEVEL SECURITY` et des politiques qui lisent une variable posée à
chaque transaction (`set_config('app.user_id', …, true)`, exemple officiel
`prisma-client-extensions/row-level-security`). C'est la seule isolation
**en base** possible avec un rôle unique. Écartée maintenant parce que :

- chaque requête passe dans une transaction qui pose la variable : des
  allers-retours de plus par requête, sur ~105 requêtes au tableau de bord ;
- l'exemple officiel prévient que les transactions explicites ne se
  comportent plus comme prévu ; le code en compte 20, plus 15 appels SQL
  brut ;
- une politique oubliée ou fausse ne lève rien : elle rend une liste vide,
  ce qui ne se voit pas ;
- les migrations qui reprennent des données, soumises au `FORCE`, ne
  verraient aucune ligne sans un mode à elles ;
- le propriétaire peut toujours retirer `FORCE` : elle protège d'un oubli
  dans le code, pas d'un identifiant volé — exactement ce que fait déjà
  l'extension, à moindre coût ;
- elle dépend de ce que Clever Cloud permet (§ 10 du plan de bascule : second
  rôle à constater).

À rouvrir si un second rôle sans `BYPASSRLS` devenait possible chez
l'hébergeur, ou si des utilisateurs multiples par entreprise arrivaient : la
table de correspondance du § 1 donnerait alors les politiques presque mot
pour mot.
