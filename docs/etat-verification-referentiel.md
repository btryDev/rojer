# État de vérification du référentiel

<!-- Document GÉNÉRÉ. Ne l'éditez pas à la main : la prochaine génération
     écraserait la correction, et un test compare déjà ce fichier au rendu
     du script. Pour le mettre à jour : pnpm verification --ecrire -->

**Généré le** : 2026-09-09
**Référentiel** : `2026-09-09.1`
**Régénérer** : `pnpm verification --ecrire`

Ce document répond à une question, et à une seule : **de quoi le
référentiel peut-il dire qu'il l'a lu ?** Il ne rend aucun verdict sur le
droit. Il rapproche ce que les obligations citent de ce que le corpus
déclare avoir dépouillé, et compte.

Il existe parce que la réponse était introuvable. Elle vivait dans les
champs de deux modules, dans des messages de commit et dans un compte rendu
de nuit que personne ne rouvrait — assez pour croire tour à tour, le même
jour, qu'aucune relecture n'avait eu lieu puis que tout avait été vérifié.
Les deux étaient faux. Le document ne se rédige pas : il se régénère.

---

## Ce que ce document ne dit pas

- **Si une périodicité est juste.** Ce n'est pas mesurable mécaniquement.
  Un article lu en première main, verbatim relevé, peut fonder un rythme
  faux ; ce document le classera au degré le plus solide, et il aura raison
  de le faire : il mesure la trace de lecture, pas la lecture.
- **Si le champ d'application retenu est le bon.** Un article plus large que
  ce qu'on en a tiré se lit ici comme n'importe quel autre.
- **Si le bon article est cité.** Un fondement approximatif — citer
  l'article qui parle du sujet plutôt que celui qui prescrit — est
  indétectable d'ici.

Ces trois questions supposent d'ouvrir le texte. Ce document dit seulement
qui l'a fait, quand, et ce qu'il en reste d'écrit.

Les contrôles de cohérence qui, eux, sont mécaniques — périodicité sans
texte porteur, lien rompu entre un article et l'obligation qu'il fonde,
divergence de version — sont tenus par `pnpm relecture`, qui déplie chaque
référence en une ligne. Ce document-ci ne les redit pas.

---

## 1. L'échelle, et pourquoi elle a 6 barreaux

Le degré d'une référence répond à « qu'est-ce que le dépôt prouve qu'on a
lu de ce texte ? ». Chaque barreau correspond à une combinaison de champs
réellement distinguable dans les types du corpus.

| rang | degré | ce que le dépôt permet d'affirmer | pourquoi ce barreau est à part |
| --- | --- | --- | --- |
| 5 | **lu à la source, verbatim relevé** | le texte a été ouvert sur Légifrance par la personne qui l'encode, à une date connue, et la phrase décisive est recopiée dans le dépôt | le verbatim est relisible sans rouvrir le texte, et le relevé n'a pas transité par un tiers |
| 4 | **lu à la source par un agent, verbatim rapporté** | un agent a ouvert le texte à une date connue et en a rapporté la phrase décisive — constat, pas garantie : le verbatim n'a pas été recoupé | le corpus porte déjà cette réserve dans SourceLecture ; l'aplatir sur le degré précédent la ferait disparaître |
| 3 | **lu et daté, aucun verbatim** | le texte a été ouvert à une date connue ; ce qu'il dit n'est nulle part dans le dépôt | rien n'est relisible : contrôler ou contredire l'encodage suppose de rouvrir le texte |
| 2 | **lu ailleurs qu'à la source** | quelqu'un a lu une reproduction, un résumé ou une base professionnelle — aucune date de version ne fait foi | le corpus déclare lui-même qu'une lecture indirecte ne peut pas fonder une entrée du référentiel |
| 1 | **au corpus, aucune trace de lecture** | l'article est inscrit au corpus et rien n'atteste qu'il ait été ouvert : statut « non dépouillé », ou pas de date, ou pas de moyen de lecture | il y a un texte identifié à aller lire — le remède est de le dépouiller |
| 0 | **rien à ouvrir** | la référence ne porte pas de clé d'article, ou porte une clé qu'aucun corpus ne connaît : elle n'est rapprochable de rien | le remède n'est pas de lire mais de rattacher — tant que la clé manque, l'article n'apparaît même pas dans la liste de travail du dépouillement |

