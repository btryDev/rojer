# Réponse absente : analyse avant décision — 2026-09-27

Branche `lot/couverture-reponse-absente`. Demandée par la propriétaire avant
qu'elle tranche : « vérifier qu'on ne fait pas de rustine et qu'on a bien
regardé le problème sous tous les angles ». Cette analyse porte sur deux points :
(b), le silence sur les matières de R. 4227-22, et `categorieErp` null, pour
lequel l'option B avait été retenue puis suspendue.

**Ce document ne contient aucun code.** Le commit `e6b0fb6`, qui code l'option
(i) pour les matières et la marque `type_erp`, reste sur la branche. Il n'est ni
mergé ni annulé.

**Méthode.** Les chiffres viennent tous d'un appel du moteur, collé depuis la
sortie. `main` désigne le moteur de `837b147`, recopié tel quel dans un fichier
temporaire ; `(i)` désigne celui de la branche. Les textes ont été relus sur
l'API Légifrance (PISTE, environnement sandbox) par
`src/lib/legifrance/client.ts`, sans passer par la mémoire. Chaque passage
sépare **le texte dit** de **lecture**.

---

## 0. En une page

- **Le défaut n'est pas « null écarte » : il en a trois, qui se cumulent.**
  1. Aucune politique de l'absence n'est déclarée en un seul endroit. Chaque évaluateur tranche seul :
     - 11 points de décision ;
     - 3 sens : retient et le dit, retient sans le dire, écarte ;
     - 4 canaux de marque : `sansReponse`, `effectifAConfirmer`, texte de `raisons`, rien.
  2. Deux questions dont la réponse fait apparaître des lignes (matières, chiffons) ne sont posées **qu'à la fiche**, et rien ne ramène un dossier ancien vers sa fiche.
  3. Une ligne retenue « à confirmer » **n'est marquée ni dans le calendrier, ni dans le dossier PDF, ni dans le ZIP, ni dans le MCP**. Seul l'écran des états permanents porte la marque avec son lien ; l'écran du registre en montre le texte, sans lien (§ 6.3, amendé après contre-lecture).
- **Une rustine :** l'option (i) seule, comme l'option B seule. Toutes deux ajoutent des lignes datées que le calendrier affiche comme **certaines**, parce que la marque n'y arrive pas :
  - (i) ajoute une échéance semestrielle à chaque petit établissement muet sur les matières ;
  - B ajoute jusqu'à 9 lignes datées à un ERP sans catégorie, dont une vérification **hebdomadaire**.

  Elles remplacent un silence par une affirmation fausse.
- **Plus grave que les deux cas instruits, trouvé en route :** au parcours de création, « ERP ? » vaut **non** par défaut et le bouton « Non » s'affiche déjà sélectionné (§ 6.2, A2). Un dirigeant qui ne répond pas devient non-ERP en silence, et toutes les obligations ERP disparaissent.
- **Recommandation (§ 7), dans cet ordre :**
  1. porter la marque « à confirmer » sur toutes les surfaces ;
  2. poser les questions là où l'on répond, et relancer les dossiers muets ;
  3. déclarer la politique de l'absence une fois, et la garder par un test ;
  4. seulement ensuite, retenir « à confirmer » : option (i) pour les matières, et pour la catégorie, B si elle est encore nécessaire.

  Compter d'abord en production, en lecture seule, les ERP sans catégorie : la requête est au § 5.

---

## 1. Le texte, lu en entier

Relevé par l'API le 2026-09-27. Les identifiants `LEGIARTI` sont ceux que l'API a rendus.

**Le texte dit.**

- **R. 4227-34** (en vigueur depuis le 2008-05-01, LEGIARTI000018532067) : « Les établissements dans lesquels **peuvent** se trouver occupées ou réunies habituellement **plus de cinquante** personnes, ainsi que ceux, **quelle que soit leur importance**, où sont **manipulées et mises en œuvre** des matières **inflammables mentionnées à l'article R. 4227-22** sont équipés d'un système d'alarme sonore. »
- **R. 4227-22** (2008-05-01, LEGIARTI000018532097) : « Les locaux ou les emplacements dans lesquels sont entreposées ou manipulées des substances ou préparations **classées explosives, comburantes ou extrêmement inflammables**, ainsi que des matières **dans un état physique susceptible d'engendrer des risques d'explosion ou d'inflammation instantanée**, ne contiennent aucune source d'ignition […]. Ces locaux disposent d'une ventilation permanente appropriée. »
  - L'article ne fixe **aucune quantité** et **aucun seuil**.
