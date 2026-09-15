# Dépouillement des natures — les 116 obligations, une par une

Lot exécuté le **2026-08-31**, branche `feat/nature-obligation`, à partir de
`origin/integration/2026-08-31` (`0590cae`), dans un worktree dédié avec son
propre `node_modules`.

Deux commits : l'audit qui l'a déclenché
(`docs/revues/rapport-audit-sans-surface.md`), puis le lot lui-même.

**Vérification** : `npx tsc --noEmit` propre · `npx eslint src` → un seul
avertissement, le `normaliserFormData` préexistant · `npx vitest run` →
**1775 tests verts** (1767 avant, plus les 8 de `nature.test.ts`).
`REFERENTIEL_VERSION` **n'a pas bougé**, et `EMPREINTE_ATTENDUE` non plus : c'est
voulu et c'est testé (§ 5).

---

## Ce que le lot livre

- `NatureObligation` — quatre valeurs, celles de l'ADR-022, désormais énumérées.
- `ObligationCommune.nature` — **requis**, posé sur les 116.
- `ObligationCommune.pieceAttendue` — **requis**, `string | null`, non nul sur 16.
- `docs/adr/026-nature-obligation.md`.
- `nature.test.ts` — 8 tests de **règles**, chacun éprouvé en injectant la
  violation qu'il prétend interdire (§ 5).
- Une note de `notesInternes` sur chacune des **55** obligations dont la nature
  ne va pas de soi, avec le verbatim ou le renvoi qui la fonde.

## La réponse en un tableau

|  | rythme chiffré | `mise_en_service_uniquement` | `autre` | total |
|---|---|---|---|---|
| **échéance récurrente** | 61 | — | **4** | 65 |
| **état permanent** | — | **1** | 29 | 30 |
| **obligation ponctuelle** | — | 6 | **3** | 9 |
| **obligation événementielle** | — | 5 | **7** | 12 |
| total | 61 | 12 | 43 | 116 |

**Les deux valeurs de périodicité sans rythme recouvrent chacune trois natures.**
C'est le fait qui rendait l'écran inécrivable, et il est maintenant une donnée.

Les cases en gras sont celles qu'aucune déduction depuis `periodicite` n'aurait
trouvées.

---

## 1. Les 43 sans périodicité, nature par nature

La colonne *Ce qui la fonde* cite le texte tel que le référentiel le porte
(`description`, `note` de référence, verbatim de `notesInternes`). **Aucun
article n'a été relu sur Légifrance dans ce lot** — voir § 6.

### 1.1 État permanent — 29

Un état à constituer puis maintenir. Aucun acte à refaire à date : soit il est
là, soit il ne l'est pas. **C'est la seule nature pour laquelle une case à cocher
unique est un énoncé juste.**

