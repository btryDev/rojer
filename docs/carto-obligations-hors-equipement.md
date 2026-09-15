# Carto — obligations hors équipement

**Statut : document de travail. Aucune ligne n'entre dans le référentiel en l'état.**

Ce tableau recense les obligations du périmètre produit qui **ne naissent pas d'un
équipement déclaré**, et que le modèle actuel ne peut donc pas représenter
(`Obligation.categoriesEquipement` est obligatoire et non vide —
`src/lib/referentiels/conformite/types.ts:168`).

Il sert de spec d'entrée pour deux travaux distincts :
1. l'ADR sur le porteur d'échéance (cf. « Ce que la carto implique » en fin de document) ;
2. la rédaction des entrées TS du référentiel, une fois le modèle capable de les porter.

## ⚠️ Les références ci-dessous sont présumées

Elles sont issues d'une revue documentaire, **pas d'une lecture de Légifrance**.
Aucune ne doit être recopiée telle quelle dans une entrée `Obligation` : chacune
doit être relevée sur le texte en vigueur, verbatim, avant encodage — et la
version constatée tracée (cf. `ReferenceLegale.versionConstatee`, branche
`chore/veille-reglementaire`). Plusieurs sont probablement périmées ou mal
numérotées : le décret n° 2025-1100 a réécrit une partie du CCH au 1er juillet 2026.

## Le périmètre a été amendé — ce paragraphe disait le contraire

*Corrigé le 2026-08-28.* Ce document annonçait un conflit avec le périmètre
déclaré : « `.claude/CLAUDE.md` liste aujourd'hui en hors périmètre : suivi nominatif
formations/habilitations, visites médicales… ». **C'était déjà faux à la publication.**
Le commit qui a créé ce document — `704d5d0`, le 2026-08-26 — est celui-là même qui a
retiré **« suivi nominatif formations/habilitations » et « visites médicales »** de la
liste hors périmètre de `CLAUDE.md`. Le paragraphe décrivait l'état d'avant l'amendement
livré avec lui.

**Le suivi nominatif est dans le périmètre** (`.claude/CLAUDE.md`, « Suivi nominatif des
salariés »), et il est en partie livré : le porteur salarié existe (ADR-023), avec une
obligation encodée, l'attestation médicale quinquennale de `R. 4544-11-1`.

Restent **hors périmètre** parmi les sujets de ce document : registre unique du personnel,
accidents du travail et AT bénins, dangers graves et imminents, EPI, ainsi qu'ATEX et
rayonnements ionisants (⛔ ci-dessous, secteurs industriels hors cible).

Le reste du document garde sa valeur de spec d'entrée : ce qui y est recensé n'est
toujours pas encodé, et la mise en garde ci-dessus sur les références présumées reste
entière.

## Périmètre retenu

**Dedans** — Code du travail, CCH, et Code de l'environnement quand il porte sur la
sécurité du bâtiment ou des personnes.

**Dehors** — affichages commerciaux (prix, allergènes, origine des viandes, licence),
HACCP / PMS / agrément sanitaire, débit de boissons, métrologie, SACEM,
RH non-SST (DPAE, registre du personnel, BDESE, égapro, DOETH), décret tertiaire /
OPERAT, vidéosurveillance, assurances.

**À trancher** — ICPE (dedans à mon sens : sécurité d'installation, et
`CODE_ENVIRONNEMENT` est déjà dans `SOURCES_LEGALES`) ; déchets (dehors selon le
même critère).

## Légende

| Colonne | Valeurs |
|---|---|
| **Porteur** | `ÉTS` établissement · `BÂT` bâtiment · `SAL` salarié · `ÉQU` équipement |
| **Nature** | `RÉC` échéance récurrente · `PERM` état permanent à constituer puis maintenir · `PONC` ponctuelle (embauche, affectation) · `ÉVÈN` événementielle |
| **Statut** | ❌ absent · ⚠️ existe mais mal ancré (faux négatif possible) · 🚫 **inencodable** en l'état du modèle · ⛔ hors périmètre déclaré · ✅ couvert |

---

## A. Déclencheur : statut d'employeur

> **A15 corrigée le 2026-08-31** (lot `fix/faux-negatifs-ancrage`). Elle annonçait
> une obligation de « registre unique de sécurité » qui n'existe pas : le texte
> donne une faculté de regroupement. C'est exactement le risque que la mise en
> garde ci-dessus signale — une référence présumée, recopiée d'une revue
> documentaire, qui a ensuite été relayée telle quelle dans un brief de lot.
> Elle avait déjà envoyé quelqu'un chercher une obligation à rebrancher.


S'applique dès qu'il y a au moins un salarié, quels que soient le NAF, l'effectif et les équipements.

