# ADR-012 — Conservation des preuves : régénération idempotente, suppression logique, refus motivé

- **Date** : 2026-08-11
- **Statut** : Acceptée — **amendée par l'ADR-034** (2026-09-10). Toutes ses
  promesses tiennent — rien de ce qui prouve un contrôle ne se détruit, la
  régénération est idempotente, une ligne qui ne s'applique plus est marquée et
  non supprimée —, mais la ligne de suivi n'est plus le porteur de
  l'historique : elle ne porte que l'échéance OUVERTE et roule au dépôt ;
  l'historique, ce sont les `RapportVerification`. Le marqueur texte « Ne
  s'applique plus — » est remplacé par le champ `archiveLe`. La définition
  partagée d'une preuve est `portantUnePreuve` (`lib/calendrier/portee.ts`).
- **Auteur** : Claude Code (sur brief Paloma)
- **Relatif à** : ADR-002 (Action unifiée), ADR-003 (Référentiels en TS),
  ADR-009 (Boucle tickets ↔ DUERP), ADR-011 (Dates civiles), migration
  `20260810120000_integrite_et_conservation`, `docs/rgpd.md`

## Contexte

Rojer conserve trois catégories de pièces que rien ne permet de reconstituer :

- les **versions figées du DUERP** — 40 ans, art. R. 4121-4 du Code du travail ;
- les **rapports de vérification** déposés par les organismes — toute la durée
  d'exploitation, art. L. 4711-5 ;
- les **actions correctives** saisies par le dirigeant, avec responsable,
  échéance et justificatif de levée.

Or trois mécanismes du produit détruisaient ces pièces sans le dire.

### 1. La régénération du calendrier procédait par `delete` puis `create`

`genererCalendrier` supprimait toutes les vérifications non réalisées
(`a_planifier`, `planifiee`, `depassee`) avant de recréer les occurrences
calculées. Le commentaire du fichier ne promettait de protéger que les
`RapportVerification` — via l'invariant « on ne supprime jamais une
vérification réalisée ». Il oubliait deux choses :

- `Action.verificationId` est en `onDelete: Cascade`, et
  `lib/actions/plan.ts` crée des actions rattachées à des vérifications **non
  réalisées** : c'est même le cas nominal (« vérification électrique dépassée →
  faire intervenir un organisme agréé »). Scénario vécu : le dirigeant crée
  l'action lundi ; mardi il déclare un extincteur ; la déclaration régénère ;
  l'action disparaît. Aucun message ;
- un rapport déposé avec le résultat « non vérifiable » plaçait la
  vérification en `a_planifier` **avec** une `dateRealisee` ; la régénération
  déclenchée deux lignes plus bas la supprimait, emportait le
  `RapportVerification` par cascade et laissait le fichier orphelin sur le
  disque.

S'y ajoutait une perte plus discrète : les identifiants changeaient à chaque
passage, donc toute URL de fiche vérification et toute référence
`leveeRapportId` pointaient dans le vide.

Passer `Action.verificationId` en `SetNull` n'était pas une option : la CHECK
`Action_origine_xor` (ADR-002) exige qu'exactement un des deux liens soit non
nul — la suppression aurait échoué.

### 2. La suppression d'un équipement était physique

`supprimerEquipement` faisait un `prisma.equipement.delete`. La cascade
emportait **toutes** ses vérifications, y compris réalisées, donc leurs
rapports — c'est-à-dire le registre de sécurité — et les actions correctives
ouvertes. Aucun `storage.delete` : les PDF restaient sur le disque. Le champ
`Equipement.actif` existait depuis l'origine, avec une valeur par défaut, et
n'était lu ni écrit nulle part.

### 3. La suppression d'un établissement ou d'une entreprise cascadait sur le DUERP

`docs/rgpd.md` interdit explicitement cette suppression : une `DuerpVersion`
se conserve 40 ans, obligation légale qui l'emporte sur le droit à l'effacement
(art. 17.3 RGPD). La migration `20260810120000_integrite_et_conservation` pose
`onDelete: Restrict` sur `DuerpVersion.duerp` — le seul maillon qui porte la
preuve. `Duerp.etablissement` reste en `Cascade` : supprimer l'établissement
tente de cascader sur le `Duerp`, le `Restrict` de `DuerpVersion` s'y oppose et
toute la transaction est annulée.