| Obligation | Porteur | Ce qui la fonde | `pieceAttendue` |
|---|---|---|---|
| `elec-travail-consignation-registre` | équipement | R. 4226-19 — les résultats « sont **consignés sur un registre** » | registre de sécurité |
| `elec-travail-habilitation-personnel` | équipement | « un **état à maintenir en permanence**, pas un rendez-vous » (sa propre description) | — |
| `incendie-travail-moyens-lutte` | équipement | R. 4227-29 — « **maintenus en bon état** de fonctionnement » | — |
| `incendie-travail-consigne-affichee` | établissement | R. 4227-37 — la consigne est « **établie et affichée** » | consigne de sécurité incendie |
| `incendie-registre-securite` | établissement | R. 4227-39 et R. 143-44 CCH — un registre **tenu** | registre de sécurité |
| `ascenseur-entretien-contrat` | équipement | R. 134-6 — entretien « dans le cadre d'un **contrat écrit** » | contrat d'entretien |
| `ascenseur-carnet-entretien` | équipement | R. 134-7 III — carnet « **tenu à jour** », conservé toute la vie de l'appareil | carnet d'entretien |
| `ascenseur-telealarme-liaison` | équipement | R. 134-1 à -5 — un service d'intervention « disponible **en permanence** » | — |
| `porte-auto-dossier-maintenance` | équipement | Arrêté 21/12/1993 art. 8-9 — dossier « constitué et tenu à jour », conservé « pendant toute la durée d'exploitation » | dossier de maintenance |
| `porte-auto-maintien-en-etat` | équipement | R. 4224-12 — « **maintenus en bon état** de fonctionnement » | — |
| `esp-dossier-suivi` | équipement | Arrêté 20/11/2017 art. 6 — un dossier permettant de retrouver « à tout moment » l'historique | dossier d'exploitation |
| `esp-personnel-formation` | équipement | R. 4323-1 à -5 — les opérateurs **sont** informés et formés | — |
| `stockage-dangereux-retention` | équipement | R. 4412-11 — récipients « **placés sur** une capacité de rétention étanche » | — |
| `levage-registre-securite-consignation` | équipement | R. 4323-25 — le résultat « **est consigné** sur le ou les registres de sécurité » | registre de sécurité |
| `formation-securite-etablissement-manutention` | établissement | R. 4541-8 — ni rythme ni fait déclencheur ; l'employeur « **fait bénéficier** » les travailleurs concernés | — |
| `sante-travail-etablissement-adhesion-spst` | établissement | L. 4622-1 — « les employeurs **organisent** des services » ; aucun acte périodique | — |
| `sante-travail-etablissement-fiche-entreprise` | établissement | R. 4624-46 — « établit et **met à jour** » sans rythme, et l'employeur n'en est pas le réalisateur | fiche d'entreprise |
| `secours-etablissement-materiel` | établissement | R. 4224-14 — « obligation de résultat **permanente** » (sa propre description) | — |
| `secours-etablissement-mesures` | établissement | R. 4224-16 — mesures prises et « **consignées dans un document** tenu à la disposition de l'inspection » | document d'organisation des premiers secours |
| `prevention-etablissement-salarie-designe` | établissement | L. 4644-1 I — il doit y avoir, à tout moment, quelqu'un de désigné | — |
| `prevention-etablissement-cse` | établissement | L. 2311-2 — mise en place ; le renouvellement des mandats n'est pas dans l'article encodé | — |
| `prevention-etablissement-reglement-interieur` | établissement | L. 1321-1 1° — dit ce que le règlement **fixe**, aucun acte périodique | règlement intérieur |
| `information-etablissement-affichages-obligatoires` | établissement | D. 4711-1 — « l'employeur **affiche** […] l'adresse et le numéro d'appel » | — |
| `information-etablissement-avis-acces-duerp` | établissement | R. 4121-4 dernier al. — « un avis […] **est affiché** à une place convenable » | — |
| `locaux-etablissement-installations-sanitaires` | établissement | R. 4228-1 — « **met à la disposition** des travailleurs les moyens d'assurer leur propreté » | — |
| `locaux-etablissement-eau-potable` | établissement | R. 4225-2 — « **met à disposition** […] de l'eau potable et fraîche » | — |
| `locaux-etablissement-local-restauration` | établissement | R. 4228-22 — « **met à leur disposition** un local de restauration » | — |
| `locaux-etablissement-emplacement-restauration` | établissement | R. 4228-23 — « **met à leur disposition** un emplacement » | — |
| `conduite-salarie-autorisation` | salarié | R. 4323-56 al. 1 — aucune durée de validité ; l'autorisation vaut « tant qu'elle n'est pas retirée » | autorisation de conduite |

### 1.2 Échéance récurrente sans rythme écrit — 4

**Elles reviennent, et le texte ne dit pas à quel rythme.** Une déclaration
unique ne les solde pas. C'est la catégorie qu'aucun tri sur `periodicite`
n'aurait su distinguer de la précédente.

