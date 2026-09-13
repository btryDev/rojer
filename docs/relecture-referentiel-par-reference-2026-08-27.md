# Le référentiel déplié — 27 août 2026

Une ligne par couple **obligation × référence**. Le dossier de relecture PDF
n'imprime qu'une référence par obligation — celle qui la fonde — et replie les
autres dans un « + N réf. ». Ce document déplie les 155, les rapproche du
registre de dépouillement par la clé canonique `article`, et porte en dernière
colonne les constats qu'une machine peut établir sans lire les textes.

Généré par `pnpm relecture` (`scripts/export-relecture.ts`). Référentiel
`2026-08-27.1`. Le CSV complet — avec les URL, le verbatim relevé, le champ
d'application et les conditions — s'obtient par `pnpm relecture --csv`.

**Ce document n'est pas une relecture.** Il dit ce sur quoi le référentiel
s'appuie, et ce qu'il n'a pas établi. Il ne dit à aucun moment qu'une
périodicité est exacte ni qu'un champ d'application est le bon : cela suppose
d'avoir lu le texte.

---

## 1. Ce que le PDF montrait, en regard

Le dossier PDF (`Rojer-dossier-relecture-reglementaire.pdf`, version
`2026-08-25.5`) imprime ses propres comptes par domaine. Confrontés au code du
27 août :

| domaine | PDF (25/08) | code (27/08) | Δ |
|---|---|---|---|
| Électricité | 9 | 12 | **+3** |
| Sécurité incendie | 16 | 16 | — |
| Aération | 7 | 8 | **+1** |
| Cuisson / hotte | 6 | 7 | **+1** |
| Ascenseurs | 6 | 7 | **+1** |
| Portes et portails | 5 | 5 | — |
| Équipements sous pression | 6 | 6 | — |
| Stockage dangereux | 6 | 6 | — |
| Levage | 9 | 10 | **+1** |
| Froid | 8 | 8 | — |
| **total** | **78** | **85** | **+7** |

Sept obligations sont nées depuis : le rapport quadriennal, le contrôle annuel
de l'hôtel de 5ᵉ catégorie, le second rythme d'EL 18 § 4, la visite de base des
ascenseurs, la VGP trimestrielle, la quinquennale VMC-Gaz, l'entretien GC 21.
Et au moins deux lignes que le PDF affiche disent aujourd'hui autre chose : le
libellé des filtres de hotte et celui du portail piéton coulissant sont absents
du PDF sous leur forme actuelle.

Ligne à ligne :

| | dossier PDF | ce document |
|---|---|---|
| obligations | 78 (état du 25/08) | 85 |
| références visibles | ~48 | **155** |
| références repliées en « + N réf. » | 58 | 0 |
| verbatim de l'article | jamais | 40 lignes sur 155 |
| provenance de la lecture | jamais | 1ʳᵉ main / agent / indirect |
| date de version constatée | jamais | quand elle existe (26 lignes) |
| lien Légifrance | **aucun**, malgré la promesse du § « Sur quoi le contenu se fonde » | les 155 en portent un |
| articles lus qui créent une obligation non portée | pas mentionnés | 9, nommés au § 4 |
| corpus limités aux seuls articles cités | pas mentionnés | 22 sur 23 |

Le PDF n'est pas faux : c'est une vue de présentation. Il montre ce que l'outil
affirme, pas ce sur quoi il l'affirme réellement, ni ce qu'il n'a pas lu. C'est
ce qui a produit les sur-appels de la relecture par agents : ils jugeaient un
article isolé sans voir l'arrêté replié à côté. `elec-travail-periodique-annuelle`
en est le cas d'école — R. 4226-16 seul ne porte aucune périodicité, mais
l'arrêté du 26 décembre 2011 art. 3, masqué dans le « + 1 réf. », la porte.

---

## 2. Les constats mécaniques

| constat | lignes | obligations | ce qu'il établit |
|---|---|---|---|
| `PERIODICITE_SANS_TEXTE_PORTEUR` | 2 | 2 | rythme récurrent, et aucune référence de l'obligation n'est un arrêté, un décret ou un règlement UE — le chiffre du calendrier n'est porté par aucun texte cité |
| `CORPUS_NE_RENVOIE_PAS` | 9 | 7 | l'article est `retenu` au corpus mais ne liste pas cette obligation en retour |
| `FONDEMENT_NON_RETENU` | 5 | 5 | le corpus classe autrement que « retenu » un article donné pour fondement |
| `SANS_VERBATIM` | 115 | 72 | article retenu sans citation relevée — rien à relire sans rouvrir Légifrance |
| `VERSION_FUTURE` | 3 | 3 | version future programmée sur l'article |
| `VERSION_JAMAIS_CONSTATEE` | 129 | 79 | aucune date de version constatée — la veille n'a pas de point de comparaison |

Aucune ligne ne porte `NON_RATTACHE`, `HORS_CORPUS`, `NON_DEPOUILLE`,
`LECTURE_INDIRECTE`, `VERSION_DIVERGENTE` ni `SANS_URL` : les 155 références ont
leur clé, leur corpus et leur lien.

### Où en est ce tableau après l'ADR-022 (mesuré le 2026-08-27, même jour, plus tard)

