# ADR-003 — Organisation des référentiels (DUERP + obligations de vérification)

- **Date** : 2026-04-21
- **Statut** : Acceptée
- **Auteur** : Claude Code (sur brief Paloma)
- **Relatif à** : `spec/PLAN.md` étapes 3 et 11

## Contexte

Le MVP DUERP stocke ses référentiels métier dans `src/lib/referentiels/`. Aujourd'hui ce dossier contient :
- `restauration.ts`, `commerce.ts`, `bureau.ts` — référentiels sectoriels (risques + unités + mesures)
- `commun.ts` — risques transverses (routier, RPS, TMS) + questions détecteurs
- `types.ts` — types TypeScript partagés
- `index.ts` — exports + helpers de recherche par NAF

La V2 ajoute un **nouveau type de référentiel** : les **obligations réglementaires** (électricité, incendie, aération, ascenseurs, etc.). Ce n'est ni un risque ni une mesure — c'est une obligation légale formelle, avec :
- Référence au Code du travail, CCH, arrêté
- Périodicité (hebdomadaire, annuelle, quinquennale…)
- Typologie d'application (ERP catégorie, IGH, travail classique, effectif)
- Profil du réalisateur (organisme agréé, personne qualifiée, exploitant, fabricant)
- Criticité (1-5)
- Conditions d'application (questions de détection ou règles logiques)

Ce référentiel vit à côté des référentiels DUERP mais n'a **pas** le même schéma. Il sert de base au moteur de matching (étape 5) et au calendrier (étape 6).

La question : où placer ce nouveau référentiel, et comment cohabiter avec les anciens ?

## Décision

On garde une **séparation claire en deux dossiers** à la racine de `src/lib/referentiels/`, avec un `index.ts` unique qui ré-exporte tout.

```
src/lib/referentiels/
  index.ts                        → ré-exports consolidés
  types-communs.ts                → TypologieEtablissement, Periodicite, Realisateur (enums partagés)
  duerp/                          → référentiels DUERP (risques sectoriels + transverses)
    index.ts
    types.ts                      → RisqueReferentiel, MesureRecommandee, UniteTravailSuggeree
    restauration.ts               → (déplacé depuis racine)
    commerce.ts                   → (déplacé depuis racine)
    bureau.ts                     → (déplacé depuis racine)
    commun.ts                     → (déplacé depuis racine)
    referentiels.test.ts          → (déplacé)
  conformite/                     → référentiels d'obligations réglementaires (V2)
    index.ts
    types.ts                      → Obligation, ConditionApplication, CategorieEquipement
    electricite.ts                → P1
    incendie.ts                   → P1
    aeration.ts                   → P1
    cuisson-hotte.ts              → P2 (étape 11)
    ascenseurs.ts                 → P2 (étape 11)
    portes-portails.ts            → P2 (étape 11)
    …
    conformite.test.ts
```

### Principe directeur : séparation verticale
Un référentiel DUERP et un référentiel d'obligations ne partagent **pas** le même type de données. Les forcer dans un type commun serait une mauvaise abstraction (coupling without cohesion).

On partage seulement ce qui est **réellement commun** au-delà des référentiels :
- `TypologieEtablissement` (ERP / IGH / TRAVAIL_CLASSIQUE) — ADR-004
- `CategorieErp` (N1..N5, types)
- `Periodicite` (enum : hebdomadaire, mensuelle, trimestrielle, semestrielle, annuelle, biennale, triennale, quinquennale, décennale, autre)
- `Realisateur` (enum : organisme_agree, personne_qualifiee, personne_competente, exploitant, fabricant, organisme_accredite)
- `Criticite` (number 1-5)

Ces types vivent dans `src/lib/referentiels/types-communs.ts` et sont importés par les deux sous-modules.

### Type `Obligation` (esquisse)

```typescript
export type Obligation = {
  id: string;                             // ex "elec-controle-periodique-annuel"
  domaine: "electricite" | "incendie" | "aeration" | "cuisson" | "ascenseur" | "porte-portail" | "...";
  libelle: string;                        // affichable tel quel
  description?: string;                   // long form
  referenceLegale: ReferenceLegale[];     // ≥ 1 — source primaire obligatoire
  periodicite: Periodicite;
  realisateurs: Realisateur[];            // souvent 1, parfois "personne_qualifiee OR organisme_agree"
  criticite: 1 | 2 | 3 | 4 | 5;
  typologies: TypologieApplication;       // voir ADR-004 pour la forme exacte (flags ou enum)
  conditions: ConditionApplication[];     // règles logiques pour matcher un établissement/équipement
  categoriesEquipement: string[];         // ids de catégorie d'équipement qui déclenchent l'obligation
};

export type ReferenceLegale = {
  source: "CODE_TRAVAIL" | "CCH" | "CODE_ENVIRONNEMENT" | "ARRETE" | "DECRET" | "INRS";
  reference: string;                      // ex "R. 4226-16" ou "Arrêté du 25 juin 1980, art. EL 19"
  urlLegifrance?: string;                 // commentaire ou champ optionnel
};
```

Les conditions d'application (`ConditionApplication`) sont de forme déclarative **pure** — pas de fonction TS arbitraire. Exemple :

```typescript
{
  id: "ventilation-erp-sup-250-veh",
  type: "ET",
  conditions: [
    { champ: "typologie", operateur: "EGAL", valeur: "ERP" },
    { champ: "equipement.parkingCouvert", operateur: "EGAL", valeur: true },
    { champ: "equipement.nbVehicules", operateur: "SUP", valeur: 250 }
  ]
}
```