- **R. 4227-37**, version en vigueur (du 2011-11-10 au 2027-01-01, LEGIARTI000024769379, état `ABROGE_DIFF`) : « Dans les établissements mentionnés à l'article R. 4227-34, une consigne de sécurité incendie est établie et affichée de manière très apparente : 1° […] ; 2° […]. **Dans les autres établissements, des instructions sont établies, permettant d'assurer l'évacuation des personnes présentes** dans les locaux dans les conditions prévues au 1° de l'article R. 4216-2. »
  - La version au 2027-01-01 (LEGIARTI000052645197) garde le champ et renvoie désormais à R. 141-7 du CCH pour les « autres établissements ».
- **R. 4227-38** : le contenu de la consigne, en huit points.
- **R. 4227-39** : « Ces exercices et essais périodiques ont lieu **au moins tous les six mois**. Leur date et les observations […] sont consignées sur un registre tenu à la disposition de l'inspection du travail. »
- **R. 4411-6** (depuis le 2015-06-06) : le Code du travail classe désormais les substances d'après l'annexe I du règlement CLP n° 1272/2008.
  - R. 4227-22 garde le vocabulaire de classement d'avant (« classées […] extrêmement inflammables »). *[Déplacé en lecture après contre-lecture : dire que ce n'est « plus une catégorie de classement » est une inférence — le CLP connaît « gaz extrêmement inflammable », H220.]*

**Lecture.** Aucune de ces lectures n'est vérifiable sur Légifrance.

- « Matières **inflammables** mentionnées à R. 4227-22 » vise, dans l'énumération de R. 4227-22, ce qui est inflammable :
  - les « extrêmement inflammables » ;
  - les matières dans un état physique à risque d'inflammation instantanée.

  Les explosifs et les comburants non inflammables resteraient hors du champ de R. 4227-34. Le code encode déjà cette lecture sans la dire.
- La correspondance entre « extrêmement inflammable » et le CLP relève de l'annexe VII du CLP, un texte de l'Union qui n'est pas sur Légifrance. Par exemple :
  - gaz inflammables de catégorie 1 (H220) ;
  - aérosols de catégorie 1 (H222) ;
  - liquides inflammables de catégorie 1 (H224).
- Exemples de la cible, tous à titre de **lecture**, avec la ligne la plus probable :

  | Exemple | Lecture la plus probable |
  |---|---|
  | Gaz butane, propane ou naturel alimentant une cuisson (restaurant) | « Extrêmement inflammable » au sens ancien. Est-il « manipulé et mis en œuvre » par un brûleur ? Discutable ; l'arrêté de R. 4227-27 traite séparément les installations « industrielles » de gaz |
  | Aérosols (laques en salon de coiffure, dépoussiérants, désinfectants) | H222 pour beaucoup |
  | Farine en suspension (boulangerie) | « état physique susceptible d'engendrer des risques d'explosion » |
  | Alcool de flambage | Éthanol : « facilement inflammable » au sens ancien, donc R. 4227-24 et non R. 4227-22 |
  | Huiles de cuisson | Aucune classe d'inflammabilité. Elles relèvent de R. 4227-26 (chiffons gras), pas de R. 4227-22 |
  | Produits d'entretien courants | Majoritairement non classés extrêmement inflammables |

- **Part de la cible : aucune donnée.** Rojer ne stocke ni NAF exploitable pour ce champ ni inventaire de produits. Tout pourcentage serait inventé. Ce qu'on peut dire : le cas n'est pas rare en restauration (gaz, flambage) ni en coiffure (aérosols), il est marginal en bureau.

**Un angle jusqu'ici non vu : le reste de R. 4227-37.** Hors du champ de R. 4227-34, le texte exige des **instructions d'évacuation**. Aucune obligation du référentiel ne les porte : `grep "instructions sont établies"` ne trouve rien dans `conformite/*.ts`, et la phrase ne figure que dans la description de la consigne (`incendie.ts:246`).

