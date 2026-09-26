# Règles de matching équipements ↔ obligations

Ce document décrit la logique déterministe du moteur `src/lib/matching/`
(étape 5 du plan V2). Il est destiné au support, à l'audit et à quiconque
doit comprendre *pourquoi* l'outil indique qu'une obligation s'applique.

## Contrat

```typescript
determineObligationsApplicables(
  etablissement: EtablissementMatching,
  equipements: EquipementMatching[],
  options?: { obligations?: Obligation[] },
): ObligationApplicable[]
```

Le moteur est une **fonction pure** : pas d'I/O, pas d'horloge, pas
d'aléatoire. Deux appels avec les mêmes entrées donnent le même résultat.
C'est la condition d'auditabilité posée par CLAUDE.md (principe zéro-IA).

Chaque obligation retenue sort avec :

- `equipementsConcernes` : la liste des équipements qui déclenchent la règle
  pour cet établissement.
- `raisons` : les explications textuelles (mode *explain*) qui permettent à
  l'UI d'afficher « cette obligation s'applique parce que… ».

## Algorithme

Pour chaque `Obligation` du référentiel :

1. **Typologie** — la typologie de l'obligation doit être compatible avec
   celle de l'établissement (cf. section suivante). Sinon, l'obligation est
   rejetée.
2. **Équipements** — au moins un `Equipement` de l'établissement doit avoir
   sa catégorie dans `obligation.categoriesEquipement`.
3. **Conditions** — si l'obligation a des `conditions[]`, pour chaque
   équipement candidat, on vérifie que **toutes** les conditions dont la
   `categorie` cible la catégorie de cet équipement sont satisfaites par
   lui.
4. Si au moins un équipement passe les étapes 2 et 3, l'obligation est
   retenue avec la liste des équipements déclencheurs et les raisons
   textuelles.

## Typologie (ADR-004)

> **Amendement 2026-08 — correction ascenseurs.** Les critères de régime
> **positifs** (`travail: true`, `erp: true | {categories}`,
> `igh: true | {classes}`, `habitation: true`) s'appliquent désormais
> **en OU entre eux** : l'établissement doit en satisfaire au moins un.
> Une obligation déclarant `{ travail: true, erp: true, igh: true }`
> (les 6 obligations ascenseurs) s'applique donc aux établissements de
> travail **ou** ERP **ou** IGH — c'était l'intention rédactionnelle, mais
> l'ancien moteur évaluait ces lignes en ET, si bien qu'un ERP non-IGH
> avec ascenseur ne recevait aucune obligation ascenseur. Les critères
> **négatifs** (`travail: false`, `erp: false`, …) restent des exclusions
> en ET, et `effectifMin`/`effectifMax` restent en ET avec le reste.
> Sans effet sur le reste du référentiel : toutes les autres obligations
> ne déclarent qu'un seul régime positif, et pour un critère unique
> OU ≡ ET.

> **Amendement 2026-08 — restriction par type d'exploitation ERP.** La
> `TypologieApplication.erp` accepte désormais `{ types: [...] }`, en plus de
> `{ categories: [...] }`, et les deux se cumulent. Jusqu'ici le `typeErp`
> (M, N, O, W…) était demandé au dirigeant à l'inscription, stocké en base et
> transmis au moteur — mais **jamais lu** : aucune obligation propre à un type
> d'exploitation ne pouvait être exprimée. Ce n'était pas seulement un champ
> mort, c'était un plafond : impossible d'ouvrir un secteur avec hébergement
> ou public vulnérable sans ce filtre. La restriction se lit comme celle de
> catégorie — **en ET**, avant la disjonction, et un ERP dont le type est
> inconnu est rejeté.
>
> **À n'employer que si le texte fondateur vise explicitement un ou plusieurs
> types.** Les articles des dispositions générales du règlement de sécurité
> (EL, MS, EC, DF, CH, GC, GZ, GE) s'appliquent à tous les types : y ajouter
> une liste serait une restriction inventée (règle n°6). Aucune obligation du
> référentiel n'utilise `types` à ce jour — le mécanisme existe, son premier
> usage devra être sourcé article par article.

