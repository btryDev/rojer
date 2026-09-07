# La chaîne, de l'accueil au calendrier — mesure

**Date** : 2026-09-03 · **Réf mesurée** : `main`, `c928a98` · **Nature** : constat chiffré,
aucune correction, aucun fichier de `src/` modifié.

> *« Est-ce que les informations qu'on demande à l'onboarding se répercutent bien dans
> l'application ? Si on sait que c'est un ERP, alors c'est tel code, alors telle
> obligation. »*

---

## Réponse en une ligne

**Zéro condition d'obligation ne repose sur une donnée que personne ne collecte.** Les 62
conditions d'équipement du référentiel (21 couples *catégorie × propriété* distincts) et les
9 clés de typologie d'établissement sont toutes adossées à un champ effectivement posé, au
parcours ou à la fiche. Le sens 2 — le dangereux — est propre au 2026-09-03 sur cette
référence.

Le défaut est dans l'autre sens, et il est net : **deux champs sont collectés, dont un
obligatoire à l'accueil, sans qu'aucune obligation ne les lise** — `classeIgh` et
`familleHabitation`.

---

## 1. Méthode

**Tout ce qui est chiffré ici a été obtenu en appelant**, jamais au grep — la règle du dépôt
(`feedback_compter_en_appelant`). Cinq harnais jetables ont été écrits à la racine du
worktree, exécutés, puis **supprimés** :

| Harnais | Ce qu'il appelle | Ce qu'il rend |
| --- | --- | --- |
| inventaire | `obligationsConformite`, `CHAMPS_TRI_ETAT`, `CATEGORIES_TRI_ETAT` | les 145 obligations, leurs clés de typologie, leurs 62 conditions, les propriétés attendues |
| sondes | `determineObligationsApplicables` | un champ change à la fois, diff d'**ensembles d'identifiants** (pas de compteurs) |
| chaîne | `onboardingSchema` → `projeterEtablissement` → moteur (`explain`) → `genererProchainesVerifications` | le cas de bout en bout |
| surfaces | `estSansRendezVous`, `modeDeclaration` | où une obligation applicable peut apparaître |
| caractéristiques | moteur, un appareil à la fois | l'effet réel de chaque question d'équipement |

**Deux précautions de méthode, apprises en mesurant** :

1. **Le compteur ment sur les échanges.** `typeErp` en 4ᵉ catégorie donne 28 obligations
   quel que soit le type — mais l'ensemble change : la visite triennale remplace la
   quinquennale. Toutes les sondes ci-dessous comparent des **ensembles d'identifiants**,
   et les rares tableaux en compteurs le disent.
2. **Une condition cumulative se mesure à deux champs.** `aSystemeDeRecyclage` paraît
   inerte quand on le fait varier seul, parce que sa condition exige aussi
   `estLocalPollutionSpecifique`. Remesuré avec, il commande bien une obligation. La
   première mesure était fausse ; elle figure ici parce que le piège se reproduira.

**Aucun compte n'a été créé, aucun fichier d'authentification touché.** Rien n'a bloqué :
le moteur, la projection, le schéma d'onboarding et le générateur sont des modules purs,
appelables sans base ni session.

### Contre-vérification du `.claude/CLAUDE.md` (règle : ne pas croire l'instantané)

Les chiffres de la référence mesurée ont été remesurés en appelant. **Ils sont justes.**

| Affirmation du `CLAUDE.md` de `c928a98` | Mesuré |
| --- | --- |
| 145 obligations | **145** ✓ |
| 86 équipement / 45 établissement / 14 salarié | **86 / 45 / 14** ✓ |
| bureau de six sans équipement : 25 | **25** ✓ |
| à douze salariés : 26 | **26** ✓ |
| à cinquante-cinq : 29 | **29** ✓ |

Le tableau du § 8 de `docs/chantiers-ouverts.md` est également exact, ligne à ligne :
rien = 0 · travail seul = 25 · ERP seul 5ᵉ type N = 6 · travail + ERP 5ᵉ = 32 ·
travail + ERP 3ᵉ = 28 · travail + habitation 3ᵉ A = 28.

---

## 2. Le tableau de la chaîne — champ par champ

Colonnes : où le champ est **posé**, et ce qui le **lit**, mesuré.

### 2.1 Champs d'établissement

