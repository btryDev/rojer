# ADR-045 — Un ERP peut porter plusieurs types (GN 2)

- **Statut** : ~~**EN COURS sur sa branche le 2026-10-16** (`plan/multi-types-erp`),
  non fusionnée.~~ Plan validé par la propriétaire le 2026-10-16 (décisions
  transmises par la session c6). ~~Lots 0 (cet ADR) et 1 (moteur) en cours.~~
  [2026-10-17 : lots 0 et 1 (ADR, moteur) **fusionnés**, PR #49 ; lot 2
  (base, écriture) **fusionné**, PR #50 ; lot 3 (écrans, fondement,
  surfaces) **en revue** sur `lot/multi-types-ecrans`, non fusionné ; lot 4
  (scène, chapitre L) à venir.]
- **Amende** : l'ADR-004 (régimes cumulables et énumérations de précision) —
  le type d'ERP devient cumulable, la catégorie reste unique ; l'ADR-031
  (cible) n'est pas touchée.
- **Portée** : `prisma/schema.prisma` (lot 2), `matching/engine.ts` et
  `matching/types.ts` (lot 1), les douze lignes des groupes exclusifs
  (`referentiels/conformite/incendie.ts`), les formulaires, `fondementDe`, le
  PDF, le MCP (lot 3), une catégorie de matériel « Scène / installations
  scéniques » (lot 4).

## 1. Le problème

`Etablissement.typeErp` est une valeur unique. Un hôtel qui exploite aussi un
restaurant et une salle de réunion doit choisir l'un des trois. Le moteur ne
sert alors que les lignes bornées au type choisi (`types`, `typesExclus`), et
le fondement n'affiche que l'article de ce type.

Mesuré en appelant `determineObligationsApplicables` sur `main` (a6b2303a,
2026-10-16) :

- **18 obligations sur 185** sont bornées par type ;
- sur 3 525 combinaisons (231 paires de types, 4 triplets, × 5 catégories ×
  3 réponses sur les locaux à sommeil), **240** ne sont couvertes par aucun
  type déclaré seul — p. ex. M + O en catégories 1 à 4 : déclaré M, l'hôtel
  perd la consigne des chambres et les plans d'évacuation ; déclaré O, il perd
  le schéma d'organisation de la sécurité.

## 2. Le droit

Relu le 2026-10-16 par l'API Légifrance (client PISTE du dépôt, **bac à
sable** ; égalité avec la production non vérifiée ; le MCP Légifrance n'était
pas disponible dans la session).

- **GN 2** (LEGIARTI000020303850, une seule version, en vigueur depuis le
  15/08/1980) :
  - § 1 : les exploitations groupées dans un même bâtiment ou dans des
    bâtiments voisins non isolés « sont considérés comme un seul
    établissement recevant du public » ;
  - § 2 : « La catégorie d'un tel groupement est déterminée d'après l'effectif
    total des personnes admises, obtenu en additionnant l'effectif de chacune
    des exploitations. » Types différents : limite 4ᵉ / 5ᵉ à 50 en sous-sol,
    100 en étages, galeries ou surélévation, 200 au total ; « toujours classé
    en 4e catégorie au moins si l'une des exploitations est elle-même classée
    dans cette catégorie » ;
  - § 3 : « Outre les dispositions générales communes, les dispositions
    particulières propres aux différents types d'exploitations groupées dans
    l'établissement sont applicables en se référant à la catégorie déterminée
    ci-dessus. »
- **GN 3** (LEGIARTI000020303851) : des exploitations isolées entre elles sont
  « autant d'établissements ».
- **GE 4 § 2** (LEGIARTI000029642660) : pour des bâtiments isolés d'un même
  établissement, « les visites périodiques étant faites pour l'ensemble de
  l'établissement avec la périodicité la plus courte ».
- **R. 143-39 CCH** (LEGIARTI000043819027) : le maire autorise l'ouverture par
  arrêté, après avis de la commission.
- Aucun de ces textes ne connaît de type « principal ».

## 3. La décision

1. **Plusieurs types, une seule catégorie.** La catégorie reste celle que
   porte l'arrêté d'ouverture ou le PV : **Rojer la déclare, il ne la calcule
   pas**. L'aide peut rappeler GN 2 § 2, rien de plus.
2. **Des exploitations isolées (GN 3) sont des établissements distincts dans
   Rojer** (ADR-028).