> **Amendement 2026-09-02 — exclusion par type d'exploitation ERP
> (`typesExclus`), et le premier usage de `types`.** Les deux entrent
> ensemble, par le tableau de `GE 4 § 1` : la périodicité des visites de
> commission de sécurité y croise le type et la catégorie, six blocs, deux
> valeurs (trois ans, cinq ans). C'est une exception nommée à la phrase
> ci-dessus — `GE` est bien une disposition générale, et cet article-là
> s'applique bien à tous les types, mais il ne leur donne pas le même rythme.
>
> Le tableau s'encode en six obligations qui forment une **partition** des
> 1ʳᵉ à 4ᵉ catégories : chaque établissement en reçoit exactement une. Les
> lignes à cinq ans nomment leurs types (`types`) ; les lignes à trois ans
> écrivent le **complément** (`typesExclus`). Écrire le complément en
> énumérant ses types aurait creusé un faux négatif muet, et c'est tout
> l'objet du champ : `types` rejette l'ERP dont le `typeErp` est inconnu,
> `typesExclus` le **retient**. L'asymétrie est délibérée et va dans le même
> sens que la première — dans les deux cas, ne pas savoir ne retire jamais
> une ligne d'un calendrier. Un ERP de 3ᵉ catégorie qui n'a pas précisé son
> activité garde donc ses trois ans, le rythme court.
>
> Les deux champs sont **mutuellement exclusifs** sur une même obligation
> (test dédié) : ils écrivent la même frontière dans les deux sens, et les
> poser ensemble garantit qu'elles divergeront — en silence, le moteur les
> évaluant en ET.

> **Amendement 2026-08 — restrictions de catégorie en ET.** La disjonction
> ci-dessus portait un piège : une obligation déclarant
> `{ travail: true, erp: { categories: ["N1"] } }` aurait été matchée par un
> ERP de 5ᵉ catégorie employeur *via la seule branche « travail »*,
> contournant en silence la restriction de catégorie. Les restrictions de
> **catégorie ERP** et de **classe IGH** sont donc évaluées **en ET**, avant
> la disjonction : si l'établissement relève du régime restreint (il *est*
> ERP, il *est* IGH) mais tombe hors de la liste — y compris parce que sa
> catégorie est inconnue —, l'obligation est rejetée quels que soient les
> autres régimes. Un établissement qui ne relève pas du régime restreint
> (un bureau non-ERP) n'est, lui, pas concerné : il est simplement hors de
> cette branche.

La `TypologieApplication` d'une obligation agrège plusieurs critères.
Les lignes de régime (travail/ERP/IGH/habitation) s'appliquent **en OU
entre elles** ; les exclusions (`false`), les restrictions de catégorie
ou de classe, et l'effectif s'appliquent **en ET** :