| # | Obligation | Porteur | Nature | Référence présumée | Statut |
|---|---|---|---|---|---|
| A1 | DUERP établi et mis à jour (≥ 1×/an, et à chaque modification importante) | ÉTS | RÉC | CT L.4121-3, R.4121-1/2 | ✅ c'est le produit |
| A2 | **Avis affiché** indiquant les modalités d'accès au DUERP | ÉTS | PERM | CT R.4121-4 **dernier alinéa** | ✅ `information-etablissement-avis-acces-duerp` (lot 8) — l'information ORALE due à chaque salarié est distincte : `L.4141-1` / `R.4141-3-1`, lot 7 |
| A3 | Conservation des versions successives du DUERP (40 ans) | ÉTS | PERM | CT L.4121-3-1 | ✅ `DuerpVersion` |
| A4 | Liste d'actions de prévention (< 50) ou PAPRIPACT (≥ 50) | ÉTS | RÉC | CT L.4121-3-1 | ⚠️ actions existent, pas le livrable annuel |
| A5 | **Formation à la sécurité à l'embauche** (générale) | SAL | PONC | CT L.4141-2, R.4141-1 et s. | ❌ |
| A6 | Salarié désigné compétent en protection/prévention | **ÉTS** | PERM | CT L.4644-1 | ✅ `prevention-etablissement-salarie-designe` (lot 8) — porteur ÉTS et non SAL : le texte impose de DÉSIGNER, acte de l'employeur ; la formation du désigné est une seconde ligne, portée par le salarié (cf. B2) |
| A7 | Adhésion à un SPST | ÉTS | PERM | CT L.4622-1, D.4622-1/2 | ✅ `sante-travail-etablissement-adhesion-spst` (lot 8) — `L.4622-7`, souvent cité, ne fonde PAS l'adhésion : il traite de la responsabilité des dirigeants du service |
| A8 | Fiche d'entreprise établie par le SPST | ÉTS | PERM | CT R.4624-46/47 | ✅ `sante-travail-etablissement-fiche-entreprise` (lot 8) — aucune périodicité de mise à jour dans le texte ; l'année de `R.4624-47` est un délai depuis l'adhésion, pas un rythme |
| A9 | **VIP à l'embauche** + périodicité (≤ 5 ans) | SAL | RÉC | CT R.4624-10 et s. | ❌ |
| A10 | **SIR** — suivi individuel renforcé, postes à risques (≤ 4 ans + visite intermédiaire) | SAL | RÉC | CT R.4624-22 et s. | ❌ |
| A11 | Matériel de premiers secours + personnel formé au secourisme (**SST**) | ÉTS + SAL | PERM + RÉC | CT R.4224-14 à R.4224-16 | ❌ |
| A12 | Consignes de premiers secours affichées | ÉTS | PERM | CT R.4224-16 | ❌ |
| A13 | Consignes de sécurité incendie établies et affichées | ÉTS | PERM | CT R.4227-37, R.4227-38 (verbatim relevé le 2026-08-31) | ✅ **rebranchée le 2026-08-31** — `incendie-travail-consigne-affichee`, porteur établissement. (L'id donné ici, `incendie-consigne-securite`, n'a jamais existé.) |
| A14 | Affichages SST : inspection du travail, médecine du travail, secours | ÉTS | PERM | CT D.4711-1 | ❌ |
| A15 | ~~Registre unique de sécurité~~ — **il n'y en a pas** : `L. 4711-5` dispose que « l'employeur **est autorisé à** réunir ces informations dans un registre unique ». C'est une **faculté**, pas une obligation. Ce qui oblige réellement, c'est `L. 4711-1`, `L. 4711-2`, `D. 4711-2` et `D. 4711-3` — mentions obligatoires, datation, identité du vérificateur, conservation cinq ans — désormais portés par `incendie-registre-securite`. À ne pas confondre avec `D. 4711-1`, qui est un **affichage** (cf. A14), pas un registre. | ÉTS | PERM | CT L.4711-1, L.4711-2, D.4711-2, D.4711-3 (verbatim relevés le 2026-08-31) | ✅ requalifiée |
| A16 | Registre des accidents bénins | ÉTS | PERM | CSS L.441-4, D.441-1 | ❌ — listé hors périmètre dans CLAUDE.md |
| A17 | Déclaration d'accident du travail (48 h) | ÉTS | ÉVÈN | CSS L.441-2 | ❌ — listé hors périmètre dans CLAUDE.md |
| A18 | Vestiaires, sanitaires, lavabos conformes | ÉTS | PERM | CT R.4228-1 et s. | ❌ |
| A19 | Eau potable à disposition | ÉTS | PERM | CT R.4225-2/3 | ❌ |
| A20 | FDS accessibles + notice de poste (agents chimiques) | ÉTS | PERM | CT R.4412-38 (FDS, relu le 2026-08-31), R.4412-39 (notice de poste) | ⚠️ scindée : les FDS existent (`stockage-dangereux-fiches-donnees`), ancrées `STOCKAGE_MATIERE_DANGEREUSE`. **Examiné et laissé tel quel le 2026-08-31** : R. 4412-38 se déclenche sur la PRÉSENCE d'agents chimiques — déclencheur E, non implémenté —, pas sur le statut d'employeur. Le porteur établissement sur-appliquerait à tout le parc. La **notice de poste de R. 4412-39 n'est encodée nulle part** : obligation absente, pas ancrage à corriger. |
| A12 | ~~Consignes de premiers secours affichées~~ → **Mesures d'organisation des premiers secours, consignées dans un DOCUMENT** tenu à disposition de l'inspection | ÉTS | PERM | CT R.4224-16 | ✅ `secours-etablissement-mesures` (lot 7). **Ligne corrigée le 2026-08-31** : `R.4224-16` n'écrit ni « consignes » ni « affiche », il impose un écrit. L'affichage des secours existe, mais c'est le 2° de `D.4711-1` (cf. A14). Encodée telle qu'elle était écrite, cette ligne aurait posé deux fois l'affichage et zéro fois le document |
| A13 | Consignes de sécurité incendie établies et affichées | ÉTS | PERM | CT R.4227-37 et s. | ⚠️ `incendie-consigne-securite`, ancrée équipement |
| A14 | Affichages SST : inspection du travail, médecine du travail, secours | ÉTS | PERM | CT D.4711-1 | ✅ `information-etablissement-affichages-obligatoires` (lot 8) |
| A15 | Registre unique de sécurité (regroupement des registres) | ÉTS | PERM | CT D.4711-1 à D.4711-3 | ⚠️ partiel |
| A16 | Registre des accidents bénins | ÉTS | PERM | CSS L.441-4, D.441-1 | ❌ — listé hors périmètre dans CLAUDE.md |
| A17 | Déclaration d'accident du travail (48 h) | ÉTS | ÉVÈN | CSS L.441-2 | ❌ — listé hors périmètre dans CLAUDE.md |
| A18 | Vestiaires, sanitaires, lavabos conformes | ÉTS | PERM | CT R.4228-1 | ✅ `locaux-etablissement-installations-sanitaires` (lot 8) — seul `R.4228-1` est dépouillé ; `R.4228-2` à `-18` règlent l'aménagement et ne sont PAS lus |
| A19 | Eau potable à disposition | ÉTS | PERM | CT R.4225-2 | ✅ `locaux-etablissement-eau-potable` (lot 8) — article réécrit au 2025-06-02. `R.4225-3` (boisson gratuite) reste NON encodé : son champ suppose de qualifier des « conditions particulières de travail », soit le 5ᵉ déclencheur, non implémenté |
| A20 | FDS accessibles + notice de poste (agents chimiques) | ÉTS | PERM | CT R.4412-38 et s. | ❌ |

## B. Déclencheur : effectif

