# Plan d'implémentation — ADR-057 (pas de chapeaux, un geste une ligne)

Trois lots, dans cet ordre : **A** (référentiel et moteur), **B** (interface),
**C** (catégories). B peut démarrer dès que A est fusionné ; C attend A, parce
que la fusion VMC + CTA touche le geste « ventilation ». Chaque lot : une
branche, un worktree, une PR, CI verte avant fusion, puis le flux `main` →
`cc` (`docs/etat-bascule-clever-cloud.md`).

**Mesure avant / après, à chaque lot**, en appelant
`determineObligationsApplicables` sur trois profils fixes, écrits dans un
test : restaurant N5 type N (8 salariés, 1 tableau, 2 extincteurs, 2 BAES,
1 alarme, 1 hotte, 1 piano, 1 installation gaz, 1 VMC) ; le même en N3 ;
bureau de 6 salariés sans ERP, sans appareil. Le restaurant N5 donne
aujourd'hui 65 obligations, 72 lignes (`main` 0fba284c).

## Lot A — référentiel et moteur

### A1. Niveau audit (données seules)

`niveau: "audit"` sur les six obligations de l'ADR § 2. Aucune autre
modification. Tests : `niveau-audit.test.ts`, chiffres publics,
`EMPREINTE_ATTENDUE`. Attendu : 18 au niveau audit, 187 suivies.

### A2. Porteurs et catégories (données)

- `PE 4 § 2` et `PO 1 § 3` : `porteur` → équipement ;
  `categoriesEquipement` = l'ancien `equipementsEnContexte` +
  `INSTALLATION_GAZ` ; `realisateurs` = compétente, qualifiée, agréé ; retrait
  de `groupeExclusif` et d'`equipementsEnContexte`. Notes : rayer (règle 11)
  le paragraphe « l'intersection, pas l'union » et la reprise de la
  criticité du gaz, avec la date et le renvoi à l'ADR-057.
- `R. 4222-20` : équipement, `VMC`, `CTA`, `HOTTE_PRO`.
- ~~`cuisson-gaz-installations-annuelle` : `categoriesEquipement` →
  `INSTALLATION_GAZ` seule.~~ [2026-11-06, lot A : reporté au lot C. Sa note
  dit que retirer l'appareil de cuisson retirerait GZ 15 aux restaurants de
  catégories 1 à 4 qui n'ont pas déclaré leur installation de gaz ; la
  question « au gaz ? » de l'appareil se pose avec la fusion des catégories.]
- Les cinq lignes « travail » des gestes (`incendie-travail-moyens-lutte`,
  `-alarme-entretien-verification`, `-desenfumage-entretien-verification`,
  `-ria-entretien-verification`, `cuisson-travail-appareils-entretien-verification`) :
  retrait de `erp: false`. **Ne pas fusionner A2 sans A3** : sans la fusion,
  un employeur en ERP recevrait deux lignes par extincteur.
- Test `conformite.test.ts` « toute obligation à `typesExclus` appartient à
  un groupe » : `PE 4` n'a plus de groupe ; accepter un `geste` à la place
  (la règle 3 départage `PE 4` et `PO 1` sur un ERP qui porte O et un autre
  type).

### A3. Le champ `geste` et la fusion au moteur

- `types.ts` : `geste?: string` sur `ObligationPorteeParEquipement`, interdit
  (`never`) ailleurs ; entre dans `empreinteReferentiel()`.
- Les six gestes de l'ADR § 3, posés sur leurs membres.
- `engine.ts` : `fusionnerGestes`, après `resoudreGroupesExclusifs`. Par
  appareil, les membres applicables d'un même geste → le titulaire (rythme
  effectif le plus court, puis ordre du référentiel) garde l'appareil dans ses
  `equipementsConcernes` ; les autres l'en retirent (et disparaissent s'ils
  n'en gardent aucun). `ObligationApplicable` gagne
  `aussiFondeePar: Record<equipementId, string[]>`.
- **Prescriptions (ADR-035)** : elles s'appliquent AVANT la fusion
  (`passe.ts`, `appliquerPrescriptions`), pour qu'un membre raccourci par un
  acte d'autorité puisse devenir titulaire. Test dédié.