Tout établissement de travail doit donc **l'un ou l'autre**, la consigne affichée ou les instructions. Aujourd'hui, un bureau muet ne reçoit ni l'une ni l'autre. Ce trou existe **quelle que soit** la décision sur le silence. Il fait de la consigne et des instructions une **paire**, au sens d'`engine.ts` (conditions d'équipement) : le membre général survit au silence.

Le corpus relève un second manque (`arrete-1993-11-04-signalisation.ts:416`) : l'**installation** de l'alarme sonore, objet même de R. 4227-34, n'est portée par aucune obligation.

---

## 2. Comment Rojer peut-il savoir ?

`/etablissements/nouveau` réutilise le formulaire de la fiche (`app/etablissements/nouveau/page.tsx:16`) : seul le premier dossier passe par le parcours de création.

| Attribut lu par le moteur | Parcours de création | Fiche | null sur un dossier neuf | Colonne créée le |
|---|---|---|---|---|
| estERP / IGH / habitation | booléen, **« non » par défaut** (`onboarding/schema.ts:95-98`, `components/onboarding/types.ts:62`) | oui | impossible — mais le silence vaut « non » (§ 6.2, A2) | — |
| typeErp, categorieErp | exigés si ERP (`onboarding/schema.ts:184-196`) | exigés (`etablissements/schema.ts:362-374`) | non (validation Zod seule, sans contrainte CHECK en base) | 2026-04-21 |
| personnesPresentesHabituellement | seulement si `nombreDePersonnesADemander`, alors exigé (`onboarding/schema.ts:266-284`) | visible pour tous, exigé dans le même cas | oui hors de ce cas | 2026-08-25 |
| **manipuleMatieresR422722** | **non posé** depuis le 2026-09-01 (`onboarding/actions.ts:111-112`) | trois états, avec « Je ne sais pas encore » (`EtablissementForm.tsx:262`) | **toujours** | 2026-08-25 |
| comporteLocauxSommeilPublic | types O, R, U, J, REF, OA ; oui/non exigé (`onboarding/schema.ts:246-259`) | mêmes types, exigé | hors liste, remis à null | 2026-09-01 |
| **chiffonsImpregnes** | **non posé** | trois états (`EtablissementForm.tsx:305`) | **toujours** | 2026-09-27 |
| classeIgh, familleHabitation | retirés le 2026-09-03 | retirés | toujours | — (aucune obligation ne les lit) |
| effectifSurSite, Entreprise.effectif | exigés | exigé / fiche entreprise | non (NOT NULL) | — |

**Ce qui ramène un dossier ancien vers sa fiche.** Uniquement le lien « Répondre sur la fiche » d'une ligne d'état permanent (`LigneEtat.tsx:130-135`). Il n'existe que pour les quatre valeurs de `QuestionSansReponse`, et ne couvre aucune ligne datée. `chantiers-ouverts.md:821` : « rien ne les y amène ».

**Déduire sans deviner ?**

- `deduction-erp.ts` n'est « appelé par aucun écran » (`:57-58`).
- Le NAF n'est lu ni pour la catégorie ni pour les matières (`onboarding/schema.ts:172-173`). Le choix est écrit pour les chiffons : « POURQUOI UNE QUESTION ET PAS LE CODE NAF » (`incendie.ts`, notesInternes de l'obligation chiffons).
- Aucune déduction ne part des équipements déclarés. Un `APPAREIL_CUISSON_ERP` au gaz ne ferait d'ailleurs pas conclure : le § 1 montre que le gaz de cuisson reste une lecture.

**Conclusion.** Pour les matières, rien de ce que Rojer sait ne permet de conclure dans un sens ou dans l'autre sans deviner. Le défaut principal est **« la question n'est pas posée là où l'utilisateur répond »**. « null écarte » en est la conséquence.

Pour `categorieErp`, c'est l'inverse : la question est exigée partout où elle est posée. Le null est une **anomalie de données**, dossier ancien ou import, qu'aucune contrainte en base n'interdit.

---

## 3. Les précédents

Détail et citations : table B de la contre-recherche, reprise ici en abrégé. Les références sont de la forme fichier:ligne.

| Sujet | Décision | Argument écrit | Lignes | Posée à la création ? |
|---|---|---|---|---|
| Règle générale (ADR-022 § 7) | null ≠ non ; « à confirmer » ; allègement refusé sur le silence | `adr/022:195-198` | — | — |
| Locaux à sommeil (2026-09-09, puis 2026-09-20, propriétaire) | Hors des types plausibles, **rien** ne s'applique, même un « oui ». Dans ces types, le silence retient « à confirmer » | « la question ne leur étant posée que sur un écran que personne n'ouvre » (`version-moteur.ts:67-68`) ; coût nommé : l'auberge typée N (`engine.ts:340-342`) | datées (SDI annuel, visite de commission quinquennale, visites R de 4ᵉ catégorie) et permanentes | oui, réponse due |
| Chiffons (C45, 2026-09-27) | Seul un « non » déclaré retire | « celui qui lit une ligne qu'il ne doit pas a une chance de s'en apercevoir » (`engine.ts:291-298`) | état permanent | **non** |
| Famille d'habitation, classe d'IGH (2026-09-01 et 2026-09-03) | Le silence retient « à confirmer » | « les écarter retirerait en silence » (`engine.ts:224-226`, `162-179`) | aucune obligation | retirée |
| Personnes présentes (2026-09-02 et -03, propriétaire) | Borne basse ; ERP « à confirmer » ; travail seul écarté | l'effectif salarié EST le total (ADR-022 § 7) | consigne (permanente), exercice (semestriel) | conditionnelle, **revenue le 2026-09-20** : « un restaurant de six salariés… porte une consigne… que rien n'établit » (`onboarding/schema.ts:140-145`) |
| Effectif du site et de l'entreprise (C37) | Retient le site et le dit (`effectifAConfirmer`) | `effectif-entreprise.ts:18-19` | états permanents | oui |
| Groupe électrogène (C41) | `non_infirmee` : le silence retient les deux rythmes | `electricite.ts:24-27` | **datées** (bimensuelle, mensuelle) | question d'équipement |
| Catégorie ERP (2026-09-03) | L'absence écarte, « et doit le rester » | « une catégorie d'ERP se déclare toujours, elle » (`engine.ts:176-179`) | datées et permanentes | exigée |
| Type ERP | `types` : écarte ; `typesExclus` : retient | « ne pas savoir ne retire jamais une ligne » (`engine.ts:494-498`) | visites de commission | exigé |
| Conditions d'équipement (2026-08) | opt-in (non satisfaite sur le silence) / opt-out (`non_infirmee` imposée aux criticités ≥ 4 qu'on conditionne après coup) | « une sur-application visible… vaut toujours mieux qu'un faux négatif muet » (`regles-matching.md:250-257`) | variables | — |