**Un second axe, tenu à part.** `ReferenceLegale.versionConstatee` (porté
par l'obligation) et `ArticleDepouille.luLe` / `.lecture` / `.citationCle`
(portés par l'article de corpus) ne disent pas la même chose : le premier
est l'ancre de veille — la version contre laquelle l'obligation est calée,
celle qui permettra de voir que le texte a bougé — les seconds sont la trace
de lecture. Une référence peut être lue à la source avec verbatim sans
porter d'ancre, et l'inverse existe. Les fondre en une note unique
effacerait celle des deux qui manque.

| ancrage | ce qu'il dit |
| --- | --- |
| **ancrée** | version constatée, concordante avec le corpus |
| **divergente** | version constatée ≠ version lue au corpus — à trancher |
| **jamais constatée** | aucune version constatée — à vérifier, pas « à jour » |

**Le degré d'une obligation est celui de sa référence la plus faible**, et
non celui de son fondement. Le Code du travail renvoie presque toujours la
périodicité à un arrêté, et cet arrêté est une référence de contexte : ne
mesurer que le fondement déclarerait vérifiée une obligation dont le chiffre
repose sur un texte que personne n'a ouvert.

---

## 2. Où en est-on

**152 obligations**, **295 références** — 88 obligations en citent plus d'une.

| degré | obligations (au plancher) | part | dont fondements | références | part |
| --- | --- | --- | --- | --- | --- |
| 5 · lu à la source, verbatim relevé | 57 | 38 % | 65 | 144 | 49 % |
| 4 · lu à la source par un agent, verbatim rapporté | 84 | 55 % | 81 | 139 | 47 % |
| 3 · lu et daté, aucun verbatim | 11 | 7 % | 6 | 12 | 4 % |
| 2 · lu ailleurs qu'à la source | 0 | 0 % | 0 | 0 | 0 % |
| 1 · au corpus, aucune trace de lecture | 0 | 0 % | 0 | 0 | 0 % |
| 0 · rien à ouvrir | 0 | 0 % | 0 | 0 | 0 % |

**141 obligations sur 152 (93 %)** reposent, jusqu'à leur dernière référence de contexte, sur des textes lus à la source avec verbatim relevé.

**11 obligations (7 %)** citent au moins un texte ouvert et daté dont rien n'a été relevé. Ce n'est pas une lecture à refaire : c'est une lecture qu'on ne peut ni contrôler ni contredire sans rouvrir Légifrance.

**11 obligations sont mieux vérifiées sur leur fondement que sur l'ensemble de leurs références** — leur point faible est une référence de contexte, celle que le dossier de relecture replie dans un « + N réf. » : `elec-travail-consignation-registre`, `elec-travail-habilitation-personnel`, `elec-salarie-attestation-medicale-voisinage`, `elec-travail-rapport-quadriennal`, `incendie-erp-pe4-entretien-installations-techniques`, `incendie-registre-securite`, `incendie-erp-extincteurs-annuelle`, `incendie-igh-charge-calorifique-quinquennale`, `ascenseur-controle-technique-quinquennal`, `stockage-dangereux-ventilation-locaux`, `sante-travail-etablissement-adhesion-spst`.

**Aucune référence n'est au bas de l'échelle** : les 2 degrés « au corpus, aucune trace de lecture » et « rien à ouvrir » sont vides. Toute référence du référentiel porte une clé d'article, cette clé est connue d'un corpus, et cet article porte une date et un moyen de lecture. Ces degrés restent dans l'échelle parce que leur disparition ne se verrait pas si l'échelle ne les nommait plus.

---

## 3. L'ancre de veille

| ancrage | références | part |
| --- | --- | --- |
| ancrée | 275 | 93 % |
| divergente | 0 | 0 % |
| jamais constatée | 20 | 7 % |

**11 obligations sur 152 (7 %) ne portent aucune version constatée, sur aucune de leurs références.** Le jour où l'un de leurs textes est modifié, rien dans le dépôt ne pourra le signaler : l'absence de repère se lit comme « à vérifier », jamais comme « à jour ».

**Aucune divergence** entre la version qu'une obligation déclare avoir constatée et celle que le corpus déclare avoir lue. Les deux moitiés du dépôt disent la même chose partout où elles parlent toutes les deux.

---

## 4. Par domaine

|  | obl. | réf. | 5 | 4 | 3 | 2 | 1 | 0 | vérifiées à la source | sans ancre | lu entre |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `aeration` | 10 | 15 | 3 | 7 | · | · | · | · | 10 / 10 — 100 % | 0 / 15 | 2026-08-26 → 2026-09-04 |
| `ascenseur` | 8 | 17 | 4 | 4 | · | · | · | · | 8 / 8 — 100 % | 0 / 17 | 2026-08-26 → 2026-09-04 |
| `co_activite` | 1 | 4 | · | 1 | · | · | · | · | 1 / 1 — 100 % | 0 / 4 | 2026-08-31 |
| `compactage_dechets` | 1 | 5 | 1 | · | · | · | · | · | 1 / 1 — 100 % | 0 / 5 | 2026-09-01 → 2026-09-02 |
| `cuisson_hotte` | 6 | 9 | 2 | 3 | 1 | · | · | · | 5 / 6 — 83 % | 1 / 9 | 2026-08-26 → 2026-09-01 |
| `eclairage` | 1 | 2 | · | 1 | · | · | · | · | 1 / 1 — 100 % | 0 / 2 | 2026-09-01 → 2026-09-02 |
| `electricite` | 15 | 24 | 2 | 11 | 2 | · | · | · | 13 / 15 — 87 % | 2 / 24 | 2026-08-26 → 2026-09-04 |
| `epi` | 2 | 7 | 2 | · | · | · | · | · | 2 / 2 — 100 % | 0 / 7 | 2026-09-04 |
| `equipement_sous_pression` | 7 | 8 | 7 | · | · | · | · | · | 7 / 7 — 100 % | 1 / 8 | 2026-09-01 |
| `formation_securite` | 9 | 30 | · | 9 | · | · | · | · | 9 / 9 — 100 % | 0 / 30 | 2026-08-31 |
| `froid` | 8 | 16 | 8 | · | · | · | · | · | 8 / 8 — 100 % | 16 / 16 | 2026-08-26 |
| `incendie` | 32 | 67 | 18 | 7 | 7 | · | · | · | 25 / 32 — 78 % | 0 / 67 | 2026-08-26 → 2026-09-04 |
| `information_travailleurs` | 2 | 2 | · | 2 | · | · | · | · | 2 / 2 — 100 % | 0 / 2 | 2026-08-31 |
| `levage` | 10 | 27 | 9 | 1 | · | · | · | · | 10 / 10 — 100 % | 0 / 27 | 2026-08-26 → 2026-09-02 |
| `locaux_sociaux` | 4 | 4 | · | 4 | · | · | · | · | 4 / 4 — 100 % | 0 / 4 | 2026-08-31 |
| `organisation_prevention` | 4 | 7 | 1 | 3 | · | · | · | · | 4 / 4 — 100 % | 0 / 7 | 2026-08-31 → 2026-09-02 |
| `porte_portail` | 5 | 8 | · | 5 | · | · | · | · | 5 / 5 — 100 % | 0 / 8 | 2026-09-01 |
| `sante_travail` | 9 | 17 | · | 8 | 1 | · | · | · | 8 / 9 — 89 % | 0 / 17 | 2026-08-31 |
| `secours` | 3 | 3 | · | 3 | · | · | · | · | 3 / 3 — 100 % | 0 / 3 | 2026-08-31 |
| `signalisation` | 9 | 10 | · | 9 | · | · | · | · | 9 / 9 — 100 % | 0 / 10 | 2026-09-02 |
| `stockage_dangereux` | 6 | 13 | · | 6 | · | · | · | · | 6 / 6 — 100 % | 0 / 13 | 2026-08-27 → 2026-09-01 |

Colonnes numérotées : le nombre d'obligations à chaque rang de l'échelle, mesuré au plancher — **5** première main, **4** agent + verbatim, **3** lu sans verbatim, **2** indirect, **1** sans trace, **0** non rattaché.

**17 domaines ont toutes leurs obligations adossées à des textes lus à la source avec verbatim relevé** : `aeration` (10), `ascenseur` (8), `co_activite` (1), `compactage_dechets` (1), `eclairage` (1), `epi` (2), `equipement_sous_pression` (7), `formation_securite` (9), `froid` (8), `information_travailleurs` (2), `levage` (10), `locaux_sociaux` (4), `organisation_prevention` (4), `porte_portail` (5), `secours` (3), `signalisation` (9), `stockage_dangereux` (6).

Aucun domaine n'est entièrement dépourvu de verbatim.

---

## 5. Par porteur

|  | obl. | réf. | 5 | 4 | 3 | 2 | 1 | 0 | vérifiées à la source | sans ancre | lu entre |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `equipement` | 89 | 165 | 44 | 37 | 8 | · | · | · | 81 / 89 — 91 % | 20 / 165 | 2026-08-26 → 2026-09-04 |
| `etablissement` | 49 | 98 | 13 | 33 | 3 | · | · | · | 46 / 49 — 94 % | 0 / 98 | 2026-08-26 → 2026-09-04 |
| `salarie` | 14 | 32 | · | 14 | · | · | · | · | 14 / 14 — 100 % | 0 / 32 | 2026-08-27 → 2026-09-01 |

Colonnes numérotées : le nombre d'obligations à chaque rang de l'échelle, mesuré au plancher — **5** première main, **4** agent + verbatim, **3** lu sans verbatim, **2** indirect, **1** sans trace, **0** non rattaché.

---

## 6. Quand ces textes ont été lus

| date de lecture | références | part | obligations concernées |
| --- | --- | --- | --- |
| 2026-08-26 | 44 | 15 % | 35 |
| 2026-08-27 | 12 | 4 % | 9 |
| 2026-08-31 | 70 | 24 % | 33 |
| 2026-09-01 | 139 | 47 % | 86 |
| 2026-09-02 | 16 | 5 % | 13 |
| 2026-09-04 | 14 | 5 % | 8 |

295 des 295 références portent une date de lecture, toutes comprises entre 2026-08-26 et 2026-09-04.

Ces dates ne sont pas un âge : elles disent quand quelqu'un a ouvert le
texte, pas depuis quand la version lue est en vigueur. Une lecture d'hier
sur une version de 2008 est parfaitement à jour. C'est l'ancre de veille du
§ 3, pas cette colonne, qui dira qu'un texte a bougé.

---

## 7. Ce qui est lu et que personne ne cite

Une référence n'existe que si une obligation la cite. Un texte dépouillé
que rien ne cite n'apparaît donc dans aucun degré ci-dessus — et le prendre
pour du travail restant est exactement l'erreur qui a failli faire relancer
une relecture déjà faite.

**277 articles dépouillés ne sont cités par aucune obligation**, répartis sur 38 corpus.

| corpus | articles non cités | sur | lus |
| --- | --- | --- | --- |
| `arrete-1980-livre-3` | 52 | 59 | 2026-08-26 → 2026-09-01 |
| `code-travail-travail-en-hauteur` | 33 | 33 | 2026-09-01 |
| `code-travail-plan-prevention` | 16 | 16 | 2026-09-02 |
| `arrete-1993-11-04-signalisation` | 14 | 21 | 2026-09-02 |
| `arrete-2021-09-10-retours-eau` | 14 | 14 | 2026-09-02 |
| `code-travail-formation-securite` | 11 | 26 | 2026-08-31 |
| `csp-eau-potable` | 11 | 11 | 2026-09-02 |
| `code-travail-eclairage` | 11 | 12 | 2026-09-02 |
| `code-travail-epi` | 11 | 16 | 2026-09-04 |
| `code-travail-vigilance-modalites` | 8 | 8 | 2026-09-02 |
| `code-travail-co-activite` | 7 | 11 | 2026-08-31 → 2026-09-02 |
| `arrete-2004-12-21-echafaudages` | 7 | 7 | 2026-09-01 |
| `arrete-1986-habitation` | 7 | 12 | 2026-09-01 → 2026-09-04 |
| `code-travail-vigilance` | 7 | 7 | 2026-09-02 |
| `arrete-1980-livre-2` | 6 | 25 | 2026-09-01 → 2026-09-04 |
| `code-travail-duerp-principes` | 6 | 6 | 2026-09-02 |
| `code-travail-matieres-inflammables` | 6 | 6 | 2026-09-02 |
| `code-travail-bruit-vibrations` | 5 | 5 | 2026-09-02 |
| `arrete-2011-12-30-igh` | 4 | 6 | 2026-09-03 → 2026-09-04 |
| `code-travail-duerp` | 4 | 5 | 2026-09-02 |
| `code-travail-travail-dissimule` | 4 | 4 | 2026-09-02 |
| `arrete-2017-04-19-registre-accessibilite` | 4 | 4 | 2026-09-03 |
| `arrete-2018-02-23-gaz-habitation` | 3 | 4 | 2026-08-26 |
| `code-travail-sante-travail` | 3 | 15 | 2026-08-31 |
| `arrete-1993-03-05-machines` | 3 | 5 | 2026-09-02 |
| `cch-classement-erp-igh` | 3 | 3 | 2026-09-03 |
| `code-travail-electricite` | 2 | 8 | 2026-08-31 |
| `arrete-2011-12-26-electricite` | 2 | 5 | 2026-08-26 |
| `code-travail-risque-chimique` | 2 | 8 | 2026-09-01 → 2026-09-02 |
| `code-travail-epi-amont` | 2 | 2 | 2026-09-04 |
| `arrete-1993-03-19-epi` | 2 | 4 | 2026-09-04 |
| `arrete-1980-livre-1` | 1 | 1 | 2026-09-03 |
| `inrs-documentaire` | 1 | 2 | 2026-09-03 |
| `code-travail-locaux-sociaux` | 1 | 5 | 2026-08-31 |
| `code-travail-service-prevention-sante` | 1 | 4 | 2026-08-31 |
| `arrete-1993-03-19-travaux-dangereux` | 1 | 1 | 2026-09-03 |
| `casf-definition-handicap` | 1 | 1 | 2026-09-03 |
| `cch-registre-accessibilite` | 1 | 1 | 2026-09-04 |

**18 corpus ne sont cités nulle part** — `code-travail-travail-en-hauteur` (33 articles, lus 2026-09-01), `code-travail-plan-prevention` (16 articles, lus 2026-09-02), `arrete-2021-09-10-retours-eau` (14 articles, lus 2026-09-02), `csp-eau-potable` (11 articles, lus 2026-09-02), `code-travail-vigilance-modalites` (8 articles, lus 2026-09-02), `arrete-2004-12-21-echafaudages` (7 articles, lus 2026-09-01), `code-travail-vigilance` (7 articles, lus 2026-09-02), `code-travail-duerp-principes` (6 articles, lus 2026-09-02), `code-travail-matieres-inflammables` (6 articles, lus 2026-09-02), `code-travail-bruit-vibrations` (5 articles, lus 2026-09-02), `code-travail-travail-dissimule` (4 articles, lus 2026-09-02), `arrete-2017-04-19-registre-accessibilite` (4 articles, lus 2026-09-03), `cch-classement-erp-igh` (3 articles, lus 2026-09-03), `code-travail-epi-amont` (2 articles, lus 2026-09-04), `arrete-1980-livre-1` (1 articles, lus 2026-09-03), `arrete-1993-03-19-travaux-dangereux` (1 articles, lus 2026-09-03), `casf-definition-handicap` (1 articles, lus 2026-09-03), `cch-registre-accessibilite` (1 articles, lus 2026-09-04). Le dépouillement est fait, aucune obligation ne s'y branche encore.

Le total du corpus, les articles jamais lus et ceux qui imposent une obligation que le référentiel ne porte pas sont tenus par `pnpm relecture`, qui les compte à la maille du corpus.

---

## 8. Les 152 obligations

| obligation | domaine | porteur | réf. | fondement | plancher | sans ancre | lu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `cuisson-erp-extinction-automatique-annuelle` | cuisson_hotte | equipement | 2 | 3 · lu sans verbatim | 3 · lu sans verbatim | 0 / 2 | 2026-08-26 → 2026-08-27 |
| `elec-igh-annuelle` | electricite | equipement | 1 | 3 · lu sans verbatim | 3 · lu sans verbatim | 1 / 1 | 2026-09-04 |
| `elec-travail-habilitation-personnel` | electricite | equipement | 2 | 4 · agent + verbatim | 3 · lu sans verbatim | 1 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-extincteurs-annuelle` | incendie | equipement | 2 | 5 · première main | 3 · lu sans verbatim | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-pe4-entretien-installations-techniques` | incendie | etablissement | 3 | 5 · première main | 3 · lu sans verbatim | 0 / 3 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-ria-annuelle` | incendie | equipement | 1 | 3 · lu sans verbatim | 3 · lu sans verbatim | 0 / 1 | 2026-08-26 |
| `incendie-erp-ssi-annuelle` | incendie | equipement | 1 | 3 · lu sans verbatim | 3 · lu sans verbatim | 0 / 1 | 2026-08-26 |
| `incendie-erp-ssi-triennale` | incendie | equipement | 1 | 3 · lu sans verbatim | 3 · lu sans verbatim | 0 / 1 | 2026-08-26 |
| `incendie-igh-charge-calorifique-quinquennale` | incendie | etablissement | 2 | 4 · agent + verbatim | 3 · lu sans verbatim | 0 / 2 | 2026-09-04 |
| `incendie-igh-moyens-secours-annuelle` | incendie | equipement | 1 | 3 · lu sans verbatim | 3 · lu sans verbatim | 0 / 1 | 2026-09-04 |
| `sante-travail-etablissement-adhesion-spst` | sante_travail | etablissement | 3 | 4 · agent + verbatim | 3 · lu sans verbatim | 0 / 3 | 2026-08-31 |
| `aeration-erp-chauffage-ventilation-annuelle` | aeration | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `aeration-erp-filtres-visite-periodique` | aeration | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-04 |
| `aeration-erp-ps-surveillance-qualite-air-inf-250` | aeration | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `aeration-erp-ps-surveillance-qualite-air-sup-250` | aeration | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `aeration-travail-locaux-pollution-specifique` | aeration | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `aeration-travail-mise-en-service` | aeration | equipement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-08-27 → 2026-09-01 |
| `aeration-travail-recyclage-semestriel` | aeration | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `ascenseur-carnet-entretien` | ascenseur | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `ascenseur-controle-technique-quinquennal` | ascenseur | equipement | 3 | 5 · première main | 4 · agent + verbatim | 0 / 3 | 2026-09-01 → 2026-09-04 |
| `ascenseur-rapport-annuel-activite` | ascenseur | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `ascenseur-telealarme-liaison` | ascenseur | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `co-activite-etablissement-protocole-securite` | co_activite | etablissement | 4 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 4 | 2026-08-31 |
| `cuisson-erp-appareils-annuelle` | cuisson_hotte | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `cuisson-erp-verification-initiale` | cuisson_hotte | equipement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-08-26 → 2026-09-01 |
| `cuisson-gaz-installations-annuelle` | cuisson_hotte | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `eclairage-etablissement-regles-entretien` | eclairage | etablissement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 → 2026-09-02 |
| `elec-erp-groupe-electrogene-annuel` | electricite | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `elec-erp-groupe-electrogene-quinzaine` | electricite | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `elec-erp-mise-en-service` | electricite | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `elec-erp-presence-personne-qualifiee` | electricite | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `elec-salarie-attestation-medicale-voisinage` | electricite | salarie | 2 | 5 · première main | 4 · agent + verbatim | 0 / 2 | 2026-08-27 → 2026-09-01 |
| `elec-salarie-habilitation` | electricite | salarie | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `elec-travail-carnet-prescriptions` | electricite | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `elec-travail-consignation-registre` | electricite | equipement | 2 | 5 · première main | 4 · agent + verbatim | 0 / 2 | 2026-08-31 → 2026-09-01 |
| `elec-travail-mise-en-service` | electricite | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `elec-travail-periodique-annuelle` | electricite | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `elec-travail-rapport-quadriennal` | electricite | equipement | 2 | 5 · première main | 4 · agent + verbatim | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `conduite-salarie-autorisation` | formation_securite | salarie | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-31 |
| `conduite-salarie-formation` | formation_securite | salarie | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `formation-securite-etablissement-information` | formation_securite | etablissement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-08-31 |
| `formation-securite-etablissement-manutention` | formation_securite | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `formation-securite-etablissement-organisation` | formation_securite | etablissement | 8 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 8 | 2026-08-31 |
| `formation-securite-etablissement-travail-sur-ecran` | formation_securite | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `formation-securite-salarie-accueil` | formation_securite | salarie | 7 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 7 | 2026-08-31 |
| `formation-securite-salarie-cse-sst` | formation_securite | salarie | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-08-31 |
| `formation-securite-salarie-designe-competent` | formation_securite | salarie | 4 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 4 | 2026-08-31 |
| `habitation-consignes-plans-intervention` | incendie | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `habitation-registre-securite` | incendie | etablissement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-09-01 |
| `habitation-verification-annuelle-installations-securite` | incendie | etablissement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-09-01 |
| `incendie-erp-5-sommeil-consigne-chambres` | incendie | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `incendie-erp-5-sommeil-plans-affiches` | incendie | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `incendie-erp-alarme-verification-hebdomadaire` | incendie | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-04 |
| `incendie-registre-securite` | incendie | etablissement | 10 | 5 · première main | 4 · agent + verbatim | 0 / 10 | 2026-08-31 → 2026-09-01 |
| `information-etablissement-affichages-obligatoires` | information_travailleurs | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `information-etablissement-avis-acces-duerp` | information_travailleurs | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `levage-examen-etat-conservation` | levage | equipement | 4 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 4 | 2026-09-01 |
| `locaux-etablissement-eau-potable` | locaux_sociaux | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `locaux-etablissement-emplacement-restauration` | locaux_sociaux | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `locaux-etablissement-installations-sanitaires` | locaux_sociaux | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `locaux-etablissement-local-restauration` | locaux_sociaux | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `prevention-etablissement-cse` | organisation_prevention | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `prevention-etablissement-reglement-interieur` | organisation_prevention | etablissement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-31 |
| `prevention-etablissement-salarie-designe` | organisation_prevention | etablissement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-31 |
| `porte-auto-dossier-maintenance` | porte_portail | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `porte-auto-maintien-en-etat` | porte_portail | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `porte-auto-portail-piete-coulissant` | porte_portail | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `porte-auto-verification-initiale` | porte_portail | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `porte-auto-verification-semestrielle` | porte_portail | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `conduite-salarie-attestation-medicale` | sante_travail | salarie | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `sante-travail-etablissement-fiche-entreprise` | sante_travail | etablissement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-31 |
| `sante-travail-etablissement-liste-postes-risques` | sante_travail | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `sante-travail-salarie-sir` | sante_travail | salarie | 4 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 4 | 2026-08-31 |
| `sante-travail-salarie-sir-categorie-a` | sante_travail | salarie | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `sante-travail-salarie-sir-visite-intermediaire` | sante_travail | salarie | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `sante-travail-salarie-vip` | sante_travail | salarie | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-31 |
| `sante-travail-salarie-vip-adaptee` | sante_travail | salarie | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-31 |
| `secours-etablissement-materiel` | secours | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `secours-etablissement-mesures` | secours | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `secours-salarie-secouriste` | secours | salarie | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-08-31 |
| `signalisation-etablissement-alimentation-secours-presence` | signalisation | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-etablissement-alimentations-secours-annuelle` | signalisation | etablissement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-02 |
| `signalisation-etablissement-cheminements-evacuation` | signalisation | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-etablissement-entretien` | signalisation | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-etablissement-obstacles-zones-dangereuses` | signalisation | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-etablissement-risques-residuels` | signalisation | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle` | signalisation | etablissement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-incendie-moyens-lutte` | signalisation | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `signalisation-stockage-substances-dangereuses` | signalisation | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-02 |
| `stockage-dangereux-declaration-icpe` | stockage_dangereux | equipement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-09-01 |
| `stockage-dangereux-fiches-donnees` | stockage_dangereux | equipement | 1 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 1 | 2026-09-01 |
| `stockage-dangereux-formation-personnel` | stockage_dangereux | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-09-01 |
| `stockage-dangereux-retention` | stockage_dangereux | equipement | 3 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 3 | 2026-08-27 → 2026-09-01 |
| `stockage-dangereux-ventilation-locaux` | stockage_dangereux | equipement | 2 | 5 · première main | 4 · agent + verbatim | 0 / 2 | 2026-08-27 → 2026-09-01 |
| `stockage-dangereux-verification-etancheite` | stockage_dangereux | equipement | 2 | 4 · agent + verbatim | 4 · agent + verbatim | 0 / 2 | 2026-08-27 → 2026-09-01 |
| `aeration-controle-installations-r4222-20` | aeration | etablissement | 3 | 5 · première main | 5 · première main | 0 / 3 | 2026-08-27 |
| `aeration-habitation-vmc-gaz-annuelle` | aeration | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-08-26 |
| `aeration-habitation-vmc-gaz-quinquennale` | aeration | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-08-26 |
| `ascenseur-entretien-contrat` | ascenseur | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `ascenseur-examen-annuel-securite` | ascenseur | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `ascenseur-examen-semestriel-secours` | ascenseur | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `ascenseur-visite-six-semaines` | ascenseur | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `compactage-dechets-vgp-trimestrielle` | compactage_dechets | equipement | 5 | 5 · première main | 5 · première main | 0 / 5 | 2026-09-01 → 2026-09-02 |
| `cuisson-erp-circuits-extraction-nettoyage` | cuisson_hotte | equipement | 1 | 5 · première main | 5 · première main | 1 / 1 | 2026-08-26 |
| `cuisson-erp-filtres-hebdomadaire` | cuisson_hotte | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-08-26 |
| `elec-erp-cat1-4-annuelle` | electricite | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `incendie-hotel-po-controle-annuel-electricite` | electricite | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 |
| `epi-etablissement-consigne-utilisation` | epi | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-04 |
| `epi-verification-generale-periodique` | epi | equipement | 5 | 5 · première main | 5 · première main | 0 / 5 | 2026-09-04 |
| `esp-declaration-mise-en-service` | equipement_sous_pression | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `esp-dossier-suivi` | equipement_sous_pression | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `esp-inspection-periodique` | equipement_sous_pression | equipement | 1 | 5 · première main | 5 · première main | 1 / 1 | 2026-09-01 |
| `esp-inspection-periodique-generateur-vapeur` | equipement_sous_pression | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `esp-intervention-reparation` | equipement_sous_pression | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `esp-personnel-formation` | equipement_sous_pression | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `esp-requalification-decennale` | equipement_sous_pression | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `froid-controle-etancheite-annuel` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-annuel-50t-detection` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-apres-modification` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-biennal-detection` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-mise-en-service` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-semestriel-500t-detection` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-semestriel-50t` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `froid-controle-etancheite-trimestriel-500t` | froid | equipement | 2 | 5 · première main | 5 · première main | 2 / 2 | 2026-08-26 |
| `incendie-erp-5-sommeil-contrat-entretien-sdi` | incendie | etablissement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-08-27 |
| `incendie-erp-5-visite-commission` | incendie | etablissement | 3 | 5 · première main | 5 · première main | 0 / 3 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-baes-annuelle` | incendie | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `incendie-erp-desenfumage-annuelle` | incendie | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `incendie-erp-eclairage-securite-autonomie-semestrielle` | incendie | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `incendie-erp-eclairage-securite-essai-mensuel` | incendie | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `incendie-erp-extincteurs-revision-decennale` | incendie | equipement | 1 | 5 · première main | 5 · première main | 0 / 1 | 2026-09-01 |
| `incendie-erp-visite-commission-cat1-2-quinquennale` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-visite-commission-cat1-2-triennale` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-visite-commission-cat3-quinquennale` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-visite-commission-cat3-triennale` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-visite-commission-cat4-quinquennale` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-erp-visite-commission-cat4-triennale` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `incendie-travail-consigne-affichee` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `incendie-travail-eclairage-securite-autonomie-semestrielle` | incendie | equipement | 4 | 5 · première main | 5 · première main | 0 / 4 | 2026-09-01 |
| `incendie-travail-eclairage-securite-essai-mensuel` | incendie | equipement | 4 | 5 · première main | 5 · première main | 0 / 4 | 2026-09-01 |
| `incendie-travail-exercice-semestriel` | incendie | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `incendie-travail-moyens-lutte` | incendie | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `levage-epreuve-initiale-fonctionnement` | levage | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-08-26 → 2026-09-01 |
| `levage-examen-adequation-mise-en-service` | levage | equipement | 3 | 5 · première main | 5 · première main | 0 / 3 | 2026-08-26 → 2026-09-01 |
| `levage-registre-securite-consignation` | levage | equipement | 3 | 5 · première main | 5 · première main | 0 / 3 | 2026-09-01 |
| `levage-remise-en-service-apres-reparation` | levage | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `levage-vgp-accessoires-annuelle` | levage | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `levage-vgp-annuelle-charges` | levage | equipement | 3 | 5 · première main | 5 · première main | 0 / 3 | 2026-09-01 → 2026-09-02 |
| `levage-vgp-semestrielle-chariot-gerbeur` | levage | equipement | 4 | 5 · première main | 5 · première main | 0 / 4 | 2026-09-01 |
| `levage-vgp-semestrielle-personnes` | levage | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `levage-vgp-trimestrielle-force-humaine` | levage | equipement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 |
| `prevention-etablissement-liste-personnes-qualifiees` | organisation_prevention | etablissement | 2 | 5 · première main | 5 · première main | 0 / 2 | 2026-09-01 → 2026-09-02 |

Trié du plus faible au plus solide : la première ligne est celle qui
demande le plus de travail.

---

## 9. Les 295 références, une par une

`prescrit` et `verbatim` sont les deux champs du corpus qui rendent une
lecture relisible : ce que l'article impose, en une phrase, et la phrase
décisive recopiée. Une ligne sans verbatim est une lecture qu'il faut
refaire pour la contredire.

| obligation | rang | référence | article | corpus | statut | lu le | moyen | prescrit | verbatim | version au corpus | version constatée | degré | ancrage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `elec-travail-mise-en-service` | fondement | R. 4226-14 | R. 4226-14 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 4 · agent + verbatim | ancrée |
| `elec-travail-mise-en-service` | contexte 1 | Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 2 et 6 | Arrêté 2011-12-26 art. 2 | arrete-2011-12-26-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2011-12-30 | 2011-12-30 | 4 · agent + verbatim | ancrée |
| `elec-travail-periodique-annuelle` | fondement | R. 4226-16 | R. 4226-16 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 4 · agent + verbatim | ancrée |
| `elec-travail-periodique-annuelle` | contexte 1 | Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 3 | Arrêté 2011-12-26 art. 3 | arrete-2011-12-26-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2011-12-30 | 2011-12-30 | 4 · agent + verbatim | ancrée |
| `elec-travail-consignation-registre` | fondement | R. 4226-19 | R. 4226-19 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 5 · première main | ancrée |
| `elec-travail-consignation-registre` | contexte 1 | L. 4711-5 | L. 4711-5 | code-travail-incendie | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `elec-travail-habilitation-personnel` | fondement | R. 4544-9 à R. 4544-11 | R. 4544-10 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2025-10-01 | 2025-10-01 | 4 · agent + verbatim | ancrée |
| `elec-travail-habilitation-personnel` | contexte 1 | INRS ED 6127 « Habilitation électrique » | INRS ED 6127 | inrs-documentaire | sans_objet | 2026-08-26 | premiere_main | — | — | — | — | 3 · lu sans verbatim | jamais constatée |
| `elec-travail-carnet-prescriptions` | fondement | R. 4544-10, quatrième alinéa (carnet de prescriptions remis à chaque travailleur) | R. 4544-10 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2025-10-01 | 2025-10-01 | 4 · agent + verbatim | ancrée |
| `elec-salarie-habilitation` | fondement | R. 4544-10 (habilitation délivrée à un travailleur désigné) | R. 4544-10 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2025-10-01 | 2025-10-01 | 4 · agent + verbatim | ancrée |
| `elec-salarie-attestation-medicale-voisinage` | fondement | R. 4544-11-1 | R. 4544-11-1 | code-travail-electricite | retenu | 2026-08-27 | premiere_main | — | ✓ | 2025-10-01 | 2025-10-01 | 5 · première main | ancrée |
| `elec-salarie-attestation-medicale-voisinage` | contexte 1 | R. 4544-10 (habilitation délivrée à un travailleur désigné) | R. 4544-10 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2025-10-01 | 2025-10-01 | 4 · agent + verbatim | ancrée |
| `elec-erp-mise-en-service` | fondement | Arrêté du 25 juin 1980, art. GE 6 à GE 8 (vérifications par organismes agréés, rapport RVRAT) | GE 6 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2007-11-19 | 2007-11-19 | 4 · agent + verbatim | ancrée |
| `elec-erp-mise-en-service` | contexte 1 | Arrêté du 25 juin 1980, art. EL 19 § 2 (installations neuves ou modifiées) | EL 19 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2010-01-23 | 2010-01-23 | 5 · première main | ancrée |
| `elec-erp-cat1-4-annuelle` | fondement | Arrêté du 25 juin 1980, art. EL 19 § 3 (vérifications périodiques des installations non modifiées) | EL 19 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2010-01-23 | 2010-01-23 | 5 · première main | ancrée |
| `elec-erp-groupe-electrogene-quinzaine` | fondement | Arrêté du 25 juin 1980, art. EL 18 § 4 (première périodicité) | EL 18 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2019-07-01 | 2019-07-01 | 4 · agent + verbatim | ancrée |
| `elec-erp-presence-personne-qualifiee` | fondement | Arrêté du 25 juin 1980, art. EL 18 § 2 (présence physique d'une personne qualifiée) | EL 18 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2019-07-01 | 2019-07-01 | 4 · agent + verbatim | ancrée |
| `elec-erp-groupe-electrogene-annuel` | fondement | Arrêté du 25 juin 1980, art. EL 18 § 4 (entretien et essais des groupes électrogènes de sécurité) | EL 18 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2019-07-01 | 2019-07-01 | 4 · agent + verbatim | ancrée |
| `elec-erp-groupe-electrogene-annuel` | contexte 1 | Arrêté du 25 juin 1980, art. EL 19 (vérification annuelle) | EL 19 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2010-01-23 | 2010-01-23 | 5 · première main | ancrée |
| `elec-igh-annuelle` | fondement | Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 (vérifications techniques par organismes agréés) | GH 5 | arrete-2011-12-30-igh | retenu | 2026-09-04 | agent_verbatim | ✓ | — | 2026-01-01 | — | 3 · lu sans verbatim | jamais constatée |
| `incendie-hotel-po-controle-annuel-electricite` | fondement | Arrêté du 25 juin 1980, art. PO 1 § 3 (règles spécifiques aux hôtels) | PO 1 | arrete-1980-livre-3 | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 5 · première main | ancrée |
| `incendie-hotel-po-controle-annuel-electricite` | contexte 1 | Arrêté du 25 juin 1980, art. PO 8 § 1 (extension aux hôtels existants) | PO 8 | arrete-1980-livre-3 | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2011-10-30 | 2011-10-30 | 5 · première main | ancrée |
| `elec-travail-rapport-quadriennal` | fondement | Arrêté du 26 décembre 2011, annexe II, point 3.5 (mise à jour des renseignements descriptifs) | Arrêté 2011-12-26 annexe II | arrete-2011-12-26-electricite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2011-12-30 | 2011-12-30 | 5 · première main | ancrée |
| `elec-travail-rapport-quadriennal` | contexte 1 | R. 4226-16 (vérification périodique annuelle) | R. 4226-16 | code-travail-electricite | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 4 · agent + verbatim | ancrée |
| `incendie-erp-pe4-entretien-installations-techniques` | fondement | Arrêté du 25 juin 1980, art. PE 4 § 2 | PE 4 | arrete-1980-livre-3 | retenu | 2026-08-27 | premiere_main | — | ✓ | 2026-07-01 | 2026-07-01 | 5 · première main | ancrée |
| `incendie-erp-pe4-entretien-installations-techniques` | contexte 1 | Arrêté du 25 juin 1980, art. PE 2 § 3 | PE 2 | arrete-1980-livre-3 | sans_objet | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-01-01 | 2026-01-01 | 5 · première main | ancrée |
| `incendie-erp-pe4-entretien-installations-techniques` | contexte 2 | Arrêté du 1er décembre 2025 modifiant le règlement de sécurité ERP (applicable au 1er juillet 2026) | Arrêté 2025-12-01 | arretes-modificatifs-erp | retenu | 2026-08-26 | premiere_main | ✓ | — | 2026-07-01 | 2026-07-01 | 3 · lu sans verbatim | ancrée |
| `incendie-travail-moyens-lutte` | fondement | R. 4227-28 | R. 4227-28 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `incendie-travail-moyens-lutte` | contexte 1 | R. 4227-29 | R. 4227-29 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `incendie-travail-consigne-affichee` | fondement | R. 4227-37 | R. 4227-37 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-11-10 | 2011-11-10 | 5 · première main | ancrée |
| `incendie-travail-consigne-affichee` | contexte 1 | R. 4227-38 | R. 4227-38 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-11-10 | 2011-11-10 | 5 · première main | ancrée |
| `incendie-travail-exercice-semestriel` | fondement | R. 4227-39 | R. 4227-39 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-11-10 | 2011-11-10 | 5 · première main | ancrée |
| `incendie-travail-exercice-semestriel` | contexte 1 | R. 4227-34 | R. 4227-34 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `incendie-registre-securite` | fondement | R. 4227-39 | R. 4227-39 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-11-10 | 2011-11-10 | 5 · première main | ancrée |
| `incendie-registre-securite` | contexte 1 | L. 4711-1 — mentions obligatoires des pièces de vérification | L. 4711-1 | code-travail-incendie | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `incendie-registre-securite` | contexte 2 | L. 4711-2 — conservation des observations de l'inspection | L. 4711-2 | code-travail-incendie | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `incendie-registre-securite` | contexte 3 | D. 4711-2 — datation et identité du vérificateur | D. 4711-2 | code-travail-incendie | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `incendie-registre-securite` | contexte 4 | D. 4711-3 — conservation cinq ans | D. 4711-3 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2009-03-16 | 2009-03-16 | 5 · première main | ancrée |
| `incendie-registre-securite` | contexte 5 | L. 4711-5 — faculté de regroupement, PAS un fondement | L. 4711-5 | code-travail-incendie | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `incendie-registre-securite` | contexte 6 | CCH, art. R. 143-44 (ex R. 123-51) — ERP | CCH R. 143-44 | cch-registre-securite | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-07-01 | 2026-07-01 | 5 · première main | ancrée |
| `incendie-registre-securite` | contexte 7 | CCH, art. R. 141-10 — contenu du registre | CCH R. 141-10 | cch-registre-securite | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-07-01 | 2026-07-01 | 5 · première main | ancrée |
| `incendie-registre-securite` | contexte 8 | CCH, art. R. 141-11 — solutions d'effet équivalent | CCH R. 141-11 | cch-registre-securite | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-07-01 | 2026-07-01 | 5 · première main | ancrée |
| `incendie-registre-securite` | contexte 9 | CCH, art. R. 146-35 (ex R. 122-29) — IGH | CCH R. 146-35 | cch-registre-securite | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-07-01 | 2026-07-01 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-essai-mensuel` | fondement | Arrêté du 14 décembre 2011, art. 11 | Arrêté 2011-12-14 art. 11 | arrete-2011-12-14-eclairage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-12-31 | 2011-12-31 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-essai-mensuel` | contexte 1 | R. 4227-14 | R. 4227-14 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-essai-mensuel` | contexte 2 | R. 4226-19 | R. 4226-19 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-essai-mensuel` | contexte 3 | Arrêté du 14 décembre 2011, art. 1er | Arrêté 2011-12-14 art. 1 | arrete-2011-12-14-eclairage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-12-31 | 2011-12-31 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-autonomie-semestrielle` | fondement | Arrêté du 14 décembre 2011, art. 11 | Arrêté 2011-12-14 art. 11 | arrete-2011-12-14-eclairage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-12-31 | 2011-12-31 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-autonomie-semestrielle` | contexte 1 | R. 4227-14 | R. 4227-14 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-autonomie-semestrielle` | contexte 2 | R. 4226-19 | R. 4226-19 | code-travail-incendie | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-07-01 | 2011-07-01 | 5 · première main | ancrée |
| `incendie-travail-eclairage-securite-autonomie-semestrielle` | contexte 3 | Arrêté du 14 décembre 2011, art. 1er | Arrêté 2011-12-14 art. 1 | arrete-2011-12-14-eclairage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-12-31 | 2011-12-31 | 5 · première main | ancrée |
| `incendie-erp-eclairage-securite-essai-mensuel` | fondement | Arrêté du 25 juin 1980, art. EC 14 § 3 | EC 14 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2010-05-16 | 2010-05-16 | 5 · première main | ancrée |
| `incendie-erp-eclairage-securite-autonomie-semestrielle` | fondement | Arrêté du 25 juin 1980, art. EC 14 § 3 | EC 14 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2010-05-16 | 2010-05-16 | 5 · première main | ancrée |
| `incendie-erp-extincteurs-annuelle` | fondement | Arrêté du 25 juin 1980, art. MS 38 § 4 | MS 38 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-10-08 | 2008-10-08 | 5 · première main | ancrée |
| `incendie-erp-extincteurs-annuelle` | contexte 1 | Arrêté du 25 juin 1980, art. MS 73 § 2 | MS 73 | arrete-1980-livre-2 | retenu | 2026-08-26 | agent_verbatim | ✓ | — | 1980-08-15 | 1980-08-15 | 3 · lu sans verbatim | ancrée |
| `incendie-erp-ssi-annuelle` | fondement | Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle) | MS 73 | arrete-1980-livre-2 | retenu | 2026-08-26 | agent_verbatim | ✓ | — | 1980-08-15 | 1980-08-15 | 3 · lu sans verbatim | ancrée |
| `incendie-erp-extincteurs-revision-decennale` | fondement | Arrêté du 25 juin 1980, art. MS 38 § 4 (révision décennale) | MS 38 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-10-08 | 2008-10-08 | 5 · première main | ancrée |
| `incendie-erp-ssi-triennale` | fondement | Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification triennale par organisme agréé des SSI de catégorie A ou B) | MS 73 | arrete-1980-livre-2 | retenu | 2026-08-26 | agent_verbatim | ✓ | — | 1980-08-15 | 1980-08-15 | 3 · lu sans verbatim | ancrée |
| `incendie-erp-alarme-verification-hebdomadaire` | fondement | Arrêté du 25 juin 1980, art. MS 69 deuxième alinéa (l'exploitant s'assure une fois par semaine au moins du bon fonctionnement de l'installation) | MS 69 | arrete-1980-livre-2 | retenu | 2026-09-04 | agent_verbatim | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 4 · agent + verbatim | ancrée |
| `incendie-erp-baes-annuelle` | fondement | Arrêté du 25 juin 1980, art. EC 15 | EC 15 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 5 · première main | ancrée |
| `incendie-erp-baes-annuelle` | contexte 1 | Arrêté du 25 juin 1980, art. EL 19 | EL 19 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2010-01-23 | 2010-01-23 | 5 · première main | ancrée |
| `incendie-erp-desenfumage-annuelle` | fondement | Arrêté du 25 juin 1980, art. DF 10 | DF 10 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2007-10-28 | 2007-10-28 | 5 · première main | ancrée |
| `incendie-erp-ria-annuelle` | fondement | Arrêté du 25 juin 1980, art. MS 73 (appareils et installations fixes) | MS 73 | arrete-1980-livre-2 | retenu | 2026-08-26 | agent_verbatim | ✓ | — | 1980-08-15 | 1980-08-15 | 3 · lu sans verbatim | ancrée |
| `incendie-erp-5-visite-commission` | fondement | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-erp-5-visite-commission` | contexte 1 | Arrêté du 25 juin 1980, art. GE 4 — n'est PAS applicable en 5ᵉ catégorie | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-5-visite-commission` | contexte 2 | Arrêté du 25 juin 1980, art. PE 37 (ERP de 5ᵉ catégorie avec locaux à sommeil) | PE 37 | arrete-1980-livre-3 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2004-11-24 | 2004-11-24 | 5 · première main | ancrée |
| `incendie-erp-5-sommeil-contrat-entretien-sdi` | fondement | Arrêté du 25 juin 1980, art. PE 4 § 1 | PE 4 | arrete-1980-livre-3 | retenu | 2026-08-27 | premiere_main | — | ✓ | 2026-07-01 | 2026-07-01 | 5 · première main | ancrée |
| `incendie-erp-5-sommeil-consigne-chambres` | fondement | Arrêté du 25 juin 1980, art. PE 33 § 2 | PE 33 | arrete-1980-livre-3 | retenu | 2026-09-01 | agent_verbatim | — | ✓ | 2011-11-04 | 2011-11-04 | 4 · agent + verbatim | ancrée |
| `incendie-erp-5-sommeil-plans-affiches` | fondement | Arrêté du 25 juin 1980, art. PE 35 | PE 35 | arrete-1980-livre-3 | retenu | 2026-09-01 | agent_verbatim | — | ✓ | 1990-08-27 | 1990-08-27 | 4 · agent + verbatim | ancrée |
| `incendie-erp-visite-commission-cat1-2-triennale` | fondement | Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories) | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat1-2-triennale` | contexte 1 | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat1-2-quinquennale` | fondement | Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories) | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat1-2-quinquennale` | contexte 1 | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat3-triennale` | fondement | Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories) | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat3-triennale` | contexte 1 | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat3-quinquennale` | fondement | Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories) | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat3-quinquennale` | contexte 1 | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat4-triennale` | fondement | Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories) | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat4-triennale` | contexte 1 | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat4-quinquennale` | fondement | Arrêté du 25 juin 1980, art. GE 4 § 1 (visites périodiques des quatre premières catégories) | GE 4 | arrete-1980-livre-2 | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2015-01-01 | 2015-01-01 | 5 · première main | ancrée |
| `incendie-erp-visite-commission-cat4-quinquennale` | contexte 1 | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | cch-registre-securite | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `incendie-igh-moyens-secours-annuelle` | fondement | Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 (vérifications techniques par organismes agréés) | GH 5 | arrete-2011-12-30-igh | retenu | 2026-09-04 | agent_verbatim | ✓ | — | 2026-01-01 | 2026-01-01 | 3 · lu sans verbatim | ancrée |
| `incendie-igh-charge-calorifique-quinquennale` | fondement | Arrêté du 30 décembre 2011 (règlement IGH), art. GH 61 § 5 (rapport de vérification de la charge calorifique, à la charge des occupants) | GH 61 | arrete-2011-12-30-igh | retenu | 2026-09-04 | agent_verbatim | ✓ | ✓ | 2012-04-01 | 2012-04-01 | 4 · agent + verbatim | ancrée |
| `incendie-igh-charge-calorifique-quinquennale` | contexte 1 | Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 § 3.1.4 (la quinquennale au tableau des vérifications techniques) | GH 5 | arrete-2011-12-30-igh | retenu | 2026-09-04 | agent_verbatim | ✓ | — | 2026-01-01 | 2026-01-01 | 3 · lu sans verbatim | ancrée |
| `habitation-verification-annuelle-installations-securite` | fondement | Arrêté du 31 janvier 1986, art. 101 (vérifications annuelles à la charge du propriétaire) | Arrêté 1986-01-31 art. 101 | arrete-1986-habitation | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1986-03-05 | 1986-03-05 | 4 · agent + verbatim | ancrée |
| `habitation-verification-annuelle-installations-securite` | contexte 1 | Arrêté du 31 janvier 1986, art. 103 (qualité du vérificateur) | Arrêté 1986-01-31 art. 103 | arrete-1986-habitation | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2015-10-01 | 2015-10-01 | 4 · agent + verbatim | ancrée |
| `habitation-verification-annuelle-installations-securite` | contexte 2 | Arrêté du 31 janvier 1986, art. 1er (champ d'application : habitations dont le plancher bas du logement le plus haut est à 50 m au plus) | Arrêté 1986-01-31 art. 1 | arrete-1986-habitation | sans_objet | 2026-09-01 | agent_verbatim | — | ✓ | 2020-12-25 | 2020-12-25 | 4 · agent + verbatim | ancrée |
| `habitation-registre-securite` | fondement | Arrêté du 31 janvier 1986, art. 103 (contenu minimal du registre) | Arrêté 1986-01-31 art. 103 | arrete-1986-habitation | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2015-10-01 | 2015-10-01 | 4 · agent + verbatim | ancrée |
| `habitation-registre-securite` | contexte 1 | Arrêté du 31 janvier 1986, art. 101 in fine (le registre justifie l'entretien) | Arrêté 1986-01-31 art. 101 | arrete-1986-habitation | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1986-03-05 | 1986-03-05 | 4 · agent + verbatim | ancrée |
| `habitation-registre-securite` | contexte 2 | Arrêté du 31 janvier 1986, art. 104 (présentation aux agents assermentés) | Arrêté 1986-01-31 art. 104 | arrete-1986-habitation | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1986-03-05 | 1986-03-05 | 4 · agent + verbatim | ancrée |
| `habitation-consignes-plans-intervention` | fondement | Arrêté du 31 janvier 1986, art. 100 (affichage des consignes et des plans d'intervention) | Arrêté 1986-01-31 art. 100 | arrete-1986-habitation | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2015-10-01 | 2015-10-01 | 4 · agent + verbatim | ancrée |
| `aeration-controle-installations-r4222-20` | fondement | R. 4222-20 | R. 4222-20 | code-travail-risque-chimique | retenu | 2026-08-27 | premiere_main | — | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `aeration-controle-installations-r4222-20` | contexte 1 | R. 4222-22 | R. 4222-22 | code-travail-risque-chimique | sans_objet | 2026-08-27 | premiere_main | — | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `aeration-controle-installations-r4222-20` | contexte 2 | Arrêté du 8 octobre 1987, art. 3 | Arrêté 1987-10-08 art. 3 | arrete-1987-10-08-aeration | retenu | 2026-08-27 | premiere_main | ✓ | ✓ | 1988-04-01 | 1988-04-01 | 5 · première main | ancrée |
| `aeration-travail-mise-en-service` | fondement | Arrêté du 8 octobre 1987, art. 2 a) (dossier de valeurs de référence, un mois après la première mise en service) | Arrêté 1987-10-08 art. 2 | arrete-1987-10-08-aeration | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1988-04-01 | 1988-04-01 | 4 · agent + verbatim | ancrée |
| `aeration-travail-mise-en-service` | contexte 1 | Arrêté du 8 octobre 1987, art. 3-1 (contenu du dossier de valeurs de référence, locaux à pollution non spécifique) | Arrêté 1987-10-08 art. 3 | arrete-1987-10-08-aeration | retenu | 2026-08-27 | premiere_main | ✓ | ✓ | 1988-04-01 | 1988-04-01 | 5 · première main | ancrée |
| `aeration-travail-mise-en-service` | contexte 2 | R. 4222-20 | R. 4222-20 | code-travail-risque-chimique | retenu | 2026-08-27 | premiere_main | — | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `aeration-travail-locaux-pollution-specifique` | fondement | Arrêté du 8 octobre 1987, art. 4 | Arrêté 1987-10-08 art. 4 | arrete-1987-10-08-aeration | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1988-04-01 | 1988-04-01 | 4 · agent + verbatim | ancrée |
| `aeration-travail-recyclage-semestriel` | fondement | Arrêté du 8 octobre 1987, art. 4 b) (contrôle semestriel en cas de recyclage) | Arrêté 1987-10-08 art. 4 | arrete-1987-10-08-aeration | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1988-04-01 | 1988-04-01 | 4 · agent + verbatim | ancrée |
| `aeration-erp-chauffage-ventilation-annuelle` | fondement | Arrêté du 25 juin 1980, art. CH 58 § 2 (vérifications périodiques annuelles), son § 1 renvoyant le régime à la section II du chapitre Ier | CH 58 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2025-09-10 | 2025-09-10 | 4 · agent + verbatim | ancrée |
| `aeration-erp-chauffage-ventilation-annuelle` | contexte 1 | Arrêté du 25 juin 1980, art. CH 57 (entretien, ramonage annuel des conduits de fumée) | CH 57 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 4 · agent + verbatim | ancrée |
| `aeration-erp-filtres-visite-periodique` | fondement | Arrêté du 25 juin 1980, art. CH 39 § 3 (visite périodique par l'utilisateur, périodicité ramenée à trois mois en l'absence de système de mesure et d'alarme permanent) | CH 39 | arrete-1980-livre-2 | retenu | 2026-09-04 | agent_verbatim | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 4 · agent + verbatim | ancrée |
| `aeration-erp-ps-surveillance-qualite-air-inf-250` | fondement | Arrêté du 25 juin 1980, art. PS 32 (rédaction arrêté du 9 mai 2006) | PS 32 | arrete-1980-livre-4-parcs | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2006-07-09 | 2006-07-09 | 4 · agent + verbatim | ancrée |
| `aeration-erp-ps-surveillance-qualite-air-sup-250` | fondement | Arrêté du 25 juin 1980, art. PS 32 (rédaction arrêté du 9 mai 2006) | PS 32 | arrete-1980-livre-4-parcs | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2006-07-09 | 2006-07-09 | 4 · agent + verbatim | ancrée |
| `aeration-habitation-vmc-gaz-quinquennale` | fondement | Arrêté du 23 février 2018, art. 26 § 5° (opérations quinquennales sur les VMC-gaz) | Arrêté 23-02-2018 art. 26 | arrete-2018-02-23-gaz-habitation | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2023-01-01 | 2023-01-01 | 5 · première main | ancrée |
| `aeration-habitation-vmc-gaz-annuelle` | fondement | Arrêté du 23 février 2018, art. 26 § 5° (opérations annuelles sur les VMC-gaz) | Arrêté 23-02-2018 art. 26 | arrete-2018-02-23-gaz-habitation | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2023-01-01 | 2023-01-01 | 5 · première main | ancrée |
| `cuisson-erp-filtres-hebdomadaire` | fondement | Arrêté du 25 juin 1980, art. GC 21 § 2 (entretien des installations de cuisson) | GC 21 | arrete-1980-livre-2 | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 5 · première main | ancrée |
| `cuisson-erp-verification-initiale` | fondement | Arrêté du 25 juin 1980, art. GC 22 § 1 (vérification dans les conditions de la section II du chapitre Ier) | GC 22 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 4 · agent + verbatim | ancrée |
| `cuisson-erp-verification-initiale` | contexte 1 | Arrêté du 25 juin 1980, art. GE 6 à GE 8 (vérifications par organismes agréés) | GE 6 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2007-11-19 | 2007-11-19 | 4 · agent + verbatim | ancrée |
| `cuisson-erp-verification-initiale` | contexte 2 | Arrêté du 25 juin 1980, art. GC 1 § 3 (définition de la « grande cuisine ») | GC 1 | arrete-1980-livre-2 | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 5 · première main | ancrée |
| `cuisson-erp-appareils-annuelle` | fondement | Arrêté du 25 juin 1980, art. GC 22 | GC 22 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 4 · agent + verbatim | ancrée |
| `cuisson-gaz-installations-annuelle` | fondement | Arrêté du 25 juin 1980, art. GZ 15 (vérifications techniques périodiques, ex GZ 30) | GZ 15 | arrete-1980-livre-2 | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2026-01-01 | 2026-01-01 | 4 · agent + verbatim | ancrée |
| `cuisson-erp-circuits-extraction-nettoyage` | fondement | Arrêté du 25 juin 1980, art. GC 21 § 2 (ramonage annuel, nettoyage des circuits, filtres hebdomadaires) | GC 21 | arrete-1980-livre-2 | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 1980-08-15 | — | 5 · première main | jamais constatée |
| `cuisson-erp-extinction-automatique-annuelle` | fondement | Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle des moyens de secours) | MS 73 | arrete-1980-livre-2 | retenu | 2026-08-26 | agent_verbatim | ✓ | — | 1980-08-15 | 1980-08-15 | 3 · lu sans verbatim | ancrée |
| `cuisson-erp-extinction-automatique-annuelle` | contexte 1 | Arrêté du 25 juin 1980, art. GC 8 (obligation d'installation du dispositif) | GC 8 | arrete-1980-livre-2 | retenu | 2026-08-27 | premiere_main | ✓ | ✓ | 1980-08-15 | 1980-08-15 | 5 · première main | ancrée |
| `ascenseur-visite-six-semaines` | fondement | CCH, art. R. 134-6 (prestations minimales du contrat d'entretien) | CCH R. 134-6 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-visite-six-semaines` | contexte 1 | Arrêté du 18 novembre 2004 (entretien), annexe — colonne « intervalle maximum de six semaines » | Arrêté 2004-11-18 | arretes-ascenseurs | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-entretien-contrat` | fondement | CCH, art. R. 134-6 et R. 134-7 (ex R. 125-2 et R. 125-2-1) | CCH R. 134-6 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-entretien-contrat` | contexte 1 | Arrêté du 18 novembre 2004 relatif à l'entretien des installations d'ascenseurs, art. 2 et annexe | Arrêté 2004-11-18 | arretes-ascenseurs | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-examen-semestriel-secours` | fondement | CCH, art. R. 134-6 (examen semestriel du bon état des câbles) | CCH R. 134-6 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-examen-semestriel-secours` | contexte 1 | Arrêté du 18 novembre 2004 (entretien), annexe — opérations semestrielles | Arrêté 2004-11-18 | arretes-ascenseurs | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-examen-annuel-securite` | fondement | Arrêté du 18 novembre 2004 (entretien), annexe — opérations annuelles | Arrêté 2004-11-18 | arretes-ascenseurs | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-examen-annuel-securite` | contexte 1 | CCH, art. R. 134-6 (vérification annuelle des parachutes) | CCH R. 134-6 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 5 · première main | ancrée |
| `ascenseur-controle-technique-quinquennal` | fondement | CCH, art. R. 134-11 à R. 134-13 (ex R. 125-2-4 et s.) | CCH R. 134-11 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-05-15 | 2026-05-15 | 5 · première main | ancrée |
| `ascenseur-controle-technique-quinquennal` | contexte 1 | Arrêté du 7 août 2012 relatif aux contrôles techniques à réaliser dans les installations d'ascenseurs | Arrêté 2012-08-07 | arretes-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2026-05-15 | 2026-05-15 | 5 · première main | ancrée |
| `ascenseur-controle-technique-quinquennal` | contexte 2 | Arrêté du 25 juin 1980, art. AS 9 (ERP des 4 premières catégories : vérification par un organisme agréé tous les cinq ans) | AS 9 | arrete-1980-livre-2 | retenu | 2026-09-04 | agent_verbatim | ✓ | ✓ | 2008-10-08 | 2008-10-08 | 4 · agent + verbatim | ancrée |
| `ascenseur-carnet-entretien` | fondement | CCH, art. R. 134-7 III (carnet d'entretien — régime du contrat) | CCH R. 134-7 | cch-ascenseurs | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 4 · agent + verbatim | ancrée |
| `ascenseur-carnet-entretien` | contexte 1 | CCH, art. R. 134-10 (carnet d'entretien — propriétaire assurant l'entretien par ses propres moyens) | CCH R. 134-10 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `ascenseur-rapport-annuel-activite` | fondement | CCH, art. R. 134-7 III (rapport annuel d'activité — régime du contrat d'entretien) | CCH R. 134-7 | cch-ascenseurs | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2026-04-01 | 2026-04-01 | 4 · agent + verbatim | ancrée |
| `ascenseur-rapport-annuel-activite` | contexte 1 | CCH, art. R. 134-10 (rapport annuel d'activité — propriétaire assurant l'entretien par ses propres moyens) | CCH R. 134-10 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `ascenseur-telealarme-liaison` | fondement | CCH, art. R. 134-2, 6° (objectif de sécurité : moyens d'alerte et de communication avec un service d'intervention) | CCH R. 134-2 | cch-ascenseurs | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 4 · agent + verbatim | ancrée |
| `ascenseur-telealarme-liaison` | contexte 1 | CCH, art. R. 134-1 (champ d'application de la section : ce qu'est un ascenseur) | CCH R. 134-1 | cch-ascenseurs | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2021-07-01 | 2021-07-01 | 5 · première main | ancrée |
| `porte-auto-verification-initiale` | fondement | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 à 4 (installations neuves) | Arrêté 1993-12-21 art. 2 | arrete-1993-12-21-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1994-07-13 | 1994-07-13 | 4 · agent + verbatim | ancrée |
| `porte-auto-verification-initiale` | contexte 1 | R. 4224-13 | R. 4224-13 | code-travail-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `porte-auto-verification-semestrielle` | fondement | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 9 | Arrêté 1993-12-21 art. 9 | arrete-1993-12-21-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `porte-auto-dossier-maintenance` | fondement | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 8 et 9 (livret d'entretien) | Arrêté 1993-12-21 art. 9 | arrete-1993-12-21-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `porte-auto-dossier-maintenance` | contexte 1 | R. 4224-17 | R. 4224-17 | code-travail-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `porte-auto-maintien-en-etat` | fondement | R. 4224-12 et R. 4224-13 | R. 4224-13 | code-travail-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `porte-auto-maintien-en-etat` | contexte 1 | R. 4224-17 | R. 4224-17 | code-travail-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `porte-auto-portail-piete-coulissant` | fondement | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 et 5 (passages de véhicules) | Arrêté 1993-12-21 art. 2 | arrete-1993-12-21-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1994-07-13 | 1994-07-13 | 4 · agent + verbatim | ancrée |
| `esp-declaration-mise-en-service` | fondement | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 7 à 11 | Arrêté 2017-11-20 art. 7-11 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 5 · première main | ancrée |
| `esp-declaration-mise-en-service` | contexte 1 | R. 557-14-1 et s. (suivi en service) | C. env. R. 557-14-1 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2016-12-31 | 2016-12-31 | 5 · première main | ancrée |
| `esp-inspection-periodique` | fondement | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 15 | Arrêté 2017-11-20 art. 15 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2018-01-01 | — | 5 · première main | jamais constatée |
| `esp-inspection-periodique-generateur-vapeur` | fondement | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 15, I | Arrêté 2017-11-20 art. 15 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 5 · première main | ancrée |
| `esp-requalification-decennale` | fondement | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 18 et 19 | Arrêté 2017-11-20 art. 18-19 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 5 · première main | ancrée |
| `esp-dossier-suivi` | fondement | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 6 (dossier d'exploitation) | Arrêté 2017-11-20 art. 6 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 5 · première main | ancrée |
| `esp-intervention-reparation` | fondement | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 26 à 28 | Arrêté 2017-11-20 art. 26-28 | esp-suivi-en-service | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2025-09-08 | 2025-09-08 | 5 · première main | ancrée |
| `esp-personnel-formation` | fondement | R. 4323-1 à R. 4323-5 (information et formation à l'utilisation des équipements de travail) | R. 4323-1 | code-travail-equipements-information | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2009-12-29 | 2009-12-29 | 5 · première main | ancrée |
| `stockage-dangereux-declaration-icpe` | fondement | C. env., art. L. 512-8 — régime de la DÉCLARATION (section 3) | C. env. L. 512-8 | icpe-stockage | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2017-03-01 | 2017-03-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-declaration-icpe` | contexte 1 | C. env., art. L. 512-7 — régime de l'ENREGISTREMENT, dit autorisation simplifiée (section 2) | C. env. L. 512-7 | icpe-stockage | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2020-12-09 | 2020-12-09 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-declaration-icpe` | contexte 2 | C. env., art. L. 512-1 — régime de l'AUTORISATION environnementale (section 1) | C. env. L. 512-1 | icpe-stockage | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2017-03-01 | 2017-03-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-retention` | fondement | R. 4412-11 (procédures de stockage sûres des agents chimiques dangereux) | R. 4412-11 | code-travail-risque-chimique | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-retention` | contexte 1 | Arrêté du 1er juin 2015 (rubriques 4331/4734, enregistrement), art. 22 — valeurs de rétention, opposables uniquement sous ce régime ICPE | Arrêté 2015-06-01 art. 22 | icpe-stockage | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2022-01-01 | 2022-01-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-retention` | contexte 2 | R. 4412-17 (prévention des débordements et ruptures de parois des récipients) | R. 4412-17 | code-travail-risque-chimique | retenu | 2026-08-27 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `stockage-dangereux-verification-etancheite` | fondement | R. 4412-11, 2° (procédures d'entretien régulières du matériel de stockage) | R. 4412-11 | code-travail-risque-chimique | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-verification-etancheite` | contexte 1 | R. 4412-17 (prévention des débordements et ruptures de parois des récipients) | R. 4412-17 | code-travail-risque-chimique | retenu | 2026-08-27 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `stockage-dangereux-ventilation-locaux` | fondement | R. 4222-20 | R. 4222-20 | code-travail-risque-chimique | retenu | 2026-08-27 | premiere_main | — | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `stockage-dangereux-ventilation-locaux` | contexte 1 | Arrêté du 8 octobre 1987, art. 4 (locaux à pollution spécifique) | Arrêté 1987-10-08 art. 4 | arrete-1987-10-08-aeration | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 1988-04-01 | 1988-04-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-fiches-donnees` | fondement | R. 4412-38 (accès des travailleurs aux fiches de données de sécurité) | R. 4412-38 | code-travail-risque-chimique | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-formation-personnel` | fondement | R. 4412-38 (agents chimiques dangereux) | R. 4412-38 | code-travail-risque-chimique | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `stockage-dangereux-formation-personnel` | contexte 1 | R. 4412-87 (agents CMR uniquement) | R. 4412-87 | code-travail-risque-chimique | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `levage-examen-adequation-mise-en-service` | fondement | Arrêté du 1er mars 2004, art. 14-I a) (vérification à la mise en service : examen d'adéquation) | Arrêté 2004-03-01 art. 14 | arrete-2004-03-01-levage | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-examen-adequation-mise-en-service` | contexte 1 | Arrêté du 1er mars 2004, art. 5-I (définition de l'examen d'adéquation) | Arrêté 2004-03-01 art. 5 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-examen-adequation-mise-en-service` | contexte 2 | R. 4323-22 | R. 4323-22 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-epreuve-initiale-fonctionnement` | fondement | Arrêté du 1er mars 2004, art. 14 (vérification à la mise en service), renvoyant aux art. 5, 10 et 11 | Arrêté 2004-03-01 art. 14 | arrete-2004-03-01-levage | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-epreuve-initiale-fonctionnement` | contexte 1 | R. 4323-22 | R. 4323-22 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-annuelle-charges` | fondement | R. 4323-23 (vérification générale périodique des équipements de travail) | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-annuelle-charges` | contexte 1 | R. 4323-24 (les vérifications sont réalisées par des personnes qualifiées, appartenant ou non à l'établissement) | R. 4323-24 | code-travail-levage | retenu | 2026-09-02 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-annuelle-charges` | contexte 2 | Arrêté du 1er mars 2004, art. 23 (périodicité de 12 mois) | Arrêté 2004-03-01 art. 23 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-vgp-semestrielle-chariot-gerbeur` | fondement | Arrêté du 1er mars 2004, art. 23 a) | Arrêté 2004-03-01 art. 23 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-vgp-semestrielle-chariot-gerbeur` | contexte 1 | R. 4323-23 | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-semestrielle-chariot-gerbeur` | contexte 2 | Arrêté du 1er mars 2004, art. 20-II | Arrêté 2004-03-01 art. 20 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-vgp-semestrielle-chariot-gerbeur` | contexte 3 | Arrêté du 1er mars 2004, annexe | Arrêté 2004-03-01 annexe | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2011-01-09 | 2011-01-09 | 5 · première main | ancrée |
| `levage-vgp-trimestrielle-force-humaine` | fondement | Arrêté du 1er mars 2004, art. 23 b) (périodicité de 3 mois) | Arrêté 2004-03-01 art. 23 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-vgp-trimestrielle-force-humaine` | contexte 1 | R. 4323-23 | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-semestrielle-personnes` | fondement | Arrêté du 1er mars 2004, art. 23 (périodicité de 6 mois pour les appareils servant au transport de personnes ou à l'élévation d'un poste de travail) | Arrêté 2004-03-01 art. 23 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-vgp-semestrielle-personnes` | contexte 1 | R. 4323-23 | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-accessoires-annuelle` | fondement | Arrêté du 1er mars 2004, art. 24 (vérification périodique des accessoires) | Arrêté 2004-03-01 art. 24 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-vgp-accessoires-annuelle` | contexte 1 | R. 4323-23 | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-examen-etat-conservation` | fondement | Arrêté du 1er mars 2004, art. 22-II (contenu de la vérification générale périodique) | Arrêté 2004-03-01 art. 22 | arrete-2004-03-01-levage | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `levage-examen-etat-conservation` | contexte 1 | Arrêté du 1er mars 2004, art. 23 (périodicité : tous les douze mois) | Arrêté 2004-03-01 art. 23 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-examen-etat-conservation` | contexte 2 | Arrêté du 1er mars 2004, art. 9 (définition de l'examen de l'état de conservation) | Arrêté 2004-03-01 art. 9 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2005-03-31 | 2005-03-31 | 5 · première main | ancrée |
| `levage-examen-etat-conservation` | contexte 3 | R. 4323-23 | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-remise-en-service-apres-reparation` | fondement | R. 4323-28 | R. 4323-28 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-remise-en-service-apres-reparation` | contexte 1 | Arrêté du 1er mars 2004, art. 18 à 21 (remise en service) | Arrêté 2004-03-01 art. 19 | arrete-2004-03-01-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-registre-securite-consignation` | fondement | R. 4323-25 | R. 4323-25 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-registre-securite-consignation` | contexte 1 | R. 4323-26 | R. 4323-26 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `levage-registre-securite-consignation` | contexte 2 | R. 4323-27 | R. 4323-27 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `froid-controle-etancheite-mise-en-service` | fondement | R. 543-79, al. 1 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-mise-en-service` | contexte 1 | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-annuel` | fondement | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-annuel` | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-biennal-detection` | fondement | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-biennal-detection` | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-semestriel-50t` | fondement | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-semestriel-50t` | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-annuel-50t-detection` | fondement | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-annuel-50t-detection` | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-trimestriel-500t` | fondement | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-trimestriel-500t` | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-semestriel-500t-detection` | fondement | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-semestriel-500t-detection` | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-apres-modification` | fondement | R. 543-79, al. 2 | C. env. R. 543-79 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2025-01-01 | — | 5 · première main | jamais constatée |
| `froid-controle-etancheite-apres-modification` | contexte 1 | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | froid-fluides-frigorigenes | retenu | 2026-08-26 | premiere_main | ✓ | ✓ | 2024-02-20 | — | 5 · première main | jamais constatée |
| `formation-securite-etablissement-organisation` | fondement | L. 4141-2 (formation pratique et appropriée à la sécurité, bénéficiaires) | L. 4141-2 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 1 | R. 4141-3 (objet et contenu de la formation) | R. 4141-3 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 2 | R. 4141-11 (formation aux conditions de circulation) | R. 4141-11 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 3 | R. 4141-13 (formation aux conditions d'exécution du travail) | R. 4141-13 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 4 | R. 4141-15 (tâches ouvrant droit à formation en cas de création ou modification de poste) | R. 4141-15 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 5 | R. 4141-17 (objet de la formation à la conduite à tenir en cas d'accident) | R. 4141-17 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 6 | R. 4141-6 (association du médecin du travail à l'élaboration des actions de formation) | R. 4141-6 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-12-20 | 2008-12-20 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-organisation` | contexte 7 | R. 4141-9 (formation à la reprise après un arrêt d'au moins vingt et un jours, à la demande du médecin du travail) | R. 4141-9 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | fondement | R. 4141-20 (formation dispensée dans le mois qui suit l'affectation du travailleur à son emploi) | R. 4141-20 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | contexte 1 | L. 4141-2 (bénéficiaires : embauche, changement de poste, salariés temporaires, reprise) | L. 4141-2 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | contexte 2 | R. 4141-2 (information et formation dispensées lors de l'embauche et chaque fois que nécessaire) | R. 4141-2 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-12-20 | 2008-12-20 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | contexte 3 | R. 4141-15 (tâches concernées) | R. 4141-15 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | contexte 4 | R. 4141-16 (changement de poste de travail ou de technique) | R. 4141-16 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | contexte 5 | R. 4141-18 (bénéficiaires de la formation à la conduite à tenir en cas d'accident) | R. 4141-18 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-accueil` | contexte 6 | R. 4141-19 (formation à la conduite à tenir lors d'un changement de poste) | R. 4141-19 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | — | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-information` | fondement | L. 4141-1 (obligation générale d'information) | L. 4141-1 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2013-04-18 | 2013-04-18 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-information` | contexte 1 | R. 4141-3-1 (contenu de l'information due aux travailleurs) | R. 4141-3-1 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2010-01-23 | 2010-01-23 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-information` | contexte 2 | R. 4141-2 (information dispensée lors de l'embauche et chaque fois que nécessaire) | R. 4141-2 | code-travail-formation-securite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-12-20 | 2008-12-20 | 4 · agent + verbatim | ancrée |
| `conduite-salarie-formation` | fondement | R. 4323-55 (conduite réservée aux travailleurs ayant reçu une formation adéquate) | R. 4323-55 | code-travail-conduite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `conduite-salarie-autorisation` | fondement | R. 4323-56, alinéa 1 (autorisation de conduite délivrée par l'employeur) | R. 4323-56 | code-travail-conduite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2025-10-01 | 2025-10-01 | 4 · agent + verbatim | ancrée |
| `conduite-salarie-autorisation` | contexte 1 | R. 4323-57 (arrêtés fixant les catégories d'équipements soumises à autorisation) | R. 4323-57 | code-travail-conduite | sans_objet | 2026-08-31 | agent_verbatim | — | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-manutention` | fondement | R. 4541-8 (information sur les risques et formation adéquate à la sécurité des travailleurs dont l'activité comporte des manutentions manuelles) | R. 4541-8 | code-travail-manutention-ecran | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-etablissement-travail-sur-ecran` | fondement | R. 4542-16 (information et formation avant la première affectation à un travail sur écran et à chaque modification substantielle du poste) | R. 4542-16 | code-travail-manutention-ecran | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-cse-sst` | fondement | L. 2315-18 (formation en santé, sécurité et conditions de travail des membres de la délégation du personnel du CSE : cinq jours au premier mandat, trois au renouvellement) | L. 2315-18 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-03-31 | 2022-03-31 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-cse-sst` | contexte 1 | L. 2315-17 (les formations sont renouvelées lorsque les représentants ont exercé leur mandat pendant quatre ans, consécutifs ou non) | L. 2315-17 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2026-05-28 | 2026-05-28 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-cse-sst` | contexte 2 | L. 2315-16 (le temps de formation est pris sur le temps de travail et rémunéré comme tel) | L. 2315-16 | code-travail-organisation-prevention | sans_objet | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-designe-competent` | fondement | L. 4644-1 I alinéa 2 (le ou les salariés désignés bénéficient d'une formation en matière de santé au travail dans les conditions prévues aux articles L. 2315-16 à L. 2315-18) | L. 4644-1 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-03-31 | 2022-03-31 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-designe-competent` | contexte 1 | L. 2315-18 (durée minimale de cinq jours au premier mandat, trois jours au renouvellement ; financement par l'employeur) | L. 2315-18 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-03-31 | 2022-03-31 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-designe-competent` | contexte 2 | L. 2315-17 (organisme enregistré ; renouvellement après quatre ans de MANDAT exercé — condition inapplicable à un salarié désigné, qui n'en détient aucun) | L. 2315-17 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2026-05-28 | 2026-05-28 | 4 · agent + verbatim | ancrée |
| `formation-securite-salarie-designe-competent` | contexte 3 | R. 4644-1 (désignation après avis du comité social et économique s'il existe ; temps et moyens nécessaires ; absence de discrimination) | R. 4644-1 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-vip` | fondement | R. 4624-16 (renouvellement selon une périodicité qui ne peut excéder cinq ans) | R. 4624-16 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-vip` | contexte 1 | R. 4624-10 (visite initiale dans un délai n'excédant pas trois mois à compter de la prise effective du poste) | R. 4624-10 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-sir` | fondement | R. 4624-28 (renouvellement par le médecin du travail, périodicité ne pouvant excéder quatre ans) | R. 4624-28 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-sir` | contexte 1 | R. 4624-22 (champ du suivi individuel renforcé : postes à risques particuliers) | R. 4624-22 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-sir` | contexte 2 | R. 4624-24 (examen médical d'aptitude préalable à l'affectation, substitué à la VIP) | R. 4624-24 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-sir` | contexte 3 | R. 4624-27 (dispense d'examen d'aptitude si le travailleur en a bénéficié dans les deux ans précédant l'embauche, sous trois conditions) | R. 4624-27 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-sir-visite-intermediaire` | fondement | R. 4624-28, seconde phrase (visite intermédiaire par un professionnel de santé, au plus tard deux ans après la visite avec le médecin du travail) | R. 4624-28 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-etablissement-liste-postes-risques` | fondement | R. 4624-23, III (liste complétée par l'employeur, motivée par écrit, transmise au SPST et mise à jour tous les ans) | R. 4624-23 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2026-04-10 | 2026-04-10 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-vip-adaptee` | fondement | R. 4624-17 (modalités de suivi adaptées, périodicité qui n'excède pas trois ans) | R. 4624-17 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-vip-adaptee` | contexte 1 | R. 4624-18 (visite préalable à l'affectation : travailleurs de nuit et travailleurs de moins de dix-huit ans) | R. 4624-18 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2017-01-01 | 2017-01-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-salarie-sir-categorie-a` | fondement | R. 4451-82 (catégorie A : visite renouvelée chaque année, visite intermédiaire non requise) | R. 4451-82 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-07-01 | 2018-07-01 | 4 · agent + verbatim | ancrée |
| `conduite-salarie-attestation-medicale` | fondement | R. 4323-56, alinéa 2 (attestation d'une validité de cinq ans délivrée par le médecin du travail) | R. 4323-56 | code-travail-conduite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2025-10-01 | 2025-10-01 | 4 · agent + verbatim | ancrée |
| `sante-travail-etablissement-adhesion-spst` | fondement | L. 4622-1 (les employeurs organisent des services de prévention et de santé au travail) | L. 4622-1 | code-travail-service-prevention-sante | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-03-31 | 2022-03-31 | 4 · agent + verbatim | ancrée |
| `sante-travail-etablissement-adhesion-spst` | contexte 1 | D. 4622-1 (le service est organisé sous la forme soit d'un service autonome, soit d'un service interentreprises) | D. 4622-1 | code-travail-service-prevention-sante | retenu | 2026-08-31 | agent_verbatim | ✓ | — | 2022-04-28 | 2022-04-28 | 3 · lu sans verbatim | ancrée |
| `sante-travail-etablissement-adhesion-spst` | contexte 2 | D. 4622-2 (le choix entre les deux formes de service est fait par l'employeur) | D. 4622-2 | code-travail-service-prevention-sante | retenu | 2026-08-31 | agent_verbatim | ✓ | — | 2022-04-28 | 2022-04-28 | 3 · lu sans verbatim | ancrée |
| `sante-travail-etablissement-fiche-entreprise` | fondement | R. 4624-46 (le médecin du travail ou l'équipe pluridisciplinaire établit et met à jour une fiche d'entreprise) | R. 4624-46 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-04-28 | 2022-04-28 | 4 · agent + verbatim | ancrée |
| `sante-travail-etablissement-fiche-entreprise` | contexte 1 | R. 4624-47 (pour les entreprises adhérentes à un service interentreprises, la fiche est établie dans l'année qui suit l'adhésion) | R. 4624-47 | code-travail-sante-travail | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-04-28 | 2022-04-28 | 4 · agent + verbatim | ancrée |
| `secours-etablissement-materiel` | fondement | R. 4224-14 (matériel de premiers secours adapté à la nature des risques et facilement accessible) | R. 4224-14 | code-travail-secours | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `secours-salarie-secouriste` | fondement | R. 4224-15 (membre du personnel formé au secourisme dans chaque atelier où sont accomplis des travaux dangereux) | R. 4224-15 | code-travail-secours | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `secours-etablissement-mesures` | fondement | R. 4224-16 (mesures prises après avis du médecin du travail, consignées dans un document tenu à disposition de l'inspection du travail) | R. 4224-16 | code-travail-secours | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2021-02-13 | 2021-02-13 | 4 · agent + verbatim | ancrée |
| `prevention-etablissement-salarie-designe` | fondement | L. 4644-1 I (l'employeur désigne un ou plusieurs salariés compétents pour s'occuper des activités de protection et de prévention) | L. 4644-1 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-03-31 | 2022-03-31 | 4 · agent + verbatim | ancrée |
| `prevention-etablissement-salarie-designe` | contexte 1 | R. 4644-1 (les personnes désignées le sont après avis du comité social et économique s'il existe, et disposent du temps nécessaire et des moyens requis) | R. 4644-1 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `prevention-etablissement-cse` | fondement | L. 2311-2 (CSE dans les entreprises d'au moins onze salariés, si l'effectif est atteint pendant douze mois consécutifs) | L. 2311-2 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `prevention-etablissement-reglement-interieur` | fondement | L. 1321-1 1° (le règlement intérieur fixe les mesures d'application de la réglementation en matière de santé et de sécurité) | L. 1321-1 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `prevention-etablissement-reglement-interieur` | contexte 1 | L. 1311-2 (obligation d'établir un règlement intérieur à partir de cinquante salariés, au terme d'un délai de douze mois) | L. 1311-2 | code-travail-organisation-prevention | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2020-01-01 | 2020-01-01 | 4 · agent + verbatim | ancrée |
| `prevention-etablissement-liste-personnes-qualifiees` | fondement | R. 4323-24 première phrase (liste des personnes qualifiées tenue à la disposition de l'inspection du travail) | R. 4323-24 | code-travail-levage | retenu | 2026-09-02 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `prevention-etablissement-liste-personnes-qualifiees` | contexte 1 | R. 4323-23 (article qui institue la vérification générale périodique et en renvoie la périodicité à des arrêtés) | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `information-etablissement-affichages-obligatoires` | fondement | D. 4711-1 (affichage de l'adresse et du numéro d'appel du service de santé au travail, des secours d'urgence et de l'inspection du travail) | D. 4711-1 | code-travail-information-travailleurs | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `information-etablissement-avis-acces-duerp` | fondement | R. 4121-4 dernier alinéa (avis affiché indiquant les modalités d'accès des travailleurs au document unique) | R. 4121-4 | code-travail-information-travailleurs | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2022-03-31 | 2022-03-31 | 4 · agent + verbatim | ancrée |
| `epi-etablissement-consigne-utilisation` | fondement | R. 4323-105 (consigne d'utilisation des équipements de protection individuelle) | R. 4323-105 | code-travail-epi | retenu | 2026-09-04 | premiere_main | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 5 · première main | ancrée |
| `epi-etablissement-consigne-utilisation` | contexte 1 | R. 4323-104 (contenu de l'information dont la consigne est la reprise écrite) | R. 4323-104 | code-travail-epi | sans_objet | 2026-09-04 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `epi-verification-generale-periodique` | fondement | Arrêté du 19 mars 1993, art. 1er (liste des EPI soumis à vérification et périodicité de douze mois) | Arrêté 1993-03-19 (EPI) art. 1er | arrete-1993-03-19-epi | retenu | 2026-09-04 | premiere_main | ✓ | ✓ | 1993-12-01 | 1993-12-01 | 5 · première main | ancrée |
| `epi-verification-generale-periodique` | contexte 1 | R. 4323-99 (article habilitant) | R. 4323-99 | code-travail-epi | sans_objet | 2026-09-04 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `epi-verification-generale-periodique` | contexte 2 | Arrêté du 19 mars 1993, art. 2 (contenu de la vérification) | Arrêté 1993-03-19 (EPI) art. 2 | arrete-1993-03-19-epi | sans_objet | 2026-09-04 | premiere_main | ✓ | ✓ | 1993-12-01 | 1993-12-01 | 5 · première main | ancrée |
| `epi-verification-generale-periodique` | contexte 3 | R. 4323-100 (qualification du vérificateur) | R. 4323-100 | code-travail-epi | retenu | 2026-09-04 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `epi-verification-generale-periodique` | contexte 4 | R. 4323-101 à R. 4323-103 (consignation et conservation) | R. 4323-101 | code-travail-epi | sans_objet | 2026-09-04 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `locaux-etablissement-installations-sanitaires` | fondement | R. 4228-1 (moyens d'assurer la propreté individuelle : vestiaires, lavabos, cabinets d'aisance et, le cas échéant, douches) | R. 4228-1 | code-travail-locaux-sociaux | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `locaux-etablissement-eau-potable` | fondement | R. 4225-2 (mise à disposition d'eau potable et fraîche pour se désaltérer et se rafraîchir) | R. 4225-2 | code-travail-locaux-sociaux | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2025-06-02 | 2025-06-02 | 4 · agent + verbatim | ancrée |
| `locaux-etablissement-local-restauration` | fondement | R. 4228-22 (local de restauration dans les établissements d'au moins cinquante salariés) | R. 4228-22 | code-travail-locaux-sociaux | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2020-01-02 | 2020-01-02 | 4 · agent + verbatim | ancrée |
| `locaux-etablissement-emplacement-restauration` | fondement | R. 4228-23 (emplacement permettant de se restaurer dans les établissements de moins de cinquante salariés) | R. 4228-23 | code-travail-locaux-sociaux | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2020-01-02 | 2020-01-02 | 4 · agent + verbatim | ancrée |
| `co-activite-etablissement-protocole-securite` | fondement | R. 4515-4 (les opérations de chargement ou de déchargement font l'objet d'un document écrit dit « protocole de sécurité », remplaçant le plan de prévention) | R. 4515-4 | code-travail-co-activite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `co-activite-etablissement-protocole-securite` | contexte 1 | R. 4515-1 (champ d'application : opérations réalisées par des entreprises extérieures transportant des marchandises en provenance ou à destination d'un lieu extérieur à l'enceinte de l'entreprise d'accueil) | R. 4515-1 | code-travail-co-activite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `co-activite-etablissement-protocole-securite` | contexte 2 | R. 4515-9 (opérations répétitives : un seul protocole, applicable tant que les conditions n'ont pas subi de modification significative) | R. 4515-9 | code-travail-co-activite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
| `co-activite-etablissement-protocole-securite` | contexte 3 | R. 4515-11 (exemplaire daté et signé tenu à la disposition des comités sociaux et économiques et de l'inspection du travail) | R. 4515-11 | code-travail-co-activite | retenu | 2026-08-31 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-risques-residuels` | fondement | Arrêté du 4 novembre 1993, art. 2 (mise en œuvre d'une signalisation de sécurité pour tout risque non évité par une protection collective ou par l'organisation du travail) | Arrêté 1993-11-04 art. 2 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 2014-01-19 | 2014-01-19 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-alimentation-secours-presence` | fondement | Arrêté du 4 novembre 1993, art. 7 (alimentation de secours des signalisations qui ont besoin d'une source d'énergie) | Arrêté 1993-11-04 art. 7 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-cheminements-evacuation` | fondement | Arrêté du 4 novembre 1993, art. 9 (balisage des cheminements d'évacuation par panneaux, et panneau additionnel « Sortie de secours » sur les dégagements réglementaires non utilisés habituellement) | Arrêté 1993-11-04 art. 9 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-incendie-moyens-lutte` | fondement | Arrêté du 4 novembre 1993, art. 10 (coloration rouge des équipements de lutte contre l'incendie et panneau de localisation de leurs emplacements) | Arrêté 1993-11-04 art. 10 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-stockage-substances-dangereuses` | fondement | Arrêté du 4 novembre 1993, art. 11 (pictogramme CLP sur les tuyauteries apparentes, panneau d'avertissement sur les aires, salles et enceintes de stockage) | Arrêté 1993-11-04 art. 11 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 2014-01-19 | 2014-01-19 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-obstacles-zones-dangereuses` | fondement | Arrêté du 4 novembre 1993, art. 12 (bandes jaune et noir ou rouge et blanc sur les obstacles et les endroits dangereux des zones bâties) | Arrêté 1993-11-04 art. 12 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-entretien` | fondement | Arrêté du 4 novembre 1993, art. 15, première phrase, premier membre (moyens et dispositifs de signalisation régulièrement nettoyés, entretenus, vérifiés et réparés, remplacés si nécessaire) | Arrêté 1993-11-04 art. 15 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle` | fondement | Arrêté du 4 novembre 1993, art. 15, première phrase, second membre (signaux lumineux et acoustiques : vérification du bon fonctionnement et de la réelle efficacité, avant mise en service puis au moins chaque semestre) | Arrêté 1993-11-04 art. 15 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-alimentations-secours-annuelle` | fondement | Arrêté du 4 novembre 1993, art. 15, seconde phrase (vérification des alimentations de secours au moins une fois par an) | Arrêté 1993-11-04 art. 15 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `signalisation-etablissement-alimentations-secours-annuelle` | contexte 1 | Arrêté du 4 novembre 1993, art. 7 (ce sont les alimentations de secours que cet article impose qui sont ici vérifiées) | Arrêté 1993-11-04 art. 7 | arrete-1993-11-04-signalisation | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 1993-12-17 | 1993-12-17 | 4 · agent + verbatim | ancrée |
| `compactage-dechets-vgp-trimestrielle` | fondement | Arrêté du 5 mars 1993, art. 1er, I (presses à balles ; compacteurs à déchets — moins de trois mois au moment de l'utilisation) | Arrêté 1993-03-05 art. 1 | arrete-1993-03-05-machines | retenu | 2026-09-02 | premiere_main | ✓ | ✓ | 1993-12-01 | 1993-12-01 | 5 · première main | ancrée |
| `compactage-dechets-vgp-trimestrielle` | contexte 1 | R. 4323-23 (article habilitant, branche hors levage) | R. 4323-23 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `compactage-dechets-vgp-trimestrielle` | contexte 2 | Arrêté du 5 mars 1993, art. 3 (contenu de la vérification) | Arrêté 1993-03-05 art. 3 | arrete-1993-03-05-machines | sans_objet | 2026-09-02 | premiere_main | ✓ | ✓ | 1993-12-01 | 1993-12-01 | 5 · première main | ancrée |
| `compactage-dechets-vgp-trimestrielle` | contexte 3 | R. 4323-24 (qualification du vérificateur) | R. 4323-24 | code-travail-levage | retenu | 2026-09-02 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `compactage-dechets-vgp-trimestrielle` | contexte 4 | R. 4323-25 (consignation au registre de sécurité) | R. 4323-25 | code-travail-levage | retenu | 2026-09-01 | premiere_main | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 5 · première main | ancrée |
| `eclairage-etablissement-regles-entretien` | fondement | R. 4223-11 (l'employeur fixe les règles d'entretien périodique du matériel d'éclairage ; règles consignées dans un document communiqué aux membres du CSE) | R. 4223-11 | code-travail-eclairage | retenu | 2026-09-02 | agent_verbatim | ✓ | ✓ | 2018-01-01 | 2018-01-01 | 4 · agent + verbatim | ancrée |
| `eclairage-etablissement-regles-entretien` | contexte 1 | R. 4224-17 dernière phrase (le dossier de maintenance des lieux de travail regroupe notamment le document prévu en matière d'éclairage à l'article R. 4223-11) | R. 4224-17 | code-travail-portes | retenu | 2026-09-01 | agent_verbatim | ✓ | ✓ | 2008-05-01 | 2008-05-01 | 4 · agent + verbatim | ancrée |