### Ce contre quoi le `Restrict` ne protège PAS

Ajouté le 2026-08-27, après une perte de données en production.

Le `Restrict` protège d'un `DELETE`. Il ne protège de rien contre une commande
qui **détruit et recrée le schéma** : les contraintes tombent avec les tables
qui les portent, et la base repart vide sans qu'aucune règle n'ait été violée —
il n'y a plus de règle. C'est ce qui s'est produit avec un
`prisma migrate diff --from-migrations --shadow-database-url` pointé sur la
production : Prisma vide la base visée, y rejoue les migrations, et rend un
schéma parfaitement conforme, parfaitement vide. Les quarante ans de
`DuerpVersion` n'ont opposé aucune résistance, parce qu'ils n'ont jamais été
faits pour ça.

Le distinguo mérite d'être posé, parce que la section ci-dessus se lit
volontiers comme « les versions figées sont indestructibles », et ce n'est pas
ce qu'elle dit :

| Menace | Ce qui protège |
|---|---|
| Suppression applicative d'un établissement ou d'un DUERP | `Restrict` — il tient, c'est son objet |
| Régénération du calendrier, réconciliation | Idempotence + `porteUnePreuve` — ils tiennent |
| Commande qui recrée le schéma (`migrate reset`, `migrate diff` sur une shadow database, `db push --force-reset`) | **Rien dans ce dépôt.** Seule une sauvegarde externe |

La conséquence pratique est que l'obligation des quarante ans repose, en
dernier ressort, sur les sauvegardes de l'hébergeur — pas sur une contrainte
Prisma. Un `Restrict` dit ce qu'on refuse de faire ; il ne dit rien de ce qu'un
outil d'administration peut faire par-dessus. Les garde-fous côté commandes
sont dans `.env.example`, en tête du bloc de production.

Le `Restrict` avait d'abord été posé sur les **deux** maillons. C'était trop
large : un DUERP ouvert mais jamais validé ne porte aucune pièce à conserver, et
l'établissement devenait indélébile dès le premier clic sur « Commencer mon
DUERP », sans motif légal — avec en prime un message d'erreur générique. Un
garde-fou doit être exactement aussi large que l'obligation qu'il sert.

Sans traitement applicatif, l'utilisateur récupérait de toute façon un `P2003`
brut.

## Décision

### A. La régénération du calendrier est idempotente, par réconciliation

Depuis la contrainte `@@unique([etablissementId, obligationId, equipementId])`,
une `Verification` n'est plus « une occurrence » mais **la ligne de suivi**
durable d'une obligation sur un équipement. Sa sémantique est fixée ainsi :

| Champ | Sens |
|---|---|
| `datePrevue` | prochaine échéance réglementaire |
| `dateRealisee` | réalisation **du cycle en cours**, `null` tant qu'il n'est pas soldé |
| `statut` | état du cycle en cours |
| `rapports` | l'historique complet, cycle après cycle — **la preuve** |

`reconcilierCalendrier` (`src/lib/calendrier/generateur.ts`) est une fonction
**pure**, à horloge injectée, qui produit le plan minimal d'écritures :

- **couple applicable sans ligne** → création ;
- **couple applicable avec ligne** → mise à jour en place, jamais
  suppression-recréation. L'identifiant est stable, donc les actions et les
  rapports liés survivent. Les attributs de référentiel (libellé, périodicité,
  réalisateurs) sont réalignés à chaque passage ; les dates, elles, suivent
  trois règles :
  - cycle ouvert (`dateRealisee === null`) : `datePrevue` **ne bouge pas**.
    Une régénération n'a aucune raison d'effacer un retard accumulé ;
  - cycle soldé et période non écoulée : `datePrevue` = `dateRealisee +
    périodicité`, le résultat du contrôle (`realisee_*`) est conservé ;
  - cycle soldé et période écoulée : nouveau cycle — `dateRealisee` repasse à
    `null`, statut `depassee`. C'est ce qui empêche l'outil d'afficher
    « Conforme » sur un contrôle annuel vieux de deux ans. Les rapports du
    cycle précédent restent attachés à la même ligne ;
- **ligne devenue non applicable** (équipement désactivé, régime modifié,
  obligation retirée du référentiel) :
  - sans aucune trace (ni rapport, ni action, ni `dateRealisee`) → suppression,
    rien n'est perdu ;
  - avec une trace → **archivage** : le libellé est préfixé de
    « Ne s'applique plus — ». La ligne, et donc la preuve, est conservée.