| # | Obligation | Porteur | Nature | Référence présumée | Statut |
|---|---|---|---|---|---|
| B1 | Mise en place du CSE (≥ 11 sur 12 mois consécutifs) | ÉTS | **PERM** | CT L.2311-2 | ✅ `prevention-etablissement-cse` (lot 8), `effectifMin: 11`. Nature corrigée : ce n'est pas événementiel — les douze mois DATENT l'obligation, ils ne la font pas naître. Le produit n'historisant pas l'effectif, la ligne apparaît au franchissement constaté, en avance sur l'échéance légale |
| B2 | **Formation santé-sécurité des membres du CSE** | SAL | **PERM** | CT L.2315-18 | ✅ `formation-securite-salarie-cse-sst` (lot 8). Nature corrigée : cinq et trois jours sont des DURÉES DE STAGE, pas des périodicités — le rythme suit le mandat, que le produit ne modélise pas. Même ligne pour le salarié désigné de A6, par renvoi exprès de `L.4644-1` |
| B3 | CSSCT obligatoire (≥ 300) | ÉTS | ÉVÈN | CT L.2315-36 | ❌ (hors cible V2 ?) |
| B4 | Local de restauration (≥ 50) / emplacement de restauration (< 50) | ÉTS | PERM | CT R.4228-22/23 | ✅ **DEUX** obligations (lot 8) : `locaux-etablissement-local-restauration` (`effectifMin: 50`) et `locaux-etablissement-emplacement-restauration` (`effectifMax: 49`). Deux régimes exclusifs, pas une règle et son exception — le seuil est bien à 50 depuis le décret n° 2019-1586, non à 25 |
| B5 | Règlement intérieur — volet hygiène et sécurité (≥ 50) | ÉTS | PERM | CT **L.1321-1 1°** (fondateur), L.1311-2 (seuil) | ✅ `prevention-etablissement-reglement-interieur` (lot 8). **Référence corrigée** : `L.1311-2` ne dit rien du contenu, seulement le seuil et le délai de douze mois. C'est `L.1321-1` 1° qui fait entrer le règlement intérieur dans le périmètre santé-sécurité |
| B6 | PAPRIPACT (≥ 50) | ÉTS | RÉC | CT L.4121-3-1 | ❌ (cf. A4) |

## C. Déclencheur : typologie du bâtiment (ERP / IGH)

| # | Obligation | Porteur | Nature | Référence présumée | Statut |
|---|---|---|---|---|---|
| C1 | **Registre de sécurité ERP** | ÉTS | PERM | CCH R.143-44 (version au 01/07/2026, verbatim relevé le 2026-08-31) + CT L.4711-1, L.4711-2, D.4711-2, D.4711-3 | ✅ **faux négatif corrigé le 2026-08-31** — `incendie-registre-securite`, porteur établissement. La branche `travail: true` reposait sur `L. 4711-5`, une **faculté** : les quatre articles qui l'obligent réellement ont été ajoutés et dépouillés au corpus. |
| C2 | Visites périodiques de la commission de sécurité | ÉTS | quinquennale en locaux à sommeil (PE 37), **aucun rythme écrit sinon** | CCH **R. 143-41** (fonde les visites, ne fixe aucun rythme) + arrêté 25/06/1980 **PE 37** (verbatim relevés le 2026-08-31) | ⚠️ **examiné le 2026-08-31, délibérément NON rebranché.** Le faux négatif est réel (R. 143-41 ne cite aucun équipement), mais PE 37 — seul article du Livre III à organiser une visite périodique en 5ᵉ catégorie — ne vise que les établissements « comportant, pour le public, des locaux à sommeil ». Cette restriction décide de l'**existence** de la visite, pas de son rythme : la retirer ferait naître une échéance chez chaque boutique. Elle est portée par une caractéristique de l'ALARME_INCENDIE, et un porteur établissement n'accepte pas de `conditions`. **Dette nommée : il faut un attribut d'établissement « locaux à sommeil ouverts au public » — donc une donnée à collecter, écartée par le cadrage V1 au même titre que le DTA et le radon.** |
| C3 | Registre public d'accessibilité | ÉTS | PERM | Décret 2017-431 | ✅ `RegistreAccessibilite` |
| C4 | **Exercices d'évacuation** (semestriels) | ÉTS | RÉC | CT R.4227-39, champ de R.4227-34 (verbatim relevés le 2026-08-31) | ✅ **faux négatif corrigé le 2026-08-31** — `incendie-travail-exercice-semestriel`, porteur établissement. R. 4227-34 **impose** l'alarme aux établissements de son champ : l'alarme y était le contenu d'une obligation, jamais la condition d'une autre. |
| C5 | Service de sécurité incendie / **SSIAP** selon type et catégorie | SAL | RÉC | Arrêté 25/06/1980, MS 46 et s. | ❌ |
| C6 | **Guide-file / serre-file** | SAL | RÉC | (AOCR — base à vérifier) | ❌ |
| C7 | Plan d'évacuation affiché | ÉTS | PERM | CT R.4227-37 | ❌ |
| C7b | Instruction du personnel (ERP 5ᵉ catégorie), sans périodicité écrite | SAL | PERM | Arrêté 25/06/1980, **PE 27** — relevé par l'audit | ❌ |
| C8 | **Entretien et vérification triennaux de l'ensemble des installations et équipements techniques de l'établissement** | ÉTS | RÉC (3 ans) | Arrêté 25/06/1980, **PE 4 § 2** — en vigueur au 01/07/2026, verbatim relevé par l'audit `chore/veille-reglementaire` | 🚫 |
| C9 | Contrat annuel d'entretien du système de détection incendie — **locaux à sommeil uniquement** | ÉTS | RÉC (1 an) | Arrêté 25/06/1980, **PE 4 § 1** — même relevé | 🚫 |
| C10 | Contrôle biennal de l'ensemble des installations techniques (hôtellerie), **hors installations électriques et SDI — annuels** et hors ascenseurs (AS 9) | ÉTS | RÉC (2 ans + retraits) | Arrêté 25/06/1980, **PO 1 § 3** — verbatim relevé par l'audit `chore/veille-reglementaire` | 🚫 |

## D. Déclencheur : caractéristiques du bâtiment

| # | Obligation | Porteur | Nature | Référence présumée | Statut |
|---|---|---|---|---|---|
| D1 | **DTA** — permis de construire antérieur au 01/07/1997 | **BÂT** | PERM | CSP R.1334-29-5 | ❌ **universel, gros trou** |
| D2 | Fiche récapitulative du DTA communiquée aux occupants | **BÂT** | PERM | CSP R.1334-29-5 | ❌ |
| D3 | Repérage amiante avant travaux | ÉTS | ÉVÈN | CT R.4412-97 | ❌ |
| D4 | Mesurage radon (ERP en zone à potentiel 3) | ÉTS | RÉC (10 ans) | CSP R.1333-33 et s. | ❌ |
| D5 | Surveillance de la qualité de l'air intérieur (certains ERP) | ÉTS | RÉC (7 ans) | CE R.221-30 et s. | ❌ |
| D6 | **DMLT** — dossier de maintenance des lieux de travail | ÉTS | PERM | CT R.4211-3 | ❌ |
| D7 | **DIUO** | ÉTS | PERM | CT R.4532-95 et s. | ❌ |
| D8 | CREP plomb (immeubles antérieurs à 1949) | ÉTS | PERM | CSP L.1334-8 | ❌ (surtout habitation — à trancher) |

## E. Déclencheur : activité réellement exercée

C'est la couche qui manquait à l'analyse initiale : ni statut, ni équipement, ni effectif — **un fait de tâche**.

