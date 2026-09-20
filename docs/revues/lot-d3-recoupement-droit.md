# Lot D3 — recoupement en droit de quatre familles absentes du dépôt

Rédigé le 2026-09-01. Branche `lot-d3/recoupement-droit`, partie de `origin/main`
(`2a54efb`). **Lot en lecture seule sur `src/`** : aucune obligation encodée,
aucun corpus touché, aucun test écrit. Ce document est le seul artefact.

## D'où vient la liste

Un audit externe a relevé quatre familles d'obligations dont le dépôt ne porte
aucune trace — ni encodage, ni cartographie, ni cadrage, ni dette. **Il dit
lui-même n'en avoir recoupé aucune sur Légifrance** : ce sont des absences
vérifiées dans le dépôt, pas des obligations vérifiées en droit. Trois
références de brief se sont révélées fausses à la lecture cette semaine pour
avoir sauté cette étape.

Toutes les lectures ci-dessous sont faites **sur Légifrance, article par
article**, le 2026-09-01. Un article vu en résumé de moteur de recherche n'est
pas compté comme lu.

## Les quatre absences, d'abord vérifiées dans le dépôt

Contre-vérifiées au grep sur `origin/main` le 2026-09-01, avant toute lecture
juridique :

| Famille | Recherche | Résultat |
|---|---|---|
| Pénibilité / C2P | `4161`, `4163`, `C2P`, `pénibilit` | **0 article**. Deux occurrences du seul mot « pénibilité », dans du texte d'écran (`CotationForm.tsx:232`) et de PDF (`DuerpDocument.tsx:857`) |
| Chapitre chaleur | `2025-482` | **3 occurrences, toutes sur `R. 4225-2`** (`locaux-sociaux.ts:81`, `corpus/code-travail-locaux-sociaux.ts:66`, `rapport-lot8-socle.md:114`) |
| Chaleur (codification) | `4463`, `chaleur` | **0 article `R. 4463-*`**. « chaleur » n'apparaît qu'en libellé de risque DUERP (`bureau.ts:283`) et en récupérateur de chaleur de hotte |
| Défibrillateur | `defibrill`, `éfibrill`, `DAE` | **0 occurrence** |
| Arrêté du 5 mars 1993 | `5 mars 1993` | **0 occurrence**. Le dépôt ne connaît que les arrêtés du 19 mars 1993 (travaux dangereux) et du 21 décembre 1993 (portes et portails) |

L'audit avait raison sur les cinq absences. Reste à savoir si les textes
existent, disent ce qu'on leur prête, et mordent sur la cible.

---

## 1. Le chapitre chaleur du décret n° 2025-482 — **FONDÉE, dans le périmètre**

**C'est la plus grave des quatre, et l'audit a vu juste.** Le dépôt a bien lu
**un** article du décret et pas son objet principal.

### Ce que le dépôt en dit aujourd'hui

`src/lib/referentiels/conformite/locaux-sociaux.ts:81` cite le décret
n° 2025-482 comme ce qui a réécrit `R. 4225-2` — « eau potable **et fraîche**
[…] pour se désaltérer **et se rafraîchir** » — et note, à juste titre, que la
rédaction antérieure ne portait pas « et se rafraîchir ». La lecture est bonne.
Elle s'est arrêtée à l'article modifié sans remonter au décret qui le modifiait.

### Ce que le décret fait en réalité

Le décret n° 2025-482 du 27 mai 2025 relatif à la protection des travailleurs
contre les risques liés à la chaleur (JORF, `JORFTEXT000051676074`) ne se borne
pas à retoucher `R. 4225-2`. Il **crée un chapitre entier** du code du travail :
quatrième partie, livre IV, titre VI, **chapitre III « Prévention des risques
liés aux épisodes de chaleur intense », articles `R. 4463-1` à `R. 4463-8`**.

Lu sur Légifrance le 2026-09-01, article par article. Tous les articles du
chapitre sont **en vigueur depuis le 2 juin 2025**, créés par l'article 3 du
décret.

**`R. 4463-1`** — définition
(https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676923) :

> « Pour l'application du présent chapitre, l'épisode de chaleur intense est
> défini, dans des conditions déterminées par arrêté des ministres chargés du
> travail, de l'environnement et de l'agriculture, par référence à un dispositif
> développé par Météo-France pour signaler le niveau de danger de la chaleur. »

L'arrêté d'application est l'**arrêté du 27 mai 2025** (`JORFTEXT000051676145`),
qui raccroche le déclenchement à la vigilance météorologique de Météo-France.

**`R. 4463-2`** — évaluation des risques, **c'est l'obligation centrale**
(https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676927) :

> « L'employeur évalue les risques liés à l'exposition des travailleurs à des
> épisodes de chaleur intense, en intérieur ou en extérieur. Lorsque
> l'évaluation identifie un risque d'atteinte à la santé ou à la sécurité des
> travailleurs, l'employeur définit les mesures ou les actions de prévention
> prévues au III de l'article L. 4121-3-1. »