| Champ            | Critère (régimes : matché si… / effectif : requis)                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `travail: true`  | matché si `estEtablissementTravail = true`                                                                                                                           |
| `erp: true`      | matché si l'établissement est ERP (toutes catégories)                                                                                                                |
| `erp: { categories: [...] }` | matché si l'établissement est ERP **et** sa `categorieErp` appartient à la liste                                                                         |
| `erp: { types: [...] }`      | matché si l'établissement est ERP **et** son `typeErp` appartient à la liste (cumulable avec `categories`)                                               |
| `erp: { typesExclus: [...] }` | matché si l'établissement est ERP **et** que son `typeErp` n'appartient PAS à la liste — un `typeErp` non renseigné n'est pas exclu (cumulable avec `categories`, jamais avec `types`) |
| `igh: true`      | matché si l'établissement est IGH                                                                                                                                    |
| `igh: { classes: [...] }`    | matché si l'établissement est IGH **et** sa `classeIgh` appartient à la liste — **ou n'est pas renseignée**, auquel cas l'obligation est retenue « à confirmer » (2026-09-03, même dissymétrie que la famille : la question de la classe ayant été retirée du produit, tout dossier neuf porte `null`, et rejeter reviendrait à faire disparaître en silence la première obligation qu'on bornerait ainsi)                                                                            |
| `habitation: true`| matché si `estHabitation = true`                                                                                                                                    |
| `effectifMin`    | requis (ET) : l'effectif de la maille (`effectifMaille`) ≥ `effectifMin` (bornes incluses). Maille `entreprise` : `Entreprise.effectif` (L. 1111-2, apprentis non compris, L. 1111-3) ; sous le seuil alors que `effectifSurSite` l'atteint → retenu « à confirmer ». Maille `etablissement` : `effectifSurSite` (C37) |
| `effectifMax`    | requis (ET) : l'effectif de la maille (`effectifMaille`) ≤ `effectifMax` (bornes incluses)                                                                                                    |
| `personnesPresentesMin` | requis (ET) : le total « personnes occupées ou réunies » (salariés + public) doit l'atteindre. Le chiffre déclaré tranche dans les deux sens ; à défaut le moteur ne connaît que des **bornes basses** — plancher de public de la catégorie d'ERP (1ʳᵉ 1501, 2ᵉ 701, 3ᵉ 301 ; la 4ᵉ et la 5ᵉ n'en donnent pas), puis `effectifSurSite`. Au-dessus d'une borne : applicable. En dessous : « à confirmer » si l'établissement est ERP, rejet s'il est de travail seul (pas de public, l'effectif est le total) |

**Règle importante** : si la typologie d'une obligation est vide (aucun
champ défini), elle est **rejetée**. C'est un garde-fou contre les
obligations mal rédigées — un test dédié le vérifie dans le référentiel.

### Forme normalisée : `erp: true` ou `erp: { categories }`

`erp: true` et `erp: { categories: ["N1", …, "N5"] }` ne sont **pas**
équivalents, alors que les deux formes cohabitaient dans le référentiel.
La seconde exige en plus que `categorieErp` soit renseignée : un ERP dont
la catégorie est inconnue perd l'obligation. Écrire une restriction qui
n'exclut rien revient donc à créer un faux négatif silencieux.

Convention retenue, verrouillée par un test :

- le texte ne restreint pas par catégorie → **`erp: true`** ;
- le texte restreint réellement → `erp: { categories: [...] }` avec la
  liste des seules catégories visées (jamais les cinq).

Même logique pour `igh: true` et `igh: { classes: [...] }`, et pour
`erp: { types: [...] }` : un test interdit de lister les 21 types, qui
reviendrait à écrire une restriction n'excluant rien tout en exigeant que
`typeErp` soit renseigné. Un test interdit symétriquement d'**exclure**
les 21 types : l'obligation ne resterait qu'aux ERP dont le type n'est pas
renseigné, ce qui ne veut rien dire.

### Cas du cumul ERP × IGH

Un établissement peut être ERP cat N1 **et** IGH classe GHZ en même temps.
Dans ce cas, toutes les obligations ERP applicables à sa catégorie **et**
toutes les obligations IGH applicables à sa classe sont cumulées. Les
domaines ne sont pas déduits par l'outil : la liste est la somme des
obligations qui matchent chaque ligne de typologie.

### Cas du registre de sécurité

L'obligation `incendie-registre-securite` porte `{ travail: true, erp: true }`.

Elle était modélisée sur le seul `travail: true`, au motif que tous les
établissements du périmètre emploient au moins un salarié, les références CCH
n'étant citées « que pour information ». Le raccourci a sauté le 2026-08-26 :
R. 143-44 fonde le registre en ERP par lui-même, indépendamment de la qualité
d'employeur, et il a été réécrit au 1ᵉʳ juillet 2026 par le décret n° 2025-1100
— ajout du 5° sur les dates des exercices, renvoi aux articles R. 141-10 et
R. 141-11. Une référence qu'on déclare décorative est une référence qu'aucun
audit ne relit : celle-ci avait deux mois de retard.

R. 146-35 (IGH) reste cité sans `igh: true`, mais parce que l'IGH est hors
périmètre produit — pas parce que la référence serait accessoire. À activer le
jour où l'IGH entre au périmètre.

**Limite connue.** `categoriesEquipement` ancre l'obligation à un extincteur ou
une alarme déclarés : un établissement qui n'a ni l'un ni l'autre ne reçoit
aucune ligne, alors que le registre est dû sans condition d'équipement. Le
moteur exige au moins une catégorie, parce que `Verification.equipementId` n'est
pas nullable. Corriger ce faux négatif est une décision de schéma, pas de
référentiel.

## Équipements : catégorie + conditions

Pour qu'une obligation s'applique, **au moins un équipement** de
l'établissement doit :

1. Avoir sa catégorie dans `obligation.categoriesEquipement`.
2. Satisfaire **toutes** les conditions de l'obligation dont la propriété
   `categorie` cible la catégorie de cet équipement.

Si aucune condition ne cible la catégorie d'un équipement, les conditions
sont considérées comme **triviallement satisfaites** pour lui.

### Conditions supportées

```typescript
// Condition sur une propriété numérique (ex. capacité de parking)
{
  type: "equipement_propriete_numerique",
  categorie: "VMC",
  propriete: "nbVehiculesParkingCouvert",
  operateur: ">",   // ">" | ">=" | "<" | "<=" | "=="
  valeur: 250,
}

// Condition sur une propriété booléenne (ex. présence groupe électrogène)
{
  type: "equipement_propriete_booleenne",
  categorie: "INSTALLATION_ELECTRIQUE",
  propriete: "aGroupeElectrogene",
  valeur: true,
}

// Condition « maintenue tant que l'utilisateur n'a pas répondu non »
{
  type: "equipement_propriete_non_infirmee",
  categorie: "VMC",
  propriete: "estVmcGaz",
}
```

Les propriétés lues sont celles du champ `caracteristiques` (JSON) de
l'équipement en base, renseigné par le formulaire de déclaration (étape 4).

### Propriété non renseignée : opt-in contre opt-out

C'est le point de sécurité du modèle. Deux comportements coexistent, et le
choix entre les deux n'est pas esthétique :

| Type de condition       | Propriété absente | Sémantique |
| ----------------------- | ----------------- | ---------- |
| `..._numerique`         | non satisfaite    | opt-in     |
| `..._booleenne`         | non satisfaite    | opt-in     |
| `..._non_infirmee`      | **satisfaite**    | opt-out    |

Le type d'une valeur incompatible (string au lieu de number) est traité
comme une absence, jamais comme une valeur « ignorée ».

**Règle de rédaction (amendement 2026-08).** Ajouter une condition à une
obligation **déjà publiée** de criticité ≥ 4 impose la forme
`non_infirmee`. Les équipements déjà en base n'ont évidemment pas la
nouvelle propriété : avec une condition stricte, ils perdraient tous
l'obligation, sans le moindre signal, à la prochaine régénération du
calendrier. Sur une obligation de criticité élevée, une sur-application
visible — que le dirigeant éteint en répondant « non » — vaut toujours
mieux qu'un faux négatif muet.

Côté formulaire, ces propriétés sont donc des questions à **trois états**
(oui / non / « je ne sais pas encore ») et non des cases à cocher : une
case décochée ne distingue pas « non » de « pas encore répondu ».

Trois conditions strictes sur des obligations de criticité ≥ 4 sont
antérieures à cette règle et explicitement tolérées
(`elec-erp-groupe-electrogene-annuel`,
`aeration-travail-locaux-pollution-specifique`,
`aeration-erp-ps-surveillance-qualite-air-sup-250`) : elles n'ont jamais
été appliquées sans réponse, donc personne ne peut les perdre. La liste
est figée dans les tests ; toute nouvelle entrée doit être justifiée.

### Exclusivité PS 32

Les deux obligations `aeration-erp-ps-surveillance-qualite-air-inf-250`
(biennale) et `…-sup-250` (annuelle) sont par construction **mutuellement
exclusives** sur une même VMC : les conditions sont `<= 250` et `> 250`. Si
la propriété `nbVehiculesParkingCouvert` n'est pas renseignée, aucune des
deux ne se déclenche — c'est le comportement attendu (l'utilisateur doit
répondre à la question du parking pour que la règle s'active).

## Mode explain

Pour chaque obligation retenue, le moteur produit une liste de raisons.
Exemples pour un restaurant ERP cat 5 avec hotte déclarée :

```
obligation: cuisson-erp-circuits-extraction-nettoyage
equipementsConcernes: [eq-hotte (Hotte cuisine)]
raisons:
  - "ERP"
  - "équipement déclenche la règle (Hotte cuisine)"
```

Ces raisons sont destinées à :

- **l'affichage en UI** : le détail d'une obligation dans le calendrier
  (étape 6) pourra les afficher dans un panneau « Pourquoi cette règle ? »
- **le support** : un utilisateur qui conteste une obligation doit pouvoir
  consulter la logique qui y mène, sans que le support ait à explorer le
  code
- **l'audit** : les raisons sont déterministes et reproductibles, ce qui
  est exigé pour un outil à valeur légale

## Conséquences pour le référentiel

Toute obligation qui entre dans `src/lib/referentiels/conformite/` doit :

1. Déclarer une `typologies` **non vide** (sinon rejetée par le moteur).
2. Déclarer au moins une catégorie dans `categoriesEquipement`.
3. Si sa portée réelle dépend d'un attribut (ex. présence de groupe
   électrogène), ajouter une `conditions[]` explicite — **pas** de logique
   implicite en commentaire `notesInternes`. Les `notesInternes` sont
   réservées à la documentation interne, pas à la logique d'application.