| # | Obligation | Porteur | Nature | Référence présumée | Statut |
|---|---|---|---|---|---|
| E1 | **Habilitation électrique** — salarié opérant sur ou près d'installations élec | SAL | pas de périodicité légale | CT R.4544-9 à R.4544-11 | ⚠️ ancrée `INSTALLATION_ELECTRIQUE` ; le « 3 ans » encodé est une convention INRS, **sans fondement dans le Code du travail** (relecture f6) |
| E1b | **Attestation médicale d'absence de contre-indication** conditionnant l'habilitation au voisinage de pièces nues sous tension — l'employeur en conserve copie pendant sa validité | SAL | RÉC (5 ans) | CT **R.4544-11-1**, créé le 01/10/2025 par le décret n° 2025-355 — relevé par l'audit `chore/veille-reglementaire` | 🚫 nominatif **et** médical — en vigueur depuis 11 mois, jamais porté |
| E2 | **Autorisation de conduite** (équipements mobiles automoteurs, levage) | SAL | RÉC | CT R.4323-56 | ❌ |
| E3 | Formation à la conduite / CACES | SAL | RÉC | CT R.4323-55 | ❌ |
| E4 | Travail en hauteur, utilisation d'EPI antichute | SAL | RÉC | CT R.4323-104 et s. | ❌ |
| E5 | Formation à la manutention manuelle (gestes et postures) | SAL | RÉC | CT R.4541-8 | ❌ |
| E6 | Formation « travail sur écran » | SAL | PONC | CT R.4542-16 | ❌ (pertinent tertiaire) |
| E7 | Agents chimiques dangereux / CMR — formation, notice de poste | SAL | RÉC | CT R.4412-38 (relu le 2026-08-31), R.4412-87 | ⚠️ 2 entrées, ancrées `STOCKAGE_MATIERE_DANGEREUSE`. **Examiné et laissé tel quel le 2026-08-31** — cf. A20 : le déclencheur du texte est la présence d'agents chimiques, c'est-à-dire ce déclencheur E, non implémenté. L'ancrage équipement est un proxy imparfait mais qui sous-applique ; le porteur établissement sur-appliquerait. |
| E4 | Travail en hauteur, utilisation d'EPI antichute | SAL | RÉC | CT R.4323-104 et s. | ❌ — **non encodée au lot 8, et la référence est à revoir**. `R.4323-104` porte l'INFORMATION sur les EPI en général, `R.4323-105` la consigne d'utilisation, `R.4323-106` la formation au port (« renouvelée aussi souvent que nécessaire » : aucune périodicité). Aucun des trois ne parle de travail en hauteur, qui relève de `R.4323-58` et s. Par ailleurs les EPI sont listés hors périmètre dans `.claude/CLAUDE.md` |
| E5 | Formation à la manutention manuelle (gestes et postures) | **ÉTS** | **PERM** | CT R.4541-8 | ✅ `formation-securite-etablissement-manutention` (lot 8). Porteur ÉTS et non SAL : le texte n'écrit ni durée de validité ni pièce nominative, et « les travailleurs dont l'activité comporte des manutentions manuelles » est une qualification que le produit ne détient pas — un titre que personne ne sait attribuer ne produit aucune ligne |
| E6 | Formation « travail sur écran » | **ÉTS** | **PERM** | CT R.4542-16 | ✅ `formation-securite-etablissement-travail-sur-ecran` (lot 8). Même raison de porteur que E5. Le second déclenchement — « modification substantielle du poste » — est un événement non détectable : décrit, jamais planifié |
| E7 | Agents chimiques dangereux / CMR — formation, notice de poste | SAL | RÉC | CT R.4412-38, R.4412-87 | ⚠️ 1 entrée, ancrée équipement |
| E8 | Amiante sous-section 4 | SAL | RÉC (3 ans) | CT R.4412-117 et s. | ❌ |
| E9 | Bruit — évaluation, EPI, examen audiométrique | SAL + ÉTS | RÉC | CT R.4431-1 et s. | ❌ (AOCR : 3 lignes) |
| E10 | ATEX — formation + DRPCE | SAL + ÉTS | PERM + RÉC | CT R.4227-49 et s. | ⛔ hors périmètre (CLAUDE.md) |
| E11 | Jeunes travailleurs — dérogation aux travaux réglementés | ÉTS | PERM | CT R.4153-38 et s. | ❌ |
| E12 | Femmes enceintes — postes à risques | ÉTS | PERM | CT D.4152-x | ❌ |
| E13 | Rayonnements ionisants — PCR, zonage, dosimétrie | SAL + ÉTS | RÉC | CT R.4451-x | ⛔ hors périmètre (CLAUDE.md) |
| E14 | **Protocole de sécurité chargement/déchargement** | ÉTS | PERM | **CT R.4515-1, R.4515-4 et s.** | ✅ `co-activite-etablissement-protocole-securite` (lot 8), **universel dès qu'un camion livre**. **Référence corrigée** : l'arrêté du 26/04/1996 est à l'origine du dispositif mais renvoie à l'article `R.237-1`, numérotation d'avant la recodification de 2008. Le dispositif est codifié à `R.4515-1` à `R.4515-11` |
| E15 | Plan de prévention (entreprise extérieure) | ÉTS | ÉVÈN | CT R.4512-6 et s. | ✅ `PlanPrevention` |
| E16 | Permis de feu | ÉTS | ÉVÈN | Arrêté 19/03/1993 | ✅ `PermisFeu` |
| E17 | Coordination SPS | ÉTS | ÉVÈN | CT L.4532-2 | ❌ |
| E18 | ICPE — déclaration / enregistrement / autorisation + contrôles | ÉTS | PERM + RÉC | CE L.512-x | ❌ (AOCR : 13 lignes) — **périmètre à trancher** |

---

## Ce que la carto donne comme chiffres

| | Nombre |
|---|---|
| Lignes recensées hors équipement | **62** |
| ✅ couvertes | 5 → **8** au 2026-08-31 (A13, C1, C4 rebranchées ; A15 requalifiée — il n'y avait pas d'obligation) |
| ⚠️ existantes mais mal ancrées (faux négatifs possibles) | 6 → **3** au 2026-08-31 |
| 🚫 inencodables en l'état du modèle | 3 |
| ❌ absentes | 48 |
| dont **formations réglementaires** | 13 |

Pour mémoire, côté équipement : **85 obligations encodées, dont 82 portées par un équipement** sur ~481 lignes AOCR.
*(Corrigé le 2026-08-27 : 78 → 85 au constat. Le retrait de trois fragments
absorbés par l'ADR-022 s'est fait **à compte constant** — ils ont été remplacés
par les deux obligations à porteur établissement et celle à porteur salarié —,
le total reste donc 85. Une version antérieure de cette parenthèse annonçait
« 85 → 84 » et contredisait la ligne juste au-dessus. Le compte faisant foi est le préfixe de
`EMPREINTE_ATTENDUE` dans `src/lib/referentiels/conformite/conformite.test.ts` — cherchez
la constante, pas un numéro de ligne, qui se périme à chaque édition. Les mentions de 78, 80 et 81 qui
subsistent plus bas dans ce document datent de rédactions successives.)*

