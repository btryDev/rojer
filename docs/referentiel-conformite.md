# Référentiel d'obligations réglementaires — démarche et procédure

Ce document explique **comment est construit** le référentiel d'obligations de
conformité (santé–sécurité) de la plateforme. Il est destiné à être lu par
toute personne qui écrit, relit ou audite le contenu de
`src/lib/referentiels/conformite/`.

## Principe fondateur : sources primaires opposables

**Aucune obligation n'entre dans le référentiel sans référence légale
vérifiable** sur Légifrance ou sur une source institutionnelle reconnue
(INRS). ~~Les normes privées (APSAD, NF non visées par un texte) et les
recommandations non opposables ne suffisent pas.~~

**Amendé par l'ADR-039 (2026-10-07).** Une norme homologuée (NF, EN) peut
fonder une obligation ou un rythme, même si aucun texte ne la rend
obligatoire. Elle se cite sous la source `NORME`, comme norme — intitulé,
édition, paragraphe ou annexe —, avec une clé `article` présente au corpus
`src/lib/referentiels/corpus/normes.ts`, et jamais comme un article de loi.
APSAD, CACES et recommandations non normatives restent exclus.

**Rythme vague, rythme retenu.** Quand le texte impose une vérification, un
entretien ou une action récurrente sans chiffrer le rythme (« périodicité
appropriée », « régulièrement », « répétée périodiquement », « maintenus en
bon état »), `periodicite` reste `autre` — c'est le texte — et l'obligation
porte un `rythmeRetenu` :

- `{ motif: "norme", periodicite, norme, reference }` quand une norme lue
  écrit le rythme ;
- `{ motif: "defaut_annuel", periodicite: "annuelle", texteVague }` sinon,
  `texteVague` recopié mot pour mot d'une citation du corpus.

Un rythme écrit (texte, puis norme) l'emporte toujours. Le rythme retenu est
affiché partout comme tel (« Rythme de la norme … », « Rythme retenu par
défaut : le texte dit « … » »). « Chaque fois que nécessaire » n'est pas un
rythme vague : c'est un déclencheur événementiel.

Raisons :

1. Le produit n'est pas un conseil juridique automatisé. Il rappelle les
   obligations opposables, il ne certifie rien.
2. L'utilisateur doit pouvoir montrer à un inspecteur du travail, à une
   commission de sécurité ou à un assureur l'origine exacte de chaque ligne
   qui apparaît dans son calendrier.
3. L'auditabilité repose sur Git : chaque obligation ajoutée, modifiée ou
   supprimée laisse une trace dans l'historique du code.

## Périmètre couvert à l'issue de l'étape 11

Neuf domaines. À date : **≥ 60 obligations** (test de cohérence en place).

### P1 — tous établissements (étape 3)

- **Électricité** — Code du travail R. 4226, arrêté du 26 décembre 2011,
  règlement ERP (EL), règlement IGH (GH 50).
- **Sécurité incendie** — Code du travail R. 4227, règlement ERP (MS, EC,
  DF), règlement IGH (GH 60 s.), CCH (registre de sécurité).
- **Aération et ventilation** — Code du travail R. 4222, arrêté du 8 octobre
  1987, règlement ERP (CH 58, PS 32, GC 20), arrêté du 25 avril 1985
  (VMC-Gaz habitation).

### P2 — fréquents selon secteur (étape 11)

- **Cuisson et hotte professionnelles** — Arrêté du 25 juin 1980 sections
  GC (grandes cuisines) et GZ (gaz combustibles). S'applique typiquement
  en restauration ERP.
- **Ascenseurs** — CCH art. R. 134-1 à R. 134-31, arrêté du 18 novembre
  2004 (entretien), arrêté du 13 août 2008 (contrôle technique
  quinquennal).
- **Portes et portails automatiques** — Code du travail R. 4224-12 et
  R. 4224-13 (portes et portails), R. 4224-17 (maintenance et dossier),
  arrêté du 21 décembre 1993 (vérifications périodiques).
  *Corrigé le 2026-08-31.* Cette ligne citait `R. 4224-15`, qui traite de
  la formation de secouriste et n'a rien à voir avec les portes. Le code
  portait la même erreur et l'avait corrigée à l'audit d'août 2026
  (`portes-portails.ts`, `notesInternes`) ; le document, lui, continuait
  de l'annoncer — un document qui affirme ce que le code ne fait pas.
  `R. 4224-15` est désormais dépouillé et encodé pour ce qu'il est, sous
  le domaine « premiers secours ».