4. Ne pas dupliquer une obligation déjà présente. Deux entrées fondées sur
   le **même article** (`referencesLegales[0]`), pour la même catégorie
   d'équipement et la même périodicité, sont un doublon : elles produisent
   deux échéances pour un seul travail à faire et faussent les agrégats de
   conformité. Un test le vérifie. Deux exceptions, et elles se
   calculent plutôt qu'elles ne se déclarent : deux entrées distinguées par
   des `conditions` différentes, et deux entrées dont les typologies ERP sont
   **disjointes** — aucun établissement ne pouvant recevoir les deux, il n'y a
   pas de double échéance. C'est ce qui permet aux six lignes de `GE 4 § 1` de
   coexister sans six exceptions écrites à la main.
5. Si sa description énonce un seuil d'effectif, le déclarer en
   `effectifMin` / `effectifMax`, avec la maille que le texte compte
   (`effectifMaille` : `entreprise` ou `etablissement` — obligatoire, C37) — un seuil écrit en prose et jamais encodé
   est un seuil qui n'existe pas. Un test le vérifie également.

Les tests du moteur (`src/lib/matching/engine.test.ts`) et les tests de
cohérence du référentiel
(`src/lib/referentiels/conformite/conformite.test.ts`) vérifient ces règles.

## Limites connues