| Champ | Onboarding | Fiche | Lu par le moteur ? | Autres lecteurs mesurés |
| --- | --- | --- | --- | --- |
| `raisonDisplay` | oui | oui | non | en-têtes, PDF, sélecteur |
| `adresse` | oui (format contrôlé) | oui | non | PDF, registre |
| `codeNaf` | oui (format contrôlé) | oui | **non** | référentiel DUERP sectoriel (`perimetre/secteur.ts`), pré-remplissage d'équipements, périmètre, PDF |
| `effectifSurSite` | oui | oui | **oui** — `effectifMin` (4 obl.), `effectifMax` (1), borne basse de `personnesPresentesMin` | périmètre (refus > 50), DUERP |
| `estEtablissementTravail` | oui | oui | **oui** — 103 obligations | |
| `estERP` | oui | oui | **oui** — 54 obligations | périmètre (ERP en IGH refusé) |
| `typeErp` | oui (requis si ERP) | oui | **oui** — `erp.types` (4 obl.), `erp.typesExclus` (3) | registre, PDF |
| `categorieErp` | oui (requis si ERP) | oui | **oui** — `erp.categories` (16 obl.) | registre, PDF |
| `estIGH` | oui | oui | **oui** — 10 obligations portent `igh` | périmètre |
| `classeIgh` | oui (**requis si IGH**) | oui | **NON — aucune obligation** | affichage fiche, ligne de régime du PDF, registre |
| `estHabitation` | oui | oui | **oui** — 13 obligations | |
| `familleHabitation` | oui (**requis si habitation**) | oui | **NON — aucune obligation** | affichage fiche, registre |
| `personnesPresentesHabituellement` | **non** (retiré le 2026-09-01) | oui | **oui** — `personnesPresentesMin` (2 obl.) | registre |
| `manipuleMatieresR422722` | **non** (retiré le 2026-09-01) | oui | **oui** — `champR422734` (2 obl.) | registre |
| `comporteLocauxSommeilPublic` | **non** | oui | **oui** — `locauxSommeilPublic` (4 obl.) | registre |
| `natureActivite` | non | oui | non | fiche « Renseignements généraux » du registre (`registre/champs.ts`, CCH R. 143-44) |
| `effectifPublicAdmis` | non | oui | non | idem registre |
| `dateAutorisationOuverture` | non | oui | non | idem registre |
| `dateCertificatConformite` | non | oui | non | idem registre |
| `epiPresents` / `epiPresentsDetail` | non | non — écran de paramétrage | non | checklist du tableau de bord seule (consignation assumée, cf. `parametrage.ts`) |
| `aDemandesAssureur` | non | non — écran de paramétrage | non | checklist ; ouvre la saisie d'une prescription particulière |
| `siret` | oui (sur l'**entreprise**) | non | non | identité |

### 2.2 Effet mesuré de chaque champ du moteur

Sondes à un champ, diff d'ensembles. Base A = travail seul, 8 salariés, aucun équipement.
Base B = travail + ERP N5 type N. Base C = travail + parc complet (un exemplaire de chacune
des 19 catégories, sans caractéristique).

| Champ | Effet mesuré |
| --- | --- |
| `effectifSurSite` | 3 franchissements : **11** (+ CSE), **50** (+ règlement intérieur, + local de restauration, − emplacement de restauration). Aucun autre seuil : 1, 10, 20, 25, 26 et 100 ne bougent rien de plus. Le « seuil de 25 » n'existe pas. |
| `estEtablissementTravail` | Base B : 32 → 6 quand on le retire. 26 obligations en dépendent. |
| `estERP` | Base B : 32 → 25. Base C : +21 nettes, avec 2 échanges (l'éclairage de sécurité « travail » cède la place au « ERP »). |
| `categorieErp` | N5 → N4 : −5 / +1. N5 → N3 : −5 / +1. N5 → N2 : −5 / +2. `null` : −5 sans compensation. **La 5ᵉ catégorie reçoit plus que la 3ᵉ** (32 contre 28) — anomalie déjà consignée au § 8 de `chantiers-ouverts.md`, confirmée ici. |
| `typeErp` | Effet réel, mais **par échange, jamais par compteur**. N5 : type O ajoute `incendie-hotel-po-controle-annuel-electricite`. N4 : les types O, R, U, J — et **`null`** — reçoivent la visite triennale au lieu de la quinquennale. N1/N2 : le type V bascule de la triennale à la quinquennale. |
| `estIGH` | **Nul sans équipement** (base A : 25 → 25). Base C : +2 (`elec-igh-annuelle`, `incendie-igh-moyens-secours-annuelle`). Les 8 autres obligations `igh` sont déjà servies par la branche `travail` de leur disjonction. |
| `classeIgh` | **Aucun effet, dans aucune des 11 valeurs (10 classes + `null`), sur aucune des deux bases.** |
| `estHabitation` | Base B : +3. Base C : +5 (les deux VMC gaz s'ajoutent). |
| `familleHabitation` | **Aucun effet, dans aucune des 6 valeurs (5 familles + `null`), sur aucune des deux bases.** |
| `personnesPresentesHabituellement` | Base B : `null` = 32 (les 2 obligations `R. 4227-34` retenues « à confirmer »), 10 ou 50 = 30 (elles partent), 51 ou 300 = 32. Base A : `null` = 25, 51 = 27. |
| `manipuleMatieresR422722` | Base A : `null` = 25, `true` = 27, `false` = 25. **`null` se comporte donc exactement comme `false`** — la dernière violation de la règle du non-renseigné, celle que le `CLAUDE.md` recense. Sans effet sur base B, où l'indétermination ERP a déjà retenu les deux lignes. |
| `comporteLocauxSommeilPublic` | Base B : `null` = 32, `true` = 32 (même ensemble), `false` = 28. Sans effet hors 5ᵉ catégorie. |

---

## 3. Les champs collectés que rien ne lit

### 3.1 Sur l'établissement — deux, dont un obligatoire à l'accueil

| Champ | Où il est demandé | Ce qui le lit | Mesure |
| --- | --- | --- | --- |
| **`classeIgh`** | Onboarding, **obligatoire si `estIGH`** (`onboardingSchema`, superRefine) ; fiche | Aucune obligation. Le moteur porte bien la branche `igh: { classes: [...] }` (`evaluerIgh`, `engine.ts:139`), **mais aucune des 145 obligations ne l'écrit** | 11 valeurs × 2 bases : ensemble identique à chaque fois |
| **`familleHabitation`** | Onboarding, **obligatoire si `estHabitation`** ; fiche | Aucune obligation. Branche `habitation: { familles: [...] }` présente et testée (`evaluerHabitation`, `LIBELLE_FAMILLE`), **jamais écrite par une obligation** | 6 valeurs × 2 bases : ensemble identique à chaque fois |

Aucune des deux n'est morte au sens strict : elles s'affichent à la fiche, dans la ligne de
régime du PDF (`pdf/builders.ts:90`) et à la fiche « Renseignements généraux » du registre.
Le constat porte sur le **calcul** : la réponse du dirigeant ne déplace aucune obligation.

Trois éléments de contexte, mesurés et non supposés :

- La grille `CHOIX_CLASSES_IGH` a été corrigée le 2026-09-03 (dix classes, ajout de `GHTC`
  et coupure `GHW1`/`GHW2`), et un chantier de retrait de `GHW` est ouvert
  (`chantiers-ouverts.md` § 9 bis). Le travail de fond est donc récent et sérieux ; ce
  qu'aucune mesure n'établit, c'est qu'une obligation le consomme.
- `familleHabitation` est **plus récent que les obligations habitation** : les trois lignes
  de l'arrêté du 31 janvier 1986 sont entrées le même jour (2026-09-01) sans restriction de
  famille.
- Le commentaire de `matching/types.ts` dit que `familleHabitation` à `null` « ne fait
  perdre aucune obligation ». C'est vrai — et la mesure ajoute qu'aucune valeur non plus
  n'en fait gagner ni perdre.

### 3.2 Sur l'équipement — une question à trois états

`aRobinetsIncendieArmes`, posée sur chaque **extincteur** (`CATEGORIES_TRI_ETAT`,
`EquipementForm`), affichée à la fiche (`LIBELLE_CARACTERISTIQUE`) : `true`, `false` et
« pas répondu » donnent le **même ensemble d'obligations**.

C'est un retrait fait à moitié, et le référentiel écrit lui-même le critère qui n'a pas été
appliqué. `incendie-erp-ria-annuelle` porte en `notesInternes` :

> « La branche EXTINCTEUR bornée par `aRobinetsIncendieArmes` […] est TRANSITOIRE […]
> Critère de retrait de la branche : plus aucun équipement EXTINCTEUR ne porte la clé
> `aRobinetsIncendieArmes` en base — **retirer alors « EXTINCTEUR » des catégories, la
> condition, et la question du formulaire.** »

Mesuré : l'obligation ne porte plus que `categoriesEquipement: ["RIA"]` et **aucune
condition** — les deux premiers retraits sont faits. Le troisième, la question du
formulaire, ne l'est pas. `scripts/reprise-ria.ts` existe (202 lignes) ; **si la reprise a
été passée en production n'est pas établi** ici, faute d'accès légitime aux données.

`nombre` et `notes` sont eux aussi sans effet sur le moteur — c'est leur définition, ce
sont des champs d'affichage.

### 3.3 Un module entier, hors moteur

`src/lib/onboarding/deduction-erp.ts` porte `deduireCategorieErp`,
`deduireCategorieErpComplete`, `deduire4eOu5e` et la table `SEUILS_5E_CATEGORIE` (dix types
relus article par article sur Légifrance le 2026-08-25). **Aucun écran ne les appelle** —
vérifié en cherchant chaque symbole dans tout `src/` : seuls `CHOIX_CLASSES_IGH` et
`CHOIX_FAMILLES_HABITATION` en sortent, vers les formulaires. Le fichier documente
explicitement ce choix (« Ne pas rebrancher ces fonctions sur une déduction : la décision
de séance est de ne pas deviner »). Ce n'est donc pas un oubli, et ce n'est pas un champ
collecté ; c'est signalé pour que l'inventaire soit complet.

---

## 4. Les conditions dont la donnée n'est demandée nulle part — **le livrable principal**

## **Zéro.**

### 4.1 Le côté équipement — 62 conditions, 21 couples, 12 propriétés

| Propriété | Catégories visées | Où elle est posée |
| --- | --- | --- |
| `estVmcGaz` | VMC | `QuestionTriEtat`, `EquipementForm` |
| `aExtinctionAutomatique` | APPAREIL_CUISSON_ERP | idem |
| `sertAuLevageDePersonnes`, `estMuParForceHumaine`, `estChariotOuGerbeur`, `aAccessoiresDeLevage` | EQUIPEMENT_LEVAGE | idem |
| `estSoumisSuiviEnService` | EQUIPEMENT_SOUS_PRESSION | idem |
| `estChargeSousSeuilControle`, `estHermetiquementScelleSousSeuil`, `estChargeSuperieure50TCo2`, `estChargeSuperieure500TCo2`, `aDetectionDeFuites` | INSTALLATION_FRIGORIFIQUE | idem |
| `aGroupeElectrogene` | INSTALLATION_ELECTRIQUE | champ dédié, `EquipementForm:331` |
| `estLocalPollutionSpecifique` | VMC, CTA, HOTTE_PRO | champ dédié, `:351` |
| `aSystemeDeRecyclage` | VMC, CTA, HOTTE_PRO | champ dédié, `:376` |
| `nbVehiculesParkingCouvert` | VMC | champ dédié, `:401` |
| `familleEsp` | EQUIPEMENT_SOUS_PRESSION | select dédié, `:576` |

`familleEsp` mérite une note : `equipements/schema.ts` l'annotait encore « jamais lue par le
moteur », et `corpus/esp-suivi-en-service.ts` l'écrit dans un relevé du 2026-09-01. **Ce
n'est plus vrai** : le couple `equipement_propriete_enum_egale` /
`equipement_propriete_enum_differente` a été ajouté, et deux obligations ESP s'y adossent —
mesuré, la valeur change bien le régime. La note de code est en retard sur le code.

Toutes les catégories citées par une obligation sont proposées au formulaire
(`CATEGORIES_EQUIPEMENT` est rendu en entier, `COMPACTEUR_PRESSE_DECHETS_MOTORISE`
compris). Une seule catégorie n'est citée par **aucune** obligation : `AUTRE` — et c'est le
choix explicite du lot « compacteur » du 2026-09-02, rappelé dans le brief.

### 4.2 Le côté établissement — 9 clés de typologie

| Clé | Obligations | Attribut lu | Collecté |
| --- | --- | --- | --- |
| `travail` | 103 | `estEtablissementTravail` | onboarding + fiche |
| `erp` (+ `categories` 16, `types` 4, `typesExclus` 3) | 54 | `estERP`, `categorieErp`, `typeErp` | onboarding + fiche |
| `habitation` | 13 | `estHabitation` | onboarding + fiche |
| `igh` | 10 | `estIGH` | onboarding + fiche |
| `locauxSommeilPublic` | 4 | `comporteLocauxSommeilPublic` | **fiche seule** |
| `effectifMin` | 4 | `effectifSurSite` | onboarding + fiche |
| `personnesPresentesMin` | 2 | `personnesPresentesHabituellement` | **fiche seule** |
| `champR422734` | 2 | `manipuleMatieresR422722` | **fiche seule** |
| `effectifMax` | 1 | `effectifSurSite` | onboarding + fiche |

Deux mécanismes du moteur ne conditionnent rien et ne peuvent donc pas produire de faux
négatif : `equipementsEnContexte` ne sert qu'à enrichir la raison affichée
(`engine.ts:813`), et `exclut` n'est lu que par le catalogue de titres salarié.

### 4.3 Ce qui n'est **pas** dans ce compte, et qu'il faut nommer

La question posée était « une condition écrite contre une donnée absente ». Il n'y en a pas.
Il existe en revanche des **régimes que le texte distingue et que le référentiel ne scinde
pas, faute d'attribut** — l'obligation n'est alors pas conditionnée du tout, donc elle
n'apparaît pas au compte ci-dessus. Ce sont des sur- ou sous-applications, chacune déjà
écrite dans le code, aucune découverte ici :

| Distinction du texte | État | Sens de l'erreur, tel que le code l'écrit |
| --- | --- | --- |
| ESP à couvercle amovible à fermeture rapide (2 ans, art. 15) | `couvercleAmovible` n'est **collecté nulle part** — c'est un paramètre de `verdictSuiviEnService`, pas un champ du schéma | sous-application, invisible (`corpus/esp-suivi-en-service.ts`) |
| ESP dont le contrôle de mise en service a été fait et conforme (4 ans dès la 1ʳᵉ inspection) | non modélisé | sur-application d'un an, visible |
| Enseignement R (1) avec hébergement / R (2) sans | aucun attribut « comporte des locaux d'hébergement » ; `TypeErp` ne connaît qu'un seul R | tout R en triennale : sur-application visible, choisie (`incendie-erp-visite-commission-cat4-triennale`) |
| Type O : hôtel (seuil 100) / autre hébergement (seuil > 15) | la nature n'est pas demandée | sans effet aujourd'hui : la déduction de catégorie est débranchée (§ 3.3) |
| 9 des 11 catégories du I de l'arrêté du 5 mars 1993 | hors référentiel, motif écrit dans la `reserve` de l'article | obligation manquante, assumée |

---

## 5. Les champs demandés à la fiche et pas à l'onboarding

Trois, et ils sont exactement les trois qui commandent des obligations :

| Champ | Obligations commandées | Ce que coûte l'absence à l'accueil, **mesuré** |
| --- | --- | --- |
| `personnesPresentesHabituellement` | `incendie-travail-consigne-affichee`, `incendie-travail-exercice-semestriel` | **Rien pour un ERP.** Le moteur déduit une borne basse — la catégorie franchit seule le seuil de 51 dès la 3ᵉ — et retient « à confirmer » en dessous. Base B mesurée : `null` donne le même ensemble que `51`. **Pour un établissement de travail seul, en revanche, l'obligation est écartée** : base A à `null` = 25, à `51` = 27. Le commentaire du code l'assume — l'effectif salarié y *est* le total, ce n'est plus une borne. |
| `manipuleMatieresR422722` | les deux mêmes | Base A : `null` = 25, `true` = 27. **`null` est lu « non »** — la dernière violation de la règle du non-renseigné, celle que le `CLAUDE.md` recense encore. Sans conséquence sur un ERP, où l'autre branche du OU a déjà retenu les lignes. |
| `comporteLocauxSommeilPublic` | `incendie-erp-5-visite-commission` et les trois lignes de sommeil de 5ᵉ | **Rien.** `null` donne le même ensemble que `true` : les quatre lignes sont retenues « à confirmer ». Seul un « non » explicite les retire (32 → 28). |

**Ces trois retraits sont conformes à la ligne du § 8 de `chantiers-ouverts.md`** — « on ne
déduit jamais un fait qui sera stocké comme déclaré, on déduit des conséquences ». Aucun des
trois n'est écrit en base par une déduction ; les trois colonnes restent à `null`, et le
moteur en tire ce qu'il peut. Le seul endroit où l'absence **coûte** une obligation est
`personnesPresentesHabituellement` chez un établissement de travail non-ERP, et c'est un
choix documenté, pas un accident.

Quatre autres champs sont à la fiche seule sans commander d'obligation : `natureActivite`,
`effectifPublicAdmis`, `dateAutorisationOuverture`, `dateCertificatConformite`. Ils servent
la fiche « Renseignements généraux » du registre de sécurité (CCH R. 143-44) — ce sont des
renseignements à présenter, pas des critères.

---

## 6. La chaîne de bout en bout — restaurant ERP type N, 5ᵉ catégorie, 8 salariés

Exécuté : `onboardingSchema.safeParse` → payload de `creerDossier` → `projeterEtablissement`
→ `determineObligationsApplicables` (mode `explain`) → `genererProchainesVerifications`.

**Étape 1 — l'accueil.** Le schéma accepte 13 champs. Il exige le type ET la catégorie
puisque `estERP` est coché ; il refuse le cumul ERP + IGH ; il exige un NAF bien formé sans
exiger qu'un référentiel sectoriel existe.

**Étape 2 — l'écriture.** La server action écrit 12 colonnes. **Onze colonnes restent à
`null`** : `classeIgh`, `familleHabitation`, `personnesPresentesHabituellement`,
`manipuleMatieresR422722`, `comporteLocauxSommeilPublic`, `natureActivite`,
`effectifPublicAdmis`, `dateAutorisationOuverture`, `dateCertificatConformite`,
`epiPresents`, `aDemandesAssureur`.

**Étape 3 — la projection.** `projeterEtablissement` rend 13 champs, recopiés un à un. Rien
ne se perd : les 13 champs du type `EtablissementMatching` sont tous requis, et l'omission
ne compile pas.

**Étape 4 — le moteur.** **32 obligations applicables**, aucun équipement déclaré. Le mode
`explain` sur quatre d'entre elles :

```
[incendie-erp-5-visite-commission]  quinquennale, criticité 4, porteur établissement
  typologies : {"erp":{"categories":["N5"]},"locauxSommeilPublic":true}
  - ERP catégorie 5 (règle limitée à 5)
  - présence de locaux à sommeil pour le public non renseignée
    — obligation retenue par prudence, à confirmer
  - l'obligation porte sur l'établissement lui-même : elle ne dépend d'aucun appareil déclaré

[incendie-travail-exercice-semestriel]  semestrielle, criticité 4
  typologies : {"travail":true,"personnesPresentesMin":51,"champR422734":true}
  - établissement de travail (salariés)
  - nombre de personnes habituellement présentes non renseigné, et l'établissement
    reçoit du public — obligation retenue par prudence, à confirmer (seuil 51)

[incendie-erp-pe4-entretien-installations-techniques]  triennale, criticité 5
  - ERP catégorie 5 (règle limitée à 5)

[sante-travail-etablissement-adhesion-spst]  état permanent, criticité 4
  - établissement de travail (salariés)
```

**La chaîne tient, et elle est traçable** : chaque obligation nomme la réponse d'onboarding
qui la déclenche, et nomme aussi ce qu'elle ne sait pas encore.

**Étape 5 — le calendrier. C'est ici que la chaîne se rétrécit, et c'est voulu.**

| | nombre |
| --- | --- |
| obligations applicables | 32 |
| lignes de calendrier engendrées | **8** |
| obligations sans ligne | **24** |

Les 24 portent toutes `periodicite: "autre"`. `estSansRendezVous` les écarte du générateur,
et elles remontent sur l'écran « Ce qui doit être en place » : **20 en mode « état », 1 en
mode « fait à dater »**. La règle est partagée entre le générateur et l'écran
(`etats-permanents/regle.ts`), donc elles ne peuvent apparaître ni deux fois ni zéro fois.

**Trois d'entre elles n'apparaissent nulle part**, et c'est le seul endroit où quelque chose
se perd sur ce cas : `formation-securite-etablissement-information` (criticité 3),
`formation-securite-etablissement-travail-sur-ecran` (criticité 2),
`co-activite-etablissement-protocole-securite` (criticité 4). Elles sont
`nature: "evenementielle"` et `periodicite: "autre"` : le générateur les saute, et
`modeDeclaration` rend `null` pour toute nature autre que `etat_permanent` ou
`echeance_recurrente`.

Sur l'ensemble du référentiel, la mesure donne :

| nature | total | ligne de calendrier | écran « en place » | **ni l'un ni l'autre** |
| --- | --- | --- | --- | --- |
| `echeance_recurrente` | 80 | 77 | 3 | 0 |
| `etat_permanent` | 44 | 1 | 43 | 0 |
| `evenementielle` | 12 | 5 | 0 | **7** |
| `ponctuelle` | 9 | 6 | 0 | **3** |

**10 obligations sur 145 n'ont ni ligne de calendrier ni case « en place ».** Les quatre
portées par un salarié (`conduite-salarie-formation`, criticité 5 ;
`secours-salarie-secouriste` ; `formation-securite-salarie-accueil` ;
`formation-securite-salarie-designe-competent`) apparaissent à l'écran « Équipe » comme
titres déclarés, mais `genererVerificationsDepuisTitres` n'en tire une ligne que si
l'employeur saisit lui-même une échéance sur le titre — `prochaineDate` rend `null` pour
`periodicite: "autre"`.

Le guide « Chez vous » (`construireChezVous`) agrège par domaine sans filtrer sur la nature :
il **compte donc les six autres**, celles portées par un équipement ou l'établissement. Il ne
peut en revanche voir **aucune** des 14 obligations à porteur salarié — `evaluerObligation`
rend `null` pour ce porteur (ADR-023), et le guide part de la même liste que le calendrier.

**Les huit lignes engendrées arrivent toutes `statut: "a_planifier"`, `estUrgent: true`,
`datePrevue` au jour de la génération.** C'est la branche « pas d'historique » du générateur
(`generateur.ts:381`) : faute de vérification antérieure et de mise en service — une ligne
portée par l'établissement n'en a pas, par construction —, `premiereEncoreAVenir` est faux,
donc la date retombe sur `now` et l'urgence est posée. Un dossier créé aujourd'hui ouvre
donc son calendrier avec huit lignes urgentes, dont une de criticité 5. Le fait est mesuré ;
l'arbitrage — est-ce le bon signal pour un dirigeant qui vient de finir son inscription —
n'appartient pas à ce lot.

---

## 7. Ce que je n'ai pas pu établir

- **Si `scripts/reprise-ria.ts` a été passé en production**, et donc si le critère de retrait
  de la question `aRobinetsIncendieArmes` est atteint. Le script existe ; son exécution
  demanderait de lire la base de production, ce que ce lot ne fait pas.
- **Le nombre d'établissements réels** portant `classeIgh` ou `familleHabitation` renseignés.
  Le constat porte sur le code, pas sur les dossiers.
- **Si l'absence d'obligation restreinte par `igh.classes` ou `habitation.familles` est un
  manque ou une exactitude.** Établir qu'un texte distingue les classes IGH ou les familles
  d'habitation sur une obligation que Rojer porte déjà demande un dépouillement Légifrance,
  qui n'est pas de ce lot. Ce qui est mesuré est que la donnée est demandée et ne sert pas —
  pas qu'elle devrait servir.
- **Le rendu à l'écran** : aucune capture, aucun compte, aucun serveur lancé. Tout ce qui
  précède est mesuré par appel de fonction. Ce qu'une page affiche effectivement des 32
  obligations n'est pas établi ici.
- **Les prescriptions particulières (ADR-014)** : leur effet de surcharge de périodicité
  peut faire passer une obligation de l'écran « en place » au calendrier. Le cas n'a pas été
  sondé — les sondes n'ont passé aucune prescription.
- **Les DUERP et le secteur** : `codeNaf` alimente un référentiel sectoriel de risques que ce
  lot n'a pas mesuré. Sa contribution à la chaîne « onboarding → obligations de conformité »
  est nulle, ce qui est établi ; sa contribution au DUERP ne l'est pas.
- **`effectifPublicAdmis` en regard de la catégorie déclarée** : `deduction-erp.ts` évoque le
  signalement d'incohérence que la fiche « permet déjà de poser ». Qu'un tel contrôle existe
  n'est **pas établi** — aucun appelant n'a été trouvé.
