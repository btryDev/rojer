# ADR-038 — Ce que le DUERP rend dû à une partie de l'effectif

- **Statut** : **CODÉE SUR SA BRANCHE le 2026-10-05** (`lot/duerp-questions-titres`),
  non fusionnée, en attente de revue indépendante. Périmètre validé par la
  propriétaire le 2026-10-05 : formations spécifiques, le « non » montré sur la
  fiche, titre de carte « Formations liées aux risques du poste ». Le travail
  de nuit, d'abord inclus, a été retiré à la relecture du même jour (§ 5).
- **Amende** : l'ADR-023 § 1 bis (le moteur ne déduit aucune activité d'un
  porteur salarié). **Ne le renverse pas** : rien n'est déduit, une
  déclaration est lue.
- **Portée** : `referentiels/commun.ts` et `types.ts`, `transverses/`,
  `duerps/reponses-fermees.ts` et `ecrire-reponse-fermee.ts`,
  `salaries/titres-du-duerp.ts`, `catalogue.ts`, `obligations-evenementielles.ts`,
  la fiche salarié, l'écran des questions transverses, une migration additive.

## 1. Le problème

La fiche d'un salarié montrait la même liste à tout l'effectif. C'était exact
pour ce qui est dû à tous (formation à la sécurité de `L. 4141-2`, VIP de
`R. 4624-10`), faux pour ce qui ne l'est qu'à certains : la formation à la
conduite de `R. 4323-55` s'affichait sur la fiche de quelqu'un qui ne conduit
rien, et l'habilitation électrique n'apparaissait nulle part comme due.

Le fait qui manque — « cette personne conduit un engin, opère sur
l'installation électrique » — est le cinquième déclencheur, l'activité
réellement exercée, que le produit n'a pas. Le DUERP est l'endroit où le Code
le fait évaluer ; il ne le demandait pas.

## 2. La décision

1. **Le lien part d'une question transverse du DUERP, jamais d'une mesure.**
   Une mesure recommandée est une recommandation INRS ; un titre est une
   obligation du Code. `QuestionDetection.declencheTitres` nomme les titres du
   catalogue qu'un « oui » rend dus. Une question n'en porte que si son fait
   est, dans les mots du texte, celui que l'article fondateur vise.
2. **Deux questions neuves**, rédigées sur le verbatim relu au corpus :
   opérations sur les installations électriques ou dans leur voisinage
   (`R. 4544-9`, `R. 4544-10`), conduite d'équipements mobiles automoteurs ou
   de levage (`R. 4323-55`, `R. 4323-56`). `q-travail-nuit` ne déclenche
   rien (§ 5).
3. **Le « non » transverse est persisté** (`Duerp.reponsesTransverses`). Sans
   lui, chaque DUERP validé aurait lu les deux questions neuves comme refusées.
   Le « oui » reste lu sur le risque, sa seule vérité ; le « non » sur la
   colonne ; le reste est sans réponse. La lecture et l'écriture concurrente
   sont celles de l'ADR-020, extraites pour être partagées.
4. **Sur la fiche, une carte, pas un second questionnaire.** « Formations
   liées aux risques du poste » montre chaque question qui déclenche un titre,
   avec la réponse du DUERP et un lien vers la question. Les titres, leur
   condition et ce que la personne en détient sont nommés DANS LES TROIS
   ÉTATS : ne les nommer que sur « oui » les faisait disparaître de tous les
   dossiers existants, sans réponse à la mise en production.
5. **Une seule surface par titre.** Un titre gouverné par une question quitte
   la carte « Ce qui se déclenche pour cette personne ».
6. **Le tableau de bord lit le même « non ».** Une transmission
   d'établissement qui nomme un titre gouverné (`elec-travail-habilitation-
   personnel`, les obligations de levage) se tait quand la question répond
   « non » ; le silence et le « oui » ne changent rien.

## 3. Ce que la décision ne fait pas

- **Elle ne dit pas qui est concerné.** Le DUERP dit qu'il y a des salariés
  exposés ; la fiche demande si cette personne en est, et la réponse est le
  titre déclaré. Un titre absent ne s'affiche jamais en retard.
- **Pas de case « ne concerne pas cette personne ».** Elle demanderait un
  stockage nominatif de l'exposition ; écartée de ce lot.
- **Le document unique imprimé ne porte pas les « non ».** Le snapshot fige les
  risques, pas les refus. À décider à part.
- **Gestes et postures (`R. 4541-8`), écran (`R. 4542-16`), chimique
  (`R. 4412-38`, `-87`)** ont déjà leur question (`q-charges`, `q-ecran`) ou
  leur risque, mais leur obligation est portée par l'établissement, sans titre
  au catalogue. Les y faire entrer est un lot à part ; `R. 4323-106` (EPI) et
  `R. 4323-69`, `-89` (échafaudages, cordes) restent `non_couvert` ou
  `obligation_manquante` au corpus.

## 4. Contre-vérification

Les verbatims cités viennent du corpus, relus sur Légifrance aux dates de
`luLe` (`R. 4544-9` le 2026-08-31, `R. 4544-10` le 2026-09-01, `R. 4323-55` et
`-56` le 2026-08-31, `R. 4624-18` le 2026-08-31). `citations-risques.test.ts`
confronte chaque citation au verbatim. Aucun article n'a été relu pour ce lot.

## 5. Relecture du 2026-10-05

Une relecture indépendante, en lecture seule, a rendu un bloquant et quatre
points à corriger, tous corrigés sur la branche :

- **Bloquant — le travail de nuit ne déclenche plus la VIP adaptée.** Le
  titre est fondé sur `R. 4624-17` et `R. 4624-18`, qui le rendent dû aussi au
  travailleur handicapé, au pensionné d'invalidité et au moins de dix-huit
  ans ; un « non » à la question faisait dire à la fiche d'un apprenti que la
  visite n'était due à personne. La question ne qualifie pas non plus le
  travailleur de nuit de `L. 3122-5`. Les notesInternes du titre
  l'interdisaient déjà.
- La phrase « ces titres ne sont proposés à personne » était fausse — le
  formulaire les propose toujours. Remplacée.
- Les titres n'étaient nommés que sur « oui » (voir § 2.4). La carte est
  désormais un composant rendu en test (`CarteTitresDuDuerp.test.tsx`).
- La lecture `chargerReponsesTransverses` n'avait pas de test d'isolation.
- Le tableau de bord contredisait la fiche sur un « non » (§ 2.6).

Corrigés au passage : deux « oui » simultanés (`upsert`), lecture de toutes
les unités transverses par l'écran comme par la fiche, confirmation avant de
quitter un « oui » (le risque et ses actions partent en cascade),
revalidation des pages de l'établissement, une transaction simulée qui annule
en test, deux motifs du référentiel électrique qui disaient le cinquième
déclencheur « non implémenté ».