- Tests : invariant « l'intersection des intervenants de tous les membres
  d'un geste n'est jamais vide » ; un geste ne mêle jamais deux porteurs ;
  les trois profils ; le cas hôtel O + type N (biennal l'emporte) ; un ERP
  N1–N4 (pas de `PE 4`, ERP + travail fusionnés).

### A4. Calendrier et reprise

- Colonne `Verification.fondeeAussiPar String[] @default([])`, écrite par le
  générateur depuis `aussiFondeePar`. `realisateurRequis` de la ligne =
  intersection des membres.
- **Succession dans le geste** : la ligne générée porte en `succedeA` les
  autres membres de son geste. Quand le titulaire change, la rangée est
  reprise (même appareil, mêmes rapports).
- **Dispersion d'une ligne d'établissement** (`PE 4`, `PO 1`, `R. 4222-20`) :
  aujourd'hui `heritageDesRetirees` refuse de faire hériter une réalisation à
  N appareils, à raison (« un contrôle fait sur la VMC daterait la hotte »).
  Règle nouvelle et bornée : une ligne d'appareil reprend le dernier rapport
  réalisé de la ligne d'établissement archivée **de la même obligation**, si
  l'appareil était déclaré dans Rojer à la date de réalisation de ce rapport ;
  sinon elle naît « à planifier » sous le délai de grâce de l'ADR-040. Le
  rapport reste attaché à sa ligne archivée (ADR-034).
- `VERSION_MOTEUR_CALENDRIER` 7 → 8 : la passe de reprise réconcilie tous les
  calendriers, et archive ou supprime les lignes des six obligations passées
  au niveau audit (ADR-042).
- Gardes transversales à lancer à la main : `version-moteur`,
  `migrations-rls` (colonne neuve), `fraicheur-sorties`,
  `reconciliateur-bout-en-bout`, `continuite-identite`.

### A5. Lire les références d'une ligne en un seul endroit

Une fonction `fondementsDeLigne(v)` : références du titulaire puis de
`fondeeAussiPar`, dédoublonnées. Elle remplace la lecture directe
`obligationParId(…).referencesLegales` partout où une LIGNE affiche sa
source : fiche de vérification, fiche équipement, calendrier, registre (page
et PDF, `pdf/builders.ts`), dossier, export contrôle, points à corriger, plan
d'actions, MCP. Inventaire exact au début du lot (23 fichiers appellent
`obligationParId`, tous ne lisent pas les références). Affichage :
« Code du travail R. 4227-28 · ERP MS 38 · PE 4 § 2 ».

### A6. Fin de lot

Remesurer et mettre à jour `CLAUDE.md` (comptes, porteurs, niveau audit,
« Ce que Rojer ne couvre pas »), `docs/chantiers-ouverts.md`, les notes des
obligations touchées. Contrôle sur la base locale avant fusion ; en prod
après déploiement, lecture du statut Vercel (migration).

## Lot B — interface

[2026-11-06 : codé, `lot/adr-057-b`. B1 et B3 comme écrit ; B2 par la
décision « d'après le parc » (ADR § 4) ; B4 sans changement.]

- **B1. Page Équipements** : la section « Équipements de sécurité » est
  retirée. Chaque groupe porte en tête son obligation de présence quand elle
  s'applique : « Premiers secours » (matériel de premiers secours, déclaré par
  l'état permanent existant ; défibrillateur), « Incendie » (extincteurs,
  alarme sonore). États : « obligatoire ici · N déclarés », « aucun déclaré →
  Déclarer », « à confirmer ». Le défibrillateur quitte son groupe propre pour
  « Premiers secours ».
- **B2.** Ces trois obligations de présence ne s'affichent plus ailleurs
  (vérifier « Ce qui doit être en place » et le tableau de bord) : un seul
  endroit.
- **B3. « Ce que Rojer ne couvre pas »** : les trois lignes de signalisation
  regroupées en « Signalisation des extincteurs » et « Signalisation des
  RIA », chacune avec ses références (vérifier au corpus ce qui vise le RIA).
- **B4.** La section « contrôles d'ensemble » ne garde que les lignes du
  § « À trancher » de l'ADR ; à revoir quand elles seront tranchées.
- Charte board (`docs/charte-board.md`) ; garde `espaces-avalees`.

## Lot C — catégories

[2026-11-07 : codé, `lot/adr-057-c`. Les écarts au plan sont dits dans
l'ADR, § 5, et rayés ci-dessous.]

- Enum Prisma : `VENTILATION` (VMC + CTA), `PORTE_PORTAIL_MOTORISE`, `EPI`
  absorbant les trois EPI spécialisés. ~~**En deux déploiements** : ajout des
  valeurs et migration des lignes `Equipement`, puis retrait des anciennes
  valeurs dans un second déploiement.~~ [2026-11-07 : un seul — la migration
  recrée l'enum sans les anciennes valeurs, ADR § 5.]
- Caractéristiques qui remplacent la catégorie là où un texte distingue :
  VMC-gaz (habitation), parc de stationnement couvert (qualité de l'air),
  portail de véhicules, type d'EPI (antichute, respiratoire, gilet). Les
  conditions des obligations passent par `equipement_propriete_booleenne` ou
  une énumération. ~~Une caractéristique absente rend la condition non
  satisfaite (règle actuelle des propriétés d'équipement) : à confirmer pour
  le type d'EPI, sinon un harnais existant perdrait sa vérification.~~
  [2026-11-07 : tranché — le type est exigé à la saisie, donc jamais absent ;
  la règle générale (`enum_differente`) survit tout de même au silence.]
  Migration : la caractéristique est posée depuis l'ancienne catégorie.
  [VMC-gaz et parc de stationnement : les questions `estVmcGaz` et
  `nbVehiculesParkingCouvert` existaient déjà ; « portail de véhicules » est
  le type `portail`.]
- Les rangées `Verification` restent : la clé de ligne est obligation ×
  appareil, l'identifiant de l'appareil ne change pas.
- Libellés, pré-remplissage, recherche de matériel, `DOMAINE_DE_CATEGORIE`,
  ordre des catégories.

## Ce que le plan ne fait pas

Le § « À trancher » de l'ADR (habitation art. 101, scène, contrat SDI,
électricité hors lieu de travail) attend les réponses de la propriétaire ; rien
n'y est touché.