**Le renvoi au III de `L. 4121-3-1` est le point qui fait entrer cette famille
dans le cœur du produit** : ce III est celui qui, pour les entreprises de moins
de cinquante salariés, fait consigner les actions de prévention **dans le
DUERP** et dans ses mises à jour. Autrement dit `R. 4463-2` n'est pas une
obligation périphérique : c'est une **entrée obligatoire du DUERP**, sur le
document qui est le socle historique de Rojer.

**`R. 4463-3`** — les huit fondements de la réduction du risque
(https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051676931) :

> « La réduction des risques liés à l'exposition aux épisodes de chaleur intense
> prévue au second alinéa de l'article R. 4463-2 se fonde, notamment, sur :
> 1° La mise en œuvre de procédés de travail ne nécessitant pas d'exposition à
> la chaleur ou nécessitant une exposition moindre ;
> 2° La modification de l'aménagement et de l'agencement des lieux et postes de
> travail ;
> 3° L'adaptation de l'organisation du travail, et notamment des horaires de
> travail, afin de limiter la durée et l'intensité de l'exposition et de prévoir
> des périodes de repos ;
> 4° Des moyens techniques pour réduire le rayonnement solaire sur les surfaces
> exposées, par exemple par l'amortissement ou par l'isolation, ou pour prévenir
> l'accumulation de chaleur dans les locaux ou au poste de travail ;
> 5° L'augmentation, autant qu'il est nécessaire, de l'eau potable fraîche mise
> à disposition des travailleurs ;
> 6° Le choix d'équipements de travail appropriés permettant, compte tenu du
> travail à accomplir, de maintenir une température corporelle stable ;
> 7° La fourniture d'équipements de protection individuelle permettant de
> limiter ou de compenser les effets des fortes températures ou de se protéger
> des effets des rayonnements solaires directs ou diffusés ;
> 8° L'information et la formation adéquates des travailleurs, d'une part, sur
> la conduite à tenir en cas de forte chaleur et, d'autre part, sur
> l'utilisation correcte des équipements de travail et des équipements de
> protection individuelle de manière à réduire leur exposition à la chaleur à un
> niveau aussi bas qu'il est techniquement possible. »

Le 5° est **le seul point du chapitre que le dépôt touche déjà**, et il le
touche par l'autre bout : `R. 4225-2` porte la mise à disposition permanente,
`R. 4463-3` 5° porte l'**augmentation** en épisode. Ce ne sont pas la même
obligation.

**`R. 4463-4` à `R. 4463-8`** (section 3, mesures de prévention,
https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000051676929/) :

- `R. 4463-4` : « En cas d'épisode de chaleur intense, une quantité d'eau
  potable fraîche suffisante est fournie par l'employeur. »
- `R. 4463-5` : adaptation des mesures au travailleur signalé comme
  particulièrement vulnérable.
- `R. 4463-6` : l'employeur **définit les modalités de signalement** de
  l'apparition d'un indice physiologique préoccupant — y compris pour le
  travailleur isolé.
- `R. 4463-7` : mise en œuvre **lors de la survenue** de l'épisode, avec
  adaptation en cas d'intensification.
- `R. 4463-8` : le plan de prévention, le PGC et le PPSPS **tiennent compte** du
  risque chaleur.

### Verdict

**FONDÉE. Dans le périmètre. Mord directement sur la cible.**

- Le chapitre s'adresse à **tout employeur**, sans seuil d'effectif et sans
  restriction sectorielle. Un restaurant de six personnes y est aussi assujetti
  qu'un chantier.
- Il vise expressément l'exposition **« en intérieur »** — la cuisine de
  restaurant en est le cas d'école, et le commerce de détail sans climatisation
  en plein été n'en est pas loin.
- Il n'est **pas** du « RH non-SST » ni de l'exploitation non-SST : c'est la
  quatrième partie du code du travail, prévention des risques.
- `R. 4463-8` recoupe le module `PlanPrevention` que le produit porte déjà.

### Ce qui n'est **pas** dans le texte, et qu'il ne faut pas lui prêter

- **Aucune périodicité.** Ni `R. 4463-2` ni aucun autre article du chapitre
  n'écrit un rythme. L'évaluation suit celle du DUERP ; la mise en œuvre est
  **déclenchée par un épisode**, c'est-à-dire par la vigilance Météo-France.
- **Aucun seuil de température dans le code.** Le seuil est renvoyé à l'arrêté
  du 27 mai 2025 et au dispositif Météo-France ; encoder « 33 °C » ou tout autre
  chiffre serait inventer.
- `R. 4463-6` fait **définir des modalités**, pas tenir un registre.

### Recommandation d'encodage

Deux obligations d'établissement, pas une — elles ne sont ni du même porteur
logique ni de la même nature :

| Proposition | Fondement | Porteur | Nature | Périodicité |
|---|---|---|---|---|
| Évaluer le risque chaleur intense et consigner les actions au DUERP | `R. 4463-2`, renvoyant au III de `L. 4121-3-1` | établissement | état permanent | `autre` — **le texte n'en donne aucune** |
| Définir les modalités de signalement d'un indice physiologique préoccupant | `R. 4463-6` | établissement | état permanent | `autre` |