Cette approche garantit l'auditabilité et permet au moteur de matching (étape 5) de produire un mode `explain` : « cette obligation s'applique parce que votre établissement est un ERP + parking > 250 véhicules ».

### Pas de seed obligatoire en base

Comme les référentiels DUERP actuels, le référentiel d'obligations reste en **TypeScript typé et versionné avec le code**. Le seed en base (étape 3) crée éventuellement des tables `Obligation`/`CategorieEquipement` figées pour les jointures Prisma, mais la **source de vérité** est le repo. Un changement d'obligation passe par une PR.

Raison : auditabilité. Un inspecteur qui demande « depuis quand cette obligation est-elle dans votre système ? » doit pouvoir consulter l'historique Git.

## Conséquences

### Positives
- Séparation claire DUERP / Conformité — pas de tentation de fusion prématurée.
- Le type `Obligation` évolue indépendamment du type `RisqueReferentiel`.
- Les enums partagés (`Periodicite`, `TypologieEtablissement`) sont réutilisables par le moteur de matching et par d'éventuels futurs référentiels (déchets, environnement, etc.).
- Les référentiels DUERP existants déménagent (`src/lib/referentiels/restauration.ts` → `src/lib/referentiels/duerp/restauration.ts`) mais gardent leur contenu — pas de réécriture.

### Négatives / coûts
- Les imports existants doivent être mis à jour (`@/lib/referentiels/restauration` → `@/lib/referentiels/duerp/restauration` ou via le `index.ts` de façade). Risque de casse. **Mitigation** : `src/lib/referentiels/index.ts` re-exporte tout, ce qui minimise les chemins à changer (les utilisateurs passaient déjà par `@/lib/referentiels`).
- L'étape 1 doit prévoir les déplacements de fichiers.
- Un dev non familier peut être tenté de faire un type générique `Referentiel<T>`. À documenter dans le README du dossier.

### Neutres
- La taille du dossier reste gérable. Si on dépasse 15-20 fichiers dans `conformite/`, on pourra sous-découper (`conformite/p1/`, `conformite/p2/`).

## Alternatives rejetées

### Alternative A — Dossier unique, discrimination par champ `type`
```typescript
type Referentiel = { type: "duerp"; ... } | { type: "conformite"; ... }
```
Rejetée : mauvaise abstraction. Les deux usages n'ont presque rien en commun au-delà des enums partagés.

### Alternative B — Tout mettre en base de données + UI d'admin
Rejetée (pour le MVP V2) : on perd l'auditabilité par Git, et on ouvre la porte à des modifications non tracées d'un référentiel à valeur légale. À re-considérer en V3 si besoin opérationnel d'édition sans déploiement (auquel cas on couplera avec un `changelog` versionné en base).

### Alternative C — Un paquet npm séparé (`@duerp/referentiels`)
Rejetée : over-engineered pour un MVP mono-repo.

### Alternative D — Construire le référentiel d'obligations directement depuis l'Excel AOCR (spec/Fiche Audit AOCR 09102018.xlsx)
Rejetée en l'état : la fiche AOCR contient 481 obligations mais mélange sources primaires (Code du travail, CCH, arrêtés) et sources tierces (APSAD, NF). Le MVP V2 impose des sources primaires uniquement. On utilise l'extract `docs/audit-aocr/obligations-p1-extract.json` comme **base de travail** (139 obligations P1) à filtrer et reformuler en s'appuyant sur Légifrance.

## Checklist de mise en œuvre (étape 3 et suivantes)

1. **Étape 1** : création du dossier `duerp/` et déplacement des référentiels existants. Mise à jour des imports.
2. **Étape 3** : création du dossier `conformite/` + types + 3 fichiers P1 (électricité, incendie, aération) avec **≥ 25 obligations** sourcées.
3. **Étape 3** : documentation `docs/referentiel-conformite.md` expliquant la démarche de construction et la procédure pour ajouter une obligation.
4. **Étape 11** : ajout des domaines P2 et P3.

## Notes de conformité

- Chaque obligation du référentiel doit citer une référence **Légifrance vérifiable**. (ADR-039 : un rythme peut en outre venir d'une norme lue, citée au corpus `normes`, ou d'un défaut annuel déclaré comme tel. Une norme peut même fonder l'obligation, citée comme norme.)
- ~~Les obligations issues de règles APSAD, de normes NF ou de recommandations INRS sans valeur réglementaire ne sont **pas** ajoutées au référentiel (ou sont ajoutées avec un marqueur `categorie: "bonne_pratique"` et ne déclenchent pas d'échéance opposable). Règle rappelée dans CLAUDE.md.~~
  **Amendé par l'ADR-039 (2026-10-07).** Une norme (NF, EN) peut fonder une obligation ou un rythme : elle se cite sous la source `NORME`, comme norme (intitulé, édition, paragraphe), jamais comme un article de loi. Le marqueur `bonne_pratique` n'a jamais été construit et ne le sera pas : c'est la mention de rythme retenu qui distingue la norme du texte. APSAD et recommandations non normatives restent hors du référentiel.
- Le référentiel ne doit **jamais** affirmer qu'un utilisateur est « conforme ». Il lui dit « voici les obligations qui s'appliquent à vous ».
