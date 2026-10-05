# ADR-038 — Ce que le DUERP rend dû à une partie de l'effectif

- **Statut** : **CODÉE SUR SA BRANCHE le 2026-10-05** (`lot/duerp-questions-titres`),
  non fusionnée, en attente de revue indépendante. Périmètre validé par la
  propriétaire le 2026-10-05 : formations spécifiques, travail de nuit inclus,
  le « non » montré sur la fiche, titre de carte « Formations liées aux
  risques du poste ».
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
   de levage (`R. 4323-55`, `R. 4323-56`). `q-travail-nuit` déclenche la VIP
   adaptée (`R. 4624-18`).
3. **Le « non » transverse est persisté** (`Duerp.reponsesTransverses`). Sans
   lui, chaque DUERP validé aurait lu les deux questions neuves comme refusées.
   Le « oui » reste lu sur le risque, sa seule vérité ; le « non » sur la
   colonne ; le reste est sans réponse. La lecture et l'écriture concurrente
   sont celles de l'ADR-020, extraites pour être partagées.
4. **Sur la fiche, une carte, pas un second questionnaire.** « Formations
   liées aux risques du poste » montre chaque question qui déclenche un titre :
   « oui » avec les titres et ce que la personne en détient ; « non » visible
   et corrigeable ; sans réponse avec le lien vers la question du DUERP.
5. **Une seule surface par titre.** Un titre gouverné par une question quitte
   la carte « Ce qui se déclenche pour cette personne ».

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