Le plan est appliqué dans **une seule `$transaction`**. Les créations passent
par `createMany({ skipDuplicates: true })` : deux régénérations concurrentes
(déclaration d'équipement dans un onglet, dépôt de rapport dans l'autre)
peuvent calculer la même insertion, la contrainte d'unicité tranche sans faire
échouer la transaction.

Le générateur reçoit un historique **vide** : il ne sert plus qu'à énumérer les
couples applicables et leurs attributs. Lui passer l'historique ferait
disparaître de sa sortie les obligations « mise en service » déjà réalisées,
qui seraient alors prises pour des obligations retirées — et archivées à tort.

Le résultat « non vérifiable » ne vaut plus réalisation :
`STATUT_DEPUIS_RESULTAT` ne couvre plus que les trois résultats qui attestent
d'un contrôle effectué. Une visite infructueuse conserve son rapport (le
prestataire s'est déplacé, la pièce compte), n'écrit pas `dateRealisee`, et ne
repousse pas l'échéance d'une période entière.

### B. La suppression d'un équipement est logique dès qu'il porte un historique

- aucune vérification porteuse de trace → suppression physique, rien à
  conserver ;
- sinon → `actif = false`. L'équipement sort des listes
  (`listerEquipementsDeLEtablissement`) et du matching
  (`genererCalendrier` charge `equipements: { where: { actif: true } }`), il ne
  génère donc plus d'échéance. Son historique reste consultable et opposable.

`reactiverEquipement` fait le chemin inverse : les obligations réapparaissent,
et les lignes archivées reprennent leur libellé normal puisque celui-ci est
réécrit depuis le référentiel.

### C. La suppression d'un établissement ou d'une entreprise est refusée, avec explication

Un comptage applicatif des `DuerpVersion` précède la suppression, et un
`try/catch` sert de filet si une version est figée entre-temps. Le refus est
rendu sous forme de résultat typé (`{ statut: "refus", message, exportHref }`),
jamais sous forme d'exception : le message explique l'obligation de
conservation, cite le texte, précise qu'elle prime sur le droit à l'effacement,
et oriente vers l'export du dossier de conformité.

### D. Les enchaînements d'écritures sont transactionnels

- `cloturerIntervention` (ADR-009) : clôture du ticket et remise à zéro de la
  cotation du risque dans une même `$transaction`. Séparées, un échec sur la
  seconde laissait un ticket « fait » — donc non reclôturable — et un risque
  jamais reproposé à réévaluation. La boucle se cassait définitivement.
- `supprimerRapport` : suppression, recomptage et requalification de la
  vérification dans une transaction ; le fichier n'est libéré **qu'après** le
  commit. Un fichier orphelin se rattrape ; une ligne de registre sans pièce,
  non.
- `ajouterAnalyseLegionelle` : nettoyage best-effort du fichier si l'insert
  échoue, comme le faisaient déjà les trois autres modules d'upload.

### E. Un échec de régénération est remonté à l'interface

`regenererCalendrierSilencieux` avalait l'exception avec un `console.error` :
l'utilisateur voyait son équipement enregistré et repartait en croyant ses
obligations à jour. L'échec est désormais rendu comme avertissement explicite,
avec la marche à suivre (« page Calendrier → Actualiser »), sans faire passer
pour un échec une mutation qui a réussi.

## Conséquences

**Positives**

- Aucune action corrective, aucun rapport, aucune version de DUERP ne peut plus
  disparaître par effet de bord d'une régénération ou d'une suppression.
- Les identifiants de vérification sont stables : les liens tiennent.
- La régénération est bon marché en régime établi (deux régénérations
  successives ne produisent aucune écriture) et vérifiable — le compteur
  `unchanged` en fait foi.
- L'outil cesse d'afficher « Conforme » sur un contrôle dont la période est
  écoulée.

**Coûts et limites assumés**

- **Pas de statut `archivee` en base.** L'enum Prisma `StatutVerification` n'a
  pas de valeur dédiée ; le marqueur d'archivage vit dans
  `libelleObligation`, qui est déjà un instantané texte du référentiel. Le
  statut d'une ligne archivée est donc **gelé** dans son dernier état connu.
  L'ajout d'une valeur d'enum (ou d'un booléen `applicable`) est un chantier de
  schéma, à trancher par le propriétaire de `prisma/schema.prisma`.