- **Filtrage par type ERP employé par un seul article, et il est nommé.**
  Depuis le 2026-09-02, les six lignes du tableau de `GE 4 § 1` emploient
  `types` et `typesExclus` ; **aucune autre obligation du référentiel ne
  restreint par type**, faute de texte sourcé qui vise explicitement un type
  d'exploitation. Le
  ramonage annuel des circuits d'extraction reste donc appliqué à tout ERP
  déclarant une hotte professionnelle, quel que soit son type — et c'est
  volontaire : une grande cuisine se trouve aussi bien en hôtel (O), en école
  (R) ou en établissement de soins (U) qu'en restaurant (N). Restreindre au
  type N y créerait des faux négatifs. C'est l'équipement déclaré qui trie,
  et la sur-application théorique sur un bureau qui déclarerait une hotte est
  assumée.
- **Frontière 4ᵉ / 5ᵉ catégorie ERP : encodée pour dix types, demandée pour
  les autres** (amendement 2026-08-25). La table `SEUILS_5E_CATEGORIE` de
  `src/lib/onboarding/deduction-erp.ts` porte, pour N, M, W, T, S, Y, X, V,
  O et P, le seuil de l'article « 1 » des dispositions particulières relu sur
  Légifrance (sous-sol / étages / total, effectif du **public seul**), avec
  l'article, la version et l'URL. `deduire4eOu5e` ne tranche que si toutes
  les données nécessaires sont fournies ; un niveau non renseigné, une
  condition hors effectif (X : surface et hauteur) ou un type hors table
  (R, U, L, J) renvoie `a_confirmer`. Restent non automatisables : R
  (sous-sol interdit, étages « quel que soit l'effectif »), U (seuil en
  lits), L (deux grilles selon la nature de la salle), J (capacité
  d'hébergement, type absent de l'enum).