**La règle commune réelle.** Elle est écrite : l'incertitude ne réduit jamais la couverture, parce que l'erreur doit rester visible par qui la subit. Mais **deux critères implicites** la corrigent au cas par cas, et aucun document ne les formule :

1. **Poser la question là où la réponse change des lignes.** C'est ce critère qui a fait revenir le nombre de personnes à la création le 2026-09-20 (`onboarding/schema.ts:145`). Il n'a été appliqué ni aux matières ni aux chiffons.
2. **Un silence que le produit a lui-même organisé ne vaut pas « on ne sait pas ».** C'est l'argument de l'arbitrage sur le sommeil : le type déclaré a « répondu ».

C'est cette absence de règle formulée qui est le problème de fond. Chaque lot a refait l'arbitrage, et les documents ont gardé des constats devenus faux (§ 6.4).

---

## 4. Rustine ou correction : les options

Colonnes : ce que voit le dirigeant / bruit au calendrier / risque de silence / coût / cause ou symptôme.

**Matières (b)**

| Option | Ce que voit le dirigeant | Bruit | Silence restant | Coût | Traite |
|---|---|---|---|---|---|
| (iii) Statu quo, documenté | rien | 0 | **oui** : l'établissement qui manipule et n'a pas répondu n'a ni consigne ni exercices (ni instructions, § 1) | nul | rien |
| (i) Retenir « à confirmer » (`e6b0fb6`) | consigne « à confirmer » aux états permanents, avec un lien ; **exercice semestriel sans marque au calendrier** | +1 ligne datée par petit établissement muet | non | moteur 4 → 5, régénération du parc | le symptôme ; **affirmation fausse au calendrier** tant que la marque n'y arrive pas |
| (ii) (i) + question à la création (trois états) + relance des muets | idem, puis la réponse | transitoire | non | (i) + écran de création | la cause pour les dossiers neufs |
| (iv) « À qualifier » sans ligne datée : une ligne d'état permanent « Consigne affichée **ou** instructions d'évacuation, selon votre réponse », qui nomme les exercices semestriels ; la ligne datée ne naît qu'au « oui » | une question visible, aucune date fausse | 0 ligne datée | l'exercice n'est pas **daté** tant que la réponse manque, mais il est **nommé** | modèle : un état « à qualifier » ; encoder les instructions (R. 4227-37 al. 2) | la cause, et le trou des instructions |
| (v) Question obligatoire au premier usage (barrière sur le tableau de bord pour les questions qui changent des lignes) | une question, une fois | 0 | non, une fois la réponse donnée | un écran ; aucune migration | la cause, dossiers anciens compris |

**Catégorie ERP null**

| Option | Ce que voit le dirigeant | Bruit (restaurant N, 10 équipements du seed) | Coût | Traite |
|---|---|---|---|---|
| Statu quo | un bandeau d'indétermination sur 3 écrans ; ni le tableau de bord ni le score ne le montrent (§ 6.2, A3) | 0 | nul | rien |
| A — 5ᵉ « à confirmer » | +3 lignes (1 datée) | faible | moteur 5 | le symptôme ; un vrai N3 reste muet |
| B — union N1 à N5 « à confirmer » | **+12 lignes (9 datées)**, dont une vérification **hebdomadaire** d'alarme, EL 18, 3 visites de commission de périodicités incompatibles | fort | moteur 5 | le symptôme ; affirmation fausse au calendrier sans la marque |
| (v) Question au premier usage + contrainte en base (`estERP ⇒ categorieErp NOT NULL`) après relance | une question | 0 | un écran, une migration additive après nettoyage | **la cause** |

---

## 5. Chiffres

**Base locale `duerp_cov`** : Docker 5433, base créée pour ce lot, `prisma migrate deploy`, puis `seed-dossier-complet`. Elle contient un seul dossier, un restaurant N5 de 9 salariés, 92 personnes déclarées, matières « non », 10 équipements. Les variantes simulent un dossier ancien : le même, avec l'attribut mis à null.