`R. 4463-3`, `-4`, `-5`, `-7` sont des **modalités** de la première : ils
décrivent ce que contiennent les mesures, ils n'engendrent pas de ligne propre.
Les porter en `articles_cites` du corpus, en contexte, plutôt qu'en obligations.
`R. 4463-8` est déjà servi par le module `PlanPrevention` — à vérifier avant
d'en faire une ligne, sous peine du doublon que le dépôt a déjà corrigé une fois
sur les portails.

**À corriger au passage** : la note de `locaux-sociaux.ts:81` dit du décret
n° 2025-482 qu'il a « modifié » `R. 4225-2`. C'est vrai et incomplet — la note
laisse croire que c'est là son objet. Une phrase renvoyant au chapitre `R. 4463-*`
éviterait qu'un prochain lot relise le même décret et s'arrête au même endroit.

---

## 2. Pénibilité / C2P — **FONDÉE en droit, mais l'audit se trompe sur deux points**

Le texte existe. L'hypothèse de l'audit est **juste sur le fond et fausse dans
deux de ses termes**, et les deux erreurs auraient été encodées telles quelles.

### Erreur n° 1 — l'obligation n'est pas dans `L. 4161-*`

`L. 4161-1` (version en vigueur depuis le **1ᵉʳ octobre 2017**, ordonnance
n° 2017-1389 du 22 septembre 2017,
https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035640694)
**n'impose rien**. C'est un article de définition :

> « **I.** — Constituent des facteurs de risques professionnels au sens du
> présent titre les facteurs liés à :
> 1° Des contraintes physiques marquées : a) Manutentions manuelles de charges ;
> b) Postures pénibles définies comme positions forcées des articulations ;
> c) Vibrations mécaniques ;
> 2° Un environnement physique agressif : a) Agents chimiques dangereux, y
> compris les poussières et les fumées ; b) Activités exercées en milieu
> hyperbare ; c) Températures extrêmes ; d) Bruit ;
> 3° Certains rythmes de travail : a) Travail de nuit dans les conditions fixées
> aux articles L. 3122-2 à L. 3122-5 ; b) Travail en équipes successives
> alternantes ; c) Travail répétitif caractérisé par la réalisation de travaux
> impliquant l'exécution de mouvements répétés, sollicitant tout ou partie du
> membre supérieur, à une fréquence élevée et sous cadence contrainte.
> **II.** — Un décret précise les facteurs de risques mentionnés au I. »

Encoder `L. 4161-1` comme fondement d'une obligation aurait cité un article qui
**ne dit à personne de faire quoi que ce soit**. L'obligation est à `L. 4163-1`.

### Erreur n° 2 — « postures » n'est plus déclarable

L'audit écrit que l'obligation « vise directement la restauration — travail de
nuit, chaleur, **postures**, bruit ». C'est vrai pour trois termes sur quatre.

`L. 4163-1` (version en vigueur depuis le **1ᵉʳ janvier 2019**,
https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000035640669) :

> « **I.** — L'employeur déclare de façon dématérialisée aux caisses mentionnées
> au II **les facteurs de risques professionnels mentionnés aux b, c, d du 2° et
> au 3° de l'article L. 4161-1**, auxquels les travailleurs pouvant acquérir des
> droits au titre d'un compte professionnel de prévention, dans les conditions
> fixées au présent chapitre, sont exposés au-delà de certains seuils, appréciés
> après application des mesures de protection collective et individuelle.
> **II.** — La déclaration mentionnée au I est effectuée, selon les modalités
> prévues à l'article L. 133-5-3 du code de la sécurité sociale, auprès de la
> caisse mentionnée aux articles L. 215-1 ou L. 752-4 du même code ou à
> l'article L. 723-2 du code rural et de la pêche maritime dont relève
> l'employeur. Un décret en précise les modalités. »

**Le renvoi est limitatif : « aux b, c, d du 2° et au 3° ».** Six facteurs sur
dix. Sont **hors déclaration** depuis l'ordonnance de 2017 le 1° entier
(manutentions manuelles, **postures pénibles**, vibrations mécaniques) et le a
du 2° (agents chimiques dangereux). Un lot qui aurait recopié la formule de
l'audit aurait encodé une déclaration de postures pénibles que le droit
n'exige plus depuis huit ans — le type exact d'erreur que ce lot existe pour
éviter.

### Les seuils, et ce qu'ils font à la cible

`D. 4163-2`, version en vigueur depuis le **1ᵉʳ septembre 2023**
(section `LEGISCTA000029560938`) :

| Facteur | Intensité minimale | Durée minimale |
|---|---|---|
| Milieu hyperbare | 1 200 hectopascals | 60 interventions ou travaux par an |
| Températures extrêmes | ≤ 5 °C **ou** ≥ 30 °C | **900 heures par an** |
| Bruit | ≥ 81 dB(A) rapportés à 8 heures | 600 heures par an |
| Travail de nuit | une heure de travail **entre 24 heures et 5 heures** | **100 nuits par an** |
| Équipes successives alternantes | au minimum une heure entre 24 h et 5 h | 30 nuits par an |
| Travail répétitif | 15 actions techniques (cycle ≤ 30 s) ou 30 actions/minute | 900 heures par an |

