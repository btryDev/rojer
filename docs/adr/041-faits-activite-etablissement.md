# ADR-041 — Les faits d'activité vivent sur l'établissement

- **Statut** : **CODÉE SUR SA BRANCHE le 2026-10-08** (`lot/formations-faits-etablissement`),
  non fusionnée, en attente de revue indépendante. Périmètre validé par la
  propriétaire les 2026-10-07 et 2026-10-08.
- **Amende** : l'ADR-038 (la réponse du DUERP comme source des titres
  salarié) et l'ADR-023 § 1 bis (le cinquième déclencheur). **Ne renverse
  pas** l'ADR-023 : rien n'est déduit, une déclaration est lue.
- **Portée** : `prisma/schema.prisma` (5 colonnes, migration
  `20261008150000_etablissement_faits_activite`), `etablissements/faits-activite*.ts`,
  `matching/` (critère `activite`), `transverses/`, la fiche salarié, l'écran
  `equipe/risques`, la fiche établissement (relances), le DUERP.

## 1. Le problème

Le scan du 2026-10-07 l'a mesuré : des faits que le produit recueille ne
produisaient rien. Les questions transverses du DUERP « portez-vous des charges »,
« travaillez-vous sur écran » n'étaient lues par aucune obligation ; la
formation gestes et postures et la formation écran restaient dues après un
« non ». L'ADR-038 avait rangé « des travailleurs conduisent des engins » dans
le DUERP : un dirigeant sans DUERP ne pouvait pas le dire, et la conformité ne
lisait pas la réponse. La case « exposition CMR » promettait « cela déclenche
des obligations renforcées » et ne déclenchait rien.

La définition de Rojer tranche le fond : « Le DUERP n'est pas un silo, c'est
une vue spécifique sur cette donnée. »

## 2. La décision

1. **Cinq faits d'activité sur l'établissement**, colonnes à trois états comme
   la règle du non-renseigné (ADR-022) : `manutentionManuelle`, `travailSurEcran`,
   `operationsElectriques`, `conduiteEngins`, `expositionCMR`. Un registre
   unique (`faits-activite.ts`) dit, pour chacun, sa question, sa raison
   (article cité) et les titres salarié qu'il déclenche.
2. **Le moteur les lit** par un critère de typologie unique, `activite`,
   avec la règle du non-renseigné : seul un « non » déclaré retire, le silence
   retient « à confirmer » et relance la question. Conditionnées :
   gestes et postures (R. 4541-8), formation écran (R. 4542-16), habilitation
   du personnel et carnet de prescriptions (R. 4544-10), consigne EPI
   (R. 4323-105, sur `epiPresents`, déjà posé par la fiche).
3. **Un seul écrivain** (`faits-activite-ecriture.ts`) pose le fait et, si
   l'établissement a un DUERP, le risque transverse correspondant, dans une
   transaction. Trois portes y mènent : l'écran « Évaluer les risques de vos
   salariés » d'Équipe, la relance de la fiche établissement, l'étape
   transverse du DUERP. Le DUERP créé plus tard naît avec les risques des
   faits déjà déclarés.
4. **La fiche salarié** lit les faits, plus le DUERP : formation, autorisation
   et attestations de conduite ; habilitation et attestation électriques ;
   **suivi individuel renforcé sur une exposition CMR** (R. 4624-23, I, 3°,
   relu sur Légifrance le 2026-10-08). La case CMR du DUERP alimente le fait
   et ne promet plus que cela.
5. **Un risque travaillé n'est jamais supprimé hors du DUERP.** Un « non »
   donné depuis Équipe retire le risque s'il est vierge, le garde s'il a une
   cotation ou des actions, et l'étape transverse le signale. Dans le DUERP,
   le « Non » retire, après confirmation.
6. **La question de conduite** suit le préventeur (« attention aux
   équipements, manuel, automatique, semi automatique, transport de charges
   ou de personnes ») : charges OU personnes, transpalette manuel écarté.

## 3. Reprise des données

La migration remplit les colonnes depuis les DUERP existants : risque présent
→ `true`, `false` dans `reponsesTransverses` → `false`, sinon `NULL`. Une
exposition CMR cochée sur un risque → `true`. Rien n'est inventé : une case
CMR non cochée n'a jamais été un « non ».

## 4. Ce que la décision ne fait pas

- **Rien n'est encodé** (règle du 2026-10-07) : aucune obligation nouvelle,
  seulement des déclencheurs et des surfaces sur l'existant.
- **Produits chimiques** : la formation et les FDS restent déclenchées par
  l'équipement de stockage (C64), alors que R. 4412-38 vise la présence
  d'agents chimiques. Reporté, à instruire avec le préventeur.
- **Qui est concerné** reste une déclaration par personne : le titre déclaré.
- **Ce qui est dû à une personne** (date d'entrée, titres de santé visibles,
  liens entre titres) : lot suivant.