- **Seuils PS × V des équipements sous pression : verdict indicatif, pas
  décision** (amendement 2026-08-25). Les seuils de champ vivent à l'article
  R. 557-14-1 du Code de l'environnement — pas dans l'arrêté du 20 novembre
  2017, qui ne pose des seuils que pour la déclaration de mise en service
  (art. 7). `verdictSuiviEnService` (`src/lib/equipements/esp.ts`) les
  applique à la famille, à PS et à V lus sur la plaque constructeur, et le
  formulaire affiche le résultat pour éclairer la réponse
  `estSoumisSuiviEnService`. Les cinq obligations restent bornées par cette
  réponse (opt-out) : aucune échéance de criticité élevée ne s'éteint sur la
  seule foi d'un chiffre saisi. Non encodés : tuyauteries (seuils en DN),
  groupe de fluide (qualification CLP par le dirigeant), régime du plan
  d'inspection.
- **Champ de R. 4227-34 (consigne, exercices semestriels) : disjonctif et
  compté sur les personnes présentes** (amendement 2026-08-25, **sens du repli
  corrigé le 2026-09-03**). Le moteur connaît deux données d'établissement,
  `personnesPresentesHabituellement` (salariés + public) et
  `manipuleMatieresR422722` (absent = non). Le premier absent ne se remplace
  plus par `effectifSurSite` : il se **borne par le bas**, et une borne basse
  ne conclut que vers le haut. La catégorie d'ERP en est une — dès la 3ᵉ, le
  public seul dépasse trois cents personnes —, l'effectif salarié en est une
  autre. Sous les deux, l'obligation est retenue « à confirmer » pour un ERP,
  qui reçoit du public par définition, et rejetée pour un établissement de
  travail seul, où l'effectif EST le total.
  `TypologieApplication` gagne `personnesPresentesMin` et `champR422734`,
  ce dernier étant le seul OU inter-critères du moteur, nommé d'après son
  article. Reste au dirigeant : la qualification R. 4227-22 des produits
  (lecture des FDS), « manipulées et mises en œuvre » vs simple stockage,
  l'appréciation de « habituellement ». Le déclencheur `ALARME_INCENDIE` reste
  une heuristique : l'alarme est une conséquence de R. 4227-34, pas sa
  condition.
- **Pas de logique temporelle** : le moteur détermine *quelles* obligations
  s'appliquent, pas *quand* la prochaine vérification est due. Cela relève
  de l'étape 6 (générateur de calendrier).
- **Ascenseurs en habitation pure : couverts** (amendement 2026-08-25). Les
  six obligations déclarent `habitation: true` — L. 134-1, L. 134-3 et
  R. 134-11 CCH visent « le propriétaire d'un ascenseur » sans distinction
  de bâtiment. Limite restante : l'onboarding exige `effectifSurSite ≥ 1`,
  un immeuble d'habitation sans salarié se déclare donc par la fiche
  établissement.