3. **Le modèle** (lot 2) : `typeErp` est gardé, `typesErpAutres TypeErp[]`
   est ajouté, `NOT NULL DEFAULT '{}'`, sans reprise de données. Le CHECK
   `Etablissement_erp_type_categorie_requis` ne change pas ; ~~deux CHECK
   s'ajoutent (pas d'autres types sans ERP, pas de doublon avec `typeErp`)~~
   [2026-10-17, décision transmise par c6 au lot 2 : UN SEUL CHECK s'ajoute,
   `Etablissement_types_erp_autres_sans_premier` — pas de `typeErp` parmi les
   autres types. **Symétrie avec `typeErp` et la catégorie** : décocher « ERP »
   GARDE les autres types en base, pour qu'une erreur de clic ne perde rien.
   Hors ERP, `matchTypologie` les ignore — garde éprouvée sur une obligation
   synthétique qui lirait le sommeil sans critère ERP
   (`types-erp-multiples.test.ts`).]
   `typeErp` est « le premier type déclaré », **sans portée juridique** : il
   ne décide de rien dans le moteur.
4. **Le moteur** (lot 1) : `EtablissementMatching` porte, comme la base,
   `typeErp` et `typesErpAutres: TypeErp[]`, ce dernier **requis** ; le moteur
   ne lit les types que par `typesErpDe(etab)` (`matching/types-erp.ts`).
   `matchTypologie` évalue la typologie type par type et rend la première
   évaluation satisfaite dans l'ordre de déclaration : l'**union** (GN 2 § 3).
   `sommeilPlausiblePourLeType` se lit donc sur l'ensemble des types. Pour un
   seul type, l'établissement est évalué tel quel, comme avant. Les raisons
   affichées sont celles du premier type qui a satisfait la ligne.
5. **Les groupes exclusifs.** L'union seule sert des doublons : **945** des
   3 525 combinaisons reçoivent deux membres d'une même paire. Les douze
   lignes concernées portent `groupeExclusif` ; quand plusieurs membres d'un
   groupe sortent, **le plus exigeant l'emporte** — le rythme le plus court,
   un rythme l'emportant sur `autre` ; à rythme égal, le membre **établi**
   l'emporte sur celui que retient le silence (« à confirmer »), comme dans la
   composition du registre ; à égalité encore, le premier du référentiel.
   Les deux égalités connues sont dans le groupe de la 4ᵉ catégorie : un type R
   avec un type à trois ans (sommeil non renseigné : la ligne R « avec
   hébergement », à confirmer, cède la place à la triennale établie), et R
   sans hébergement avec un type à cinq ans (deux quinquennales établies). Cinq groupes :
   - les visites de commission de GE 4 § 1, catégories 1-2, 3 et 4 (2, 2 et 4
     lignes) ;
   - PE 4 § 2 / PO 1 § 3 (entretien des installations techniques, 5ᵉ) ;
   - PE 27 § 5 / PO 7 (instruction du personnel, 5ᵉ).
   Pour les deux paires de 5ᵉ, c'est la doctrine déjà écrite dans leurs
   `notesInternes` (« au rythme le plus court »). **Pour les visites de
   commission, c'est une lecture par analogie avec GE 4 § 2, et aucun texte
   ne règle le cas** : la propriétaire a cherché, sans rien trouver, dans les
   guides préfectoraux (décision du 2026-10-16). La date fixée au PV prime
   toujours, par une prescription particulière de source
   `pv_commission_securite` (ADR-035).
6. **Le chapitre L** (salles) a été lu le 2026-10-16, prérequis de ce
   chantier : 85 articles. L 14 (une personne désignée, formée à la sécurité
   incendie) s'ajoute aux types de `incendie-erp-personnel-designe-moyens-secours`.
   Les actes propres au spectacle vont dans une catégorie de matériel
   « Scène / installations scéniques » (lot 4, décision de la propriétaire du
   2026-10-16) ; L 63 § 4, L 55, L 75 et L 79 sont annoncés, non suivis.
7. **La continuité des dossiers existants n'est pas traitée** (décision de la
   propriétaire du 2026-10-16) : quand un groupe bascule après l'ajout d'un
   type, l'ancienne ligne suit le chemin ordinaire du générateur. Seul est
   gardé ce qui évite un doublon ou un plantage.