## Ce que la carto implique pour le modèle

1. **Cinq déclencheurs**, pas un : statut d'employeur, effectif, typologie du bâtiment,
   caractéristiques du bâtiment, activité exercée — plus l'équipement, déjà couvert.
2. **Trois porteurs** : établissement, salarié (ou poste), équipement. Aujourd'hui
   `Verification.equipementId` n'est pas nullable (`prisma/schema.prisma:382`) — c'est
   le vrai blocage, pas le type.
3. **Quatre natures temporelles**, dont deux que `Periodicite` ne sait pas dire :
   `PERM` (un DTA ne se re-vérifie pas, il existe ou non) et `ÉVÈN`. Les forcer en
   `periodicite: "autre"` serait une rustine.
4. **13 formations réglementaires** ne peuvent aujourd'hui exister que comme
   `TypeAction: formation`, donc dans le cycle de vie d'une mesure du DU — cotables,
   dépriorisables, marquables `abandonnee`. Une habilitation électrique ne s'abandonne pas.
5. **Une obligation en vigueur est aujourd'hui inencodable** (C8, PE 4 § 2). C'est
   l'argument le plus solide pour l'ADR : il ne s'agit pas d'un besoin nouveau qu'on
   voudrait ajouter, mais d'une obligation existante, universelle chez les utilisateurs
   du périmètre (PE 2 § 3 maintient PE 4 pour les établissements de moins de 20 personnes),
   que le modèle empêche d'écrire. Son porteur est l'établissement pris comme un tout, et
   sa liste d'installations est hétérogène et ouverte (« etc. ») : l'encoder en
   `categoriesEquipement` obligerait à énumérer ce que le texte n'énumère pas.

## Attribut d'établissement manquant : « locaux à sommeil »

Signalé par l'audit `chore/veille-reglementaire` : **PE 4 § 1, PE 28, PE 32 et PE 37**
conditionnent leur application à la présence de locaux à sommeil. Ce n'est pas une
propriété d'équipement, et elle n'existe pas en base — aucun champ dans
`prisma/schema.prisma` (vérifié : la notion n'apparaît que dans des commentaires de
`src/lib/onboarding/deduction-erp.test.ts`).

Nuance à instruire avant d'ajouter un champ : l'attribut est **partiellement dérivable**
de `typeErp`, qui existe déjà — les types O, R avec internat, U et J comportent des
locaux à sommeil par nature. Mais la dérivation n'est pas totale (un type N ou M peut en
comporter, un type R sans internat n'en a pas), et `typeErp` est nullable (ADR-004).
**Tranché** : champ déclaré, pas dérivé — cf. « Décisions tranchées », point 3.

## Ce que les catégories ne couvrent pas encore

Trois angles morts du découpage lui-même, identifiés après coup.

**L'événement est un déclencheur, pas seulement une nature.** Il était classé en `ÉVÈN`
parmi les natures temporelles, ce qui est incomplet : un accident du travail *déclenche*
l'obligation de déclarer sous 48 h, un chantier déclenche un plan de prévention, une
embauche déclenche formation et visite d'information. Ce sont bien des déclencheurs, et
ils ne se confondent avec aucun des cinq autres. **Six déclencheurs, donc.**

**Le porteur « bâtiment » manque.** *Corrigé le 2026-08-27 : l'ADR-019 « le bâtiment est un
lieu » n'est pas en cours sur une branche — elle est **livrée sur `main`** depuis le
2026-08-21 (`b0c489e`), et elle **refuse** ce porteur : « `Verification` et `Action` n'ont pas
de `batimentId` […] Le bâtiment d'une échéance se lit en remontant la chaîne. » Le DTA reste
donc bloqué par **deux** manques distincts — un porteur bâtiment **et** un attribut d'année de
permis, que `Batiment` ne porte pas (il n'a que `nom`, `complementAdresse`, `ordre`). Aucun des
deux n'est l'`EnsembleClasse` que l'ADR-019 réserve : celle-ci est faite pour les **régimes**
(flags ERP/IGH, catégorie, effectif accueilli), et l'année du permis est une propriété physique,
pas un régime.* Le paragraphe d'origine suit, pour le raisonnement qu'il porte.

Le modèle `Batiment` existe (`prisma/schema.prisma:288`). Un
DTA se rattache à un bâtiment — c'est l'année de son permis de construire qui déclenche —
et un établissement peut en occuper plusieurs, d'époques différentes. Porter le DTA sur
l'établissement serait faux dès le deuxième bâtiment. **Quatre porteurs, donc.**

**Un septième chemin existe déjà, hors référentiel.** La prescription particulière (ADR-035,
modèle `PrescriptionParticuliere`, enum `SourcePrescription`) : arrêté du maire ou du
préfet, mise en demeure de l'inspection du travail, PV de commission de sécurité. Ce n'est
pas une lacune — c'est traité à part, et bien. Mais l'ADR doit le nommer, sinon il laissera
croire que le référentiel est la seule source d'échéances.

## Passage ciblé : obligations partiellement encodées

Fait le 2026-08-26 sur `main`, après le cas PE 4 § 2. **Question posée** : pour chaque
obligation dont l'article source est plus large que ce qui est encodé, le reste est-il
porté ailleurs ou perdu en silence ?

**Méthode** — extraction des 78 obligations avec leurs références, périodicités et
catégories d'équipement ; regroupement par **article fondateur** (`referencesLegales[0]`,
convention ADR-003 : « celui qu'on citerait seul devant un inspecteur ») ; signalement des
articles qui fondent plusieurs obligations, surtout à travers plusieurs domaines.

**Le référentiel compte 81 obligations** depuis les corrections du 2026-08-26 (78 au moment de ce recensement).

**Limite majeure, à lire avant les constats** — ce passage teste **un seul mode de
défaillance** : un article plus large que son encodage, détecté par le partage d'un article
fondateur. Il ne peut structurellement pas voir une obligation dont l'article unique dit
autre chose que ce qui est encodé — la classe EL 18 § 4, où des essais quinzomadaires et
mensuels étaient encodés « annuelle ». Il ne voit pas non plus une obligation absente, un
seuil faux ou un réalisateur faux. **Un résultat propre ici ne dit rien de l'exactitude du
contenu.**

### 1. Un article fondateur qui ne fonde rien — `L. 4711-5` ✅ **vérifié**

`elec-travail-consignation-registre` porte `referencesLegales[0] = "L. 4711-5"`, avec
`R. 4226-19` en second. Or `.claude/CLAUDE.md` écrit noir sur blanc : « **L. 4711-5
n'institue rien** : il autorise seulement à réunir plusieurs registres en un seul. »
L'ordre est donc inversé — c'est R. 4226-19 qui fonde la consignation.

**Vérifié en source indépendante** : R. 4226-19 dispose que les résultats des
vérifications prévues aux articles R. 4226-14 et R. 4226-16 « sont consignés sur un
registre », auquel sont annexés les rapports des organismes accrédités. C'est bien lui qui
institue l'obligation. L. 4711-5 ne fait que permettre de réunir plusieurs registres.

Ce n'est pas cosmétique. Le test anti-doublon s'appuie sur cette convention : *deux
obligations fondées sur le même article, pour la même catégorie et la même périodicité,
sont un doublon*. Un article fondateur faux fausse le test — exactement le mécanisme qui
avait masqué le doublon portails.

### 2. Convention appliquée à deux vitesses — `R. 4323-23`

`R. 4323-23` **fonde** `levage-vgp-semestrielle-chariot-gerbeur` mais n'est qu'**appui**
pour `levage-examen-etat-conservation`, `levage-vgp-accessoires-annuelle` et
`levage-vgp-semestrielle-personnes`, où l'arrêté du 1ᵉʳ mars 2004 occupe la première place.
Même rôle juridique, deux traitements. Même effet sur le test anti-doublon.

### 3. Motif PE 4 **possiblement** ailleurs — `GH 5` (IGH)

L'arrêté du 30 décembre 2011, art. GH 5 (« vérifications techniques par organismes
agréés ») fonde **deux** obligations dans **deux domaines** : `elec-igh-annuelle`
(`INSTALLATION_ELECTRIQUE`) et `incendie-igh-moyens-secours-annuelle` (`ALARME_INCENDIE`,
`EXTINCTEUR`, `DESENFUMAGE`). Un article qui impose la vérification d'un ensemble,
découpé en fragments ancrés équipement : c'est le motif PE 4 à l'identique. L'IGH étant
hors périmètre produit, la priorité est basse.