- **RIA : catégorie propre, branche EXTINCTEUR retirée** (amendement
  2026-08-25, soldé le 2026-09-03). `RIA` est une catégorie d'équipement ;
  `incendie-erp-ria-annuelle` ne vise plus qu'elle. La branche `EXTINCTEUR`
  bornée par l'opt-out `aRobinetsIncendieArmes` était transitoire, le temps de
  la reprise `scripts/reprise-ria.ts` ; celle-ci a été appliquée en production
  le 2026-08-25 (cinq RIA créés, cinq lignes de calendrier réaffectées, plus
  aucun extincteur porteur de la clé) et la branche est tombée le jour même.
  **La QUESTION du formulaire, elle, avait survécu neuf jours** — posée sur
  chaque extincteur alors que `true`, `false` et l'absence rendaient le même
  jeu d'obligations. Elle est retirée le 2026-09-03 ; la caractéristique
  `aRobinetsIncendieArmes` n'existe plus.

- **Classe d'IGH et famille d'habitation : les questions sont retirées, les
  restrictions restent exprimables** (2026-09-03). `igh: { classes }` et
  `habitation: { familles }` demeurent des critères valides du moteur ; aucune
  obligation du référentiel ne les emploie, et plus aucun formulaire ne collecte
  les deux attributs. La lecture des deux règlements a établi qu'aucune
  obligation d'exploitant n'en dépend — l'arrêté du 30 décembre 2011 met ses
  vérifications à la charge des « propriétaires » (`GH 5`) sans les moduler par
  classe, et l'obligation périodique centrale de l'arrêté du 31 janvier 1986
  (art. 101) vise « le propriétaire » sans mentionner de famille. **Retirer la
  question n'est pas retirer la capacité** : le jour où un texte imposerait
  quelque chose à une classe ou à une famille, le critère existe, la colonne
  existe, et il ne resterait qu'à reposer la question.

## Prescriptions particulières (ADR-035)

Après le matching du référentiel, `appliquerPrescriptions`
(`src/lib/matching/prescriptions.ts`) module le résultat pour l'établissement :

- `renforce_periodicite` surcharge, par équipement, la périodicité d'une
  obligation applicable — uniquement vers **plus strict** au sens de
  `PERIODICITE_EN_JOURS` (une obligation `autre` / `mise_en_service_uniquement`
  accepte tout rythme daté). Sinon la prescription est **ignorée** avec
  raison : obligation non applicable ici, rythme pas plus strict (« rattrapée
  par le référentiel »), équipement non déclencheur, doublon moins strict.
- `obligation_sur_mesure` produit des lignes `obligationId =
  "prescription:<id>"`, criticité 4 par convention, jamais associées à une
  référence légale du référentiel.
- Le générateur écrit `Verification.prescriptionId` ; la réconciliation le
  compare. Aucun impact sur `REFERENTIEL_VERSION`.

## Tests de non-régression

Toute modification du moteur doit laisser passer :

- `src/lib/matching/engine.test.ts` — combinaisons typologie × équipement ×
  effectif × conditions, dont la disjonction des régimes, la conjonction
  des restrictions de catégorie **et de type d'exploitation**, la sémantique
  « non infirmée » et le verrou « aucun établissement existant ne perd une
  obligation de criticité ≥ 4 » (amendements 2026-08).
- `src/lib/referentiels/conformite/conformite.test.ts` — cohérence du
  référentiel : conditions vivantes, absence de doublon, seuils d'effectif
  encodés, forme normalisée des typologies.
- `src/lib/equipements/schema.test.ts` — toute propriété conditionnant une
  obligation est bien collectée par le formulaire, et « non » reste distinct
  de « pas encore répondu ».

Avant d'ajouter une règle métier transverse (ex. « toute obligation marquée
criticité ≥ 4 doit avoir un réalisateur agréé »), écrire d'abord le test
dans le référentiel — pas dans le moteur.