- **`dateRealisee` change de sens** : elle ne désigne plus « la dernière
  réalisation connue » mais « la réalisation du cycle en cours ». Le compteur
  « réalisées sur 12 mois » de `compterEtatCalendrier`, qui s'appuie sur elle,
  sous-compte donc les obligations à périodicité courte dont le cycle a été
  relancé. Le comptage juste se fait sur `RapportVerification.dateRapport`.
- **Le basculement de cycle a lieu à la régénération**, pas à la seconde près.
  Entre l'échéance atteinte et la régénération suivante, une ligne peut rester
  affichée « réalisée ». `estVerificationEnRetard` (`src/lib/dates/retard.ts`)
  court-circuite sur `dateRealisee !== null` : sous la nouvelle sémantique, ce
  prédicat gagnerait à tenir compte aussi de `datePrevue`.
- Un équipement désactivé n'est plus atteignable depuis l'interface tant que
  celle-ci n'expose pas `listerEquipementsDesactives` et
  `reactiverEquipement`.

### E. Le calendrier sait avec quelle version du référentiel il a été généré

Le référentiel de conformité vit en TypeScript versionné (ADR-003), mais ses
effets sont figés en base : chaque `Verification` copie un libellé, une
périodicité et une liste de réalisateurs au moment de sa génération.

La réconciliation savait déjà réaligner ces attributs, et traiter correctement
une obligation retirée du référentiel : la ligne est supprimée si elle ne porte
aucune preuve, marquée « Ne s'applique plus » sinon. Ce qui manquait, c'était le
**déclencheur**. Rien ne relançait la réconciliation après une évolution du
référentiel : elle ne survenait qu'au hasard d'une mutation d'équipement, d'un
dépôt de rapport, ou d'un clic sur « Actualiser ». Deux établissements
identiques pouvaient donc afficher deux échéances différentes selon la date de
leur dernière modification, et les lignes portant une obligation supprimée
restaient en base avec `obligationParId() === undefined` — donc `domaine: null`,
donc invisibles des filtres du registre et du dossier remis à l'inspecteur.

Décision :

- `REFERENTIEL_VERSION` est déclarée dans `lib/referentiels/conformite/index.ts`
  et doit être incrémentée à chaque modification du référentiel. Un test compare
  une empreinte déterministe du contenu (id, périodicité, libellé, réalisateurs)
  à une valeur enregistrée : l'oubli fait échouer la suite.
- `Etablissement.referentielVersionCalendrier` mémorise la version appliquée
  lors de la dernière réconciliation. Elle est écrite **dans la transaction du
  plan** : si celui-ci échoue, l'établissement reste marqué comme
  désynchronisé et sera repris, plutôt que d'être considéré à tort comme à jour.
- `NULL` signifie « jamais réconcilié depuis l'introduction du mécanisme » et
  déclenche donc le rattrapage. La migration ne backfille volontairement rien.
- Le rattrapage a lieu à l'affichage du calendrier, à côté du cas historique
  « calendrier vide alors que des équipements sont déclarés ». C'est sans risque
  puisque la réconciliation est idempotente et ne détruit jamais une ligne
  portant un rapport, une action ou une date de réalisation.

Limite assumée : le rattrapage est paresseux. Un établissement dont personne
n'ouvre le calendrier reste sur l'ancienne version — ses échéances ne sont pas
fausses pour autant, elles sont simplement calculées avec le référentiel
précédent. Un balayage à la migration conviendrait mieux le jour où le parc
d'établissements le justifiera.

## Alternatives écartées

- **Passer `Action.verificationId` en `SetNull`** — impossible : la CHECK
  `Action_origine_xor` (ADR-002) refuserait la mise à jour.
- **Conserver `delete` + `create` en réattachant les actions après coup** —
  fenêtre pendant laquelle les actions n'existent plus, identifiants perdus,
  et rien pour les rapports.
- **Une corbeille (`deletedAt`) généralisée** — plus lourd que le besoin :
  seuls trois objets portent une obligation de conservation, et `actif`
  existait déjà pour les équipements.
- **Un `upsert` Prisma par couple** — littéralement le motif demandé, mais
  plusieurs centaines de requêtes dans une transaction interactive. La
  réconciliation préalable ramène le régime établi à zéro écriture.