**Correction de ma première rédaction** : j'avais écrit « motif confirmé » avant d'avoir lu l'article. C'est faux —
je n'ai vérifié que la **forme** (un article fondateur, deux domaines, deux ancrages
équipement), pas que GH 5 couvre davantage que ce qui est encodé. Conclure sans lire
l'article serait exactement l'erreur reprochée au cas PE 4. C'est un candidat, au même
titre que R. 4222-20 ci-dessous.

### 4. Confirmé, et dans le périmètre — `R. 4222-20` 🚫

**Verbatim relevé en première main** par l'audit `chore/veille-reglementaire` (b91fcda) :
« L'employeur maintient **l'ensemble des installations mentionnées au présent chapitre** en
bon état de fonctionnement et en assure régulièrement le contrôle. » Version en vigueur au
1ᵉʳ mai 2008, chapitre II « Aération, assainissement » (R. 4222-1 à R. 4222-26).

L'article couvre donc toute installation d'aération d'un lieu de travail, sans distinction.
Le référentiel l'accroche à trois catégories — `VMC`, `CTA`,
`STOCKAGE_MATIERE_DANGEREUSE` — via trois obligations. Un établissement dont la
ventilation n'est déclarée sous aucune des trois ne reçoit rien.

Contrairement à PE 4 § 2 (5ᵉ catégorie) et à GH 5 (IGH, hors périmètre), **celui-ci vise
tout employeur**. Il rejoint donc les obligations manquantes.

### 5. Sous-référencement confirmé — froid

Six obligations fondées sur le même « Règlement (UE) 2024/573, art. 5 », avec **six
périodicités distinctes**, sans désignation de paragraphe ni de seuil. Le test anti-doublon
ne les attrape pas — les périodicités diffèrent — mais rien ne permet de vérifier laquelle
est fondée sur quoi. Constat identique à celui de l'audit, atteint indépendamment.

### Ce qui est ressorti propre

- **Aucune catégorie d'équipement orpheline** : les 18 valeurs de `CategorieEquipement` sont couvertes. `AUTRE` est la soupape volontaire documentée dans `src/lib/equipements/hors-referentiel.ts`, pas un trou.
- **PS 32** (parkings) : deux obligations séparées par le seuil de 250 véhicules, mutuellement exclusives — découpage légitime, pas une décomposition.
- **BAES** (arrêté du 14 décembre 2011 art. 11, et EC 14 § 3) : un article, deux opérations distinctes — essai mensuel et autonomie semestrielle — les deux encodées. Rien de perdu.

## Dette connue signalée par l'audit

- ~~**Doublon portails**~~ **corrigé** (59fdc3f). La semestrielle de `porte-auto-portail-piete-coulissant` n'était fondée sur aucune de ses deux références — les articles 2 et 5 de l'arrêté du 21 décembre 1993 sont des prescriptions techniques d'installation, pas un rythme. `periodicite` passe à `mise_en_service_uniquement` ; l'article 9 porte le contrôle périodique, déjà couvert par `porte-auto-verification-semestrielle`. Le doublon disparaît sans fusionner deux obligations qui disent des choses différentes. Au passage, le libellé restreignait aux portails **coulissants** alors que l'article 2 vise toute installation de passage de véhicules — un dirigeant équipé d'un battant motorisé pouvait légitimement écarter la ligne.
- ~~**EL 18 § 4**~~ **corrigé** (08e2e2e) : l'article impose deux rythmes — quinze jours pour les niveaux, un mois pour l'essai de démarrage en charge — le référentiel n'en portait qu'un. Valeur `bimensuelle` ajoutée à l'énumération (migration additive appliquée en production, vérifiée). Le référentiel passe à **80 obligations**.
- **Froid sous-référencé** : 8 obligations, 7 périodicités distinctes, toutes adossées au même « art. 5 » du règlement (UE) 2024/573 sans désigner le paragraphe ni le seuil qui les fonde. La source est la bonne, la granularité ne permet pas de vérifier chaque périodicité isolément.
- **31 articles `non_couvert`** relevés par l'audit : obligations réelles visant des ERP de 5ᵉ catégorie que le produit ne porte pas (hôtels, locaux à sommeil, petits établissements de soins et sportifs). Liste à intégrer ici.

### La quinquennale de commission : deux erreurs successives

À corriger dans les deux sens, et l'épisode vaut d'être gardé entier.

`incendie-erp-5-visite-commission` affichait une échéance quinquennale. L'audit a d'abord
montré que ses deux références ne la fondaient pas — R. 143-34 traite des vérifications à
la charge de l'exploitant, GE 4 relève du Livre II écarté par PE 1 § 1 et son tableau
n'a aucune ligne de 5ᵉ catégorie — et en a conclu que le rythme était inventé (4bdb1f8).