Deux seuils sont **plus étroits que l'intuition** et méritent d'être relevés,
parce qu'ils changent qui est concerné :

- **Le travail de nuit du C2P n'est pas le travail de nuit du droit du travail.**
  `L. 3122-2` ouvre la période à 21 heures ; `D. 4163-2` ne compte que l'heure
  travaillée **entre minuit et 5 heures**. Un restaurant qui ferme à 23 h 30 ne
  déclenche rien, quel que soit le nombre de services.
- **900 heures par an à 30 °C ou plus** — près de vingt heures par semaine sur
  quarante-cinq semaines, en poste. Une cuisine peut y arriver ; ce n'est pas
  acquis, et ce n'est pas au produit d'en décider.

Le seuil nuit est passé de 120 à 100 nuits au 1ᵉʳ septembre 2023 : la version
lue est bien la version en vigueur, pas celle des fiches pratiques en ligne.

### La périodicité — le texte en donne une, et elle est nette

`R. 4163-8`, version en vigueur depuis le 1ᵉʳ janvier 2019 :

> « Au terme de chaque année civile et au plus tard au titre de la paie du mois
> de décembre, l'employeur déclare […] »

C'est bien un **rythme annuel avec date butoir**, pas un plafond : « au terme de
chaque année civile » n'admet pas la lecture « au moins une fois tous les ans ».
Le support est la déclaration de `L. 133-5-3` du code de la sécurité sociale —
la DSN.

`D. 4163-4` ajoute, pour les travailleurs qui ne peuvent pas acquérir de droits
au C2P, une **fiche individuelle de suivi** remise « au terme de chaque année
civile », et « au plus tard le dernier jour du mois suivant la date de fin de
contrat » pour un contrat qui s'achève en cours d'année. Deuxième périodicité
écrite, deuxième porteur (salarié).

### Le rattachement au DUERP, que l'audit n'a pas vu

`D. 4163-3` (en vigueur depuis le 1ᵉʳ janvier 2019) :

> « L'employeur déclare l'exposition des travailleurs à un ou plusieurs facteurs
> de risques professionnels mentionnés à l'article L. 4163-1, **en cohérence
> avec l'évaluation des risques prévue à l'article L. 4121-3**, au regard des
> conditions habituelles de travail caractérisant le poste occupé, appréciées en
> moyenne sur l'année, notamment à partir des **données collectives mentionnées
> au 1° de l'article R. 4121-1-1**. »

C'est l'argument le plus fort pour le périmètre : le texte lui-même **fait
dépendre la déclaration du DUERP**. `R. 4121-1-1` n'a **pas été ouvert** dans ce
lot — c'est la première chose à lire pour un lot d'encodage.

### Verdict

**FONDÉE. Dans le périmètre matériel, partiellement hors du périmètre outillé.**

- Ce n'est **pas** du « RH non-SST ». C'est la quatrième partie du code du
  travail, titre VI, et `D. 4163-3` l'arrime au DUERP. La lecture de l'audit est
  bonne sur ce point.
- **Aucun seuil d'effectif.** Un employeur d'un salarié est assujetti.
  (À ne pas confondre avec `L. 4162-1`, l'accord ou plan d'action en faveur de
  la prévention, qui **a** un seuil et sort de la cible — non lu dans ce lot.)
- **Mais l'acte lui-même vit dans la DSN**, que le produit ne tient pas et ne
  tiendra pas. Le produit ne peut ni la faire, ni constater qu'elle est faite.
- Et surtout : **le produit n'a aucun moyen de savoir si un seuil est franchi.**
  Heures à 30 °C, nuits entre minuit et 5 heures, décibels — c'est le cinquième
  déclencheur, « activité réellement exercée », **non implémenté**. Encodée sans
  condition, la ligne s'afficherait chez tous les bureaux du produit : faux
  positif de masse.

### Recommandation

**Ne pas encoder d'obligation. Encoder au corpus, et déclarer.** C'est
exactement le traitement que le dépôt a déjà appliqué à `R. 4225-3` (boisson
non alcoolisée), pour la même raison et avec la même honnêteté :

| Article | Statut corpus proposé | Motif |
|---|---|---|
| `L. 4161-1` | `articles_cites` / contexte | Article de définition, n'impose rien |
| `L. 4163-1` | `non_couvert`, `declareA` → `docs/couverture-declaree-du-produit.md` | Obligation réelle, sans seuil d'effectif, mais dont le franchissement du seuil relève du cinquième déclencheur non implémenté, et dont le support est la DSN |
| `D. 4163-2` | `articles_cites` | Porte les six seuils |
| `R. 4163-8` | `articles_cites` | Porte la périodicité annuelle et la date butoir |
| `D. 4163-4` | `non_couvert` | Fiche individuelle de suivi, porteur salarié, annuelle |

Si un lot ultérieur veut malgré tout une ligne visible, la seule forme
défendable est une **indétermination**, pas un manque : « travaillez-vous entre
minuit et 5 heures plus de 100 nuits par an ? » est une question au dirigeant,
et le module `perimetre/couverture.ts` distingue déjà les deux.