```
base duerp_cov : 1 établissement(s)
- tel quel                                 main : 83 lignes (32 datées) | option (i) (branche e6b0fb6) : +0 (0 datées) −0
- matières null                            main : 83 lignes (32 datées) | option (i) (branche e6b0fb6) : +0 (0 datées) −0
- matières null, personnes null            main : 83 lignes (32 datées) | option (i) (branche e6b0fb6) : +0 (0 datées) −0
- matières null, personnes 30 déclarées    main : 81 lignes (31 datées) | option (i) (branche e6b0fb6) : +2 (1 datées) −0 : incendie-travail-consigne-affichee, incendie-travail-exercice-semestriel
- non ERP (travail seul), matières null    main : 64 lignes (16 datées) | option (i) (branche e6b0fb6) : +2 (1 datées) −0 : incendie-travail-consigne-affichee, incendie-travail-exercice-semestriel
- catégorie null                           main : 80 lignes (31 datées) | option (i) (branche e6b0fb6) : +0 (0 datées) −0 | option A (N5) : +3 (1 datées) −0 : incendie-erp-pe4-entretien-installations-techniques, incendie-erp-5-instruction-personnel, incendie-erp-5-consignes-affichees | option B (union) : +12 (9 datées) −0 : elec-erp-cat1-4-annuelle@équip., elec-erp-presence-personne-qualifiee, incendie-erp-ssi-triennale@équip., incendie-erp-alarme-verification-hebdomadaire@équip., incendie-erp-visite-commission-cat1-2-triennale, aeration-erp-filtres-visite-periodique@équip., cuisson-gaz-installations-annuelle@équip., incendie-erp-visite-commission-cat3-quinquennale, incendie-erp-visite-commission-cat4-quinquennale, incendie-erp-pe4-entretien-installations-techniques, incendie-erp-5-instruction-personnel, incendie-erp-5-consignes-affichees
- type null                                main : 83 lignes (32 datées) | option (i) (branche e6b0fb6) : +0 (0 datées) −0
```

**Qui l'option (i) touche** (grille, sans équipement) :

```
bureau non ERP, 3 salariés                 consigne/exercice — main : non/non | (i) : oui/oui [marque : matieres_r4227_22,matieres_r4227_22] | (i) avec « non » : non/non
bureau non ERP, 50 salariés                consigne/exercice — main : non/non | (i) : oui/oui [marque : matieres_r4227_22,matieres_r4227_22] | (i) avec « non » : non/non
bureau non ERP, 51 salariés                consigne/exercice — main : oui/oui | (i) : oui/oui [marque : —,—] | (i) avec « non » : oui/oui
restaurant N5, 8 sal., personnes null      consigne/exercice — main : oui/oui | (i) : oui/oui [marque : raison,raison] | (i) avec « non » : oui/oui
restaurant N5, 8 sal., personnes 40        consigne/exercice — main : non/non | (i) : oui/oui [marque : matieres_r4227_22,matieres_r4227_22] | (i) avec « non » : non/non
commerce M5, 4 sal., personnes 20          consigne/exercice — main : non/non | (i) : oui/oui [marque : matieres_r4227_22,matieres_r4227_22] | (i) avec « non » : non/non
restaurant N3, 8 sal., personnes null      consigne/exercice — main : oui/oui | (i) : oui/oui [marque : —,—] | (i) avec « non » : oui/oui
```

Deux populations sont touchées :

- tout établissement de travail **non ERP** de moins de 51 personnes ;
- tout ERP qui a **déclaré** 50 personnes ou moins.

Dans les deux cas, la question des matières est restée muette, soit, selon le § 2, tout dossier qui n'a jamais ouvert sa fiche. Le restaurant N5 muet sur le nombre de personnes porte **déjà** ces deux lignes sur `main`, avec une marque « à confirmer » qui n'existe que dans le texte de la raison.

**Le parc de production n'a pas été lu.** Deux requêtes en lecture seule donneraient les vrais chiffres ; la propriétaire peut les lancer :

```sql
SELECT count(*) FROM "Etablissement" WHERE "estERP" AND ("categorieErp" IS NULL OR "typeErp" IS NULL);
SELECT count(*) FROM "Etablissement" WHERE "estEtablissementTravail" AND "manipuleMatieresR422722" IS NULL
  AND ("personnesPresentesHabituellement" <= 50 OR (NOT "estERP" AND "effectifSurSite" <= 50));
```

---

## 6. Plus profond

### 6.1 Cause racine : aucune politique de l'absence déclarée une seule fois

Relevé dans `engine.ts` (branche) :