**Cette conclusion était fausse.** `PE 37` fixe bien la périodicité, verbatim vérifié en
source indépendante : « Ces établissements doivent être visités **tous les cinq ans** par
la commission de sécurité compétente ; la fréquence de ces visites peut être augmentée,
s'il est jugé nécessaire, par arrêté du maire ou du préfet, après avis de la commission. »
Il ne vise que les établissements **avec locaux à sommeil**. Rectifié en 99d0f87.

Deux enseignements.

L'article dormait dans le lot PE 28-37, déclaré non couvert parce qu'il dépend de
l'attribut « locaux à sommeil ». **Le coût de ne pas dépouiller un lot n'est pas seulement
une lacune : c'est parfois une erreur ailleurs.** Un secteur peu représenté n'est pas un
article sans intérêt.

Et la description d'origine, remplacée par la correction, liait déjà la visite aux locaux à
sommeil. Elle était plus juste que ce qui l'a remplacée — un rappel que corriger sans avoir
lu tout le corpus peut dégrader.

`periodicite` reste `autre`, mais pour une raison nommée : aucun attribut ne porte la
distinction « locaux à sommeil ». PE 37 rejoint les obligations manquantes.

### Le référentiel se contredisant lui-même

Nouveau genre de défaut, distinct de tous les autres : ni un manque, ni un écart au texte,
mais **deux obligations du référentiel disant l'inverse l'une de l'autre**.
`ascenseur-examen-annuel-securite` rangeait « les câbles ou chaînes de suspension et leurs
extrémités » dans l'annuel ; `ascenseur-examen-semestriel-secours` les portait en
semestriel. Le tableau de l'annexe de l'arrêté du 18 novembre 2004 donne raison au second.
Rien ne garantissait que la lecture la plus lâche ne l'emporte pas.

Six lignes du tableau manquaient — dont, en semestriel, le **frein** (ce qui retient la
cabine) et le **dispositif antidérive** (ce qui l'empêche de descendre seule en
hydraulique). Corrigé en 1089e4a.

**Point de méthode** : le tableau à trois colonnes perd la position de ses croix à la
conversion en texte. Quatre lectures automatiques l'avaient rendu illisible ; il a fallu le
relever sur capture d'écran. Une source tabulaire ne se vérifie pas comme un article.

**Deuxième valeur de périodicité manquante** : les neuf lignes à « intervalle maximum de
six semaines » ne produisent aucune échéance — c'est la visite de base de l'ascenseur,
celle qui vérifie les verrouillages de portes, la précision de nivelage et les moyens
d'alerte permettant de parler à quelqu'un depuis une cabine bloquée. L'énumération ne
descend pas à quarante-deux jours, comme elle ne descendait pas à quatorze ce matin.
Décision en attente : une migration de l'enum Postgres, du même type additif que
`bimensuelle`.

### Une condition encodée à l'envers

Le défaut le plus grave relevé de la journée n'est ni un manque ni une périodicité fausse.
`levage-epreuve-initiale-fonctionnement` réservait l'épreuve aux appareils « non
spécifiquement conçus pour le levage de personnes ». L'article 14 d) de l'arrêté du
1ᵉʳ mars 2004 dit l'inverse : « Cette épreuve n'est pas exigée pour les appareils de levage
mus par la force humaine employée directement **sauf s'ils sont conçus pour lever des
personnes**. »

L'obligation **excluait précisément les appareils pour lesquels le texte l'impose le plus
nettement** — ceux sous lesquels quelqu'un se tient. Et sa référence citait les articles 6,
10 et 11, qui *définissent* les épreuves, sans citer l'article 14, qui seul les *exige* :
définir n'est pas prescrire. Corrigé en 0be2a1f.

Aucun test ne pouvait l'attraper : la condition était cohérente, bien formée, et fausse.

### Cinq articles portent le même motif

PE 4 § 2, PE 4 § 1, PO 1 § 3, **R. 4222-20**, et les opérations quinquennales du § 5° de
l'arrêté du 23 février 2018 (réglage global du réseau aéraulique et vérification de
*l'ensemble* du dispositif de sécurité collective, appareil par appareil — le seul contrôle
qui vérifie que la combustion est coupée sur chaque logement si l'extraction s'arrête). Trois relèvent du règlement ERP, le
quatrième du Code du travail et vise tout employeur. Ce n'est plus une série d'accidents
d'encodage : c'est la signature d'un modèle à un seul axe. **Quand une obligation naît de
l'établissement, le référentiel ne sait que la découper** — et le découpage produit zéro
ligne pour qui n'a rien déclaré.

## Ce que le modèle actuel rend impossible, en une phrase

Toute obligation dont le déclencheur n'est pas un équipement déclaré est soit absente,
soit accrochée à un équipement arbitraire — et dans ce second cas elle disparaît en
silence pour l'établissement qui n'a pas déclaré cet équipement.

*Corrigé le 2026-08-27, puis rectifié le même jour.* Ce passage annonçait « trois faux négatifs
déjà documentés dans le référentiel lui-même (`src/lib/referentiels/conformite/incendie.ts:162`,
"LIMITE CONNUE, NON CORRIGÉE ICI") ». Une première rectification affirmait que cette chaîne
n'avait jamais existé ; elle se fondait sur un `git log -S` lancé sur `main` seul. Sur `--all`,
la chaîne apparaît : elle a été introduite par le commit `7736869` du 2026-08-26, puis perdue
par un rebase dont la rapatriation n'a repris qu'une partie du contenu. **La note a été
restaurée** dans `incendie.ts`. Seule la référence par numéro de ligne était bien périmée —
`incendie.ts:162` désigne aujourd'hui une note sur `CCH R. 141-10`. Ce que le référentiel porte réellement, ce sont **neuf sur-applications assumées** — six dans `incendie.ts`, trois dans `electricite.ts` —
(lignes 343, 367, 403, 426, 481, 504) — des faux **positifs** délibérés, maintenus pour éviter
des faux négatifs muets, et dont chaque note nomme déjà sa condition de levée : « À reprendre
lorsque le référentiel saura porter PE 4 § 2, dont le porteur est l'établissement et non un
équipement. »

## Décisions tranchées

Prises le 2026-08-26 sur la base des textes et des recommandations vérifiés ce jour.
Les références restent à relever sur Légifrance avant encodage, comme le reste du document.

### 1. Porteur salarié : **nominatif**, avec une frontière stricte sur la santé

L'obligation est nominative par nature, ce n'est pas un choix de modélisation.
**R. 4544-10** : le titre d'habilitation électrique est délivré par l'employeur à un
travailleur désigné, et précise la nature des opérations qu'il est autorisé à effectuer.
Une attestation SST, un CACES, une autorisation de conduite obéissent à la même logique.
Un porteur « poste » ne sait pas dire « Dupont est habilité, Martin ne l'est pas » — or
c'est exactement ce qui est demandé en contrôle. Le suivi par poste produirait un
compteur (« 2 caristes à habiliter ») sans jamais permettre de prouver quoi que ce soit.