### P3 — selon équipements déclarés (étape 11)

- **Équipements sous pression** — Code de l'environnement L. 557-1 s.,
  décret 2015-799, arrêté du 20 novembre 2017 (inspection périodique,
  requalification).
- **Stockage de matières dangereuses** — Code de l'environnement L. 511-1
  s. (ICPE), arrêté du 3 octobre 2010 (récipients mobiles, rétention,
  ventilation).
- **Équipements de levage** — Code du travail R. 4323-22 à R. 4323-28,
  arrêtés du 1er et du 2 mars 2004 (VGP semestrielle/annuelle, examens
  d'adéquation, remise en service).

Les domaines hors périmètre V2 (IGH complexes, ICPE, ATEX, rayonnements
ionisants, sport, piscine) sont documentés dans `.claude/CLAUDE.md`.

## Organisation des fichiers

Voir ADR-003 pour le détail. En pratique :

```
src/lib/referentiels/
  types-communs.ts          → Periodicite, Realisateur, TypologieApplication,
                               CategorieEquipement (miroirs des enums Prisma)
  conformite/
    types.ts                → type Obligation, ReferenceLegale,
                               ConditionApplication
    electricite.ts          → obligations du domaine électricité
    incendie.ts             → obligations du domaine incendie
    aeration.ts             → obligations du domaine aération
    index.ts                → agrégation + lookup par id / domaine
    conformite.test.ts      → invariants structurels
```

Les enums côté TypeScript sont **strictement alignés** sur les enums Prisma
(`Periodicite`, `Realisateur`, `CategorieEquipement`). Un décalage rend le
seed incohérent : les tests `types-communs` le détectent.

## Anatomie d'une obligation

```typescript
{
  id: "elec-travail-periodique-annuelle",       // stable, jamais réutilisé
  domaine: "electricite",
  libelle: "Vérification périodique annuelle des installations électriques (travail)",
  description: "Vérification annuelle par un organisme accrédité...",
  referencesLegales: [
    { source: "CODE_TRAVAIL", reference: "R. 4226-16",
      urlLegifrance: "https://www.legifrance.gouv.fr/..." },
    { source: "ARRETE",       reference: "Arrêté du 26 décembre 2011, art. 1 et 2",
      urlLegifrance: "https://www.legifrance.gouv.fr/..." },
  ],
  periodicite: "annuelle",
  realisateurs: ["organisme_accredite", "personne_qualifiee"],
  criticite: 5,
  typologies: { travail: true },
  categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
}
```

### Criticité

Échelle interne 1 → 5 :

| Valeur | Sens                                                                   |
| ------ | ---------------------------------------------------------------------- |
| 1      | Informatif / traçabilité, pas d'incidence directe en cas de manquement |
| 2      | Écart mineur — risque de réserves en contrôle                          |
| 3      | Écart moyen — risque de mise en demeure                                |
| 4      | Écart majeur — risque de sanction administrative ou pénale             |
| 5      | Vital — mise en danger directe si manquement                           |

C'est une **échelle d'arbitrage interne**, pas une classification officielle.
Elle sert à prioriser dans le calendrier et le tableau de bord (étape 9). Le
principe : elle ne décide jamais à la place de l'utilisateur.

### Typologies (ADR-004)

Un établissement peut cumuler plusieurs régimes. Une obligation déclare
chaque critère individuellement :

- `travail: true` — s'applique dès lors que l'établissement emploie au moins
  un salarié (règle quasi universelle).
- `erp: true` — s'applique à tous les ERP.
- `erp: { categories: ["N5"] }` — s'applique seulement aux ERP 5ᵉ catégorie.
- `igh: true` — IGH, toutes classes.
- `habitation: true` — logement collectif (rare en TPE/PME).

Le moteur de matching (étape 5) consomme ces critères de façon déterministe.

### Conditions (propriétés d'équipement)

Certaines obligations dépendent d'une caractéristique d'équipement (ex.
parking > 250 véhicules). Le champ optionnel `conditions` porte ces règles
déclarativement :

```typescript
conditions: [
  {
    type: "equipement_propriete_numerique",
    categorie: "VMC",
    propriete: "nbVehiculesParkingCouvert",
    operateur: ">",
    valeur: 250,
  },
]
```

Les propriétés référencées seront alimentées par le formulaire de
déclaration d'équipements (étape 4).

## Procédure pour ajouter une obligation

1. **Identifier la source primaire** (article de code, arrêté, décret). Si la
   source n'est pas trouvable sur Légifrance ou sur une source INRS
   explicite, l'obligation **n'est pas ajoutée**.
2. **Lire le texte dans sa version consolidée en vigueur** sur Légifrance.
   Ne jamais citer de mémoire.
3. **Rédiger l'obligation** dans le fichier du domaine concerné :
   - `id` au format `{domaine}-{regime}-{action}-{periodicite?}`, unique,
     en kebab-case.
   - `libelle` court, lisible par un non-juriste.
   - `description` : reformulation fidèle du texte, sans ajouter
     d'interprétation. Ne pas copier-coller de Légifrance (droit sui generis
     sur les bases publiques : c'est autorisé par la LOI n° 2016-1321 mais
     on préfère reformuler).
   - `referencesLegales` : au moins une référence. URL Légifrance cible la
     version consolidée (préférer les URL `codes/article_lc/LEGIARTI...` ou
     `loda/id/...`).
   - `periodicite`, `realisateurs`, `criticite`, `typologies`,
     `categoriesEquipement` — tous alignés sur les enums partagés.