| Point de décision | null → |
|---|---|
| `evaluerErp`, `categories` | écarte |
| `evaluerErp`, `types` | écarte |
| `typesExclus` | retient ; marque `type_erp` depuis `e6b0fb6`, sinon texte seul |
| `evaluerIgh`, `classes` | retient, texte seul |
| `evaluerHabitation`, `familles` | retient, texte seul |
| personnes présentes | ERP : retient, texte seul ; travail seul : écarte (règle écrite) |
| matières | `main` : écarte ; branche : retient + `sansReponse` |
| sommeil `true` | types plausibles : retient + `sansReponse` ; type null : retient, texte seul ; hors liste : écarte |
| sommeil `false` (allègement) | écarte (règle écrite) |
| chiffons | retient + `sansReponse` |
| seuil d'entreprise | retient + `effectifAConfirmer` |
| conditions d'équipement | par type : opt-in écarte ; opt-out retient, **sans marque** |

**Une table unique empêcherait-elle la prochaine divergence ?** En partie, et c'est la partie qui compte.

Une table `attribut → { sens: retient_a_confirmer | ecarte_par_regle_ecrite, question, domaine, portée de l'écart }` devrait être **indexée par les clés nullables d'`EtablissementMatching`**, au moyen d'un type projeté. Deux effets :

- un attribut neuf ne compilerait pas sans que le sens de son absence soit déclaré ;
- la garde générique lirait ses domaines de valeurs dans la table, sans rien recopier.

Elle ne suffirait pas seule : la personne présente (borne basse) et le sommeil (types plausibles) gardent une logique propre, qu'une table n'exprime pas. C'est la **garde**, en appelant le moteur, qui vérifie que chaque évaluateur tient ce que la table déclare.

Coût raisonnable :

- un module ;
- six branches null qui lisent la table pour leur marque ;
- un test paramétré sur 316 profils × 8 attributs. L'inventaire tourne en 1,4 s (`time` : 1,43 s user).

Les conditions d'équipement ont déjà leur politique, déclarée par le type de condition. Il leur manque seulement la marque de l'opt-out.

### 6.2 Au-delà du moteur

Relevé par une recherche en lecture seule, chaque point vérifié à la ligne citée.

| # | Où | Sur null ou sans réponse |
|---|---|---|
| **A2** | `components/onboarding/types.ts:62` (`estERP: false`), `StepTypologie.tsx:123` (« Non » actif par défaut), `onboarding/schema.ts:96` (`.default(false)`) | **Le dossier devient non-ERP sans réponse** : accessibilité « non applicable » (`sidebar-nav.ts:489`), matrice des modules (`dashboard/obligations.ts:141`), aucune obligation ERP. Idem pour IGH et habitation. **Vérifié à la lecture de ces trois lignes.** |
| A1 | `app/etablissements/[id]/equipements/page.tsx:88` | `codeNaf: etab.codeNaf` sans repli sur celui de l'entreprise, alors que le formulaire promet ce repli (`EtablissementForm.tsx:141`) : les suggestions **sectorielles** (froid, hotte, cuisson, éclairage de sécurité par secteur) disparaissent pour un second établissement sans NAF propre ; les règles de base de `suggererEquipements` n'en dépendent pas (`pre-remplissage.ts:273+`) |
| A3 | `dashboard/score.ts:173-186` | les indéterminations de `couverture.ts` (catégorie null) n'entrent pas dans l'indice ; le tableau de bord n'affiche pas `BandeauCouverture` |
| A5 | `mcp/tools.ts:128-139` | `.filter(Boolean)` sur `[typeErp, categorieErp]` : le MCP dit « ERP » sans signaler le manque |
| A6 | `pdf/builders.ts:389`, `controle-zip/route.ts:195,652` | le registre et le README du ZIP ignorent la catégorie manquante ; seul `01_Dossier_conformite.pdf` imprime les indéterminations |
| A7 | widget établissement, `pdf/builders.ts:133`, `guide/page.tsx:67` | « ERP » sans « catégorie à renseigner » |

### 6.3 Les « à confirmer » existants n'atteignent pas l'utilisateur