**Base légale : obligation légale de l'employeur** (RGPD art. 6.1.c), pas le consentement
— un consentement recueilli dans une relation de subordination n'est pas libre, donc pas
valable. Conservation : durée de la relation de travail puis archivage intermédiaire ; la
CNIL a publié le **2 avril 2026** un référentiel de durées de conservation RH à consulter
pour les durées exactes.

**Frontière à ne jamais franchir** — et elle contraint directement les lignes A9 et A10 :
le dossier médical en santé au travail appartient au SPST, pas à l'employeur. L'employeur
ne reçoit que l'avis d'aptitude ou d'inaptitude, les propositions d'aménagement et les
restrictions ; **aucun élément de diagnostic ne peut lui être transmis**. L'application ne
doit donc stocker, pour le suivi médical, que la date de la visite, l'échéance suivante et
le sens de l'avis. Jamais un motif, jamais une pièce jointe médicale.

**Conséquence assumée** : `docs/rgpd.md` affirme aujourd'hui que l'outil ne stocke aucun
identifiant personnel de salarié, et qualifie l'ensemble des données de « données
d'entreprise ». Cette section devient fausse le jour où le porteur salarié existe. Elle
doit être réécrite **avant** la migration, pas après — base légale, durées, information des
personnes, droit d'accès.

### 2. ICPE : **hors périmètre**, avec une question fermée de rattrapage

Trois raisons convergentes.

Les seuils ne sont pratiquement jamais atteints dans le périmètre V2 : la rubrique 2925
(charge d'accumulateurs) déclenche à partir de 600 kW, la 1510 (entrepôts couverts) relève
de l'enregistrement à partir de 5 000 m³. Un restaurant, un commerce de détail ou un
bureau n'y arrivent pas, sauf grande surface avec entrepôt — soit une fraction marginale
de la cible.

Encoder l'ICPE correctement suppose la nomenclature entière, des centaines de rubriques
avec des seuils calculés par installation. C'est un produit en soi, pas un domaine de plus.

Et le risque est asymétrique : un faux positif alarme sans raison, un faux négatif laisse
croire à une couverture qui n'existe pas.

**Mais on ne se tait pas** : une question fermée à l'onboarding (« exercez-vous une
activité relevant des installations classées ? ») bascule le dossier en couverture
partielle, avec la mention à l'écran et au document. C'est le mécanisme déjà en place pour
les activités non couvertes par le référentiel sectoriel — même principe, zéro IA, zéro
devinette.

Les déchets suivent la même règle et restent dehors. Les fluides frigorigènes restent
dedans : ils y sont par la sécurité des équipements, pas par l'ICPE.

### 3. Locaux à sommeil : **attribut déclaré**, pas dérivé

Un booléen `locauxSommeil` sur `Etablissement`, renseigné par une question fermée à
l'onboarding. Trois raisons.

La condition est structurante, pas marginale : **PE 4 § 1, PE 28, PE 32 et PE 37** s'y
adossent, et **PE 2 § 3** en fait un critère du régime allégé des ERP de 5e catégorie.

La dérivation depuis `typeErp` est incomplète des deux côtés — un type N peut comporter
des chambres à l'étage, un type R sans internat n'en comporte pas — et `typeErp` est
nullable (ADR-004).

Surtout, une dérivation muette rendrait « non » par défaut quand `typeErp` est absent :
c'est le faux négatif exact que toute cette carto cherche à supprimer.

**Règle de traitement du non-renseigné**, qui vaut au-delà de ce champ :

> L'incertitude ne réduit jamais la couverture.

`null` ne vaut pas « non ». Concrètement : une obligation conditionnée aux locaux à
sommeil apparaît avec une mention « à confirmer » tant que le champ n'est pas renseigné,
et un allègement de régime conditionné à leur absence ne s'applique pas tant que l'absence
n'est pas déclarée. Les deux vont dans le même sens — ne pas masquer, ne pas alléger.

C'est l'inverse exact de la sémantique de `equipement_propriete_booleenne`, où l'absence
de propriété rend la condition non satisfaite. Le contraste est volontaire et mérite
d'être écrit dans le type : une propriété d'équipement absente signifie « cet équipement
n'a pas cette caractéristique », une propriété d'établissement absente signifie « on ne
sait pas encore ».

### Ce qui reste à l'appréciation du produit

Rien de réglementaire. Deux points d'ergonomie : le libellé exact des questions
d'onboarding ajoutées (ICPE, locaux à sommeil), et l'endroit où s'affiche la couverture
partielle au niveau du dossier.

## Sources consultées pour les décisions

- **R. 4544-10** — le titre d'habilitation électrique est délivré nominativement par l'employeur ([Code du travail numérique](https://code.travail.gouv.fr/code-du-travail/r4544-10))
- **CNIL, référentiel de durées de conservation RH**, publié le 2 avril 2026 ([cnil.fr](https://www.cnil.fr/fr/referentiel-durees-conservation-donnees-rh))
- **CNIL, guide pratique SPST** — l'employeur n'a pas accès au DMST, seulement à l'avis d'aptitude ([PDF](https://www.cnil.fr/sites/cnil/files/2023-12/cnil_guide_spst_0.pdf))
- **INRS** — dossier médical en santé au travail, conservation 40 ans par le SPST ([focus juridique](https://www.inrs.fr/publications/juridique/focus-juridiques/focus-juridique-dossier-medical-sante-travail.html))
- **Nomenclature ICPE** — seuils des rubriques 1510 et 2925 ([Prévention BTP](https://www.preventionbtp.fr/ressources/focus/nomenclature-icpe-installations-classees-pour-la-protection-de-l-environnement-votre-chantier-depot-ou-atelier-fait-il-partie-de-la-liste_aYKgMaqFDAMe7pGduxAGf6))

## Sources de contenu

- `spec/Fiche Audit AOCR 09102018.xlsx` — 481 lignes, base de travail, **non citable** (mélange sources primaires et normes privées, cf. ADR-003)
- INRS **ED 6298**, « La formation à la sécurité — obligations réglementaires et recommandations », 03/2018, 68 p., PDF gratuit — la source à dépouiller pour les 13 formations
- Légifrance — la seule source citable, à relever article par article

Aucune base commerciale (Bureau Veritas, Red-on-line, Preventeo) ne doit être recopiée
— `.claude/CLAUDE.md:69`. Aucun jeu de données ouvert ne fournit le couple
« déclencheur + périodicité » : LEGI donne le texte sans la structure, et la base
data.gouv des obligations d'entreprise n'a pas été mise à jour depuis janvier 2014.