---

## 3. Le défibrillateur (DAE) — **FONDÉE en droit, HORS PÉRIMÈTRE, et l'hypothèse de l'audit est périmée**

L'audit énonce : « obligation du Code de la construction et de l'habitation pour
les ERP (catégories 1 à 4 et certains types de 5ᵉ), avec maintenance et
déclaration ». **C'était exact jusqu'au 6 décembre 2025.** Ça ne l'est plus tout
à fait.

### La référence n'est pas celle qu'on croit

Le décret n° 2018-1186 du 19 décembre 2018 avait codifié l'obligation aux
articles `R. 123-57` à `R. 123-60` du CCH. **La recodification du 1ᵉʳ juillet
2021 les a déplacés** : ils vivent aujourd'hui au chapitre VII « Autres
équipements », articles `R. 157-1` à `R. 157-4`.

Piège vérifié et écarté : `R. 143-33`, que plusieurs sources secondaires
donnent pour l'article DAE, **traite de tout autre chose** — l'accès des membres
des commissions de sécurité aux établissements qu'ils visitent (version en
vigueur du 1ᵉʳ juillet 2021, lue le 2026-09-01). Une lecture de résumé aurait
encodé une référence fausse.

### Le texte en vigueur

`R. 157-1` CCH, **version en vigueur depuis le 7 décembre 2025** (décret
n° 2025-1167 du 5 décembre 2025, `JORFTEXT000052993669`), lu sur
https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819225 :

> « Sont soumis à l'obligation de détenir un défibrillateur automatisé externe,
> les établissements recevant du public qui relèvent :
> 1° Des catégories 1 à 4 mentionnées à l'article R. 143-19 ;
> 2° **Et parmi ceux relevant de la catégorie 5, lorsqu'ils sont implantés pour
> une durée supérieure à trois mois et accueillent un nombre minimal de
> personnes défini par arrêté des ministres chargés de la santé et de la
> construction** :
> a) Les structures d'accueil pour personnes âgées ou pour personnes
> handicapées ; b) Les établissements de santé et les centres de santé
> mentionnés aux codes de la santé publique ; c) Les établissements clos et
> couverts accueillant une activité sportive ; d) Les établissements affectés à
> une activité de danse ou à une salle de jeux ; e) Les gares routières ou
> ferroviaires ; f) Les aéroports ; g) Les hôtels-restaurants d'altitude ;
> h) Les refuges de montagne gardés. »

Le décret n° 2025-1167 a **remplacé le 2°** en y ajoutant les deux conditions
cumulatives — implantation de plus de trois mois, effectif minimal d'accueil
fixé par arrêté. Un lot qui aurait encodé la formule de l'audit aurait porté
l'état antérieur du droit.

Autres articles du chapitre :

- `R. 157-2` (version du 1ᵉʳ juillet 2021) : « Le défibrillateur automatisé
  externe est installé dans un emplacement visible du public et en permanence
  facile d'accès. »
- `R. 157-3` (1ᵉʳ juillet 2021) : mise en commun possible entre établissements
  d'un même site ou sous direction commune.
- `R. 157-4`, **version en vigueur depuis le 22 avril 2026** : « Le propriétaire
  du défibrillateur veille à la mise en œuvre de la maintenance du
  défibrillateur et de ses accessoires ». **Le porteur est le propriétaire du
  DAE, pas l'exploitant de l'ERP** — distinction que l'énoncé de l'audit
  (« avec maintenance ») écrase.
- La **déclaration à la base nationale** ne figure pas dans ce chapitre : elle
  relève du décret n° 2018-1259 et de l'arrêté du 29 octobre 2019, **non lus
  dans ce lot**. Ne rien en affirmer.

### Verdict

**FONDÉE en droit. HORS du périmètre couvert par le produit.**

`src/lib/perimetre/couverture.ts:86` porte `CATEGORIES_COUVERTES = ["N5"]` : le
produit ne couvre **que la 5ᵉ catégorie**, et le déclare (axe `categorie_erp`).
Croisons :

- Un ERP de catégories 1 à 4 est soumis au DAE — mais le produit **se déclare
  déjà non couvrant** pour lui.
- Un ERP de 5ᵉ catégorie n'y est soumis que s'il figure aux a à h du 2°. **Aucun
  des trois secteurs cibles n'y figure** : un restaurant de quartier (type N),
  une supérette (type M), un bureau ne sont ni une structure d'accueil, ni un
  établissement de santé, ni sportif, ni une salle de danse, ni une gare, ni un
  aéroport, ni d'altitude, ni un refuge.

**Pour toute la population que Rojer prétend couvrir, l'obligation DAE ne
s'applique pas.** Ce n'est pas un trou du référentiel.

### Recommandation

**Ne rien encoder.** Mais **écrire l'exclusion**, parce qu'aujourd'hui elle
n'existe nulle part et que la prochaine relecture reposera la même question :

- une ligne « Défibrillateur automatisé externe (`R. 157-1` et s. CCH) » dans la
  liste « Hors périmètre (à ce jour) » de `.claude/CLAUDE.md` ;