| Obligation | Porteur | Ce qui la fonde |
|---|---|---|
| `incendie-erp-5-visite-commission` | équipement | PE 37 — les ERP de 5ᵉ catégorie à locaux à sommeil « sont visités **tous les cinq ans** ». Le rythme est écrit ; la périodicité, elle, est restée `autre` — défaut nommé au § 4 |
| `stockage-dangereux-verification-etancheite` | équipement | R. 4412-11 — l'exploitant « vérifie **régulièrement** l'état du stockage » |
| `stockage-dangereux-formation-personnel` | équipement | R. 4412-38 — formation « **renouvelée régulièrement** et lors de tout changement notable » |
| `formation-securite-etablissement-organisation` | établissement | L. 4141-2 — formation « **répétée périodiquement** dans des conditions déterminées par voie réglementaire ou par convention ou accord collectif » |

Les deux dernières portent aussi un titre événementiel ; la règle de résolution
de l'ADR-026 § 3 range `echeance_recurrente` d'abord, parce que c'est le rythme
qui commande le suivi.

### 1.3 Obligation événementielle — 7

**Elles se redéclenchent sur un fait que le produit n'observe pas.** Une case
cochée mentirait à la première survenance.

| Obligation | Porteur | Le fait déclencheur |
|---|---|---|
| `froid-controle-etancheite-apres-modification` | équipement | R. 543-79 al. 2 — « toute modification affectant le circuit frigorifique », toute réparation de fuite. Sa note le disait déjà : « un événement […] que l'outil n'observe pas » |
| `stockage-dangereux-fiches-donnees` | équipement | R. 4412-38 — information « actualisée **à chaque changement** » (second titre ; le premier est l'accès permanent) |
| `formation-securite-etablissement-information` | établissement | R. 4141-2 — « lors de l'embauche et **chaque fois que nécessaire** » |
| `formation-securite-etablissement-travail-sur-ecran` | établissement | R. 4542-16 — « **chaque fois que l'organisation du poste est modifiée** de manière substantielle » (second titre ; le premier est ponctuel) |
| `co-activite-etablissement-protocole-securite` | établissement | R. 4515-9 — le protocole unique ne vaut que pour des opérations répétitives « impliquant **les mêmes entreprises** », et « tant que les conditions de déroulement n'ont pas subi de **modification significative** » |
| `formation-securite-salarie-accueil` | salarié | L. 4141-2 et R. 4141-15 — **changement de poste ou de technique**, affectation à l'une des tâches énumérées |
| `conduite-salarie-formation` | salarié | R. 4323-55 — formation « complétée et réactualisée **chaque fois que nécessaire** » |

### 1.4 Obligation ponctuelle — 3

Faites une fois, elles ne se refont pas. Une déclaration unique les solde.

| Obligation | Porteur | Ce qui la fonde |
|---|---|---|
| `stockage-dangereux-declaration-icpe` | équipement | « **Étape de qualification initiale.** Une fois le régime connu… » (sa propre note) |
| `formation-securite-salarie-designe-competent` | salarié | L. 2315-17 renouvelle après quatre ans de **mandat exercé** ; un salarié désigné n'en détient aucun. Aucun autre texte ne date le renouvellement |
| `secours-salarie-secouriste` | salarié | R. 4224-15 — aucune durée de validité au Code ; les vingt-quatre mois cités partout viennent du dispositif INRS/CNAM |

---

## 2. Les 12 `mise_en_service_uniquement` — la valeur recouvre trois natures

C'est la seconde découverte du dépouillement, et elle n'était pas dans le brief.

### Ponctuelles — 6 (le cas que le nom de la valeur décrit)

`aeration-travail-mise-en-service` (« au plus tard un mois après la mise en
service ») · `cuisson-erp-verification-initiale` (GC 22 § 1) ·
`esp-declaration-mise-en-service` (avant exploitation) ·
`levage-examen-adequation-mise-en-service` (« avant première mise en service ») ·
`levage-epreuve-initiale-fonctionnement` (« avant mise en service ») ·
`froid-controle-etancheite-mise-en-service` (R. 543-79 al. 1).

### Événementielles — 5

| Obligation | Le second titre, ou le seul |
|---|---|
| `elec-travail-mise-en-service` | R. 4226-14 — « à la mise en service **et après toute modification de structure** » |
| `elec-erp-mise-en-service` | EL 19 § 2 — installations « neuves **ou modifiées** » |
| `porte-auto-verification-initiale` | « à la mise en service **ou après modification** » |
| `esp-intervention-reparation` | Arrêté 20/11/2017 art. 26-28 — **aucun titre de mise en service** : uniquement « après toute intervention notable » |
| `levage-remise-en-service-apres-reparation` | R. 4323-28 et art. 20-I — démontage/remontage, modification, changement de site, changement de configuration, **suite d'un accident** : cinq faits |

Pour les deux dernières, la périodicité `mise_en_service_uniquement` est un
**tenant-lieu** : elle produit une ligne unique, ce qui est le bon nombre, mais
le nom de la valeur dit le contraire de ce que l'obligation fait.

### État permanent — 1, et c'est un défaut

`porte-auto-portail-piete-coulissant`. Sa description l'écrit depuis le
2026-08-26 : « **C'est une exigence d'installation, non une échéance.** » Le
dispositif à sécurité positive doit être là et le rester ; il n'y a aucun acte à
faire à la mise en service. Voir § 4.

---

## 3. Les 61 à rythme chiffré

Toutes `echeance_recurrente`, sans exception, et **c'est une règle, pas un
constat** : un texte qui écrit une durée impose de refaire l'acte. Elle est
verrouillée par le premier test de `nature.test.ts`, qui échoue dès qu'une
périodicité chiffrée est posée sur une autre nature.

Deux d'entre elles portent malgré tout une `pieceAttendue`, parce que leur
article impose un **écrit** en plus de l'acte :

- `incendie-travail-exercice-semestriel` → « registre des exercices et essais »
  (R. 4227-39 : « leur date et leurs observations **sont consignées sur un
  registre** ») — c'est l'obligation qui porte déjà
  `transmet: modele_absent → ExerciceSecurite` ;
- `sante-travail-etablissement-liste-postes-risques` → « liste des postes à
  risques particuliers » (R. 4624-23 III, « chaque inscription est **motivée par
  écrit** »).

---

## 4. Ce que le dépouillement a trouvé et n'a pas corrigé

**Deux incohérences périodicité ↔ nature.** Elles sont nommées dans la note de
leur ligne, pas corrigées :

1. `incendie-erp-5-visite-commission` — récurrente, et `PE 37` en écrit le
   rythme : cinq ans. La condition `dessertLocauxSommeil` restreint déjà la ligne
   aux établissements que PE 37 vise. La périodicité devrait donc pouvoir passer
   à `quinquennale`. **Non fait** : une périodicité se pose sur un verbatim, et
   je n'ai relu aucun texte à la source dans ce lot. À reprendre avec la
   relecture réglementaire — en gardant que le maire ou le préfet peut augmenter
   la fréquence par arrêté, ce qui relève d'une prescription particulière
   (ADR-035) et non du référentiel.
2. `porte-auto-portail-piete-coulissant` — état permanent portant
   `mise_en_service_uniquement`. **Non fait** : changer la périodicité déplace
   des lignes chez tous les utilisateurs équipés d'un portail, et cela se décide
   pour soi-même.

**Deux natures posées contre le mot de leur propre description.**
`formation-securite-etablissement-organisation` et
`formation-securite-etablissement-information` sont toutes deux qualifiées de
« permanentes » par leur `description`, alors que leurs articles écrivent
« répétée périodiquement » et « chaque fois que nécessaire ». J'encode le texte,
pas la description — mais je n'ai pas réécrit les descriptions : ce sont des
textes relus, et les toucher demanderait de rouvrir leur relecture. Le désaccord
et son motif sont dans les `notesInternes`.

**Une correction à la carto.** `docs/carto-obligations-hors-equipement.md` range
le protocole de sécurité (E14) en `PERM`. `R. 4515-9`, lu en entier, dit le
contraire. La ligne est encodée `evenementielle` ; le document n'est pas réécrit
ici, la note de l'obligation porte la correction.

**Dix obligations portent un second déclencheur que le produit n'observe pas.**
Les cinq du § 2 (événementielles à titre de mise en service), plus
`stockage-dangereux-fiches-donnees`,
`formation-securite-etablissement-travail-sur-ecran`,
`formation-securite-etablissement-information`, `formation-securite-salarie-accueil`
et `stockage-dangereux-formation-personnel`. Une forme
`Transmission.declencheur_absent` les rendrait comptables comme
`attribut_absent` rend comptables les attributs manquants. **Non créée** : elle
toucherait l'ADR-024, et la nature `evenementielle` suffit déjà à empêcher la
faute que ce lot devait empêcher. C'est une piste, pas un manque silencieux.

**Deux réserves de même famille, sur des faits que le produit observe
pourtant.** `secours-salarie-secouriste` et
`prevention-etablissement-salarie-designe` redeviennent dues quand la personne
formée ou désignée quitte l'effectif — un fait que `Salarie.actif` porte déjà.
Rien ne s'en sert. Ce n'est pas un défaut de nature ; c'est un rapprochement qui
n'est pas fait, et il est signalé dans les deux notes.

---

## 5. Les tests, et comment chacun a été cassé

`nature.test.ts`, huit tests, **aucune liste exhaustive d'identifiants** — une
liste se répare en recopiant la sortie, donc elle cesse de vérifier. Ce sont des
règles. Chacune a été éprouvée en injectant sa violation, puis rétablie :

| Garantie | Violation injectée | Résultat |
|---|---|---|
| Un rythme chiffré impose `echeance_recurrente` | `periodicite: "annuelle"` sur un état permanent (`locaux-sociaux.ts`) | **1 échec** — le bon |
| L'inverse est faux (des récurrentes sans rythme existent) | réalignement de toutes les natures sur la périodicité | **3 échecs** — celui-ci, plus les deux suivants |
| `autre` recouvre ≥ 3 natures | idem | idem |
| Les trois cas d'école portent trois natures différentes | idem | idem |
| `modele_absent` suppose `pieceAttendue` non nulle | `pieceAttendue: null` sur `incendie-travail-exercice-semestriel` | **1 échec** |
| Une pièce attendue porte un nom | `pieceAttendue: "   "` | **1 échec** |
| La nature ne déplace pas l'empreinte | `o.nature` ajouté au corps d'`empreinteReferentiel` | **1 échec** |
| Une périodicité, elle, déplace l'empreinte | *(contre-test du précédent, pour qu'il ne soit pas vrai d'une empreinte aveugle)* | — |

Le quatrième test nomme trois identifiants, et c'est assumé : il attend **trois
valeurs différentes** sur trois lignes qui portaient la même avant ce lot. Ce
n'est pas une liste, c'est une discrimination — elle ne se répare pas en
recopiant.

---

## 6. Ce que je n'ai pas pu établir, et deux corrections à ce qui m'a été demandé

### La correction à deux caractères n'en était pas une, et le refus avait raison

Il m'était demandé de faire déclarer `modele_absent` à
`secours-etablissement-mesures` (R. 4224-16) et
`co-activite-etablissement-protocole-securite` (R. 4515-4), « alors que la
nomenclature existe au registre d'écart ».

**Elle n'existe pas.** Les huit entrées du § 6 de
`docs/registre-securite-ecart.md` ont été lues une à une le 2026-08-31 —
`ExerciceSecurite`, `PersonnelSecurite`, `ControleAdministratif`,
`EvenementRegistre`, `AppareilInventaire`, `ContactUtile`,
`VerificationConstruction`, `PieceJointeRegistre` — et **aucune ne couvre** le
document d'organisation des premiers secours ni le protocole de sécurité de
chargement. Pour une raison de fond, et pas par oubli : ce document est l'écart
d'un **registre de sécurité incendie**, où ni l'un ni l'autre de ces écrits n'a
sa place. Y ajouter deux entrées aurait étiré le document au-delà de son sujet.

Les deux obligations avaient donc raison de refuser, mot pour mot : « en inventer
un ici sans avoir vérifié sa nomenclature créerait une référence fantôme. »

Le manque qu'elles nommaient en prose est néanmoins comblé, autrement :
`pieceAttendue` nomme l'écrit que le **texte** exige, sans rien préjuger du
modèle Prisma qui le porterait. La donnée est lisible par une machine, et aucune
référence n'est inventée. Les deux notes le disent, pour que la même « correction
à deux caractères » ne soit pas retentée.

### La branche d'intégration n'a pas bougé

Il m'était demandé de refaire un `git fetch`, la branche portant désormais « les
corrections d'écran et une correction de `CLAUDE.md` ». Après `git fetch`,
`origin/integration/2026-08-31` est toujours à **`0590cae`**. Le commit `33d45ee`
(« Une répartition d'avant l'intégration, que git n'avait pas signalée ») est sur
`origin/fix/ecrans-dossier-neuf`, pas sur l'intégration. Ce lot est donc parti de
`0590cae` — sans conséquence, il ne touche que
`src/lib/referentiels/conformite/`, disjoint des écrans.

### Le reste

- **Aucun article n'a été relu sur Légifrance dans ce lot.** Toutes les natures
  sont établies sur le texte **tel que le référentiel le porte** — `description`,
  `note` de référence, verbatims relevés dans les `notesInternes` lors des lots
  précédents. Là où le référentiel ne tranche pas, je le dis dans la note plutôt
  que de deviner. C'est la limite principale de ce dépouillement, et elle est
  structurelle : le lot classe ce qui est encodé, il ne le re-vérifie pas.
- **La typologie à quatre natures a tenu**, y compris sur les trois cas désignés
  comme susceptibles de la faire craquer. Ce qui manquait n'était pas une
  cinquième valeur, c'était la **règle de résolution** des articles à deux titres
  et le droit de dissocier la nature de la périodicité. Je n'ai donc pas élargi
  la typologie de l'ADR-022, et je le signale parce que la consigne autorisait à
  le faire.
- **`.claude/CLAUDE.md` n'a pas été modifié**, et sa liste d'ADR s'arrête à 025 :
  il lui manque une ligne pour l'ADR-026. Je ne touche pas à ce fichier sur
  demande d'une autre session ; à ajouter par qui intègre.
- **Prettier n'est pas propre sur `src/lib/referentiels/conformite/`**, et ne
  l'était **pas non plus avant ce lot** (vérifié en stashant : les mêmes fichiers
  sont signalés, `veille.test.ts` compris, que je n'ai pas touché). Je n'ai donc
  pas lancé `--write` : reformater quinze fichiers aurait noyé le diff du lot
  sous du reformatage sans rapport. À trancher pour soi-même.
- **Aucun écran n'a été ouvert.** Ce lot ne touche à aucune surface ; la
  conséquence pour l'écran des états permanents est écrite ci-dessous, elle n'est
  pas constatée.

---

## 7. Ce que ça donne pour l'écran des états permanents

Le critère de sélection demandé, qui ne pouvait pas se proposer avant :

```ts
nature === "etat_permanent"
```

**Trente obligations** au référentiel — vingt-neuf en `periodicite: "autre"`,
plus `porte-auto-portail-piete-coulissant`, dont la périodicité est le défaut
connu du § 4. Sur un dossier donné, le compte se prend au moteur, jamais à la
main.

**Les quatorze autres des quarante-trois n'ont pas leur place sur cet écran**, et
c'est le chiffre qui manquait au brief : quatre reviennent à un rythme inconnu,
sept se redéclenchent sur un fait, trois sont soldées une fois. Leur offrir une
case à cocher à vie serait le mensonge que le champ existe pour empêcher. Il leur
faut une surface — trois surfaces, plus probablement — mais pas celle-là.

Et sur les trente qui restent, **douze portent une `pieceAttendue` non nulle**
(seize au référentiel entier). Sur celles-là, la règle « une déclaration
seule, aucune pièce » du brief demande à être rouverte : cocher « en place » sur
un registre de sécurité, un carnet d'entretien ou un règlement intérieur sans
rien derrière est exactement la déclaration-qui-ressemble-à-une-preuve que la
dernière section du même brief interdit. Le champ nomme les lignes concernées ;
l'arbitrage reste à faire.