> **Ce document ENTIER — ses tableaux comme le CSV qui l'accompagne — est
> l'instantané d'AVANT.** Les tableaux ligne par ligne des sections suivantes
> décrivent encore les trois obligations retirées depuis. C'est voulu : ils
> sont le relevé que ce document analyse.
>
> **`docs/relecture-references-2026-08-27.csv`** de même. Il a
> été produit le matin, et il porte encore les trois obligations retirées
> depuis (`elec-erp-cat5-quinquennale`, `cuisson-gaz-installations-triennale`,
> `aeration-travail-entretien-annuel`) ainsi que les cinq lignes
> `FONDEMENT_NON_RETENU`. Ce n'est pas une erreur : c'est le relevé que ce
> document analyse, et le régénérer effacerait le point de comparaison.
> Régénérable à tout moment par `pnpm relecture --csv`.

| constat | avant | après | ce qui a bougé |
|---|---|---|---|
| `PERIODICITE_SANS_TEXTE_PORTEUR` | 2 | 2 | inchangé |
| `CORPUS_NE_RENVOIE_PAS` | 9 | 9 | inchangé — il est monté à 15 en cours de route, le temps que les renvois de `PE 4` et `R. 4222-20` soient complétés |
| **`FONDEMENT_NON_RETENU`** | **5** | **0** | **éteint** |
| `SANS_VERBATIM` | 115 | 113 | deux de moins **net** : quatre articles ont gagné leur `citationCle` (`PE 4`, `R. 4222-20`, `R. 4222-22`, arrêté du 8 octobre 1987 art. 3), et les deux obligations nouvelles ont ajouté des lignes de référence qui en reprennent une part |
| `VERSION_FUTURE` | 3 | 3 | inchangé |
| `VERSION_JAMAIS_CONSTATEE` | 129 | 129 | inchangé |

Le référentiel passe de 85 à **84** obligations : `2026-08-27.5`. Le solde se lit +2 −3 : deux obligations portées par l'établissement (PE 4 § 2, R. 4222-20) et trois fragments de ces mêmes articles qu'elles absorbent (`elec-erp-cat5-quinquennale`, `cuisson-gaz-installations-triennale`, `aeration-travail-entretien-annuel`).

**`FONDEMENT_NON_RETENU` s'est éteint tout seul**, et c'est ce qui rend le
constat intéressant. Les cinq lignes portaient sur `PE 4` et `R. 4222-20`, deux
articles que le corpus classait `obligation_manquante` parce que le modèle ne
savait pas les porter : ils fondaient des obligations sans pouvoir être dits
« retenus ». L'ADR-022 leur a donné un porteur — l'établissement — ils sont
encodés, donc retenus, donc le constat n'a plus d'objet.

Ce n'était pas une alerte à traiter ligne par ligne : c'était le même manque
structurel, compté cinq fois. Un constat mécanique qui s'éteint par un
changement de modèle vaut confirmation que le constat visait juste.

**Deux réserves subsistent, et elles sont désormais comptées.** `PE 4` et
`R. 4222-20` ne sont pas retenus *en entier* : le § 1 de PE 4 (contrat annuel
du système de détection) attend l'attribut `Etablissement.locauxSommeil`, et le
volet « pollution spécifique » de l'arrêté de 1987 attend un secteur qui le
concerne. Marquer ces articles « retenu » tout court les aurait effacés. Le
statut `retenu` porte donc maintenant un champ `reserve`, et
`reservesDeLecture()` les agrège — un article partiellement couvert se lit
comme tel, au lieu de disparaître du tableau de bord du dépouillement.

**Ce qui n'a PAS bougé et devait être dit** : les neuf sur-applications du
Livre II — six dans `incendie.ts`, trois dans `electricite.ts` — sont toujours là. Leurs notes annonçaient « à
reprendre lorsque le référentiel saura porter PE 4 § 2 » ; il le sait, mais
c'était la moitié de la condition. L'autre moitié est un point de droit — ces
lignes se disent aussi fondées, chez un employeur, sur le Code du travail — et
il n'a pas été relu. Les retirer sur cette base supprimerait chez l'utilisateur
des échéances dont on n'a pas établi qu'elles ne sont pas dues, et en silence.
C'est un chantier de veille, distinct.

---

## 3. Les deux périodicités sans texte porteur

C'est le constat systémique que le rapport Code du travail annonçait : le Code
renvoie presque toujours la modalité à un arrêté, et citer l'article seul revient
à attribuer un chiffre à un texte qui ne le contient pas.

| obligation | rythme affiché | ce qui est cité |
|---|---|---|
| `elec-travail-habilitation-personnel` | triennale | R. 4544-9 à R. 4544-11 + INRS ED 6127 |
| `incendie-travail-exercice-semestriel` | semestrielle | R. 4227-39 + R. 4227-34 |

Pour la première, le triennal ne vient d'aucun des deux : la NF C 18-510 le
porte, et ce n'est pas une source opposable au sens du référentiel. Pour la
seconde, R. 4227-39 porte bien « tous les six mois » — mais il impose AUSSI des
essais et visites périodiques du matériel, que le référentiel ne retient pas
(cf. `relecture-source-2026-08-26.md` § 2.3).

---

## 4. Le rattachement à sens unique

Le rattachement est censé être bidirectionnel : l'obligation cite `article`, et
l'article du corpus liste en retour les `obligations` qu'il fonde. Le dépôt
teste déjà un sens — `liensRetenusRompus()`, un article qui nomme une obligation
inexistante — et renvoie 0. L'autre sens n'était pas testé. Neuf cas :