- **Aucune colonne ne persiste la marque.** `Verification` n'a aucun champ à cet effet (`schema.prisma`), et `reconciliation.ts` n'écrit pas `raisons`.
- **Calendrier.** La page lit les lignes persistées (`calendrier/queries.ts:56`) et n'affiche que `libelleObligation`. Son propre commentaire, à `calendrier/page.tsx:1021-1030`, affirme le contraire : la ligne serait « servie « à confirmer » ». **Il est faux.**
- **Dossier PDF, et donc ZIP.** `mentions-etats-permanents.ts:195-209` ne recopie ni `aConfirmer` ni `questionsSansReponse`. Les vérifications sont imprimées par leur seul libellé.
- **Registre PDF.** `builders.ts:414` copie `raisons`, mais `RegistreDocument` ne les imprime pas.
- **MCP.** L'outil `verifications` lit les lignes persistées, sans marque.
- **Guide.** `effectifAConfirmer` est affiché par domaine ; `sansReponse` n'est pas lu.
- **Écran des états permanents.** Seul à tout porter, phrase et lien (`LigneEtat.tsx:104-136`). Le widget ne rend qu'un préfixe « À confirmer · ».
- **Écran du registre de sécurité** *(ajouté après contre-lecture)* : il affiche les `raisons`, donc le texte « à confirmer » (`TeteFicheRegistre.tsx:53-58`), sans lien vers la fiche. Mais `SectionDue` ne porte que `section` et `raisons` et perd `sansReponse` (`registre/composition.ts`), et le PDF du registre n'imprime pas les raisons.
- **Conséquence :**
  - les lignes datées retenues par prudence s'affichent comme **certaines** sur toutes les surfaces sauf le guide ;
  - l'exercice semestriel d'un ERP muet sur le nombre de personnes est dans ce cas dès aujourd'hui, sur `main` ;
  - il en va de même du groupe électrogène (opt-out, bimensuel et mensuel), du SDI annuel et des visites de commission.

### 6.4 Pourquoi 3 au lieu de 22, et quels autres constats sont faux pour la même raison

La contre-vérification avait appelé le moteur sur **un** profil : restaurant N5, sans équipement. Sur ce profil, la catégorie null perd bien 3 obligations. Sur 40 profils ERP, sans équipement ou avec toutes les catégories, **les 40** en perdent au moins une. ~~et jusqu'à 18 lignes (ERP O, 8 salariés, parc complet)~~ *[corrigé après contre-lecture : passer d'une catégorie déclarée à null fait perdre **au plus 8 lignes** (440 profils recomptés : 22 types × 5 catégories × 2 parcs × 2 moteurs, aucun à 0) ; 18 est l'union N1 à N5 absente sous null pour un ERP O au parc complet, c'est-à-dire ce que l'option B **ajouterait**.]*

Constats de la documentation recomptés **en appelant le moteur** (130 profils × 2 parcs, `837b147` et `e6b0fb6`) :

| Source | Affirmation | Verdict |
|---|---|---|
| `.claude/CLAUDE.md:369`, `adr/022:217` | le non-renseigné, « appliqué partout sauf à un attribut » / « la seule entorse » | **FAUX** : catégorie ERP et `types` (hôtel PO) écartent aussi |
| `CLAUDE.md:376-379`, `chantiers-ouverts.md:32-34`, `dette-…:177-180`, `adr/022:217-221`, `onboarding/schema.ts:149-150`, décision A4 | matières absentes « ne retire rien aujourd'hui » | **FAUX** depuis le 2026-09-03 (6 profils, 2 lignes) |
| `CLAUDE.md:165-167` | bureau de 6, 12 et 55 personnes : 39, 40 et 43 obligations | **FAUX** : 42, 43, 46 sur `main` |
| `CLAUDE.md:254-258` | restaurant N3 alarme + CTA « 34 → 36 », 5ᵉ « 37 » | **FAUX** (périmé) : 51 et 50 |
| `engine.ts:494-498` *(ajouté après contre-lecture)* | « dans les deux cas, ne pas savoir ne retire jamais une ligne » | **FAUX** pour `types`, qui écarte sur null (`engine.ts:128`) |
| `regles-matching.md:52,58-60` | « 6 obligations ascenseurs », un seul régime positif ailleurs | **FAUX** : 17 obligations à plusieurs régimes |
| `regles-matching.md:186-190` | registre de sécurité ancré à un équipement | **FAUX** (périmé) : présent sans équipement |
| `froid.ts:128` | « la seule réponse qui retire… est le oui… hermétiquement scellés » | **FAUX** : « sous le seuil » retire aussi (0 ligne) |
| `chaine-onboarding…:123` | sommeil « sans effet hors 5ᵉ » | **FAUX** : N4 type R |
| `chaine-onboarding…:117` | `estIGH` « nul sans équipement » | **FAUX** : +charge calorifique (126 profils) |
| `types.ts:61`, `types.ts:114`, `types.ts:127`, `regles-matching.md:322-325`, `froid.ts:109`, CH 58, 170/89/67/14, personnes présentes | — | VRAI |

Le motif commun des faux : un constat **chiffré sur un profil**, ou écrit avant un changement de moteur, et jamais recompté. Le correctif de méthode est la garde du § 6.1 : elle recompte à chaque exécution de la suite. Le correctif des textes est de les rayer et de les dater. **`.claude/CLAUDE.md` n'est pas modifié par ce lot** : la correction proposée est au § 8, à appliquer par la propriétaire.

---

## 7. Recommandation

Dans cet ordre, parce que chaque étape rend la suivante vraie.