## 4. Ce qui est écarté, et pourquoi

- **« `typesExclus` n'exclut que si tous les types sont exclus »** (proposition
  du 2026-10-15) : sert les deux visites de commission à un hôtel O + N + L de
  3ᵉ, et PE 4 avec PO 1 § 3 à un hôtel-restaurant de 5ᵉ. Aucune règle
  uniforme ne convient, les deux familles de paires allant en sens contraires.
- **Le calcul de la catégorie selon GN 2 § 2** : Rojer déclare. Les seuils de
  `onboarding/deduction-erp.ts` ne sont plus importés que par son test.
- **Un tableau unique `typesErp[]` en base** : même résultat juridique, au prix
  d'une reprise de données et de quarante-quatre fichiers touchés.

## 5. Les garanties (lot 1)

- **En mono-type, le moteur rend exactement ce que rend `main`.** Deux
  preuves, et aucune n'est une liste recopiée :
  - **une fois, au lot** : le moteur de `main` et celui du lot sont appelés
    sur la même grille (23 valeurs de type dont l'absence, 6 de catégorie
    dont l'absence, 3 réponses sur le sommeil, 3 sur les personnes présentes,
    avec et sans parc : 2 484 profils), et les sorties comparées ligne à ligne
    — identifiant, porteur, équipements, questions sans réponse ;
  - **dans la suite** : sur toute grille mono-type, la résolution des groupes
    ne retire rien. C'est ce qui garantit que la sortie mono-type reste
    l'évaluation par type, inchangée.
- **Chaque groupe sort au plus un membre**, pour toute paire (231) et tout
  triplet (1 540) de types, × 5 catégories × 3 réponses sur le sommeil.
- **L'union dépasse au moins une fois chaque type seul** (borne basse).
- **Permuter le premier type ne change rien.**
- **Deux lignes que seul un établissement à deux types réunit** — au même
  porteur, aux mêmes conditions, quel que soit leur article ou leur rythme —
  partagent un groupe exclusif, ou relèvent d'une famille déclarée avec son
  motif (`doublons-par-type.test.ts`). Trois familles au 2026-10-17, 25
  paires : visite de commission ↔ disposition particulière d'un type (21),
  dispositions de deux types (2), paires de 5ᵉ croisées (2).
- **Toute ligne à `typesExclus` appartient à un groupe** ; les membres d'un
  groupe ont le même porteur. Ce test garde les lectures à venir des chapitres
  J, P, R, S, T, U, V, X, Y.

## 5 bis. Le sceau

- `REFERENTIEL_VERSION` passe à `2026-10-17.1` : `groupeExclusif` entre à
  l'empreinte (`185-b0dc045847297da2`).
- `VERSION_MOTEUR_CALENDRIER` **reste à 6** : ce que la régénération écrit ne
  change pour aucun dossier (projection à `typesErpAutres: []` jusqu'au lot 2,
  sortie mono-type identique, 2 484 profils comparés à `main`). Seule
  l'empreinte du code du moteur est recopiée (`RELEVE`).
- **Lot 3** (2026-10-17) : `VERSION_MOTEUR_CALENDRIER` **reste à 6**. Quand
  plusieurs types satisfont une ligne, le moteur rend l'évaluation du premier
  dans l'ordre de `TYPES_ERP` (l'ordre du produit) et non du premier déclaré :
  seules les RAISONS changent, et elles ne sont pas écrites en base
  (`version-moteur.ts`, « ce que la régénération écrit »). L'empreinte du code
  est recopiée à chaque retouche du moteur.

## 6. À rayer et dater à la fusion (règle 11)

- `docs/notes-cadre-juridique.md`, question ouverte « Cumul de types d'ERP » ;
- `docs/registre-releve-types-erp.md`, D.2 ;
- ~~`NOTE_TITRE_2_COMMUNE` (`incendie.ts`), « CE QUE LA BORNE NE SAIT PAS »~~ [2026-10-17 : rayé au lot 3] ;
- `corpus/cch-classement-erp-igh.ts`, la réserve sur le groupement ;
- ~~le commentaire de `matching/engine.ts` « le modèle ne stocke qu'un type »~~ [2026-10-17 : rayé au lot 1] ;
- `.claude/CLAUDE.md`, liste des ADR : l'entrée 045 est à ajouter.