| obligation | rang | article | l'article renvoie vers |
|---|---|---|---|
| `elec-travail-consignation-registre` | fondement | R. 4226-19 | les deux `incendie-travail-eclairage-securite-*` |
| ″ | contexte 1 | L. 4711-5 | `incendie-registre-securite` |
| `elec-erp-groupe-electrogene-quinzaine` | fondement | EL 18 | `elec-erp-groupe-electrogene-annuel` |
| `elec-igh-annuelle` | fondement | GH 5 | `incendie-igh-moyens-secours-annuelle` |
| `elec-travail-rapport-quadriennal` | contexte 1 | R. 4226-16 | `elec-travail-periodique-annuelle` |
| `cuisson-erp-verification-initiale` | contexte 1 | GE 6 | `elec-erp-mise-en-service` |
| `ascenseur-visite-six-semaines` | fondement | CCH R. 134-6 | les 3 autres obligations ascenseur |
| `levage-vgp-trimestrielle-force-humaine` | fondement | Arrêté 2004-03-01 art. 23 | les 3 autres VGP |
| ″ | contexte 1 | R. 4323-23 | les 5 autres obligations levage |

Le motif est constant : chaque fois qu'un article a été **réutilisé** pour une
obligation ajoutée après coup — EL 18 § 4 dédoublé, la visite six semaines, la
VGP trimestrielle, le rapport quadriennal — le retour n'a pas suivi. Conséquence
concrète : un relecteur qui descend le corpus article par article, la façon
normale de relire, n'atteint jamais ces sept obligations. Elles sont invisibles
depuis le seul document qui prétend établir ce qui a été lu.

Une contradiction à trancher : `elec-travail-consignation-registre` est fondée
sur R. 4226-19, article que `relecture-source-2026-08-26.md` § 2.2 met déjà en
cause — « ne vise QUE les vérifications électriques, ne dit rien de l'éclairage
de sécurité » — pendant que le corpus, lui, le rattache à l'éclairage de
sécurité. Les deux ne peuvent pas être vrais.

---

## 5. Les clés qui ne couvrent qu'une partie de ce qui est cité

Dix-sept références nomment plusieurs articles et ne portent qu'une clé. Ce
n'est pas un détail de forme : la clé est ce qui rapproche l'obligation du
registre de dépouillement, et ce sur quoi la veille compare les dates de
version. Les articles de la colonne de droite ne sont donc **ni déclarés lus,
ni surveillés** — alors que le référentiel affirme s'appuyer dessus.