1. **Porter la marque « à confirmer » partout** (§ 6.3) : calendrier, dossier PDF (vérifications et états permanents), ZIP, MCP, guide (`sansReponse`). Sans cette étape, **toute** option qui retient une ligne (i, A, B) fabrique une affirmation fausse. Deux manières :
   - calculer la marque au rendu, en appelant le moteur comme le font déjà les états permanents ;
   - la persister sur `Verification`, par une migration additive.

   Je recommande le calcul au rendu : aucune migration, et une seule source.
2. **Corriger A2** : « ERP ? » sans réponse par défaut, avec une réponse exigée. C'est le silence le plus large du produit.
3. **Poser les questions là où l'on répond** : matières et chiffons au parcours de création, en trois états. C'est le critère du 2026-09-20 (§ 3). Ensuite, **une relance unique des dossiers muets** (option v), pour toute question dont la réponse change des lignes, catégorie ERP comprise.
4. **Déclarer la politique de l'absence** (§ 6.1), avec la garde générique paramétrée par elle.
5. **Alors seulement, retenir « à confirmer » :**
   - **matières** : (i), la ligne datée portant désormais sa marque ; ou (iv) si la propriétaire préfère ne dater qu'au « oui ». J'incline pour (i) : elle reste fidèle à la règle écrite, et le bruit est borné par la relance ;
   - **catégorie** : compter d'abord en production (§ 5). Si le compte est nul, la contrainte en base suffit. Sinon, B, avec des marques visibles, jusqu'à la réponse.

   Dans les deux cas, `VERSION_MOTEUR_CALENDRIER` passe à 5.
6. **Encoder les instructions d'évacuation** de R. 4227-37 al. 2, obligation certaine de tout établissement hors du champ, et l'installation de l'alarme de R. 4227-34. Ce sont deux manques que ce travail a mis au jour, indépendants du silence.

Sur `e6b0fb6` : à garder pour l'étape 5. Le livrer seul serait la rustine décrite au § 4.

**Deux précisions de la contre-lecture.**
- **L'étape 1 doit inclure le registre de sécurité.** Il passe par le même `matchTypologie` avec `champR422734` (`registre/sections.ts:171,195,206`) : sous (i), un bureau non ERP de 3 personnes muet sur les matières reçoit 3 fiches de plus (`service-securite-evacuation`, `exercices-themes`, `exercices-comptes-rendus`). Le § 5 ne les comptait pas.
- **Le bruit n'est « borné par la relance » que pour les lignes sur lesquelles personne n'a agi.** Une ligne qui porte un rapport, une action ou un statut réalisé est archivée, jamais supprimée, quand la réponse devient « non » (`calendrier/actions.ts:188-204`, `:316`).

## 8. Corrections de texte proposées (non appliquées)

- `.claude/CLAUDE.md` § « Règle du non-renseigné » : rayer « appliquée partout sauf à un attribut » et « elle ne retire rien aujourd'hui ». Écrire à la place : « appliquée partout sauf à la catégorie et au type d'ERP (`types`), où l'absence écarte ; et, jusqu'au 2026-09-27, aux matières de R. 4227-22, dont le silence retirait R. 4227-37 et -39 aux établissements de travail seul sous le seuil depuis le 2026-09-03 ». Rayer aussi les comptes 39/40/43 et 34/36/37 (§ 6.4).
- `calendrier/page.tsx:1021-1030` et `guide/chez-vous.ts:122` : le commentaire affirme une marque que le calendrier ne porte pas.
- `froid.ts:128`, `regles-matching.md:52,58-60,186-190` : les autres constats faux du § 6.4.


---

## 9. Contre-lecture neutre (2026-09-27)

Un sous-agent a été briefé sur l'observable : ouvrir chaque `fichier:ligne` cité, recompter les chiffres en appelant les deux moteurs, comparer les verbatims au corpus, chercher un angle oublié.

- **Vérifié** : les citations des §§ 1 à 3, 6.2 et 6.3, sauf les écarts ci-dessous ; la grille et la base locale du § 5, recomptées à l'identique ; les verbatims de R. 4227-22, -34 et -37 (version 2011), mot pour mot.
- **Écarts, corrigés dans le texte ci-dessus** (rayés ou marqués « après contre-lecture ») :
  - « 18 lignes » : la perte maximale est de 8 lignes, et 18 est ce que B ajouterait ;
  - A1 surévalué ;
  - le registre de sécurité montre le texte « à confirmer » ;
  - la citation de R. 4227-39 était tronquée ;
  - une inférence sur R. 4411-6 figurait sous « le texte dit » ;
  - le commentaire `engine.ts:494-498` est faux ;
  - la ligne citée de `LigneEtat.tsx` était décalée.
- **Non vérifiable dans le dépôt** : la version 2027 de R. 4227-37 et R. 4411-6 ne sont pas au corpus. Ils ont été lus sur l'API, dans les identifiants cités au § 1.
- **Angles oubliés, ajoutés au § 7** : le registre de sécurité, et l'archivage des lignes qui portent une trace.