- et surtout, un paragraphe dans `docs/couverture-declaree-du-produit.md`
  **rattaché à l'axe `categorie_erp`** : le DAE est la première conséquence
  nommable de `CATEGORIES_COUVERTES = ["N5"]`. Le document dit aujourd'hui de
  cet axe qu'il établit « qu'il existe » un manque, « pas de combien ». Le DAE
  en donne une unité.

**Un point à surveiller, en revanche** : si la propriétaire ouvre un jour les
catégories 1 à 4 — que la dette recense déjà comme « une part de la cible
déclarée », un restaurant de plus de 200 personnes étant en 4ᵉ —, **le DAE
devient dû sans condition** et redevient une obligation d'établissement à
encoder. À noter dans la dette, avec cette réserve.

---

## 4. La seconde branche de `R. 4323-23` — **FONDÉE, dans le périmètre, et c'est un vrai trou**

L'audit a raison, avec une correction de forme.

### La forme : `R. 4323-23` n'a pas « deux branches », il habilite plusieurs arrêtés

`R. 4323-23`, version en vigueur depuis le **1ᵉʳ mai 2008**
(https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018531479) :

> « Des arrêtés du ministre chargé du travail ou du ministre chargé de
> l'agriculture déterminent les équipements de travail ou les catégories
> d'équipement de travail pour lesquels l'employeur procède ou fait procéder à
> des vérifications générales périodiques afin que soit décelée en temps utile
> toute détérioration susceptible de créer des dangers. Ces arrêtés précisent la
> périodicité des vérifications, leur nature et leur contenu. »

C'est un **article d'habilitation** : il ne porte lui-même aucune périodicité, et
il ne comporte pas deux branches nommées. Ce qu'il fait, c'est renvoyer à un
**pluriel d'arrêtés**. Le dépôt n'en connaît **qu'un**.

`R. 4323-24` (version du 1ᵉʳ mai 2008, décret n° 2008-244 du 7 mars 2008) :

> « Les vérifications générales périodiques sont réalisées par des personnes
> qualifiées, appartenant ou non à l'établissement, dont la liste est tenue à la
> disposition de l'inspection du travail. Ces personnes sont compétentes dans le
> domaine de la prévention des risques présentés par les équipements de travail
> soumis à vérification et connaissent les dispositions réglementaires
> afférentes. »

### Le fait, dans le dépôt

L'en-tête de `src/lib/referentiels/conformite/levage.ts` (lignes 1 à 16),
**ouvert et lu**, énonce ses sources primaires : « Code du travail, articles
R. 4323-22 à R. 4323-28 », « Arrêté du 1ᵉʳ mars 2004 », « Arrêté du 2 mars 2004 ».
Rien d'autre. Le fichier est le seul du référentiel à citer `R. 4323-23`, et il
l'instruit **uniquement par le levage**. Le grep sur « 5 mars 1993 » sur tout le
dépôt rend **zéro**.

### Le texte non instruit

Arrêté du 5 mars 1993 soumettant certains équipements de travail à l'obligation
de faire l'objet des vérifications générales périodiques prévues à l'article
R. 233-11 du code du travail — `LEGITEXT000006060118`, **en vigueur**, articles
en vigueur depuis le 1ᵉʳ décembre 1993. `R. 233-11` est l'ancienne numérotation
de l'actuel `R. 4323-23` (recodification de 2008).

**Article 1ᵉʳ — vérification depuis moins de TROIS MOIS au moment de
l'utilisation** :

> presses mécaniques et presses hydrauliques pour le travail à froid des
> métaux · presses à vis · presses à mouler par injection ou par compression
> (matières plastiques, caoutchouc) · presses à mouler les métaux · **massicots**
> (papier, carton, bois, matières plastiques) · presses à façonner avec
> emporte-pièce · presses à platine (dorer, gaufrer, découper) · machines à
> cylindres pour caoutchouc · **presses à balles** · **compacteurs à déchets** ·
> systèmes de compactage des véhicules de collecte

avec cette restriction, qui est une **vraie condition et pas une glose** :

> « Ne sont toutefois soumis à une vérification générale périodique que les
> équipements de travail mus par une source d'énergie autre que la force humaine
> employée directement et dont le chargement ou le déchargement est effectué
> manuellement en phase de production. »

**Article 2 — vérification depuis moins de DOUZE MOIS** : centrifugeuses ·
machines mobiles d'extraction, de terrassement, d'excavation ou de forage à
conducteur porté · machines à battre les palplanches.

**Article 3** : contenu de la vérification, en quatre volets — a) examen visuel
(stabilité, fixation des protecteurs, état des matériaux, propreté, filtres,
liaisons électriques, hydrauliques et pneumatiques) ; b) essai de fonctionnement
(présence des dispositifs de protection, caractéristiques anormales de bruit ou
de vibration, arrêts automatiques et volontaires) ; c) réglages et jeux (niveaux
de fluides, pressions, ressorts, jeux anormaux, usure, fins de course) ;
d) indicateurs (appareils de mesure, dispositifs de signalisation).

### Pourquoi ça mord sur la cible