| obligation | citation | clé retenue | articles cités que la clé ne couvre pas |
|---|---|---|---|
| `elec-travail-mise-en-service` | Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 2 et 6 | `Arrêté 2011-12-26 art. 2` | art. 6 |
| `elec-travail-habilitation-personnel` | R. 4544-9 à R. 4544-11 | `R. 4544-10` | R.4544-9, R.4544-11 |
| `incendie-travail-consigne-affichee` | R. 4227-37 et R. 4227-38 | `R. 4227-37` | R.4227-38 |
| `aeration-travail-mise-en-service` | Arrêté du 8 octobre 1987, art. 2, 3 et 4 | `Arrêté 1987-10-08 art. 3` | art. 2, art. 4 |
| `ascenseur-entretien-contrat` | CCH, art. R. 134-6 et R. 134-7 (ex R. 125-2 et R. 125-2-1) | `CCH R. 134-6` | R.134-7 |
| `ascenseur-controle-technique-quinquennal` | CCH, art. R. 134-11 à R. 134-13 (ex R. 125-2-4 et s.) | `CCH R. 134-11` | R.134-13 |
| `ascenseur-carnet-entretien` | CCH, art. R. 134-7 et R. 134-10 (carnet d'entretien) | `CCH R. 134-10` | R.134-7 |
| `ascenseur-telealarme-liaison` | CCH, art. R. 134-1 à R. 134-5 (dispositifs de sécurité, dont demande de secours) | `CCH R. 134-1` | R.134-5 |
| `porte-auto-verification-initiale` | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 à 4 (installations neuves) | `Arrêté 1993-12-21 art. 2` | art. 4 |
| `porte-auto-dossier-maintenance` | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 8 et 9 (livret d'entretien) | `Arrêté 1993-12-21 art. 9` | art. 8 |
| `porte-auto-maintien-en-etat` | R. 4224-12 et R. 4224-13 | `R. 4224-13` | R.4224-12 |
| `porte-auto-portail-piete-coulissant` | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 et 5 (passages de véhicules) | `Arrêté 1993-12-21 art. 2` | art. 5 |
| `esp-personnel-formation` | R. 4323-1 à R. 4323-5 (information et formation à l'utilisation des équipements de travail) | `R. 4323-1` | R.4323-5 |
| `stockage-dangereux-declaration-icpe` | L. 512-8 (déclaration) · L. 512-7 (enregistrement) · L. 512-1 (autorisation) | `C. env. L. 512-1` | L.512-8, L.512-7 |
| `levage-epreuve-initiale-fonctionnement` | Arrêté du 1er mars 2004, art. 14 (vérification à la mise en service), renvoyant aux art. 5, 10 et 11 | `Arrêté 2004-03-01 art. 14` | art. 5, art. 10, art. 11 |
| `levage-vgp-annuelle-charges` | R. 4323-23 et R. 4323-24 | `R. 4323-23` | R.4323-24 |
| `levage-remise-en-service-apres-reparation` | Arrêté du 1er mars 2004, art. 18 à 21 (remise en service) | `Arrêté 2004-03-01 art. 19` | art. 18, art. 21 |

Deux cas à regarder en premier, parce qu'ils recoupent des défauts déjà
soupçonnés. `porte-auto-maintien-en-etat` cite R. 4224-12 sans clé, alors que
`relecture-source-2026-08-26.md` § 2.3 le signale absent du corpus et de portée
plus large — « les portes et portails sont entretenus et contrôlés
régulièrement », toutes les portes, pas seulement les automatiques. Et
`esp-personnel-formation` réduit R. 4323-1 à -5 à sa première borne, alors que
le défaut relevé au § 2.2 porte précisément sur la distinction entre
l'information (R. 4323-1) et la formation renouvelée (R. 4323-3 et -4).

---

## 6. Complétude

Ce document est un dépliage, pas un inventaire : une ligne n'existe que parce
qu'une obligation cite un article. Un article que personne ne cite n'a pas de
ligne. La complétude se lit au corpus, qui tient le registre inverse.

- **152 articles au corpus**, tous dépouillés, aucun laissé non lu.
- **1 seul corpus sur 23 est intégral.** Les 22 autres sont limités aux articles
  déjà cités : ils disent ce qu'on a lu de ce qu'on utilise, pas ce que le texte
  contient d'autre. Un corpus partiel ne peut jamais se déclarer complet.
- **9 articles imposent une obligation que le référentiel ne porte pas** :
  PE 4 (§ 1 et § 2), PE 27, PE 37, PO 1 § 3, PO 7, PO 12, R. 4222-20, et deux
  autres.
- **27 articles sont écartés par un choix explicite**, tous déclarés quelque
  part à l'utilisateur — aucun silence non annoncé.

---

## 7. Ce que ce document ne dit pas

- **Si une périodicité est exacte.** Il dit seulement si un texte cité peut la
  porter. Un rythme peut être juste et l'arrêté simplement absent de la citation.
- **Si le champ d'application retenu est le bon.** R. 4224-17 vise « les
  installations et dispositifs techniques et de sécurité des lieux de travail » —
  tout le bâti technique ; le référentiel l'a rattaché aux seules portes
  automatiques. Rien ici ne compare les deux.
- **Ce qui manque hors corpus.** Les 22 corpus limités aux articles cités
  laissent ouvert tout ce que leurs textes contiennent d'autre.

---

## 8. Le tableau

Lecture : `″` reprend l'obligation de la ligne précédente. **statut au corpus**
est le sort de l'article dans le registre de dépouillement. **lecture** dit
comment il a été lu : à la source par la personne qui l'encode (1ʳᵉ main), par
un agent dont le verbatim n'a pas été recoupé (agent), ou ailleurs qu'à la
source (indirect — ne peut pas fonder une entrée).

### Électricité — 12 obligations, 21 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `elec-travail-mise-en-service` | **fondement** | R. 4226-14 | R. 4226-14 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 2 et 6 | Arrêté 2011-12-26 art. 2 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `elec-travail-periodique-annuelle` | **fondement** | R. 4226-16 | R. 4226-16 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 3 | Arrêté 2011-12-26 art. 3 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `elec-travail-consignation-registre` | **fondement** | R. 4226-19 | R. 4226-19 | `autre` | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version jamais constatée |
| ″ | contexte 1 | L. 4711-5 | L. 4711-5 | ″ | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version jamais constatée |
| `elec-travail-habilitation-personnel` | **fondement** | R. 4544-9 à R. 4544-11 | R. 4544-10 | `triennale` | retenu | agent | non | **PÉRIODICITÉ SANS TEXTE PORTEUR** · sans verbatim · version jamais constatée |
| ″ | contexte 1 | INRS ED 6127 « Habilitation électrique » | INRS ED 6127 | ″ | sans_objet | 1ʳᵉ main | non | version jamais constatée |
| `elec-erp-mise-en-service` | **fondement** | Arrêté du 25 juin 1980, art. GE 6 à GE 8 (vérifications par organismes agréés, rapport RVRAT) | GE 6 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version future 2027-06-01 · version jamais constatée |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. EL 19 § 2 (installations neuves ou modifiées) | EL 19 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `elec-erp-cat1-4-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. EL 19 § 1 et § 2 | EL 19 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `elec-erp-cat5-quinquennale` | **fondement** | Arrêté du 22 juin 1990 (ERP 5ᵉ catégorie), art. PE 4 § 2, rédaction de l'arrêté du 1er décembre 2025 | PE 4 | `triennale` | obligation_manquante | agent | non | **FONDEMENT NON RETENU** (obligation_manquante) · version jamais constatée |
| ″ | contexte 1 | Arrêté du 1er décembre 2025 modifiant le règlement de sécurité ERP (applicable au 1er juillet 2026) | Arrêté 2025-12-01 | ″ | retenu | 1ʳᵉ main | non | sans verbatim · version jamais constatée |
| `elec-erp-groupe-electrogene-quinzaine` | **fondement** | Arrêté du 25 juin 1980, art. EL 18 § 4 (première périodicité) | EL 18 | `bimensuelle` | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim |
| `elec-erp-groupe-electrogene-annuel` | **fondement** | Arrêté du 25 juin 1980, art. EL 18 § 4 (entretien et essais des groupes électrogènes de sécurité) | EL 18 | `mensuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. EL 19 (vérification annuelle) | EL 19 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `elec-igh-annuelle` | **fondement** | Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 (vérifications techniques par organismes agréés) | GH 5 | `annuelle` | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version jamais constatée |
| `incendie-hotel-po-controle-annuel-electricite` | **fondement** | Arrêté du 25 juin 1980, art. PO 1 § 3 (règles spécifiques aux hôtels) | PO 1 | `annuelle` | retenu | 1ʳᵉ main | oui | — |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. PO 8 § 1 (extension aux hôtels existants) | PO 8 | ″ | retenu | 1ʳᵉ main | oui | — |
| `elec-travail-rapport-quadriennal` | **fondement** | Arrêté du 26 décembre 2011, annexe II, point 3.5 (mise à jour des renseignements descriptifs) | Arrêté 2011-12-26 annexe II | `quadriennale` | retenu | 1ʳᵉ main | oui | — |
| ″ | contexte 1 | R. 4226-16 (vérification périodique annuelle) | R. 4226-16 | ″ | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version jamais constatée |

### Sécurité incendie — 16 obligations, 33 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `incendie-travail-moyens-lutte` | **fondement** | R. 4227-28 | R. 4227-28 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4227-29 | R. 4227-29 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-travail-consigne-affichee` | **fondement** | R. 4227-37 et R. 4227-38 | R. 4227-37 | `autre` | retenu | agent | non | sans verbatim · version future 2027-01-01 · version jamais constatée |
| `incendie-travail-exercice-semestriel` | **fondement** | R. 4227-39 | R. 4227-39 | `semestrielle` | retenu | agent | non | **PÉRIODICITÉ SANS TEXTE PORTEUR** · sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4227-34 | R. 4227-34 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-registre-securite` | **fondement** | R. 4227-39 | R. 4227-39 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | L. 4711-5 | L. 4711-5 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | CCH, art. R. 143-44 (ex R. 123-51) — ERP | CCH R. 143-44 | ″ | retenu | 1ʳᵉ main | non | sans verbatim |
| ″ | contexte 3 | CCH, art. R. 141-10 — contenu du registre | CCH R. 141-10 | ″ | retenu | 1ʳᵉ main | non | sans verbatim |
| ″ | contexte 4 | CCH, art. R. 141-11 — solutions d'effet équivalent | CCH R. 141-11 | ″ | retenu | 1ʳᵉ main | non | sans verbatim |
| ″ | contexte 5 | CCH, art. R. 146-35 (ex R. 122-29) — IGH | CCH R. 146-35 | ″ | retenu | 1ʳᵉ main | non | sans verbatim |
| `incendie-travail-eclairage-securite-essai-mensuel` | **fondement** | Arrêté du 14 décembre 2011, art. 11 | Arrêté 2011-12-14 art. 11 | `mensuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4227-14 | R. 4227-14 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | R. 4226-19 | R. 4226-19 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 3 | Arrêté du 14 décembre 2011, art. 1er | Arrêté 2011-12-14 art. 1 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-travail-eclairage-securite-autonomie-semestrielle` | **fondement** | Arrêté du 14 décembre 2011, art. 11 | Arrêté 2011-12-14 art. 11 | `semestrielle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4227-14 | R. 4227-14 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | R. 4226-19 | R. 4226-19 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 3 | Arrêté du 14 décembre 2011, art. 1er | Arrêté 2011-12-14 art. 1 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-eclairage-securite-essai-mensuel` | **fondement** | Arrêté du 25 juin 1980, art. EC 14 § 3 | EC 14 | `mensuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-eclairage-securite-autonomie-semestrielle` | **fondement** | Arrêté du 25 juin 1980, art. EC 14 § 3 | EC 14 | `semestrielle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-extincteurs-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. MS 38 § 4 | MS 38 | `annuelle` | retenu | 1ʳᵉ main | non | sans verbatim |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. MS 73 § 2 | MS 73 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-ssi-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle) | MS 73 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-ssi-triennale` | **fondement** | Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification triennale par organisme agréé des SSI de catégorie A ou B) | MS 73 | `triennale` | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-baes-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. EC 15 | EC 15 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. EL 19 | EL 19 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-desenfumage-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. DF 10 | DF 10 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-ria-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. MS 73 (appareils et installations fixes) | MS 73 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `incendie-erp-5-visite-commission` | **fondement** | CCH, art. R. 143-41 (visites périodiques de la commission) | CCH R. 143-41 | `autre` | retenu | 1ʳᵉ main | oui | — |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. GE 4 — n'est PAS applicable en 5ᵉ catégorie | GE 4 | ″ | retenu | agent | non | sans verbatim |
| ″ | contexte 2 | Arrêté du 25 juin 1980, art. PE 37 (ERP de 5ᵉ catégorie avec locaux à sommeil) | PE 37 | ″ | obligation_manquante | 1ʳᵉ main | non | — |
| `incendie-igh-moyens-secours-annuelle` | **fondement** | Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 (vérifications techniques par organismes agréés) | GH 5 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |

### Aération et ventilation — 8 obligations, 12 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `aeration-travail-mise-en-service` | **fondement** | R. 4222-20 | R. 4222-20 | `mise_en_service_uniquement` | obligation_manquante | 1ʳᵉ main | non | **FONDEMENT NON RETENU** (obligation_manquante) · version jamais constatée |
| ″ | contexte 1 | R. 4222-21 | R. 4222-21 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | Arrêté du 8 octobre 1987, art. 2, 3 et 4 | Arrêté 1987-10-08 art. 3 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `aeration-travail-entretien-annuel` | **fondement** | R. 4222-20 | R. 4222-20 | `annuelle` | obligation_manquante | 1ʳᵉ main | non | **FONDEMENT NON RETENU** (obligation_manquante) · version jamais constatée |
| ″ | contexte 1 | Arrêté du 8 octobre 1987, art. 3 | Arrêté 1987-10-08 art. 3 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `aeration-travail-locaux-pollution-specifique` | **fondement** | Arrêté du 8 octobre 1987, art. 4 | Arrêté 1987-10-08 art. 4 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `aeration-erp-chauffage-ventilation-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. CH 58 (vérification dans les conditions de la section II du chapitre Ier) | CH 58 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. CH 57 (entretien, ramonage annuel des conduits de fumée) | CH 57 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `aeration-erp-ps-surveillance-qualite-air-inf-250` | **fondement** | Arrêté du 25 juin 1980, art. PS 32 (rédaction arrêté du 9 mai 2006) | PS 32 | `biennale` | retenu | agent | non | sans verbatim · version jamais constatée |
| `aeration-erp-ps-surveillance-qualite-air-sup-250` | **fondement** | Arrêté du 25 juin 1980, art. PS 32 (rédaction arrêté du 9 mai 2006) | PS 32 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `aeration-habitation-vmc-gaz-quinquennale` | **fondement** | Arrêté du 23 février 2018, art. 26 § 5° (opérations quinquennales sur les VMC-gaz) | Arrêté 23-02-2018 art. 26 | `quinquennale` | retenu | 1ʳᵉ main | oui | — |
| `aeration-habitation-vmc-gaz-annuelle` | **fondement** | Arrêté du 23 février 2018, art. 26 § 5° (opérations annuelles sur les VMC-gaz) | Arrêté 23-02-2018 art. 26 | `annuelle` | retenu | 1ʳᵉ main | oui | — |

### Cuisson et hotte — 7 obligations, 12 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `cuisson-erp-filtres-hebdomadaire` | **fondement** | Arrêté du 25 juin 1980, art. GC 21 § 2 (entretien des installations de cuisson) | GC 21 | `hebdomadaire` | retenu | 1ʳᵉ main | oui | — |
| `cuisson-erp-verification-initiale` | **fondement** | Arrêté du 25 juin 1980, art. GC 22 § 1 (vérification dans les conditions de la section II du chapitre Ier) | GC 22 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. GE 6 à GE 8 (vérifications par organismes agréés) | GE 6 | ″ | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version future 2027-06-01 · version jamais constatée |
| ″ | contexte 2 | Arrêté du 25 juin 1980, art. GC 1 § 3 (définition de la « grande cuisine ») | GC 1 | ″ | retenu | 1ʳᵉ main | oui | — |
| `cuisson-erp-appareils-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. GC 22 | GC 22 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `cuisson-gaz-installations-triennale` | **fondement** | Arrêté du 22 juin 1990 (ERP 5ᵉ catégorie), art. PE 4 § 2, rédaction de l'arrêté du 1er décembre 2025 | PE 4 | `triennale` | obligation_manquante | agent | non | **FONDEMENT NON RETENU** (obligation_manquante) · version jamais constatée |
| ″ | contexte 1 | Arrêté du 1er décembre 2025 modifiant le règlement de sécurité ERP (applicable au 1er juillet 2026) | Arrêté 2025-12-01 | ″ | retenu | 1ʳᵉ main | non | sans verbatim · version jamais constatée |
| `cuisson-gaz-installations-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. GZ 15 (vérifications techniques périodiques, ex GZ 30) | GZ 15 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `cuisson-erp-circuits-extraction-nettoyage` | **fondement** | Arrêté du 25 juin 1980, art. GC 21 § 2 (ramonage annuel, nettoyage des circuits, filtres hebdomadaires) | GC 21 | `annuelle` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `cuisson-erp-extinction-automatique-annuelle` | **fondement** | Arrêté du 25 juin 1980, art. GC 22 (vérifications techniques annuelles) | GC 22 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 25 juin 1980, art. MS 73 § 2 (vérification annuelle des moyens de secours) | MS 73 | ″ | retenu | agent | non | sans verbatim |
| ″ | contexte 2 | Arrêté du 25 juin 1980, art. GC 8 (obligation d'installation du dispositif) | GC 8 | ″ | retenu | 1ʳᵉ main | oui | — |

### Ascenseurs — 7 obligations, 12 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `ascenseur-visite-six-semaines` | **fondement** | CCH, art. R. 134-6 (prestations minimales du contrat d'entretien) | CCH R. 134-6 | `six_semaines` | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 18 novembre 2004 (entretien), annexe — colonne « intervalle maximum de six semaines » | Arrêté 2004-11-18 | ″ | retenu | 1ʳᵉ main | oui | — |
| `ascenseur-entretien-contrat` | **fondement** | CCH, art. R. 134-6 et R. 134-7 (ex R. 125-2 et R. 125-2-1) | CCH R. 134-6 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 18 novembre 2004 relatif à l'entretien des installations d'ascenseurs, art. 2 et annexe | Arrêté 2004-11-18 | ″ | retenu | 1ʳᵉ main | oui | — |
| `ascenseur-examen-semestriel-secours` | **fondement** | CCH, art. R. 134-6 (examen semestriel du bon état des câbles) | CCH R. 134-6 | `semestrielle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 18 novembre 2004 (entretien), annexe — opérations semestrielles | Arrêté 2004-11-18 | ″ | retenu | 1ʳᵉ main | oui | — |
| `ascenseur-examen-annuel-securite` | **fondement** | Arrêté du 18 novembre 2004 (entretien), annexe — opérations annuelles | Arrêté 2004-11-18 | `annuelle` | retenu | 1ʳᵉ main | oui | — |
| ″ | contexte 1 | CCH, art. R. 134-6 (vérification annuelle des parachutes) | CCH R. 134-6 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `ascenseur-controle-technique-quinquennal` | **fondement** | CCH, art. R. 134-11 à R. 134-13 (ex R. 125-2-4 et s.) | CCH R. 134-11 | `quinquennale` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 7 août 2012 relatif aux contrôles techniques à réaliser dans les installations d'ascenseurs | Arrêté 2012-08-07 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `ascenseur-carnet-entretien` | **fondement** | CCH, art. R. 134-7 et R. 134-10 (carnet d'entretien) | CCH R. 134-10 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| `ascenseur-telealarme-liaison` | **fondement** | CCH, art. R. 134-1 à R. 134-5 (dispositifs de sécurité, dont demande de secours) | CCH R. 134-1 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |

### Portes et portails automatiques — 5 obligations, 8 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `porte-auto-verification-initiale` | **fondement** | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 à 4 (installations neuves) | Arrêté 1993-12-21 art. 2 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4224-13 | R. 4224-13 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `porte-auto-verification-semestrielle` | **fondement** | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 9 | Arrêté 1993-12-21 art. 9 | `semestrielle` | retenu | agent | non | sans verbatim · version jamais constatée |
| `porte-auto-dossier-maintenance` | **fondement** | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 8 et 9 (livret d'entretien) | Arrêté 1993-12-21 art. 9 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4224-17 | R. 4224-17 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `porte-auto-maintien-en-etat` | **fondement** | R. 4224-12 et R. 4224-13 | R. 4224-13 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4224-17 | R. 4224-17 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `porte-auto-portail-piete-coulissant` | **fondement** | Arrêté du 21 décembre 1993 (portes et portails automatiques), art. 2 et 5 (passages de véhicules) | Arrêté 1993-12-21 art. 2 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |

### Équipements sous pression — 6 obligations, 7 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `esp-declaration-mise-en-service` | **fondement** | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 7 à 11 | Arrêté 2017-11-20 art. 7-11 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 557-14-1 et s. (suivi en service) | C. env. R. 557-14-1 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `esp-inspection-periodique` | **fondement** | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 15 | Arrêté 2017-11-20 art. 15 | `triennale` | retenu | agent | non | sans verbatim · version jamais constatée |
| `esp-requalification-decennale` | **fondement** | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 18 et 19 | Arrêté 2017-11-20 art. 18-19 | `decennale` | retenu | agent | non | sans verbatim · version jamais constatée |
| `esp-dossier-suivi` | **fondement** | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 6 (dossier d'exploitation) | Arrêté 2017-11-20 art. 6 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| `esp-intervention-reparation` | **fondement** | Arrêté du 20 novembre 2017 (suivi en service des ESP), art. 26 à 28 | Arrêté 2017-11-20 art. 26-28 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| `esp-personnel-formation` | **fondement** | R. 4323-1 à R. 4323-5 (information et formation à l'utilisation des équipements de travail) | R. 4323-1 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |

### Stockage de matières dangereuses — 6 obligations, 11 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `stockage-dangereux-declaration-icpe` | **fondement** | L. 512-8 (déclaration) · L. 512-7 (enregistrement) · L. 512-1 (autorisation) | C. env. L. 512-1 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| `stockage-dangereux-retention` | **fondement** | R. 4412-11 (procédures de stockage sûres des agents chimiques dangereux) | R. 4412-11 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 1er juin 2015 (rubriques 4331/4734, enregistrement), art. 22 — valeurs de rétention, opposables uniquement sous ce régime ICPE | Arrêté 2015-06-01 art. 22 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | R. 4412-17 (prévention des débordements et ruptures de parois des récipients) | R. 4412-17 | ″ | retenu | 1ʳᵉ main | oui | — |
| `stockage-dangereux-verification-etancheite` | **fondement** | R. 4412-11 (entretien régulier des équipements de stockage) | R. 4412-11 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4412-17 (prévention des débordements et ruptures de parois des récipients) | R. 4412-17 | ″ | retenu | 1ʳᵉ main | oui | — |
| `stockage-dangereux-ventilation-locaux` | **fondement** | R. 4222-20 | R. 4222-20 | `annuelle` | obligation_manquante | 1ʳᵉ main | non | **FONDEMENT NON RETENU** (obligation_manquante) · version jamais constatée |
| ″ | contexte 1 | Arrêté du 8 octobre 1987, art. 4 (locaux à pollution spécifique) | Arrêté 1987-10-08 art. 4 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `stockage-dangereux-fiches-donnees` | **fondement** | R. 4412-38 (accès des travailleurs aux fiches de données de sécurité) | R. 4412-38 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| `stockage-dangereux-formation-personnel` | **fondement** | R. 4412-38 (agents chimiques dangereux) | R. 4412-38 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4412-87 (agents CMR uniquement) | R. 4412-87 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |

### Appareils de levage — 10 obligations, 23 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `levage-examen-adequation-mise-en-service` | **fondement** | Arrêté du 1er mars 2004, art. 5 (examen d'adéquation et de montage) et art. 12 à 15 | Arrêté 2004-03-01 art. 5 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4323-22 | R. 4323-22 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-epreuve-initiale-fonctionnement` | **fondement** | Arrêté du 1er mars 2004, art. 14 (vérification à la mise en service), renvoyant aux art. 5, 10 et 11 | Arrêté 2004-03-01 art. 14 | `mise_en_service_uniquement` | retenu | 1ʳᵉ main | oui | — |
| ″ | contexte 1 | R. 4323-22 | R. 4323-22 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-vgp-annuelle-charges` | **fondement** | R. 4323-23 et R. 4323-24 | R. 4323-23 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 1er mars 2004, art. 23 (périodicité de 12 mois) | Arrêté 2004-03-01 art. 23 | ″ | retenu | 1ʳᵉ main | non | sans verbatim · version jamais constatée |
| `levage-vgp-semestrielle-chariot-gerbeur` | **fondement** | Arrêté du 1er mars 2004, art. 23 a) | Arrêté 2004-03-01 art. 23 | `semestrielle` | retenu | 1ʳᵉ main | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4323-23 | R. 4323-23 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | Arrêté du 1er mars 2004, art. 20-II | Arrêté 2004-03-01 art. 20 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 3 | Arrêté du 1er mars 2004, annexe | Arrêté 2004-03-01 annexe | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-vgp-trimestrielle-force-humaine` | **fondement** | Arrêté du 1er mars 2004, art. 23 b) (périodicité de 3 mois) | Arrêté 2004-03-01 art. 23 | `trimestrielle` | retenu | 1ʳᵉ main | non | **CORPUS NE RENVOIE PAS** · sans verbatim |
| ″ | contexte 1 | R. 4323-23 | R. 4323-23 | ″ | retenu | agent | non | **CORPUS NE RENVOIE PAS** · sans verbatim · version jamais constatée |
| `levage-vgp-semestrielle-personnes` | **fondement** | Arrêté du 1er mars 2004, art. 23 (périodicité de 6 mois pour les appareils servant au transport de personnes ou à l'élévation d'un poste de travail) | Arrêté 2004-03-01 art. 23 | `semestrielle` | retenu | 1ʳᵉ main | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4323-23 | R. 4323-23 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-vgp-accessoires-annuelle` | **fondement** | Arrêté du 1er mars 2004, art. 24 (vérification périodique des accessoires) | Arrêté 2004-03-01 art. 24 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4323-23 | R. 4323-23 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-examen-etat-conservation` | **fondement** | Arrêté du 1er mars 2004, art. 9 (examen de l'état de conservation) et art. 22 | Arrêté 2004-03-01 art. 9 | `annuelle` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4323-23 | R. 4323-23 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-remise-en-service-apres-reparation` | **fondement** | R. 4323-28 | R. 4323-28 | `mise_en_service_uniquement` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | Arrêté du 1er mars 2004, art. 18 à 21 (remise en service) | Arrêté 2004-03-01 art. 19 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| `levage-registre-securite-consignation` | **fondement** | R. 4323-25 | R. 4323-25 | `autre` | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 1 | R. 4323-26 | R. 4323-26 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |
| ″ | contexte 2 | R. 4323-27 | R. 4323-27 | ″ | retenu | agent | non | sans verbatim · version jamais constatée |

### Froid et fluides frigorigènes — 8 obligations, 16 références

| obligation | rang | référence citée | clé d’article | rythme | statut au corpus | lecture | verbatim | constats |
|---|---|---|---|---|---|---|---|---|
| `froid-controle-etancheite-mise-en-service` | **fondement** | R. 543-79, al. 1 | C. env. R. 543-79 | `mise_en_service_uniquement` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-annuel` | **fondement** | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | `annuelle` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-biennal-detection` | **fondement** | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | `biennale` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-semestriel-50t` | **fondement** | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | `semestrielle` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-annuel-50t-detection` | **fondement** | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | `annuelle` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-trimestriel-500t` | **fondement** | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | `trimestrielle` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-semestriel-500t-detection` | **fondement** | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | `semestrielle` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | R. 543-79, al. 2 | C. env. R. 543-79 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
| `froid-controle-etancheite-apres-modification` | **fondement** | R. 543-79, al. 2 | C. env. R. 543-79 | `autre` | retenu | 1ʳᵉ main | oui | version jamais constatée |
| ″ | contexte 1 | Règlement (UE) 2024/573, art. 5 | Règlement UE 2024/573 art. 5 | ″ | retenu | 1ʳᵉ main | oui | version jamais constatée |