4. **Écrire ou étendre un test** si l'obligation apporte un nouveau cas
   (propriété d'équipement, combinaison de typologie inédite).
5. **Commit atomique** : 1 obligation = 1 PR dans l'idéal. Un groupe
   cohérent de 2-3 obligations acceptable si elles partagent la même source.
6. **Message de commit** : `feat(conformite): <libellé court> — R. 4226-16`
   ou équivalent, avec la référence légale dans le sujet pour faciliter
   l'audit via `git log`.

## Procédure pour modifier une obligation existante

- Si la réglementation change (nouvelle version d'un article, nouvel arrêté) :
  conserver l'ancien id, mettre à jour le contenu, noter dans le message de
  commit le texte qui a évolué.
- Si l'obligation est supprimée (abrogation) : ne pas la retirer
  immédiatement. Elle doit rester lisible pour les snapshots historiques
  (DUERP conservés 40 ans). Marquer une date de fin et documenter la
  bascule — implémentation reportée à l'étape 11 si besoin.

## Procédure pour supprimer une obligation

À **éviter**. Même une obligation inutilisée peut apparaître dans un
snapshot existant. Préférer marquer « non applicable » côté moteur de
matching plutôt que retirer du référentiel. Si la suppression est
indispensable (erreur de jeunesse), elle fait l'objet d'un commit isolé
avec justification en message.

## Qualité et contrôles automatiques

Les tests en place (`conformite.test.ts`) garantissent :

- ≥ 25 obligations P1 (seuil du critère de done)
- identifiants uniques
- périodicités et réalisateurs dans les enums Prisma
- catégories d'équipement dans l'enum Prisma
- criticité dans [1, 5]
- au moins une référence légale par obligation
- URL pointant vers legifrance.gouv.fr ou inrs.fr uniquement
- au moins un régime de typologie déclaré
- catégories ERP et classes IGH valides

Ces tests **doivent passer** à chaque commit touchant un fichier du
référentiel.

## Seed en base ?

**Non, pas en V2.** La source de vérité est le repo Git. Les tables Prisma
`Verification` et `RapportVerification` référencent les obligations **par
chaîne de caractères** (`obligationId` est un `String`, pas une relation),
ce qui permet de conserver la référence dans un snapshot même si
l'obligation évolue côté code.

Un seed de table `Obligation` en base pourra être reconsidéré en V3 si un
besoin d'édition sans déploiement apparaît (auquel cas la gouvernance
devra être repensée — cf. ADR-003).

## Sources utilisées dans le référentiel P1

Pour la traçabilité, la liste des textes cités au moins une fois à l'étape 3 :

### Code du travail
- R. 4222-20 (contrôle périodique aération)
- R. 4222-21 (contrôle mise en service aération)
- R. 4226-14 (vérification initiale électricité)
- R. 4226-16 (vérification périodique électricité)
- R. 4226-19 (conservation rapports électriques)
- R. 4227-28 (moyens de lutte incendie)
- R. 4227-29 (formation maniement extincteurs)
- R. 4227-37 / R. 4227-38 (consigne incendie)
- R. 4227-39 (exercices semestriels)
- R. 4544-9 à R. 4544-11 (habilitation électrique)
- L. 4711-5 (registre de sécurité — tous établissements de travail)

### Code de la construction et de l'habitation (CCH)
- R. 134-1 à R. 134-13 (ascenseurs — dispositifs de sécurité, entretien,
  carnet, contrôle technique quinquennal)
- R. 143-34 (visite périodique commission ERP)
- R. 143-44 (registre sécurité ERP)
- R. 146-35 (registre sécurité IGH) (corrigé 2026-08-26 : R. 146-21 est abrogé et ne traitait pas du registre ; l'article IGH est R. 146-35, réécrit au 01/07/2026 par le décret 2025-1100)

### Code de l'environnement
- L. 511-1 et s. (ICPE — déclaration, enregistrement, autorisation)
- R. 557-14-1 et s. (suivi en service des équipements sous pression)

### Code du travail (complément P2/P3)
- R. 4224-12, R. 4224-13 et R. 4224-17 (portes et portails automatiques, maintenance)
- R. 4323-1 à R. 4323-5 (information et formation), R. 4323-22 à R. 4323-28 (vérifications des équipements de travail)
- R. 4412-11, R. 4412-38, R. 4412-87 (prévention du risque chimique, FDS, formation)

### Arrêtés de référence
- Arrêté du 23 février 2018 (installations de gaz des bâtiments d'habitation,
  VMC-Gaz — remplace l'arrêté du 25 avril 1985, abrogé)
- Arrêté du 25 juin 1980 modifié (règlement ERP — articles CH 58, DF 10,
  EC 14, EC 15, EL 5, EL 19, EL 20, GC 12, GC 19, GC 20, GC 21, GE 4,
  GC 22, GZ 30, MS 25, MS 38, MS 73, PS 32)
- Arrêté du 8 octobre 1987 (contrôle aération en milieu de travail)
- Arrêté du 22 juin 1990 modifié (ERP 5ᵉ catégorie — article PE 4)
- Arrêté du 1er décembre 2025 (PE 4 § 2 : vérification triennale de toutes les
  installations techniques en ERP 5ᵉ, applicable au 1er juillet 2026)
- Arrêté du 21 décembre 1993 (portes et portails automatiques)
- Arrêté du 1er mars 2004 (vérifications appareils de levage de charges)
- Arrêté du 2 mars 2004 (carnet de maintenance des appareils de levage)
- Arrêté du 18 novembre 2004 (entretien des ascenseurs)
- Arrêté du 7 août 2012 (contrôle technique quinquennal des ascenseurs)
- Arrêté du 1er juin 2015 (rubriques 4331/4734 enregistrement — valeurs de
  rétention, cité à titre de référence)
- Arrêté du 26 décembre 2011 (modalités vérifications électriques travail)
- Arrêté du 30 décembre 2011 (règlement IGH — articles GH 50, GH 60 à 63)
- Arrêté du 20 novembre 2017 (suivi en service des équipements sous pression)
- Décret 2015-799 (produits et équipements à risques)

### Audit des sources (25 août 2026)

Chaque URL du référentiel a été ouverte sur Légifrance et chaque article lu
dans sa version consolidée. Les corrections sont tracées dans les
`notesInternes` des obligations concernées (mention « Corrigé à l'audit
2026-08 »). Règle ajoutée : un identifiant `LEGIARTI`/`LEGISCTA`/`JORFTEXT`
n'entre dans le référentiel qu'après avoir été résolu manuellement — le test
ne vérifie que le domaine, pas la cible.

### INRS (à titre documentaire, pas opposable stricto sensu)
- ED 6127 — Habilitation électrique (pratique de la périodicité triennale)

## Limites et mises en garde

- Le référentiel ne vaut **pas** conseil juridique. Un cas particulier peut
  imposer des périodicités plus strictes (présence d'une IOM, d'un arrêté
  préfectoral spécifique, d'un classement ICPE…). L'outil ne détecte pas
  ces cas particuliers en V2.
- Certaines obligations citées (visite commission ERP 5ᵉ, habilitation
  électrique) ne sont pas des « échéances opérateur » au sens strict : on
  les trace pour l'exhaustivité mais le moteur de matching les traite
  différemment (cf. `notesInternes`).
- Les seuils métier (parking 250 véhicules, ERP 5ᵉ catégorie, etc.) sont
  **textuellement** issus des arrêtés cités ; jamais une règle interne
  déguisée.