C'est le point que l'audit n'a pas fait, et c'est celui qui décide :

- **Presse à balles** et **compacteur à déchets** sont des équipements
  **ordinaires en commerce de détail** — la compaction des cartons en
  arrière-boutique de supérette ou de supermarché — et présents en restauration
  dès qu'il y a un volume d'emballages. Ce n'est pas de l'équipement industriel.
- **Massicot** motorisé : papeterie, imprimerie de quartier, certains bureaux.
- La périodicité est **trimestrielle**. Ce serait, après le nettoyage
  hebdomadaire des hottes, **la périodicité la plus courte du référentiel** — et
  la plus visible en contrôle, puisqu'elle produit quatre lignes par an.
- La restriction du dernier alinéa (énergie non humaine **et** chargement ou
  déchargement manuel en phase de production) est exactement une
  `equipement_propriete_booleenne` : le modèle sait l'exprimer, sans le
  cinquième déclencheur. C'est ce qui distingue cette famille de la pénibilité.

Les trois catégories de l'**article 2**, en revanche, ne sont pas plausibles dans
les trois secteurs cibles.

### Verdict

**FONDÉE. Dans le périmètre. Trou de couverture franc**, du même genre que le
travail en hauteur du lot D1 — à ceci près qu'ici le dépôt **cite déjà l'article
fondateur** et n'en a instruit qu'une partie, ce qui est plus trompeur qu'un
silence : `docs/referentiel-conformite.md:273` annonce « R. 4323-22 à R. 4323-28
(vérifications des équipements de travail) » comme dépouillés.

### Recommandation d'encodage

| Proposition | Fondement | Appuis | Porteur | Nature | Périodicité |
|---|---|---|---|---|---|
| Vérification générale périodique trimestrielle des machines de l'arrêté du 5 mars 1993 | Arrêté du 5 mars 1993, art. 1ᵉʳ | `R. 4323-23`, `R. 4323-24`, arrêté art. 3 | équipement | échéance récurrente | **`trimestrielle`** — le texte l'écrit : « depuis moins de trois mois au moment de leur utilisation » |

**L'article 2 (douze mois) : ne pas encoder** tant qu'aucun des trois secteurs
n'a de centrifugeuse, d'engin de terrassement à conducteur porté ni de machine à
battre les palplanches. L'écrire dans la `notesInternes`, pour que le prochain
lecteur n'ait pas à rouvrir l'arrêté.

**Prérequis** : le parc d'équipements ne connaît aujourd'hui ni « presse à
balles / compacteur à déchets » ni « massicot ». Il faut d'abord les créer comme
types d'équipement — sans quoi la ligne n'a aucun déclencheur.
`src/lib/equipements/hors-referentiel.ts` et l'axe `domaine_equipement` de la
couverture sont l'endroit où le manque se voit déjà aujourd'hui.

**Deux choses que je n'ai PAS lues, à ouvrir avant d'encoder :**

1. **L'arrêté du 4 juin 1993 « complétant l'arrêté du 5 mars 1993 »**
   (`LEGITEXT000006082252`). Légifrance le donne en vigueur, et sa page
   consolidée annonce qu'il modifie les articles 3, 4 et 5 de l'arrêté du 5 mars
   1993 — mais elle **ne rend pas le contenu de ces articles**. Il peut étendre
   la liste ou le contenu des vérifications. **À ouvrir en première main.**
2. **L'inventaire complet des arrêtés pris sous `R. 4323-23`.** Ce lot en a
   identifié deux (5 mars 1993, 1ᵉʳ mars 2004). Rien ne dit qu'il n'y en a pas
   d'autres qui mordent sur les trois secteurs. **Ne pas conclure de ce silence
   qu'il n'y en a pas.**

---

## Ce que ça fait au score de l'audit

| Famille | Verdict | Suite |
|---|---|---|
| Chapitre chaleur `R. 4463-1` à `-8` | **Fondée, dans le périmètre** | ~~2 obligations d'établissement à encoder~~ — **ENCODÉES le 2026-09-20** (`lot/chaleur-intense`), corpus `code-travail-chaleur-intense`. Deux écarts avec ce document : `R. 4463-6` a un second alinéa que la page de section tronquait, et `R. 4463-8` n'est PAS « déjà servi » par `PlanPrevention` (aucune ligne n'y nomme la chaleur) |
| Pénibilité / C2P | **Fondée, hors périmètre outillé** | Corpus `non_couvert` + déclaration, **pas** d'obligation |
| Défibrillateur | **Fondée, hors périmètre couvert** | Rien à encoder ; ~~exclusion à écrire~~ — **écrite le 2026-09-20** (`.claude/CLAUDE.md`, `docs/couverture-declaree-du-produit.md`, axe `categorie_erp`) |
| Seconde branche de `R. 4323-23` | **Fondée, dans le périmètre** | 1 obligation d'équipement, trimestrielle, après création du type |

**Quatre sur quatre existent en droit. Deux sur quatre donnent des obligations à
encoder.** Aucune n'était fausse ; **trois sur quatre portaient une imprécision
qui aurait été encodée telle quelle** — l'article de rattachement pour la
pénibilité, le facteur « postures » qui n'est plus déclarable, la formulation
DAE périmée depuis décembre 2025, et la « seconde branche » qui est en réalité
un second arrêté. C'est le rendement normal d'un audit honnête qui dit ne pas
avoir recoupé, et c'est exactement ce que le recoupement était censé attraper.

---

## Une cinquième famille, signalée et non tranchée : l'amiante des bâtiments

Le brief demandait de dire si une cinquième famille du même genre apparaissait.
En voici une, avec **la réserve qui va avec** : je n'en ai lu que deux articles,
et sa difficulté n'est pas juridique mais tient au porteur.

**Absence vérifiée dans le dépôt** : « amiante » n'apparaît que dans
`sante-travail.ts`, `corpus/code-travail-sante-travail.ts` et le formulaire de
plan de prévention. **Zéro occurrence** de `1334-29`, de `4412-97`, de « DTA »,
de « dossier technique amiante ». `R. 4412-160`, seul article amiante que le
dépôt ait touché, a été **abrogé** par le décret n° 2026-253 — c'est le sujet du
lot D2.

**Le texte, lu le 2026-09-01.** `R. 1334-29-5` du code de la santé publique,
version en vigueur depuis le 1ᵉʳ juillet 2021 (décret n° 2021-872 du 30 juin
2021), https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043841389 :

> **I.** « Les propriétaires mentionnés aux articles R. 1334-17 et R. 1334-18
> constituent et conservent un dossier intitulé "dossier technique amiante" »
> — rapports de repérage, évaluations périodiques de l'état de conservation,
> mesures d'empoussièrement, travaux, recommandations générales de sécurité,
> fiche récapitulative — tenu à jour.
> **II.** « Le "dossier technique amiante" est tenu par le propriétaire à la
> disposition des occupants » et des employeurs ; il est communiqué sur demande
> aux inspecteurs du travail, aux agents de l'État, aux services de sécurité
> sociale et à « toute personne physique ou morale appelée à effectuer des
> travaux dans l'immeuble bâti ».
> **III.** « La fiche récapitulative du "dossier technique amiante" est
> communiquée par le propriétaire dans un délai d'un mois après sa constitution
> ou sa mise à jour aux occupants de l'immeuble bâti et, **si cet immeuble
> comporte des locaux de travail, aux employeurs**. »

Côté code du travail, `R. 4412-97` (version en vigueur, dernière modification
décret n° 2019-251 du 27 mars 2019) fait porter le repérage avant travaux au
**donneur d'ordre, au maître d'ouvrage ou au propriétaire** qui décide d'une
opération à risque d'exposition, et lui fait joindre les dossiers techniques du
CSP et du CCH aux documents de consultation des entreprises.

**Pourquoi c'est du même genre que les quatre.** Un restaurant, un commerce ou
un bureau dans un immeuble dont le permis de construire est antérieur au
1ᵉʳ juillet 1997 est très exactement le cas ordinaire de la cible. Le produit
porte déjà l'année du permis de construire au titre du déclencheur n° 4
(« typologie et caractéristiques du bâtiment »), et le DTA est **le document
qu'on présente en contrôle** — ce que le produit dit faire.

**Pourquoi je ne conclus pas.** L'obligation de constituer le DTA pèse sur le
**propriétaire**, et l'utilisateur de Rojer est le plus souvent locataire.
Or l'ADR-019 pose que « le bâtiment est un lieu et ne porte aucune échéance » :
cette famille tomberait sur un porteur que le modèle a explicitement écarté.
Ce qui revient à l'employeur — obtenir le DTA, l'annexer à son évaluation des
risques, le fournir avant travaux — est réel mais **je ne l'ai pas établi
article par article**, et je ne l'affirme pas.

**Ce que je dis, et rien de plus** : il y a là une famille absente du dépôt,
réelle en droit, plausible pour la cible, dont **le porteur est le point à
trancher avant tout dépouillement**. Elle mérite un lot, pas une ligne.

---

## Le vrai sujet, dit une fois

Ces quatre familles ont trois causes distinctes, et aucune n'est un oubli :

1. **Le dépôt lit des articles, pas des textes.** Le décret n° 2025-482 a été
   ouvert par la porte de `R. 4225-2` et refermé aussitôt. Rien, dans la
   méthode, ne fait remonter d'un article modifié au texte qui le modifie.
2. **Le dépôt lit des articles, pas leurs arrêtés d'application.**
   `R. 4323-23` est un article d'habilitation ; l'avoir « dépouillé » sans
   énumérer ce qu'il habilite, c'est avoir lu la porte et pas la pièce.
3. **Le dépôt ne relit pas ce qu'il a déjà classé.** Le DAE a changé le
   7 décembre 2025 et `R. 157-4` le 22 avril 2026 ; rien ne les aurait signalés.

Les trois se soignent par la même chose, et c'est la conclusion de ce lot :
**une entrée de corpus devrait porter le texte modificateur, pas seulement
l'article modifié.** `ReferenceLegale` porte `versionEnVigueur` et `luLe` — il
lui manque « par quel texte », qui est précisément l'information qui aurait
évité les quatre.
