# Journal des vérifications réglementaires

Ce document répond à une seule question : **qu'est-ce qui a été relu dans le
droit, quand, comment — et qu'en a-t-on fait ?**

Il existe parce que la réponse n'existait nulle part. Elle ne vivait que dans
des messages de commit, que personne ne relit. Conséquence mesurée : le
2026-09-01, la propriétaire et une session Claude ont cru successivement
qu'aucune relecture n'avait eu lieu, puis que tout était vérifié, et ont failli
relancer une relecture complète de textes lus le 2026-08-26.

**Deux règles de tenue, et elles sont le document.**

1. *Un rapport rendu n'est pas un défaut corrigé.* La chronologie (partie 1)
   dit ce qui a été **cherché** ; le registre (partie 2) dit ce qui a été
   **appliqué**. Les deux ne se déduisent pas l'un de l'autre.
2. *Un état se relève dans le code, jamais dans un message de commit.* Chaque
   ligne d'état du registre porte sa preuve : un fichier, une commande, un
   chiffre qu'on peut refaire tomber.

Établi le 2026-09-01 sur `origin/main` = `840abe2`, référentiel
**2026-08-31.4** — 116 obligations, 226 lignes de référence, 276 articles au
corpus. Tous les chiffres de ce document ont été mesurés à cette révision, par
les commandes citées. Aucun n'est repris d'un rapport.

> **Ce document n'est pas le registre du projet.** Le registre vit dans le
> code — champs `statut`, `reserve`, `lecture`, `luLe`, `versionConstatee` du
> corpus — et se lit par `pnpm relecture`. Ce document est ce que le code ne
> sait pas dire : *l'histoire*, et l'état des constats faits **hors** du code,
> dans des rapports. Voir la partie 3.

---

## Partie 1 — Chronologie des campagnes

Ne sont retenues ici que les campagnes qui **ouvrent un texte de droit**. Les
revues d'écran, les contrôles visuels et les audits de surface produit n'y
figurent que lorsqu'ils ont produit un constat réglementaire.

Pour chacune : **quand · par quoi · sur quoi · comment lu · ce qui en sort · ce
qui a été appliqué.** La dernière colonne est celle qui manquait.

Trois provenances de lecture sont distinguées partout, selon le vocabulaire que
le code s'est donné (`SourceLecture`, `corpus/types.ts`) : **première main**
(la personne qui encode a ouvert Légifrance et relevé le verbatim), **agent**
(un agent a ouvert Légifrance et rapporté le verbatim — « vaut constat, pas
garantie »), **indirect** (source secondaire — interdit de fonder une entrée).

---

### C1 · 2026-08-20 → 08-21 — Recalages ponctuels, sans aucun dispositif

**Périmètre** — deux obligations, prises isolément.
**Méthode** — lecture ciblée d'un article, sans trace structurée : à cette date
le corpus n'existe pas, aucun champ ne porte la version lue ni la provenance.

- `648969f` (08-20 22:25) *Le registre s'appuie sur l'article qui l'autorise,
  pas sur celui qui le range* — **première mise en cause de `L. 4711-5`**.
- `23ac89b` (08-21 11:20) — l'éclairage de sécurité en lieu de travail est
  rattaché à `R. 4227-14` et à l'article 11 de l'arrêté du 14 décembre 2011.
  Deux obligations créées. Point de départ du sur-appel documenté en 2.A #1.

**Appliqué** : oui, intégralement — mais rien ne le mesure, et rien ne
l'indexe. C'est le régime dont tout ce qui suit cherche à sortir.

---

### C2 · 2026-08-23 — Le froid, et la citation approximative

**Périmètre** — le domaine froid (`R. 543-79` c. env., règlement UE 517/2014),
plus quatre obligations ERP.
**Méthode** — **première main**, version datée relevée (« Texte relu sur
Légifrance le 23 août 2026, version en vigueur au 1ᵉʳ janvier 2025 »).

- `4c7cbd6` *Une paraphrase entre guillemets escamotait le maillon décisif* —
  une citation entre guillemets **n'était pas le texte** : elle laissait tomber
  « dans les conditions définies par arrêté », c'est-à-dire le maillon qui
  explique la chaîne des périodicités. « Sur un document opposable, une
  citation approximative vaut une référence inventée. »
- `609efd8` *EC 15 ne vérifie rien, il renvoie* · `32a53d3` *Le relais annoncé
  remplaçait quatorze actes par an par un seul* · `415b30f`.

**Sortie** — 4 constats. **Appliqué** : les quatre, le jour même.
**Ce qui reste** : le sort de `EC 15` sera repris par la nuit du 26 (§ 5 #4),
signe que le constat de C2 n'a pas été enregistré là où on le retrouverait.

---

### C3 · 2026-08-25 — « Sources relues sur Légifrance », premier audit large

`2d341ac` (16:25), avec ses reliquats `802232d`, `ab0b85b`, `6c52292`.

**Périmètre** — six limites du dossier de relecture : frontière 4ᵉ/5ᵉ catégorie
ERP (10 articles de seuils), champ de `R. 4227-34`/`-39`, ascenseurs (`L. 134-1`,
`L. 134-3`, `R. 134-11`), RIA, ESP, prescriptions particulières. Plus « l'audit
des références du référentiel mené en parallèle » — URL, périodicités.
**Méthode** — **première main** revendiquée : « Chaque encodage s'appuie sur un
texte relu le 2026-08-25, cité avec son article, sa version et son URL dans le
code. »
**Appliqué** — oui, et c'est la campagne qui installe l'habitude de citer la
version.

**Mais.** Le lendemain, `7736869` établit que cet audit a manqué `R. 143-44`,
réécrit deux mois plus tôt : *« la description encodée reprenait la version
antérieure — deux mois de retard, alors que l'audit du 25 août était
sérieux. »* La cause est nommée, et c'est une leçon de méthode : la référence
était rangée en « citée pour information », et *« un audit relit ce dont le
moteur se sert ; ce que le code a déclaré décoratif, personne ne le rouvre. »*

---

### C4 · 2026-08-26, journée — Le jour où le dépôt s'est donné des instruments

C'est la journée pivot. Elle commence par deux erreurs constatées et finit par
un corpus.

**Les deux erreurs qui déclenchent tout** (16:11–16:12) :

- `7736869` — `R. 143-44` CCH cité dans sa version périmée depuis deux mois.
- `dbf511f` — *Deux PDF présentés à une commission citaient un article
  abrogé.* `R. 146-21` CCH, **abrogé par le décret n° 2025-1100**, et qui
  n'avait jamais traité du registre. Le référentiel avait été corrigé à l'audit
  d'août ; *« la correction n'était jamais descendue dans les documents. C'est
  pourtant le document qu'on tend à l'inspection, pas le référentiel. »* Même
  commit : le badge `L. 4711-5` annonçait « c'est le fondement du registre
  unique » — deuxième passage sur cet article.

**Les instruments, dans l'ordre où ils naissent** :

| Heure | Commit | Ce qui est créé |
|---|---|---|
| 16:36 | `ca7d448` | `ReferenceLegale.versionConstatee` et `Obligation.relectureDue`, **et un test qui rougit quand une relecture est due**. Mesure d'entrée : sur 78 obligations, 56 portaient des notes, 33 citaient une année, **3 seulement un vrai rendez-vous — dont deux échus depuis des semaines**. |
| 16:44 | `22a62aa` | `TEXTES_A_VENIR` — les textes à application différée qui ne visent aucune ligne existante. |
| 17:21 | `12480ee` | **Le premier corpus lu de bout en bout** : 58 articles du Livre III (PE, PO, PU, PX). Crée le statut `obligation_manquante`, parce qu'« un article lu, dans le périmètre, qui impose quelque chose que le référentiel ne porte pas n'avait aucune case ». Résultat : **un seul** article y crée une obligation périodique hors hôtels, `PE 4`. |
| 17:46 → 19:04 | `e26dc32`, `8631d15` | La **clé d'article** : les 138 références du référentiel portent chacune la leur, ce qui rend le rapprochement corpus ↔ référentiel mécanique. |
| 19:19 | `5c6f96f` | **Les dix domaines dépouillés** : 23 corpus, 142 articles, chacun avec sa version constatée et la provenance de sa lecture. **La dette « obligation appuyée sur un texte non lu » passe de 78 à 1.** |
| 19:49 | `1e01484` | `referencesLegales[0]` devient le fondement déclaré (ADR-003) — le test anti-doublon s'en sert. |

**Ce que le dépouillement trouve, et qui est appliqué le soir même** —
`GZ 30` abrogé et son URL en 404 · `R. 134-13` « dans le mois » ≠ « trente
jours » · deux affirmations retirées faute d'article qui les porte ·
`R. 4222-20` porté en fragments (`b91fcda`) · `EL 18 § 4` à deux rythmes
(`08e2e2e`) · le doublon des portails (`59fdc3f`) · la contradiction interne
des ascenseurs (`1089e4a`, `5bf3210`) · `PE 37` (`99d0f87`, qui corrige un
commit du matin) · `GC 1` (`9814bb3`) · le rapport quadriennal ignoré
(`beef8e0`) · `PO 8 § 1` et `PO 12` (`9f13f91`).

**Et une contre-vérification indépendante** — `3c14fcf` (20:09) : un agent sans
les rapports d'origine ni le raisonnement, « avec pour consigne que trouver une
erreur était le résultat le plus utile ». **5 corrections sur 6 confirmées, une
infirmée** (`EL 18 § 4` : l'énumération `Periodicite` n'a pas de valeur
quinzomadaire), plus deux défauts non vus. C'est le premier dispositif de
recoupement du dépôt, et il fonctionne.

---

### C5 · Nuit du 26 au 27 août — Six agents, 123 articles

`618a91a` (23:09) dépose `docs/relecture-source-2026-08-26.md` ; `6dfbc85`
(23:12) y ajoute le sixième rapport.

**Périmètre** — « les 123 articles que le corpus portait en `agent_verbatim` »,
c'est-à-dire tout ce qui, à 19:19, était déclaré lu par un agent et non recoupé.
Six rapports : Code du travail, Livre III ERP, Livre II ERP, froid/aération,
ascenseurs, arrêtés divers.
**Méthode** — **agent, sur Légifrance, verbatim rapporté**, avec recoupement
partiel en première main par la session pilote. Le document se donne trois
niveaux explicites : `CONTRE-VÉRIFIÉ` (relu à la source par la pilote),
`À CONTRE-VÉRIFIER` (rapporté, plausible, non recoupé), `SUR-APPEL` (l'agent
conclut à un défaut qui n'en est pas un). **Aucun des 123 n'est resté
illisible.**

**Sortie** — dix sections, dont huit de constats à trancher : environ
**40 constats**, dont 5 rattachements sans base textuelle, 6 fondements à
recaler, 6 champs d'application trop étroits, 11 rythmes non portés, 3
sur-couvertures, 5 URL fausses, 5 fondements mis en cause. Plus un motif
dominant, chiffré : **le second rythme du même article, sur au moins quinze
articles.** « Le référentiel a été construit en retenant une périodicité par
article. Le droit n'est pas écrit comme ça. »

**Appliqué cette nuit-là** — deux choses seulement, et le commit le dit :
« **Rien n'est appliqué. La décision revient à l'utilisatrice.** »

**Appliqué depuis** — voir la partie 2, qui reprend les dix sections une par
une. En résumé : la section mécanique (URL) est soldée, deux rattachements sur
cinq sont corrigés, les six champs d'application sont ouverts à cinq sur six,
et **trois constats visaient un état déjà révolu sans que le document le
sache** — dont deux révolus depuis moins de quatre heures. (Deux autres sont
sans objet, mais le document les signalait lui-même comme tels : ceux-là ont
bien fonctionné.)

---

### C6 · 2026-08-27, 11:16 → 11:55 — Ce que la nuit a rendu applicable

Quarante minutes de commits, et c'est tout ce que la nuit a produit
directement.

| Commit | Ce qu'il fait | Méthode |
|---|---|---|
| `5826fc5` | Les cinq adresses fausses du corpus, **chacune rouverte avant substitution** : « je ne substitue pas une URL fausse par une autre sans avoir ouvert la page » | première main |
| `d9770b4` | Trois périodicités affichées sans qu'aucun texte ne les donne | première main |
| `491157c` | **Sur onze accusations portées contre nos fondements, deux tenaient** : `R. 4412-17` sur les deux obligations de stockage, `MS 73` + `GC 8` sur l'extinction automatique | première main, verbatim au corpus |
| `f4124e1` | **Six rythmes que le référentiel ne porte pas, inscrits au corpus et non en note de bas de page** — « chacun bute sur un porteur qui n'existe pas, et inventer le rattachement reviendrait à décider à la place du texte » | déclaration, pas encodage |
| `9f54964` | **`pnpm relecture`** — la « requête mécanique » que le § 2.1 du document réclamait. Mesure d'alors : 85 obligations, 155 références, 152 articles dépouillés, 0 jamais lu | relevé mécanique |

**Le rapport d'application de la nuit est donc : ~40 constats → 2 fondements
corrigés, 5 URL, 6 rythmes déclarés, 1 outil.** Neuf sur onze accusations sur
les fondements étaient des sur-appels. Ce chiffre — **deux sur onze** — est la
mesure la plus honnête de ce que vaut une lecture d'agent non recoupée, et il
justifie à lui seul le champ `lecture`.

`9f54964` nomme au passage trois défauts que rien ne portait, dont celui qui
reviendra deux fois : *« Dix-sept références nomment plusieurs articles et ne
portent qu'une clé […] Les autres ne sont ni déclarés lus ni surveillés : c'est
le mécanisme exact qui avait fait rater R. 4544-11-1, créé en octobre 2025 sur
un article voisin de celui que la clé désignait. »*

---

### C7 · 2026-08-27 après-midi — ADR-022, le modèle cesse de bloquer

`9ecef5e` *Une échéance peut naître d'autre chose qu'un équipement déclaré* ·
`bd6db71` *Le porteur d'échéance devient l'établissement, et deux articles
cessent d'être muets.*

Ce n'est pas une campagne de lecture, c'est **la levée du blocage qui empêchait
d'appliquer une famille entière de constats** : jusque-là une obligation ne
pouvait s'accrocher qu'à une catégorie d'équipement déclarée. Trois constats de
la nuit du 26 attendaient cela. Le lot qui les traite viendra quatre jours plus
tard (C9) — l'écart entre la levée du blocage et son exploitation est un des
endroits où la mémoire du projet a coûté cher.

---

### C8 · 2026-08-28 — Le balayage des URL Légifrance, et la troisième mise en cause de `L. 4711-5`

**Périmètre** — les **127 URL Légifrance du dépôt**, ouvertes une par une.
**Méthode** — ouverture manuelle, « seule l'ouverture une par une l'a montré,
et personne ne rouvrira 127 pages à chaque commit ».
**Sortie** — **17 fausses**. La plus coûteuse : `LEGIARTI000018530833`, annoncé
« R. 4121-1 · document unique », servait `R. 4412-49` — « la pastille affichait
un extrait du DUERP à côté d'un lien vers un texte sans rapport ». Rien ne
pouvait le voir : l'URL répond 200, la page s'ouvre, elle est en vigueur.

**Appliqué** — oui : `80ad4c5`, `3dec0a4`, `8bba612`, `5d8fbf6`, `ed7f772`,
`11e0c2e`, plus la garde `f0cd868` (`urls-legifrance.test.ts`) — *un article
cité deux fois porte le même identifiant*, avec normalisation des graphies
testée, et une dérogation assortie d'une condition de péremption (« une
dérogation sans condition de péremption devient une permission permanente »).
La garde dit elle-même ce qu'elle ne prouve pas.

**Et `3d4ee41` (12:05)** *L. 4711-5 ne fonde pas le registre de sécurité* —
troisième passage sur le même article en huit jours (`648969f` le 20,
`dbf511f` le 26, celui-ci le 28), et il reviendra une quatrième fois le 31.
**Aucun de ces quatre passages ne savait que les trois autres avaient eu lieu.**
C'est le meilleur argument pour ce journal.

---

### C9 · 2026-08-31 — Trois lots en parallèle : 85 obligations deviennent 116

La plus grosse campagne du dossier, et la première conduite par briefs écrits
d'avance (`e8cd15f`, `d7c8171`, `f964574`, 15:24–15:49).

**Palier 1 — faux négatifs d'ancrage** (`a2186cf`, `35c5f90`)
*Périmètre* : six obligations accrochées à une catégorie d'équipement qui ne
les conditionne pas. *Méthode* : relecture au verbatim avant tout encodage.
*Sortie* : **trois rebranchées au porteur établissement, trois refusées — et
l'agent a eu raison de refuser les trois.** Le commit de la session pilote
s'intitule *Trois de mes six « faux négatifs » n'en étaient pas*, et nomme la
cause : « la carto et une note recopiées sans être recoupées sur les textes ».
Il ajoute la phrase qui résume tout le dossier : **« Une note qui dit "à faire"
ne dit pas que ça reste à faire. »**
*Trouvaille hors brief* : la branche `travail: true` du registre reposait sur
`L. 4711-5`, une faculté. Corrigée. → partie 2, § 2.2 #4.

**Lot 7 — dépouillement salarié** (`3cd8b72`)
*Périmètre* : **38 articles lus sur Légifrance**, quatre corpus, treize
obligations — formation à la sécurité, suivi médical, secours, conduite.
*Résultat* : 85 → 98 obligations, 10 → 13 domaines ; le catalogue de titres de
salarié passe de 1 à 9 lignes. *Choix signalés comme discutables* : trois
périodicités du suivi médical sont des **plafonds**, pas des rythmes.

**Lot 8 — socle employeur** (`022fadd`)
*Périmètre* : **28 articles**, six corpus, quinze obligations — organisation de
la prévention, information des travailleurs, locaux sociaux, co-activité.
98 → 113 obligations. *Sortie remarquable* : **trois références du brief
étaient fausses et la lecture les a corrigées** (`R. 4224-16` n'est pas un
affichage mais un document consigné ; le protocole de chargement ne se fonde
pas sur l'arrêté de 1996 mais sur `R. 4515-1` et s. ; le règlement intérieur
n'entre par la santé-sécurité que par `L. 1321-1 1°`), plus une quatrième
vérification **négative** consignée en `sans_objet` « pour que personne ne
refasse le détour ».

**Assemblage** (`888a32c`, 17:09) : **85 → 116 obligations, 10 → 17 domaines.**
Un bureau de six personnes sans aucun équipement déclaré recevait une
obligation le matin, il en reçoit dix-sept.

**Le soir**, seconde vague de relecture sur les rapports eux-mêmes : `ab87ced`
*Un article abrogé cité comme droit vivant, et trois intervalles jamais
ouverts* · `157fd4c` `R. 4544-11` inscrit · `5955414` `L. 4622-1` remis ·
`45fbb00` *Le seul renvoi d'intervalle que le lot 8 laissait sans nom* ·
`774d9c0` `PE 37` · `032bc22` le II de `R. 4624-23`. Puis `fcc63cd` /
`41c050b` : **la nature d'une obligation devient un champ (ADR-026)**, sur
dépouillement, « et deux consignes que la lecture a corrigées ».

---

### C10 · 2026-09-01 — Plan de bataille, six lots, trois sources recoupées

`4ff5b5f` (11:25) : *« Ma liste scellée avant l'audit, l'audit externe
indépendant et les six axes de la revue d'assemblage. **Aucune des trois ne
contenait les deux autres.** »*

| Lot | Périmètre | Méthode | Sortie · application |
|---|---|---|---|
| **D2** `d797d23` | décret n° 2026-253 du 8 avril 2026 : 7 articles, 13 articles de code touchés | première lecture du décret, **puis croisement mécanique** contre les 116 obligations et les 237 articles des 33 corpus | Un seul point de contact (`R. 4624-23`), conforme mot pour mot. **Aucune obligation n'est fausse.** Trois affirmations que le dépôt tirait du décret sans l'avoir ouvert sont corrigées |
| **D3** `39a6e94` | les quatre familles relevées par l'audit externe et non recoupées par lui | recoupement en droit, **lot en lecture seule, aucun fichier de `src/` modifié** | Les quatre existent ; deux donnent des obligations à encoder (chapitre chaleur `R. 4463-1` à `-8` ; VGP trimestrielle de l'arrêté du 5 mars 1993 sur presses à balles, compacteurs et massicots). **Rien encodé** |
| **D1** `c21beb9`, `d8e3758` | travail en hauteur : **section 8 lue INTÉGRALEMENT, 33 articles `R. 4323-58` à `-90`**, plus l'arrêté du 21 décembre 2004 art. 1 à 7 | agent, Légifrance, 2026-09-01 ; **la borne réelle relevée à la source** — « "et suivants" n'annonçait pas le paragraphe des échelles » | 40 articles dépouillés, corpus neuf. Trois périodicités opposables trouvées, **aucune dans le Code** |
| **A, B, C, E** | exclusions mutuelles, cohérence du corpus, public reçu indéterminé, phrases qui mentent | mixte | `d8de57c` (`L. 4622-1` cessait d'être déclaré manquant **et** encodé), `2fdab49`, `fcb49b9`, `4f2d1ad`, `d915db1` |

Tous ces lots sont sur `origin/main`.

**Deux campagnes du 1er septembre ne le sont pas** — elles vivent sur
`integration/2026-09-01-recadrage` :

- `dfac392` **la confrontation à un guide professionnel** (Qualiconsult) —
  quatrième angle après la liste scellée, l'audit externe et la revue. Le
  référentiel est **trois fois plus juste que le guide** (`PE 4` : le guide
  donne un an, le texte trois depuis l'arrêté du 1er décembre 2025 ;
  l'habilitation électrique : le guide affiche la NF C 18-510 comme du droit ;
  les échelles : un annuel qu'aucun article ne fonde). Quatre pistes, **aucune
  encodée sur la foi du document — « il est commercial, il date de novembre
  2021, et il dit lui-même n'être pas exhaustif »**. C'est l'application la
  plus nette de l'interdiction du niveau `indirect`.
- `f758fb8` **le semestriel des gaines de recyclage** — voir l'encadré de la
  partie 2, § 9.2. Lu le 26 août, déclaré manquant en majuscules dans le code
  le 27, posé le 1er septembre, **et toujours pas sur `main`**.

---

### C11 · 2026-09-03 — Trois questions d'onboarding, et ce qu'on trouve en cherchant à qui un texte s'adresse

**Périmètre** — trois questions du produit qui, mesurées en appelant le moteur,
ne changeaient aucune des 145 obligations : la **classe d'IGH** (10 valeurs,
obligatoire), la **famille d'habitation** (5 valeurs, obligatoire), et la case
« robinets d'incendie armés » posée sur chaque extincteur.

**Méthode** — l'inverse de l'ordre habituel. D'abord un comptage, qui dit
seulement « ça ne sert pas AUJOURD'HUI » ; puis la lecture des deux règlements,
seule à pouvoir dire « et ça ne DEVRAIT pas servir ». Agent sur Légifrance, deux
lectures indépendantes par paragraphe décisif, la seconde exigeant la
reproduction mot pour mot.

| Question | Ce que le texte dit, et À QUI | Sortie |
|---|---|---|
| **Classe d'IGH** | `GH 5` : « **Les propriétaires** font effectuer… », aucune modulation par classe. `GH 4 § 3` : seule périodicité indexée sur la classe de tout l'arrêté, sujet « **la commission de sécurité** ». `GH W 5 § 2` : la seule obligation d'un chapitre de classe qui vise l'occupant, et elle **ne distingue pas GHW1 de GHW2**. `GH 66` : le classement retient « l'usage **principal** de l'immeuble », les dispositions de chaque classe s'appliquant « dans chacune des parties concernées » | **Question retirée** de l'onboarding et de la fiche. Colonne et énumération conservées |
| **Famille d'habitation** | Art. 101, obligation périodique centrale : vise « **le propriétaire** », aucune famille. Titres II à VI balayés (le titre V lu en entier) : rien de conditionné par la famille en exploitation | **Question retirée** |
| **RIA sur extincteur** | Rien à lire : la `notesInternes` de `incendie-erp-ria-annuelle` posait le critère de retrait, et `ff87f4b` (2026-08-25) atteste qu'il est rempli — reprise appliquée en production, plus aucun extincteur porteur de la clé | **Question retirée**, neuf jours après ses deux retraits jumeaux |

**CE QUE LA LECTURE A RAPPORTÉ EN PLUS, et c'est l'argument contre le retrait
d'une question sans ouvrir son texte** — deux obligations réelles, versées au
corpus en `obligation_manquante`, **aucune encodée** :

- **`GH 61 § 5`** — « Dans les locaux autres que les locaux d'habitation, **les
  occupants** sont tenus de faire établir, par un organisme agréé, un rapport de
  vérification de conformité de la charge calorifique. […] puis **périodiquement
  tous les cinq ans**. » Le destinataire est l'employeur locataire de bureaux
  dans une tour, c'est-à-dire l'utilisateur du produit, et cela ne dépend
  d'aucune classe. Le corpus la connaissait de loin par `GH 5 § 3.1.4` et en
  donnait une raison de non-encodage **fausse** — « faute de catégorie
  d'équipement » — corrigée ce jour : son porteur est l'établissement, et
  **rien au modèle ne la bloque**.
- **Arrêté du 31 janvier 1986, art. 78-1** — créé par l'arrêté du 27 juillet
  2026, en vigueur depuis le **3 août 2026**. Contrôle visuel annuel des boxes
  de stockage d'un parc annexe, consigné au registre de l'article 101. Il
  dément la phrase que le corpus portait depuis deux jours, « la seule
  obligation périodique du texte est l'article 101 ». Bloqué : pas d'attribut de
  parc annexe, et un débiteur — « **le gestionnaire** » — qui n'est ni le
  propriétaire ni l'exploitant.

**DEUX PIÈGES DE LÉGIFRANCE, dont un inédit au registre du dépôt.**

1. **La page consolidée produit aussi des FAUX NÉGATIFS.** Interrogée sur les
   occurrences d'« entretien », « vérifi », « une fois par an » entre les
   articles 5 et 96 de l'arrêté de 1986, elle a répondu « aucune occurrence ».
   L'article 78-1, dans cette plage, contient « au moins une fois par an » et
   quatre fois « contrôle ». Le dépôt savait déjà que cette page **fabrique** du
   contenu (art. 100) et invente des périodicités (art. 102) ; il sait
   maintenant qu'elle **nie ce qui s'y trouve**. Sur ce texte, un négatif rendu
   par la page consolidée ne vaut rien.
2. **Un article long peut être rendu silencieusement RÉSUMÉ.** `GH 61 § 5` et
   l'art. 78-1 ont tous deux été rendus tronqués au premier appel — dans le cas
   de `GH 61`, la phrase manquante était précisément celle qui porte les cinq
   ans. La parade qui a marché : redemander le paragraphe décisif SEUL, mot pour
   mot, puis poser une question fermée sur le point qui tranche.

**Application** — trois questions retirées, deux corpus amendés (5 articles IGH
dépouillés là où il n'y en avait qu'un, art. 78-1 ajouté à l'habitation), deux
affirmations du dépôt corrigées parce qu'elles étaient fausses, une dissymétrie
du moteur fermée (`evaluerIgh` ne rejetait pas comme `evaluerHabitation` sur
l'attribut non renseigné — devenu un faux négatif certain une fois la question
retirée). **Zéro obligation encodée**, et c'est délibéré : une obligation ne
s'encode pas en effet de bord d'une question à laquelle elle ne répond pas.

---

### C12 · 2026-09-04 — Refaire les lectures qu'un lot n'a pas pu finir, et confirmer ce qu'il n'a pas pu prouver

**Périmètre** — les quatre choses que le lot C11 a lui-même nommées comme non
établies : `GH 61 § 5`, rapporté mais reçu tronqué au premier appel ; les
**36 articles** de l'arrêté de 1986 écartés sur leur seul intitulé de plan ; le
corps de `GH 5`, non relu au mot près ; `GH U 16`, jamais rendu par Légifrance.
Plus la vérification du faux négatif de la page consolidée.

**Méthode** — la parade que C11 recommandait, poussée d'un cran : ne pas se
contenter de deux lectures concordantes, mais **chercher un recoupement qui ne
partage pas le même angle mort**. Deux lectures d'une même page peuvent être
tronquées au même endroit ; un AUTRE ARTICLE, non.

| Question de C11 | Ce que la relecture établit |
|---|---|
| **`GH 61 § 5` dit-il bien ce qu'on lui prête ?** | **OUI, au mot.** L'article compte **sept paragraphes**, tous couverts par deux demandes disjointes (§ 1-4, puis § 5-7) ; deux lectures indépendantes annoncent d'elles-mêmes le compte de sept. Quatre appels sur **trois URL distinctes** rendent le § 5 identique. Et surtout `GH 5 § 3.1.4`, article DIFFÉRENT lu séparément, porte la même quinquennale — c'est le seul recoupement sans angle mort commun. Destinataire : « **les occupants** » des locaux autres que d'habitation. Réalisateur : « un **organisme agréé** ». Version du 1ᵉʳ avril 2012, aucun modificateur, aucune version future |
| **Les 36 articles écartés sur leur intitulé** | **Ouverts** — et par prudence sur leur identité, ce sont les **82 articles** des titres II, III, IV et VI qui ont été relus un par un sur leur page individuelle (5-16, 17-29 bis, 30-43, 44-57, 58-64, 77-80, 81-96). **80 sont constructifs**, l'exclusion devient donc une lecture. **Deux ne le sont pas** : l'art. 78-1, déjà connu et confirmé au mot, et **l'article 60, 1, que personne n'avait vu** |
| **Le corps de `GH 5`** | **Relu au mot près, réserve levée.** Trois choses en sortent, absentes de tous les relevés antérieurs : la phrase « les vérifications […] **hormis les vérifications de la charge calorifique** […] sous la responsabilité d'un même organisme agréé », qui explique pourquoi `GH 61` charge l'occupant ; un **délai d'un mois** de remise en état après vérification (§ 6), régime que le produit ne connaît pas ; et la confirmation que les « 20 % par an » sont un bouclage interne à l'annuel |
| **`GH U 16`** | **Rendu, et il ne porte rien.** Une phrase, une liaison technique entre le PC sécurité et le centre de traitement de l'alerte. Ni périodicité ni débiteur. Retrouvé en demandant au plan consolidé son **identifiant de lien** — jamais son contenu —, puis vérifié en ouvrant la page, qui annonce elle-même « Article GH U 16 » |

**CE QUI EST ENCODÉ, ET C'EST LA PREMIÈRE FOIS QUE LE RÈGLEMENT IGH PRODUIT UNE
LIGNE POUR L'OCCUPANT** — `incendie-igh-charge-calorifique-quinquennale`,
porteur établissement, quinquennale, `organisme_agree`, `typologies: { igh: true }`
**sans restriction de classe**. Les dix autres obligations `igh` du référentiel
pèsent sur le propriétaire ou l'exploitant de l'immeuble ; celle-ci pèse sur
l'employeur qui y loue ses bureaux, c'est-à-dire sur l'utilisateur du produit.
Le corpus la portait depuis la veille en `obligation_manquante` avec une raison
de non-encodage fausse — « faute de catégorie d'équipement » — alors que rien au
modèle ne la bloquait. Ce que la moitié restante coûte est écrit en réserve : le
premier cycle, « dans l'année qui suit l'installation dans les lieux », est un
déclencheur d'événement que le modèle ne porte pas.

**CE QUI N'EST PAS ENCODÉ, ET POURQUOI** — **arrêté du 31 janvier 1986,
art. 60, 1** : « Le fonctionnement du groupe électrogène et du dispositif de mise
en marche automatique doit être vérifié **au moins une fois par mois**. » C'est
la périodicité la plus courte du texte, en vigueur **depuis 1986**, et elle a
traversé deux dépouillements. Trois choses la bloquent, dont une qui mérite
d'être connue : son déclencheur réel est un groupe électrogène de secours
alimentant un ventilateur de VMC, que le modèle ne connaît pas ; l'accrocher à
la catégorie `VMC` ferait tomber une ligne **mensuelle** sur la quasi-totalité
des VMC déclarées — ce n'est plus une sur-application visible et corrigible,
c'est du bruit ; et l'article, écrit à la voix passive, **ne nomme aucun
débiteur**. Versée au corpus en `obligation_manquante`, avec le déblocage nommé
(une propriété booléenne d'équipement, pas une migration).

**LE PIÈGE DE C11 EST CONFIRMÉ, ET IL EST PIRE QUE DÉCRIT.** Voir le § 2.D
ci-dessous, qui devient le registre des pièges de Légifrance.

**Application** — une obligation encodée (145 → **146**, remesuré en appelant),
un corpus IGH passé de cinq à six articles dépouillés avec `GH 61` en `retenu`,
un corpus habitation dont la plage 5-96 est dépouillée, deux affirmations du
dépôt corrigées parce qu'elles étaient fausses (« l'article 101 est l'unique
obligation périodique du texte », deux fois amendée et encore fausse ; « de son
article GH 5, l'outil porte les vérifications annuelles, et rien du reste », sur
la page de couverture, qui sous-annonçait à l'occupant la seule ligne dont il
est le débiteur).

---

### C13 · 2026-09-04 — Les sept derniers articles à rythme du Livre II, et deux obligations que rien ne bloquait

**Périmètre** — deux choses sans rapport, réunies par le même mandat.

*Partie 1, ce que le corpus portait déjà et que personne n'avait encodé.*
`R. 4223-11` (document consignant les règles d'entretien du matériel
d'éclairage) et `R. 4323-24` (liste des personnes qualifiées tenue à la
disposition de l'inspection du travail). Les deux étaient dépouillés, datés,
avec verbatim et texte modificateur, et **les deux portaient dans leur propre
motif la phrase qui disait qu'il n'y avait rien à débloquer** : « Rien ne bloque
techniquement : c'est un article qu'on n'avait pas lu » pour le premier, « Rien
de technique : […] ce qui manque est l'encodage lui-même » pour le second.
**Aucune lecture nouvelle n'a été nécessaire ; il a fallu une heure chacun.**
C'est la troisième et la quatrième sortie de la liste des `obligation_manquante`
par livraison plutôt que par requalification, après `GH 61` la veille.

*Partie 2, les sept articles du Livre II de l'arrêté du 25 juin 1980.* La mesure
du 2026-09-03 (`docs/revues/denominateur-livre-2-erp.md`) avait établi sur la
donnée officielle de la DILA que **dix-neuf articles seulement portent un
rythme** pour un ERP de type N ou M, tous au Titre Ier, et que le corpus en
citait douze. Les sept manquants ont été ouverts un à un à la source : `AS 9`,
`AS 10`, `MS 69`, `MS 71`, `CH 39`, `GC 18`, `CO 61`.

**Méthode, et les trois pièges du § 2.D rencontrés.**

1. **Le plan tronqué, une fois de plus.** La page de plan du Livre II s'arrête
   au chapitre II ; celle du Titre Ier, à mi-chapitre Ier. Aucun sommaire n'a
   servi de source. La structure a été reconstituée de proche en proche par les
   liens « section précédente / section suivante » (`?idSecParent=`), chaque
   page annonçant son intitulé et son intervalle d'articles.
2. **Un identifiant fabriqué, écarté par un 404.** Interrogée sur les chapitres
   du Titre Ier, la lecture automatique a rendu « Chapitre II : Construction —
   `LEGISCTA000020303864` ». Cette section n'existe pas ; le vrai identifiant
   est `LEGISCTA000020303891`, atteint par le lien « section précédente » du
   chapitre III. **La parade n'a pas été une seconde lecture de la même page,
   c'est l'ouverture de l'URL** — un identifiant inventé se dénonce en 404, un
   intitulé inventé ne se dénonce pas.
3. **Deux articles longs relus par question fermée** (parade n° 8), le
   paragraphe décisif redemandé seul : `CO 61 § 6` et `MS 71 § 3`. Les deux
   relectures rendent le même chiffre.

**Un désaccord dans la source, signalé et non lissé.** La page d'article de
`MS 69` annonce « Version en vigueur depuis le 15/08/1980 » et, dans le même
bandeau, « Modifié par Arrêté du 2 février 1993 ». Les deux ne peuvent pas être
vraies ensemble. `versionEnVigueur` porte la date que la page affiche comme
telle, `modifiePar` le texte qu'elle nomme, et le corpus dit que le désaccord
est dans la source — la lecture vient d'une page d'ARTICLE, pas d'une
consolidée.

| Article | Ce qu'il porte | Sort |
|---|---|---|
| **`AS 9`** | Ascenseurs : vérification par **organisme agréé** tous les **cinq ans**, et avant remise en service après transformation importante | **`retenu`, sans ligne neuve.** Le CCH sert déjà le même acte (`ascenseur-controle-technique-quinquennal`, `R. 134-11`). AS 9 est ajouté **en contexte** sur l'obligation existante : une seconde ligne aurait donné deux rendez-vous quinquennaux pour un contrôle, et le test anti-doublon ne l'aurait pas vu, les fondateurs étant différents. Recoupé par `PO 1 § 3`, déjà au corpus, qui renvoie nommément à AS 9 |
| **`CH 39 § 3`** | Filtres de ventilation de confort : visite périodique par l'**utilisateur**, plafond d'un an, **ramenée à trois mois** en l'absence de système de mesure et d'alarme permanent | **Encodé** — `aeration-erp-filtres-visite-periodique`, **trimestrielle**, `exploitant`, VMC + CTA, ERP N1–N4. Un allègement ne se donne pas sur une absence supposée : le produit ne détient aucun attribut disant qu'une installation a une mesure permanente |
| **`MS 69`** | Alarme : l'exploitant s'assure **une fois par semaine au moins** du bon fonctionnement de l'installation et des alimentations de sécurité | **Encodé** — `incendie-erp-alarme-verification-hebdomadaire`, **hebdomadaire**, `exploitant`, ALARME_INCENDIE, ERP N1–N4 |
| **`AS 10`** | Escaliers mécaniques et trottoirs roulants : **annuelle** par personne ou organisme agréé, **plus** un examen des chaînes et crémaillères **à mi-période** par l'entreprise d'entretien | **`obligation_manquante`.** Aucune catégorie d'équipement. Ne pas l'accrocher à `ASCENSEUR` : cinq ans contre un an, un réalisateur contre deux, aucun examen intermédiaire contre un. C'est le manque le plus proche de la cible — type M |
| **`GC 18 h)`** | Conduit d'extraction d'un **module ou conteneur spécialisé** de cuisson : nettoyé avant chaque mise en place et **au moins tous les six mois** | **`obligation_manquante`.** Aucune catégorie pour le module, aucun attribut « cuisine temporaire ». L'accrocher à `HOTTE_PRO` doublerait la fréquence du ramonage annuel de GC 21 pour toutes les cuisines professionnelles |
| **`MS 71 § 3`** | Communications radioélectriques : **une fois avant ouverture, puis tous les trois ans**, par organisme agréé par le ministère chargé de la sécurité civile | **`obligation_manquante`.** Le § 1 réserve l'article aux ERP du 1er groupe **disposant de plus d'un niveau de sous-sol**, et l'écarte sous 100 m² de sous-sol total. Deux attributs d'établissement absents. **Seule entrée du lot où la sur-application a été explicitement refusée** : le champ exclut plus qu'il n'inclut, et le rendez-vous appelle un organisme agréé |
| **`CO 61 § 6`** | Tribune **télescopique** dont le dernier plancher déployé est à plus d'un mètre : inspection périodique **tous les cinq ans** par un organisme accrédité | **`obligation_manquante`.** Aucune catégorie « tribune ». Types X et L, hors des trois secteurs cibles |

**Ce que le lot corrige en plus.**

- **La `portee` de `arrete-1980-livre-2.ts` était fausse dans les deux sens**,
  et la mesure du 2026-09-03 l'avait constaté sans pouvoir y toucher. Elle
  annonçait « (MS, EC, EL, DF, GE) » en omettant `CH`, `GZ` et `GC` — neuf des
  dix-huit articles qu'elle portait —, et « des dispositions particulières par
  type » dont elle ne contient **aucun** article. Réécrite : dix des onze
  chapitres du Titre Ier, `AM` seul absent, **zéro article du Titre II**.
- **La réserve de `R. 4224-17` lisait son propre renvoi à moitié.** Écrite le
  2026-09-01, elle recopiait la phrase entière — « aux articles R. 4222-21 **et
  R. 4223-11** » — puis n'en tirait qu'un document, la consigne de ventilation.
  Le second, celui de l'éclairage, n'était pas même nommé. Corrigée : elle dit
  ce que chacun des deux porte, lequel est désormais servi et lequel ne l'est
  pas.
- **Une référence qui nommait deux articles sous une seule clé est scindée.**
  `levage-vgp-annuelle-charges` citait « R. 4323-23 et R. 4323-24 » avec
  `article: "R. 4323-23"` : le second passait pour lu sans être rattaché. Le
  corpus l'avait relevé le 2026-09-02 ; c'est fait.

**Deux garanties éprouvées en les cassant.** (1) La nature de
`eclairage-etablissement-regles-entretien` passée de `etat_permanent` à
`ponctuelle` : `obligations-sans-surface.test.ts` la nomme aussitôt — « Soit sa
`nature` est fausse […] soit son absence de surface est assumée ». C'est le
comportement annoncé, et il vaut pour une ligne neuve. (2) La clé `article` de
la nouvelle obligation de `R. 4323-24` remplacée par une référence inexistante :
**trois** tests tombent — le lien corpus ↔ obligation dans les deux sens, le
cliquet « obligations s'appuyant sur un texte non dépouillé » (plafond 0), et le
document d'état de vérification. Les deux injections ont été retirées et la
suite est repassée au vert.

**Application** — quatre obligations (146 → **150**, remesuré en appelant), un
domaine neuf (`eclairage`, 19 → **20**), sept articles portés au corpus du
Livre II (18 → **25**), `REFERENTIEL_VERSION` en `2026-09-04.2`,
`EMPREINTE_ATTENDUE` en `150-8cb9a3b49692ed58`. Mesuré le même jour en appelant
le moteur : un restaurant de **3ᵉ catégorie** ayant déclaré une alarme et une
centrale de traitement d'air passe de 34 à **36** obligations, quand le même en
**5ᵉ catégorie** en compte 37. **L'écart que le Livre II à moitié dépouillé
creusait au détriment du 1er groupe tombe de trois à une.**

**Ce que ce lot laisse en suspens, et qui n'attend qu'une décision.** Trois
écrits que le modèle sait porter et que personne n'a réclamés : le **livret
d'entretien de l'installation de filtration** (`CH 39 § 1`), le **stock
permanent de fournitures de rechange de l'alarme** (`MS 69`, état permanent
matériel), et la **consigne d'utilisation de la ventilation** (`R. 4222-21`),
jumelle de celle de l'éclairage qui vient d'être encodée. Les trois sont en
réserve au corpus, chacun sous son article.

---

### C14 · 2026-09-04 — Les EPI : douze mois, cinq familles nommées, et une catégorie qui en couvre bien plus

**Pourquoi ce lot** — la veille, la catégorie `EPI` était entrée dans
`CategorieEquipement` **sans aucune obligation**, et son commentaire disait
pourquoi : « il ne faut PAS en attacher une avant d'avoir lu R. 4323-95 à
R. 4323-99 et l'arrêté qui fixe la liste des EPI soumis à vérification : le
faire réclamerait un rendez-vous annuel à qui a déclaré des gants ».
`etablissements/parametrage.ts` portait la même mise en garde depuis le
2026-09-01, et nommait déjà le texte à ouvrir. Ce lot est cette lecture.

**Ce qui a été ouvert** — vingt-deux articles, tous en **première main** sur
Légifrance, pages d'article une par une :

- la **section 9 du chapitre III** en entier, `R. 4323-91` à `R. 4323-106` —
  seize articles, trois sous-sections. Corpus `code-travail-epi`, `integral` ;
- les **deux articles d'amont** que la section et l'arrêté désignent
  nommément : `R. 4321-4` (mise à disposition) et `R. 4322-1` (maintien en état
  de conformité, cité par l'arrêté sous son ancien numéro `R. 233-1-1`). Corpus
  `code-travail-epi-amont`, `articles_cites` ;
- l'**arrêté du 19 mars 1993** en entier, quatre articles. Corpus
  `arrete-1993-03-19-epi`, `integral`.

**Le résultat, en une ligne : douze mois, cinq familles nommées, rien d'autre.**

Le brief nommait `R. 4323-95` en premier ; cet article **ne parle pas de
vérification périodique**. Il impose la fourniture gratuite, le bon
fonctionnement et le maintien en état hygiénique « par les entretiens,
réparations et remplacements **nécessaires** » — un état continu dont rien ne
chiffre la fréquence. La périodicité est **plus loin, et pas dans le Code** :
`R. 4323-99` est un article d'habilitation jumeau de `R. 4323-23`, il renvoie
la liste ET le rythme à des arrêtés.

**L'arrêté du 19 mars 1993, art. 1er, et sa liste NOMINATIVE ET FERMÉE** —
« les équipements de protection individuelle suivants, **en service ou en
stock**, doivent avoir fait l'objet, **depuis moins de douze mois au moment de
leur utilisation**, de la vérification générale périodique » :

1. appareils de protection respiratoire autonomes destinés à l'évacuation ;
2. appareils de protection respiratoire et équipements complets destinés à des
   interventions accidentelles en milieu hostile ;
3. gilets de sauvetage gonflables ;
4. **systèmes de protection individuelle contre les chutes de hauteur** ;
5. stocks de cartouches filtrantes antigaz pour appareils de protection
   respiratoire.

**Une seule de ces cinq touche les trois secteurs cibles : la quatrième** — le
harnais antichute et sa longe, qu'on rencontre pour un accès en toiture, une
mezzanine de réserve, une trémie de monte-charge.

**Ce que le texte NE dit PAS, et qui est la moitié du résultat.** Casque,
gants, chaussures de sécurité, lunettes, écran facial, protections auditives,
masque, vêtement de travail : **aucun n'est soumis à vérification générale
périodique**, par ce texte ni par aucun autre que ce lot ait trouvé. Ils
relèvent d'un autre régime, permanent et non périodique — `R. 4322-1` (maintien
en état de conformité) et `R. 4323-95` (entretien). Le guide commercial que
`parametrage.ts` mentionnait avait donc **le bon chiffre et la mauvaise
assiette**, exactement comme celui de la signalisation le 2026-09-02.

**La formule n'est pas « tous les ans ».** « Depuis moins de douze mois **au
moment de leur utilisation** » mesure l'échéance à l'instant de l'usage, pas à
la date de la dernière visite — même patron que l'arrêté du 5 mars 1993. Le
réalisateur est à `R. 4323-100` : **personne qualifiée, appartenant ou non à
l'établissement**. Aucun organisme accrédité n'est exigé par le Code.

| Article | Ce qu'il porte | Périodicité | Sort |
|---|---|---|---|
| `R. 4323-91` à `-94`, `-96`, `-98` | Adéquation au risque, exposition résiduelle, compatibilité, protection oculaire, usage personnel, usage conforme | **aucune** | `sans_objet` — règles de fond sans récurrence ni écrit |
| **`R. 4323-95`** | Fourniture gratuite, bon fonctionnement, état hygiénique, entretiens/réparations/remplacements « nécessaires ». Champ TOTAL, gants compris | **aucune** | `sans_objet` — un état, pas un rendez-vous |
| `R. 4323-97` | L'employeur détermine les conditions de mise à disposition et de port, après consultation du CSE | **aucune** | `sans_objet` — une décision, sans forme écrite imposée. À ne pas confondre avec `R. 4323-105` |
| **`R. 4323-99`** | Habilitation : des arrêtés désignent les EPI vérifiables et fixent la périodicité | **aucune, il renvoie** | `sans_objet` — la substance et le manque sont comptés sur l'arrêté |
| `R. 4323-100` | Personne qualifiée, appartenant ou non à l'établissement ; **liste tenue à disposition de l'inspection** | aucune | `sans_objet` — *voir le constat ci-dessous* |
| `R. 4323-101` à `-103` | Consignation au registre, annexion des rapports, tenue sur tout support | aucune propre | `sans_objet` — suivent la vérification |
| `R. 4323-104` | Information des travailleurs, quatre points | aucune | `sans_objet` — sans forme ni rythme |
| **`R. 4323-105`** | **Consigne d'utilisation écrite**, plus une documentation réglementaire tenue à disposition du CSE | aucune | **`obligation_manquante`** — le seul écrit de la section |
| **`R. 4323-106`** | Formation au port, entraînement « en tant que de besoin », renouvelée « **aussi souvent que nécessaire** » | **aucune** | **`obligation_manquante`** — le renouvellement est indexé sur un résultat, pas sur une durée |
| `R. 4321-4`, `R. 4322-1` | Mise à disposition ; maintien en état de conformité | aucune | `sans_objet` — le régime de tout ce que l'arrêté ne nomme pas |
| **Arrêté 19-03-1993 art. 1er** | Cinq familles nommées, **en service ou en stock** | **douze mois au moment de l'utilisation** | **`obligation_manquante`** |
| Arrêté 19-03-1993 art. 2 | Contenu de la vérification, indexé sur la notice du fabricant ; élimination à péremption | aucune | `sans_objet` — article de contenu |
| Arrêté 19-03-1993 art. 3, 4 | Date d'application ; clause d'exécution | aucune | `sans_objet` · `hors_perimetre` |

**Aucune obligation n'est encodée par ce lot, et c'est la question posée à la
propriétaire.** `CategorieEquipement.EPI` est une **famille, pas un régime** :
son propre libellé d'aide annonce « harnais antichute et sa longe, casque,
gants, chaussures de sécurité, protections auditives, masque ». Y attacher la
vérification annuelle réclamerait un rendez-vous de tiers au commerçant qui a
déclaré une boîte de gants — le défaut exact que le nom de
`COMPACTEUR_PRESSE_DECHETS_MOTORISE` a été écrit pour éviter. **La décision est
une migration ; elle n'est pas prise.** Les trois voies, et ce qui plaide :

1. **Scinder la catégorie.** La ligne de partage est lisible et verbatim : cinq
   noms d'objets d'un côté, tout le reste de l'autre. Contre : la scission doit
   se nommer dans les mots du dirigeant, pas dans ceux de l'arrêté — « harnais
   et systèmes antichute » est déclarable, « EPI soumis à vérification générale
   périodique » ne l'est pas ; et seule la quatrième famille concerne
   réellement la cible, ce qui plaide pour une catégorie **de l'objet** plutôt
   que pour un couple vérifiable / non vérifiable.
2. **Une propriété d'équipement (`ConditionApplication`).** **L'arrêté ne la
   fonde pas** : il ne nomme aucune propriété — ni « antichute », ni
   « respiratoire », ni un seuil — il nomme des **objets**. Une condition
   booléenne « soumis à vérification » ferait déclarer par le dirigeant la
   conclusion juridique qu'on est censé calculer pour lui.
3. **Ne rien porter et le déclarer.** C'est l'état actuel, et il est tenable :
   la liste des documents obligatoires porte déjà `verifications-epi` en
   « non produit par Rojer », enrichie ce jour de la liste verbatim des cinq
   familles et de la formule des douze mois.

**Une garde a été posée, et éprouvée deux fois.**
`corpus/epi-famille.test.ts` : *tant que le corpus déclare `obligation_manquante`
la vérification périodique des EPI, aucune obligation portée par équipement ne
peut viser la catégorie `EPI`.* Ce n'est pas une liste — il n'y a rien à y
recopier —, c'est une **implication** entre le dépouillement et le référentiel,
qui s'ouvre d'elle-même le jour où la vérification est encodée. Les deux modes
de panne ont été réinjectés, l'injection vérifiée présente avant lecture du
résultat :

- ajouter `"EPI"` aux `categoriesEquipement` de
  `compactage-dechets-vgp-trimestrielle` → **rouge**, l'obligation nommée ;
- faire passer l'article 1er de l'arrêté de `obligation_manquante` à
  `sans_objet` — la réparation-par-effacement que ce journal redoute — →
  **rouge** aussi, par le premier des trois cas.

**Trois constats laissés ouverts, faute de décision et non faute de lecture.**

- **`R. 4323-100` est le jumeau EPI de `R. 4323-24`**, et personne ne le cite.
  L'obligation `prevention-etablissement-liste-personnes-qualifiees`, encodée
  la veille, porte bien « la liste tenue à la disposition de l'inspection du
  travail » — mais fondée sur `R. 4323-23` et `-24`, les équipements de
  **travail**. Ce n'est pas une obligation manquante (la pièce est la même, et
  une seconde ligne ferait doublon) : c'est une **citation manquante**, qui se
  solde en ajoutant `R. 4323-100` aux `referencesLegales` et en passant
  l'entrée de corpus à `retenu`. Modifier une obligation livrée sort du
  périmètre d'un lot de dépouillement.
- **`R. 4323-105` — la consigne d'utilisation — ne dépend d'aucune décision de
  catégorie**, puisqu'elle se porte par **établissement**. C'est le manque le
  plus directement encodable du lot : porteur établissement, `etat_permanent`,
  `periodicite: "autre"`, `realisateurs: ["exploitant"]` — la forme exacte de
  la notice des points d'ancrage de `R. 4323-61`. Seule sa **seconde pièce**
  (« une documentation relative à la réglementation applicable » tenue à
  disposition du CSE) pose une question de périmètre non tranchée.
- **`R. 4323-92` est un article d'habilitation lu SANS énumérer les arrêtés
  qu'il habilite** — la troisième famille de manques listée en tête de
  `corpus/types.ts`, celle qui avait laissé une moitié de `R. 4323-23` hors du
  dépôt. Même limite, plus faible, sur `R. 4323-99` : **un seul** arrêté a été
  établi et lu, alors que l'article vise « les ministres chargés du travail
  **ou de l'agriculture** » et qu'un jumeau agricole existe pour `R. 4323-23`.
  Cause de fait : les panneaux « textes d'application » de Légifrance sont
  chargés en JavaScript et la lecture automatique ne les rend pas ; la
  recherche plein texte n'a rendu que l'arrêté du 22 octobre 2009, écarté (il
  s'adresse au **loueur** d'EPI d'occasion, et ne fixe ni liste ni
  périodicité). **Ne pas lire ce silence comme « il n'y en a pas ».**

**Un piège de nommage, neuf, et à connaître.** Il existe **deux arrêtés du
19 mars 1993**, de mêmes signataires, sur des objets sans rapport : les travaux
dangereux du plan de prévention (dépouillé le 2026-09-03) et les EPI (celui-ci).
Les refs d'articles du second portent « **(EPI)** » — sans quoi
`corpus.test.ts` aurait vu un seul article recevant deux statuts, et les deux
lectures se seraient contredites en silence.

---

### C15 · 2026-09-20 — L'arrêté « légionelles », et le piège n° 8 repris sur le fait

**Lu :** arrêté du 1er février 2010 (art. 1 à 8, annexes 1 et 2, version au
2023-01-01), son modificatif du 30 décembre 2022 (JORFTEXT000046849698, ouvert),
l'article 36 de l'arrêté du 23 juin 1978 (version au 2006-12-15) et l'arrêté du
30 novembre 2005 qui l'a réécrit (art. 2 et 3). **Comment :** `WebFetch`, en deux
passes — page consolidée, puis page propre de chaque article pour les articles
1er, 2, 3, 4, 7, l'annexe 2 et l'article 36. **Consigné :**
`corpus/arrete-2010-02-01-legionelles.ts`, lecture `agent_verbatim`.

**Ce qui en est sorti :** le champ du carnet sanitaire était faux à l'écran, deux
températures étaient attribuées au mauvais texte et l'une au mauvais endroit du
réseau, le seuil de 1 000 UFC/L au mauvais article. Aucune obligation encodée
(décision de la propriétaire : la cible n'est pas dans le champ).

**Le piège n° 8, une fois de plus.** La page consolidée a rendu l'article 2
TRONQUÉ — sans « il s'agit notamment des douches, des douchettes, des bains à
remous ou à jets », sans la phrase qui nomme les trois titulaires possibles de
la responsabilité — et le corpus a d'abord écrit « l'article ne donne aucune
liste d'exemples ». La page propre de l'article l'a démenti une heure plus tard.
La parade du § 2.D tient ; elle n'avait simplement pas été appliquée d'emblée.

**Non lu :** l'article 1er de l'arrêté de 1978 (son champ), et l'annexe 1 de
l'arrêté de 2005 (durées d'élévation), que Légifrance ne reproduit pas.
### C16 · 2026-09-20 — Le chapitre « chaleur intense », encodé trois semaines après son instruction

**Lu :** `R. 4463-1` à `R. 4463-8` du code du travail (créés par le décret
n° 2025-482 du 27 mai 2025, art. 3, en vigueur depuis le 2025-06-02), chacun sur
sa page propre. **Consigné :** `corpus/code-travail-chaleur-intense.ts`,
`agent_verbatim`. **Appliqué :** deux états permanents d'établissement —
`R. 4463-2` (évaluer, définir les mesures) et `R. 4463-6` (modalités de
signalement et de secours) — ; quatre `obligation_manquante` (deux déclenchées
par un épisode que le produit n'observe pas, une par une information reçue sur
une personne, une qui vise le plan de prévention) ; un risque « chaleur
intense » aux référentiels DUERP du commerce et de la restauration. Référentiel 2026-09-20.1, 156 obligations.

**Ce que la relecture a corrigé de l'instruction du 2026-09-01**
(`docs/revues/lot-d3-recoupement-droit.md` § 1), qui avait lu la page de
SECTION pour les articles 4 à 8 : `R. 4463-4` et `R. 4463-6` ont un second
alinéa qu'elle tronquait ; `R. 4463-8` n'est pas servi par le module
`PlanPrevention`. **Et ce que la contre-lecture a corrigé de la relecture** :
la citation de `R. 4463-7` portait « survenance », mot que l'outil de lecture
avait normalisé — le texte dit « survenue », et l'instruction du 2026-09-01
l'avait juste. Une lecture plus récente n'est pas une lecture meilleure.

**Non lu :** l'arrêté qui définit l'épisode de chaleur intense (`R. 4463-1`).
Aucun seuil de température n'est écrit nulle part dans le produit.

### C17 · 2026-09-20 — Le registre de dette, et la seule obligation qui n'avait pas d'excuse

**Relu :** les soixante-six motifs d'`obligation_manquante` et dix-neuf réserves
qui se disaient closes — du corpus, pas de Légifrance. **Lu à la source :**
`R. 4222-21` sur sa page propre (version au 2018-01-01, décret n° 2017-1819,
section 5 « Contrôle et maintenance des installations »), avant de l'encoder.
**Appliqué :** `cause` et `toucheLaCible` sur chaque manquante ;
`aeration-etablissement-consigne-utilisation` (référentiel 2026-09-20.2, 157
obligations) ; sept réserves passées en `historique` ; trois `bloquePar` levés
depuis l'ADR-022 et jamais raturés. Le compte est dans
`docs/chantiers-ouverts.md` § 3 bis, et `registre-dette.test.ts` le tient.

### C18 · 2026-09-21 — `PE 27`, ouvert pour un paragraphe, encodé pour deux

**Lu :** `PE 27` du règlement de sécurité (version au 2026-05-01, arrêté du
4 février 2026, art. 1). La page propre de l'article n'a rendu qu'une table des
matières (piège n° 2) ; la page de section a rendu les § 4 et § 5 et la première
phrase du § 1 lettre à lettre, les § 2 et § 3 en paraphrase seulement.
**Appliqué :** `incendie-erp-5-instruction-personnel` (§ 5) et
`incendie-erp-5-consignes-affichees` (§ 4), états permanents de tout ERP de
5ᵉ catégorie ; référentiel 2026-09-21.1, 159 obligations. **Trouvaille :** le
§ 4 n'était relevé nulle part — le corpus n'en nommait que l'alinéa facultatif
sur les exercices. **En réserve :** § 1 (présence permanente, et ses
dérogations), § 2 (alarme : personnel informé du signal, système maintenu en
bon état), § 3 (alerte, MS 70), **et le § 6 — un plan d'intervention apposé à
l'entrée — que cette entrée avait d'abord OUBLIÉ.** J'avais demandé à l'outil de
lecture les « § 1 à § 5 » : il a répondu dans le cadre que je lui donnais.
L'article en compte six ; la contre-lecture l'a relevé, et je l'ai vérifié en
demandant « combien de paragraphes, et lequel est le dernier ». Le § 6 n'est pas
encodé tant que l'arrêté du 4 février 2026, qui a réécrit l'article, n'est pas
ouvert : rien n'établit qu'il vaille pour les établissements existants.

### C19 · 2026-09-21 — Trois « textes à lire » lus, et ce qu'ils bloquaient vraiment

**Lu, chacun sur sa page propre :** `R. 4431-2` (trois paliers de bruit,
80 / 85 / 87 dB(A)), `R. 4433-1`, `R. 4433-2`, `R. 4214-11`, `R. 4224-3` — tous en
version du 2008-05-01. **Consigné :** `code-travail-bruit-vibrations.ts` (une
entrée neuve) et `code-travail-circulation-lieux.ts` (corpus neuf).

**Ce que la lecture a changé.** Aucune des trois manquantes classées « texte à
lire » n'était bloquée par un texte. Les deux du bruit attendent une donnée que
le DUERP ne recueille pas (un niveau mesuré, et laquelle des grandeurs
physiques l'a été). Le marquage des voies attend un attribut : `R. 4214-11`
s'adresse au maître d'ouvrage, `R. 4224-3` ne parle pas de marquage, et ce qui
décide est « l'importance de la circulation des véhicules ». Une manquante de
plus, `R. 4224-3` — le produit normal d'une lecture.

### C20 · 2026-09-21 — `GN 10`, l'article de champ que personne n'avait ouvert

**Lu :** l'arrêté du 4 février 2026 (JORFTEXT000053886207, trois articles — il ne
modifie que le § 1 de `PE 27`), puis `GN 10` du règlement de sécurité (version
au 2010-01-23, arrêté du 24 septembre 2009), en demandant d'abord « combien de
paragraphes ». **Consigné :** `corpus/arrete-1980-livre-1.ts`, entrée GN 10.

**Ce qui en sort.** « A l'exception des dispositions à caractère administratif,
de celles relatives aux contrôles et aux vérifications techniques ainsi qu'à
l'entretien, le présent règlement ne s'applique pas aux établissements
existants. » Zéro occurrence de « GN 10 » dans le dépôt avant ce jour. Cinq
états permanents du référentiel ne sont ni contrôle, ni vérification, ni
entretien, et sur-appliquent donc aux établissements anciens ; deux sont en
production (`PE 33`, `PE 35`). Les deux de `PE 27`, encodés le matin même, le
disent désormais dans leur description. Le § 6 de `PE 27` reste en réserve.
Décision au dossier (A6).

**Une justification que j'avais écrite le matin était fausse** : « les § 4 et
§ 5 sont des actes d'exploitation, encodés sans distinction de date comme
`PE 4 § 2` ». `PE 4 § 2` est un ENTRETIEN — précisément ce que GN 10 excepte.
L'analogie ne valait pas ; elle est raturée dans la réserve de `PE 27`.

### C21 · 2026-09-21 — Six articles événementiels relus avant d'être encodés

**Lu, par un agent, chacun sur sa page propre** (trois à quatre requêtes par
article : nombre d'alinéas, texte intégral, contrôle ciblé des mots décisifs) :
`R. 4624-31`, `R. 4624-28-2`, `R. 4141-8`, `R. 4141-12`, `R. 4121-2`, `L. 8222-5`,
et le décret n° 2026-503 du 12 juin 2026 (art. 2 et 5).

**Les six `citationCle` du corpus étaient exactes mot pour mot.** Ce qui manquait
était AUTOUR : la citation de `R. 4141-8` s'arrêtait avant son troisième alinéa
(les accidents répétés, sans condition de gravité) ; celle de `R. 4141-12`
omettait son second alinéa (la formation) ; le troisième alinéa de `L. 8222-5`
n'était mentionné nulle part ; deux textes modificateurs n'étaient pas relevés
(décret n° 2022-679, loi n° 2014-790 — ni l'un ni l'autre ouvert) ; la note
d'application dans le temps de `R. 4624-31` manquait.

**Un enseignement sur l'outil de lecture : il ne sait pas compter.** Sa réponse à
« combien d'alinéas, lequel est le dernier » était fausse ou incohérente sur
quatre articles sur six — pour `R. 4141-8` il donnait le 1° comme dernier, et le
2° aurait été oublié. La question reste utile (elle force à regarder la fin),
mais seul le texte recopié fait foi, et il se recoupe par une requête ciblée.

**Appliqué :** cinq obligations événementielles (référentiel 2026-09-21.3, 167).
`L. 8222-5` n'est pas encodée : décision B1 du dossier.

### C22 · 2026-09-21 — Les dates derrière `GN 10`, et un paragraphe qui a neuf mois

**Lu, par un agent, sur les pages de SECTION datées de Légifrance** (la seule
forme qui rende « Version en vigueur du … au … » pour ces articles) : six
versions de `PE 27`, deux de `PE 33`, une de `PE 35`, deux de `EL 18`, et les
arrêtés du 22 juin 1990, du 2 février 1993, du 11 décembre 2009, du
11 septembre 2023, du 1er décembre 2025, du 24 juillet 2006, du 26 octobre 2011
et du 19 novembre 2001 pour leurs clauses d'application.

**Ce qui en sort.** `PE 27` § 4 et § 5, `PE 33` § 2 et `PE 35` sont au règlement
depuis le 27 août 1990 : « établissement existant » veut dire, pour eux, ouvert
avant cette date. *[2026-09-26 : cette dernière phrase est une LECTURE, pas le texte — `GN 10` ne date pas l'« existant ». Voir C23.]* Le § 6 de `PE 27` ne visait que les établissements « en étage
ou en sous-sol » jusqu'au 31 décembre 2025 ; « chaque établissement » date de
l'arrêté du 1er décembre 2025, sans clause pour les existants. Aucun des
arrêtés lus n'étend ces dispositions aux établissements existants, sauf le
chapitre des hôtels (`PO 8`, `PO 11`, `PO 12`).

**Trois choses à ne pas lisser.** (1) Légifrance date la rédaction 2006 de
`PE 33` du 04/11/2011 quand l'arrêté dit « trois mois après publication », soit
2006 : non tranché. (2) L'historique d'`EL 18` avant 2002 est écrasé — la date
« 15/08/1980 » affichée est celle du règlement, pas celle de la phrase. (3) Le
brief de l'agent affirmait que l'arrêté du 26 octobre 2011 avait remanié
`PE 27` : il ne le touche pas. L'agent l'a vérifié au lieu de le croire.

**Et `PE 4` est à jour** : sa rédaction applicable au 1er juillet 2026 est celle
que le corpus porte depuis le 2026-08-27 ; il ne manquait que le nom du texte.

### C23 · 2026-09-26 — La contre-lecture des huit événementielles, et une garde pour qu'elle ne soit plus nécessaire

**Le constat.** Une contre-lecture neutre de la branche `lot/evenementielles-cible`
a confirmé tous les comptes (167, 57 manquantes dont 42 dans la cible, 90
réserves, aucun doublon d'identifiant) et trouvé ce que les comptes ne voient
pas : des libellés et des faits générateurs qui paraphrasaient leur article.
« Vulnérable à la chaleur intense » pour « vulnérable aux risques liés à
l'exposition aux épisodes de chaleur intense » ; « d'accidents ou de maladies »
pour « d'accident du travail ou de maladie professionnelle ou à caractère
professionnel » ; « un arrêt de travail » tout court, qui étendait l'examen de
reprise à tout arrêt ; « service de santé au travail », nom abandonné en 2022.
Et `R. 4624-31` n'avait AUCUN verbatim consigné pour ses quatre cas ni sa
dérogation, alors que la description les affirmait.

**Relu à la source, le 2026-09-26.** `R. 4624-31` en entier, de première main
(le nombre d'alinéas demandé en aveugle, puis deux formulations confirmées par
une requête ciblée) ; `R. 4141-8`, `R. 4141-12`, `R. 4624-28-2`, `R. 4463-4`,
`-5`, `-7` par un agent, au même protocole ; `R. 4515-8` et `R. 4515-9` de
première main ; `GN 10` et `PE 27` intégraux, versions datées, par un agent.

**Ce que la relecture a trouvé de plus que la contre-lecture.** (1) La
dérogation de `R. 4624-31` distingue DEUX catégories de mesures — « aucune
mesure individuelle d'aménagement, d'adaptation ou de transformation du poste
NI aucune mesure d'aménagement du temps de travail » ; la description les
rabattait sur une, ce qui ÉLARGISSAIT la dérogation. (2) La carte des trois cas
de mise à jour du document unique écrivait « À toute décision » là où
`R. 4121-2` écrit « Lors de toute décision ». (3) `GN 10` ne date pas
l'« établissement existant » ; le 22 juin 1990 est l'arrêté qui approuve le
type PE, et la dernière rédaction de `GN 10` date de l'arrêté du 24 septembre
2009 (en vigueur le 23 janvier 2010). La phrase « la disposition date du
27 août 1990, et cette ligne vise de plein droit… » était à la fois une
qualification juridique et un rattachement faux ; elle est remplacée par la
citation de `GN 10` et la date du type PE, sans conclusion. (4) Le décret
n° 2022-679, ouvert : son article 2, II, ne fait que renommer le service dans
tout le titre II du livre VI ; il ne cite pas `R. 4624-28-2`.

**La garde.** `src/lib/quand-ca-arrive/fait-dans-le-texte.test.ts` découpe
chaque fait générateur à la ponctuation et exige que chaque segment soit un
extrait CONTINU du verbatim consigné. Une première version, mot à mot, laissait
passer toutes les paraphrases trouvées : elles n'emploient que des mots de
l'article, rangés autrement. La version par segments les refuse — éprouvée sur
les quatre paraphrases historiques, pas sur des erreurs fabriquées. Elle a
trouvé trois écarts que la contre-lecture n'avait pas vus : « salarié » pour
« travailleur » (`R. 4542-16`), le protocole de sécurité qui employait les mots
de `R. 4515-8` sans le citer (article désormais `retenu`), et la fin
d'exposition.

**Un effet de bord, bienvenu.** Rétablir mot pour mot l'alinéa final de
`R. 4121-2` dans la description a fait rougir `non-couverture.test.ts` : la page
Périmètre annonce que Rojer ne porte pas « le programme annuel de prévention
des risques ». La paraphrase précédente y échappait par accident. L'alinéa
quitte la description et reste dans la `note`.

**Appliqué :** référentiel `2026-09-26.1`, 167 obligations, aucune entrée ni
sortie. Comptes remesurés en appelant le code : inchangés.

### C24 · 2026-09-26 — La contre-lecture des corrections, et la règle du libellé

**Le constat.** Une seconde contre-lecture, sur les corrections de C23, a
confirmé les verbatims et les comptes, et trouvé que les LIBELLÉS
continuaient de déformer : pour tenir en une ligne, ils résumaient la
condition — « un accident du travail de trente jours » pour « une absence
d'au moins trente jours pour cause d'accident du travail », « présentant un
caractère répété » sans la borne poste/fonction, « grave » écrit une fois
au lieu de deux. Et que la garde du fait générateur laissait passer une
troncature (« en cas d'accident du travail ou de maladie professionnelle »,
sans « grave ») et un complément détaché (« dans un délai de huit jours »).

**La règle du libellé.** Un libellé dit l'ACTE, dans les mots du texte, SANS
condition : la condition est dans le fait générateur, extrait mot pour mot.
Un libellé qui ne porte pas de portée ne peut ni l'élargir ni la rétrécir.
Appliquée aux onze lignes de la page. La garde vérifie que le libellé
n'emploie aucun mot que le texte n'emploie pas ; elle ne peut pas vérifier
qu'il ne porte pas de condition — c'est écrit dans son en-tête.

**La garde, resserrée.** Chaque segment du fait doit se terminer là où une
proposition du texte se termine ; seul le passage entre guillemets d'une
`note` compte comme texte, jamais le commentaire qui l'entoure. Éprouvée sur
les trois défauts que la contre-lecture proposait comme passant la version
précédente : les trois sont refusés.

**R. 4121-2, écrit une fois.** L'article était récrit sur huit surfaces, dont
deux citations entre guillemets fausses et un PDF qui imprimait « mis à jour
après tout accident du travail » comme un cas propre. Toutes lisent
`src/lib/referentiels/conformite/texte-r4121-2.ts`, confronté au corpus par
un test éprouvé sur le défaut historique.

**Relu à la source, le 2026-09-26.** `PE 1`, `PE 20` (pour la portée de
`CH 58` en 5ᵉ catégorie), `R. 4515-5`, `R. 4515-6`, `R. 4542-16`. Les dates
de lecture du corpus sont remises au jour des relectures — la contre-lecture
avait relevé qu'elles ne l'étaient pas. `PE 20` et `R. 4515-6` restent notés
`agent_verbatim` : ils ont été modifiés (en 2004 ; par le décret n° 2009-289)
et ce texte modificateur n'est pas ouvert — la règle du corpus refuse la
« première main » sans lui, et elle a eu raison de rougir.

**Appliqué :** référentiel `2026-09-26.2`, 167 obligations, aucune entrée ni
sortie.

### C25 · 2026-09-26 — `CH 58` en 5ᵉ catégorie : borné, puis rétabli le jour même

**Ce qui a été fait, puis défait.** L'annuelle `CH 58` a été bornée aux
catégories 1 à 4 (`7368621`), sur la lecture de `PE 1` § 1 (« Les
dispositions du livre II ne sont pas applicables sauf celles relevant
d'articles expressément mentionnés dans la suite du présent livre ») et
d'un balayage où aucun article PE ne nomme `CH 57` ni `CH 58`. Une
contre-lecture neutre l'a réfuté ; le commit est annulé (`8b7443a`).

**Pourquoi.** (1) Un ERP dont la catégorie n'est pas renseignée perdait la
ligne sans rien à la place : la règle du non-renseigné l'interdit. (2) Le
dépôt avait DÉJÀ tranché ce cas pour dix obligations sœurs : sur-application
assumée en 5ᵉ catégorie, ligne maintenue, parce que la retirer crée un faux
négatif muet. Le commit rompait cette politique sans la citer. (3) `PE 20`
§ 2 renvoie au « livre II, titre Ier, chapitre V » — celui de `CH 58` — pour
la « mise en œuvre » : l'étendre ou non à la vérification est une
interprétation, et `PE 15` § 1 pose la même question pour les cuisines
(`GC`). (4) Un hôtel de 5ᵉ catégorie passait en sous-application. Et la
réconciliation supprime les lignes sans trace : « archivée, rapports
conservés » était faux pour elles.

**La leçon.** J'avais dit à la propriétaire que « la réglementation
tranche ». Elle tranchait sur `PE 1` ; elle ne tranchait pas sur `PE 20`
§ 2, et le dépôt avait une politique écrite que je n'avais pas cherchée.
Avant de retirer une ligne : chercher si une obligation sœur a déjà été
jugée sur le même argument.

**Reste.** La lecture de `PE 20` § 2 et de `PE 15` § 1 (« mise en œuvre » dans
les conditions du chapitre V / X) : une seule question, qui décide de
`CH 58` et des `GC` en 5ᵉ catégorie. Le motif de `PE 31` au corpus est rayé :
il affirmait que le référentiel porte le ramonage des conduits de fumée.

### C26 · 2026-09-26 — Troisième contre-lecture : ce qu'un extrait exact peut encore trahir

**Constat.** Les verbatims et les comptes étaient justes. Restaient des
extraits exacts mal assemblés : les quatre cas de l'examen de reprise
rattachés à « la fin de l'arrêt de travail » au lieu de l'examen lui-même ;
les 2° et 3° de `R. 4121-2` joints par un « et » qui les faisait lire comme
cumulés ; « s'il y a lieu » placé en fin de libellé, donc lu sur l'analyse
autant que sur la formation ; des renvois sans antécédent (« le présent
chapitre », « cette information »). Et, ailleurs dans l'application :
« l'art. R. 4121-2 impose d'indiquer le motif » (l'article ne parle d'aucun
motif), le seuil de onze salariés lu sur l'effectif du SITE dans le guide
(le 1° vise l'entreprise), un motif de version qui rangeait l'accident du
travail « au sens du 3° », la description de l'information à l'embauche
qui ajoutait « notamment » et réécrivait trois items.

**La garde.** Un segment doit désormais COMMENCER aussi là où une
proposition du texte commence : trois coupes en tête passaient, dont une
qui inversait le sens (« ne revêtant pas » retiré). Le libellé est contrôlé
mot à mot, mots courts compris. Éprouvée sur les défauts proposés par la
contre-lecture.

**Appliqué.** Référentiel `2026-09-26.4` (la `.3`, annulée, n'est pas
réemployée), 167 obligations. La mention d'application du décret
n° 2026-503 (article 5) est ajoutée, mot pour mot, à la description de
l'examen de reprise.

### C27 · 2026-09-26 — `R. 146-35` CCH, relu pour trancher deux PDF qui se contredisaient

**Lu, sur sa page propre** (LEGIARTI000043819153, version en vigueur depuis le
2026-07-01) : structure demandée d'abord sans rien suggérer — un alinéa, une
phrase d'annonce, six items 1° à 6°, rangé au chapitre VI « Immeubles de grande
hauteur », section 5 « Mesures de contrôle ». Formulation décisive confirmée par
deux lectures distinctes : « Il doit être tenu, par le propriétaire, un registre
de sécurité sur lequel sont portés les renseignements indispensables au contrôle
de la sécurité. » Puis : « Ce registre comprend, outre les pièces attendues aux
articles R. 141-10 et R. 141-11 : […] ». **Le corpus le portait déjà** :
`corpus/cch-registre-securite.ts`, lu le 2026-09-01, même verbatim, et la même
remarque en majuscules — « le PROPRIÉTAIRE — et non l'exploitant ». La relecture
n'a rien trouvé de neuf dans le texte ; ce qui manquait était dans les PDF, qui
ne lisaient pas le corpus. **Consigné :** au corpus (`luLe` passé au 2026-09-26,
`lecture` inchangée, sceau du calendrier mesuré identique avant et après :
`2026-09-21.1+159-c8f511323424c950+moteur.4`), et dans le code qui imprime,
`src/lib/pdf/mentions-registre.ts`.

**Ce que la lecture a changé.** Le dossier de conformité imprimait
« R. 143-44 CCH (ERP), R. 146-35 CCH (IGH) » à tout établissement, et le registre
« R. 143-44 CCH » en titre à tout établissement. Les deux sont désormais
conditionnés au régime ; `R. 146-35` n'est cité qu'à un IGH, et **avec son
débiteur** — le propriétaire —, parce que le dirigeant qui lit le registre de
Rojer n'est pas nécessairement celui qui tient le registre de l'immeuble. Il
n'entre pas dans le titre du registre : ce document n'est pas celui-là.

**Une mesure refaite en appelant le code.** Le commentaire du registre disait
« le produit ne porte du régime IGH que deux obligations ». Le référentiel en
rend **onze** qui admettent l'IGH : trois propres (`elec-igh-annuelle`,
`incendie-igh-moyens-secours-annuelle`,
`incendie-igh-charge-calorifique-quinquennale`) et huit d'ascenseur, ouvertes à
tous les régimes.

### C32 · 2026-09-26 — Aucune sortie ne qualifie : « opposable », « fait foi », « exigée par les assureurs » remplacés par des faits

**Constat.** Rojer calcule, il n'avise pas (charte, interdits 16 et 17) ; les
tests anti-verdict gardaient chacun leur sortie, rien ne gardait le reste. Une
recherche sur `src/` et le serveur MCP (hors commentaires) a relevé, sur des
surfaces affichées ou imprimées : « opposable par votre contrat — pas par le
droit » (écran et fiche du permis de feu, README du dossier de contrôle, et le
marquage long de l'ADR-032 — voir plus bas), « RÉFÉRENTIELS NON OPPOSABLES », « Hiérarchie des
mesures opposable » et « éléments opposables » (dossier de conformité), « les
rendant opposables » (guide des documents obligatoires), « pas une règle
opposable » (description d'un risque), « fait foi » et « engage
conjointement » (fiche du permis de feu), « engage le prestataire et vous
protège » (écran du permis de feu), « exigée par les assureurs » (ZIP de
contrôle), « ce qui est en règle » (page d'accueil — trouvé par la garde, la
phrase était coupée en fin de ligne), « conforme et vérifiée » (exemple d'un
champ du plan de prévention). Chacun est remplacé par ce que le texte dit, ou
ce que Rojer fait.

**L'ADR-032 emploie lui-même le mot** (« sources opposables », « actes
d'autorité opposables ») pour décider ; il n'est pas réécrit. Il impose un
marquage, « engagement d'assurance, pas une obligation légale », qui reste
tel quel. ~~La phrase qui le prolonge dans `MARQUAGE_CONTRACTUEL_LONG`
(« opposable par votre contrat d'assurance, pas par le droit ») n'est pas dans
l'ADR, **mais elle n'est PAS corrigée** : `prescriptions/sources.ts` est un
module du moteur de calendrier, et la modifier déplace l'empreinte que
`calendrier/version-moteur.test.ts` scelle. Essayé, constaté
(`91badd776f7acbba` au lieu de `aa9563477bf1ea07`), retiré. Le texte n'est
écrit en base par aucune régénération (il est seulement réexporté pour
l'affichage), ce qui en ferait un « NON » au sens du test — recopier
l'empreinte seule —, mais recopier une empreinte n'est pas une décision de ce
lot. Déclarée dans la garde comme dette nommée.~~ [2026-09-26 : repris, voir
plus bas.]

**Lu, pages propres, structure demandée d'abord, formulation décisive deux
fois :**

- `R. 4121-4` (LEGIARTI000045386451, en vigueur depuis le 2022-03-31, modifié
  par le décret n° 2022-395, art. 1) : un chapeau, sept destinataires 1° à 7°,
  deux alinéas. « […] sont tenus, pendant une durée de 40 ans à compter de
  leur élaboration, à la disposition : ». **L'article entier est consigné au
  corpus** (`code-travail-information-travailleurs`, `luLe` 2026-09-26,
  `modifiePar` ajouté) ; le PDF du document unique le lit de là
  (`pdf/mentions-r4121-4.ts`) au lieu d'une paraphrase qui retenait quatre
  destinataires (« médecin du travail », « Carsat »), sans les anciens
  travailleurs ni les 6° et 7°. Les quarante ans y étaient attribués à la loi
  du 2 août 2021, qui ne fixe qu'un plancher : ils citent désormais
  `R. 4121-4`, dans ce PDF et dans le dossier de conformité.
- Arrêté du 19 mars 1993, art. 1er (LEGIARTI000029720328, en vigueur depuis le
  2008-05-01, modifié par le décret n° 2008-244) : un chapeau, vingt et un
  points numérotés « 1. » à « 21. ». « 21. Travaux de soudage oxyacétylénique
  exigeant le recours à un permis de feu. » — seule occurrence de « permis de
  feu » dans l'article. Cité sur l'écran du permis de feu, à côté de « Aucun
  texte n'impose le permis de feu sous ce nom », sans trancher entre les deux.
  `luLe` du corpus inchangé : seuls le chapeau et le point 21 ont été relus.

**La garde** : `src/lib/rendu/sans-qualification.test.ts`, qui balaie
`src/app`, `src/components`, `src/lib` et `scripts/mcp-server.ts`,
commentaires blanchis, et cherche les mots par-dessus les coupures de ligne.
Deux occurrences admises nommément : la consigne du serveur MCP, qui NOMME
les mots pour les interdire. ~~Et le marquage long, en dette.~~ [Retiré le même jour.] **Éprouvée** : la phrase historique de l'écran du
permis de feu, remise telle que `abd0108` la donne, est refusée à sa ligne
(`permis-feu/page.tsx:178 — « opposable »`) ; les défauts de ce jour sont
gardés en épreuve dans un bac, coupures de ligne comprises.

**Ce que la garde ne regarde pas, et qui reste à décider :**

- `src/lib/referentiels/conformite/` est scellé : `stockage-dangereux.ts`
  porte en `reference` « valeurs de rétention, opposables uniquement sous ce
  régime ICPE », et d'autres notes emploient le mot. Les corriger demande une
  montée de version.
- « Conforme » comme libellé du résultat d'un rapport (formulaire, calendrier,
  registre, tableau de bord) : c'est ce que le vérificateur écrit, affiché
  seul. Le reformuler est une décision de vocabulaire, pas une correction.
- Le choix « Conforme dès la construction » / « Mis en conformité après
  travaux » (régime d'accessibilité déclaré) et « Escabeau … conforme aux
  normes (NF) » (une mesure du DUERP) : le mot y qualifie un bâtiment ou un
  équipement déclaré, pas l'état du dossier.
- Les phrases qui NIENT un verdict (« Cela ne veut pas dire qu'il est
  conforme », « ne rend aucun dossier conforme », « Ce dossier ne vaut pas
  certification de conformité ») sont laissées : elles disent ce que Rojer ne
  fait pas.

**Repris le même jour, sur décision de la session de coordination.** Le
marquage long est corrigé : « cette échéance naît d'une demande de votre
assureur, et aucune référence légale ne lui est attachée ». L'empreinte du
moteur est recopiée SANS incrément (`91badd776f7acbba`, « NON : affichage
seul »), et la dette est retirée de la garde. Dans le formulaire des
prescriptions, la phrase qui suivait répétait « aucune référence légale » :
ce doublon est retiré. Le « 80 % des incendies de travaux se déclarent
après le chantier » de l'écran du permis de feu n'avait pas de source. La
page de l'INRS (brochure ED 6030, « Le permis de feu — Démarche et document
support », août 2019), lue deux fois, n'en donne qu'un : « Les travaux par
points chauds représentent 30 % des origines d'un incendie dans
l'entreprise. » Il remplace l'autre, attribué. La brochure servie en PDF
n'est que le formulaire ; son texte courant n'a pas été lu. La règle APSAD
R43, payante, ne l'a pas été non plus.

**Contre-lecture du même jour, et ce qu'elle a trouvé que la garde ne voyait
pas.**

- Le « 80 % » vivait encore dans les mesures du permis de feu
  (`permis-feu/referentiel.ts`, sous-titre de l'étape « après »), avec
  « C'est la principale cause d'incendie post-travaux » et « Porter à 4h
  minimum » sur la mesure de surveillance.
- La brochure INRS ED 6030 (2e édition, août 2019) est lue en entier : ~~la
  brochure servie en PDF n'est que le formulaire~~ [le texte courant est
  `TI-ED-6030-2.pdf`], extrait deux fois par deux outils distincts. Elle ne
  dit ni 80 %, ni « principale cause », ni 4 h. Elle dit « Surveillance à
  réaliser pendant 2 h au moins après l'arrêt des travaux. Arrêter les travaux
  2 h au moins avant la fermeture de l'entreprise si le maintien de la
  surveillance n'est pas possible. » C'est ce qui s'affiche désormais, cité.
  Le sous-titre de l'étape nomme ses trois actions (inspection, surveillance,
  remise en service), celles du tableau « Étape d'après travaux » de la
  brochure.
- « Obligatoire avant tout travail par point chaud » contredisait, sur le même
  écran, « Aucun texte n'impose le permis de feu sous ce nom ». La brochure
  écrit elle-même « La rédaction du permis de feu est obligatoire pour tous
  travaux par points chauds » : la phrase est citée et attribuée à l'INRS, et
  l'écran rappelle que ce n'est ni un article de code, ni un arrêté.
- L'INRS ne classe AUCUNE mesure en « obligatoire » ou « conseillée » : son
  formulaire demande ~~« À FAIRE ? OUI / NON »~~ « À FAIRE ? O/N » et « FAIT ?
  O/N, LE : » (pages 10-11 de la brochure ; le formulaire servi à part,
  `TI-ED-6030.pdf`, écrit « OUI NON » et « OUI/NON, LE : »). Ce classement est celui de
  Rojer. Le mot « obligatoire » quitte donc les libellés (formulaire, fiche,
  pastille « N non cochée(s) ») pour « prioritaire », et le chapeau dit que
  c'est Rojer qui les signale. L'identifiant interne `obligatoire` ne change
  pas. « Checklist officielle » devient ce qu'est l'ED 6030 : une brochure.
- Six phrases de même nature, hors des mots gardés, sont remplacées par un
  fait : « Aucune valeur légale avant validation » (filigrane du PDF),
  « votre responsabilité est engagée » (plan de prévention, où `R. 4512-6`
  est maintenant cité depuis le corpus), « votre assurance et votre preuve »,
  « c'est cette preuve qui vous couvre », « qui protège aussi bien
  l'entreprise que vous-même », « le premier document demandé ».
- La garde est élargie : frontières Unicode (`\b` est ASCII en JavaScript),
  entités de JSX et apostrophe typographique ramenées à ce qu'elles rendent,
  formes « inopposable », « opposabilité », « fera foi », « exigée par
  l'assureur / par votre assurance », « l'exigera probablement »,
  « en&nbsp;règle », « en{" "} » suivi de « règle », et les familles « vous
  couvre / vous protège », « responsabilité engagée », « valeur légale »,
  « premier document demandé ». Les admissions valent pour un texte exact,
  plus pour un fichier ~~(au mesuré : la comparaison portait sur le MOT, pas
  sur la phrase — une sonde « Ce registre est opposable à l'inspection. »
  ajoutée dans `mcp/tools.ts` passait)~~ [corrigé le même jour : l'admission
  porte sur la LIGNE exacte ; la sonde, ajoutée dans la consigne réelle de
  `tools.ts`, est refusée à la ligne 75]. Éprouvée sur la sonde de la contre-lecture (neuf
  formes, toutes refusées) et sur les fichiers réels de `2fbd230`, remis puis
  restaurés : cinq refus à la ligne. **Ce qu'elle ne voit toujours pas** :
  une qualification hors de ces familles. « Un permis de feu = votre assurance
  et votre preuve » et « Obligatoire avant tout travail » ne relèvent d'aucune
  et ne sont pas refusés sur le fichier restauré. Ils ont été trouvés à la
  lecture.

**Troisième passe, le même jour (vérification de la coordination).**
- Le filigrane de l'aperçu disait « aucune version n'est encore validée dans
  Rojer », ce qui est faux dès la v1 : l'aperçu est toujours proposé, se
  numérote `versions[0].numero + 1` et imprime l'historique. Il dit
  maintenant « Aperçu de la version N, non validée ».
- Le motif de l'aperçu, « APERÇU — brouillon non validé, ne fait pas foi »,
  perd « ne fait pas foi ». La garde voit désormais « fait pas foi » (motif
  de l'aperçu remis dans la route réelle : refusé à la ligne 32).
- La fiche d'un permis de feu dit, sous « Mesures tirées de l'INRS ED 6030 »,
  que « prioritaire » est un classement de Rojer.
- La phrase « Il matérialise un faisceau d'obligations » se lisait comme
  portant sur l'arrêté ; elle devient un renvoi à `GN 13`, par son intitulé
  « Travaux dangereux », cité juste en dessous. L'« entretien des
  installations de sécurité » qu'elle affirmait n'est plus nommé : son
  article (`R. 4224-17`) avait été retiré de cette page le 2026-09-20.

**Sceau inchangé**, mesuré avant et après :
`2026-09-26.5+167-66f005e23f039ca+moteur.4`.
`docs/etat-verification-referentiel.md` régénéré : lus au 2026-08-31,
68 − 1 = 67 ; lus au 2026-09-26, 17 + 1 = 18 (`R. 4121-4`).

### Ce que la chronologie donne à voir

1. **Le dépôt lit beaucoup et applique peu, et l'écart est systématique.** La
   nuit du 26 : ~40 constats, deux fondements corrigés. Le lot D3 : quatre
   familles fondées, zéro encodée. Ce n'est pas une négligence — c'est
   presque toujours une cause nommée (un porteur qui n'existe pas, un attribut
   que le formulaire ne pose pas, une valeur absente d'une énumération). Mais
   la cause est écrite dans un commit, et le constat meurt avec.
2. **Ce qui est appliqué est ce qui ne demande pas de lecture.** URL,
   identifiants, ordres de références. Tout ce qui suppose de rouvrir un
   article attend.
3. **Le même article est mis en cause quatre fois en onze jours** (`L. 4711-5`,
   les 20, 26, 28 et 31 août) sans qu'aucun passage sache des autres.
4. **Une lecture d'agent non recoupée se trompe souvent** : 2 sur 11 accusations
   tenaient le 27 août ; 3 sur 6 « faux négatifs » du brief du 31 n'en étaient
   pas ; 3 références de brief sur 4 étaient fausses au lot 8. Le dispositif
   qui rattrape cela — briefs contredits, contre-vérification indépendante,
   agents qui refusent — fonctionne, et c'est la meilleure nouvelle du dossier.
5. **Les instruments ont été construits, et ils sont bons.** Corpus, clé
   d'article, `versionConstatee`, `relectureDue`, `lecture`,
   `obligation_manquante`, `reserve`, `pnpm veille`, `pnpm relecture`,
   `urls-legifrance.test.ts`. Ce qui manquait n'était pas l'outillage : c'était
   le fil de l'histoire.

---

## Partie 2 — Registre des constats en suspens

### Comment lire les états

| État | Ce qu'il signifie |
|---|---|
| **CORRIGÉ** | Le référentiel d'aujourd'hui ne porte plus le défaut, et le changement est postérieur au constat. |
| **PARTIEL** | Une partie du remède est en place, une partie nommée ne l'est pas. |
| **NON CORRIGÉ** | Le référentiel porte le défaut tel que décrit, et rien n'a bougé depuis le constat. |
| **SANS OBJET** | Le constat décrivait un état déjà révolu **au moment où il a été écrit**. Ce n'est pas un succès : c'est un sur-appel qui n'a pas été détecté comme tel, et qui a coûté une relecture. |
| **ENREGISTRÉ** | Le constat est confirmé et porté par le code (statut `obligation_manquante`, ou `reserve` de lecture) — donc il ne se reperdra plus. Le manque, lui, demeure. |

**Attention à SANS OBJET.** Trois constats de la nuit du 26 août portaient sur
un état du référentiel déjà révolu **sans que le document le sache** — celui de
l'éclairage depuis cinq jours, ceux de `CH 58` et de `R. 4227-39` depuis quatre
heures. C'est le défaut de méthode le plus coûteux du dossier, et il est
invisible sans ce tableau : sur les cinq rattachements du § 2.2, un lecteur du
document d'origine croit avoir cinq défauts à traiter là où il en a deux.

À distinguer des sur-appels que le document **avait** vus et nommés
(`elec-travail-periodique-annuelle`, les slugs d'ascenseur, l'arrêté du
21 décembre 1993) : ceux-là ont coûté une lecture, pas une correction. Le
dispositif à trois niveaux du document a donc fonctionné pour ce qu'il pouvait
voir ; il ne pouvait pas voir que le code avait bougé sous lui.

---

## 2.A — `docs/relecture-source-2026-08-26.md`, constat par constat

Le document dit de lui-même, en tête : « **Rien ici n'a été appliqué au code**
hors ce qui est marqué APPLIQUÉ », et son commit (`618a91a`, 2026-08-26 23:09)
conclut « Rien n'est appliqué. La décision revient à l'utilisatrice. »

**C'était vrai le 26 au soir. Ça ne l'est plus, et le document n'a jamais
bougé.** Il porte dix sections, dont huit de constats à trancher. Ce qui suit
les reprend une par une.

Méthode de vérification : l'état de chaque obligation a été relevé **deux
fois** — sur l'arbre à `618a91a` (le commit du document lui-même) et sur
`origin/main` aujourd'hui — par extraction des clés d'article dans l'ordre des
`referencesLegales`. La convention ADR-003 fait de `referencesLegales[0]` le
**fondement** ; les suivantes sont du contexte. Comparer les deux relevés est
ce qui sépare CORRIGÉ de SANS OBJET.

### § 2.2 — Les cinq « rattachements sans base textuelle »

C'est le tableau le plus cité du document. Relevé complet :

| # | Obligation | Références au 26/08 23:09 | Références aujourd'hui | État |
|---|---|---|---|---|
| 1 | `incendie-travail-eclairage-securite-*` | `Arrêté 2011-12-14 art. 11` · `R. 4227-14` · `R. 4226-19` · `Arrêté 2011-12-14 art. 1` | identiques | **SANS OBJET** |
| 2 | `stockage-dangereux-verification-etancheite` | `R. 4412-11` | `R. 4412-11` · **`R. 4412-17`** | **CORRIGÉ** |
| 3 | `aeration-travail-mise-en-service` | `R. 4222-20` · `R. 4222-21` · `Arrêté 1987-10-08 art. 3` | identiques | **NON CORRIGÉ** |
| 4 | `incendie-registre-securite` | `R. 4227-39` · `L. 4711-5` · `CCH R. 143-44` · `R. 141-10` · `R. 141-11` · `R. 146-35` | **`L. 4711-1`, `L. 4711-2`, `D. 4711-2`, `D. 4711-3` ajoutés ; `L. 4711-5` requalifié** | **CORRIGÉ** |
| 5 | `esp-personnel-formation` | `R. 4323-1` | `R. 4323-1` | **PARTIEL** |

**Le compte est donc : 2 corrigés, 1 partiel, 1 non corrigé, 1 sans objet.**
Ce n'est pas « trois traités sur cinq ». Un des trois que l'on croit traités
n'a jamais eu besoin de l'être, et deux constats sur cinq restent ouverts.

---

**#1 — `incendie-travail-eclairage-securite-*` / `R. 4226-19` · SANS OBJET**

Le constat : « `R. 4226-19` ne vise QUE les vérifications électriques
R. 4226-14 et R. 4226-16. Ne dit rien de l'éclairage de sécurité. »

Il est exact sur le fond, et sans portée sur le code. L'obligation ne s'est
jamais fondée sur `R. 4226-19` : depuis `23ac89b` (**2026-08-21**, cinq jours
avant le constat), son fondement est l'article 11 de l'arrêté du 14 décembre
2011, relevé au verbatim, et `R. 4226-19` y figure en troisième position avec
une note qui dit exactement ce que le constat reproche :

> « Registre sur lequel l'article 11 de l'arrêté fait porter le résultat des
> opérations. **Support de consignation, pas fondement de la périodicité.** »

Cette note était déjà présente à `618a91a` — vérifié : `grep -c 'Support de
consignation' <fichier à 618a91a>` rend `2`, une occurrence par obligation du
couple. L'agent a jugé la référence sans lire la note qui l'accompagnait.

*Preuve aujourd'hui :* `src/lib/referentiels/conformite/incendie.ts`,
obligations `incendie-travail-eclairage-securite-essai-mensuel` et
`-autonomie-semestrielle`.

---

**#2 — `stockage-dangereux-verification-etancheite` / `R. 4412-11` · CORRIGÉ**

Le constat : « Ni "rétention" ni "étanchéité" n'y figurent. Seul le 2° parle de
"procédures d'entretien régulières". »

Corrigé le **2026-08-27** par `491157c`, *« Les deux fondements que l'arbitrage
a retenus, vérifiés puis recalés »* — sur onze accusations portées contre les
fondements, deux tenaient, et celle-ci en était une. `R. 4412-17` a été ajouté
aux deux obligations de stockage, **lu en première main** avec verbatim, et
entré au corpus.

*Preuve aujourd'hui :* `src/lib/referentiels/conformite/stockage-dangereux.ts`
porte les deux références, `R. 4412-11` étant réétiqueté « (entretien régulier
des équipements de stockage) » — c'est-à-dire réduit à ce que le constat lui
concédait. `src/lib/referentiels/corpus/code-travail-risque-chimique.ts` porte
`R. 4412-17` en `lecture: "premiere_main"`, `luLe: "2026-08-27"`, avec sa
`citationCle`.

---

**#3 — `aeration-travail-mise-en-service` / `R. 4222-21` · NON CORRIGÉ**

Le constat : « Impose une CONSIGNE d'utilisation écrite, pas une vérification à
la mise en service. »

Rien n'a bougé. `R. 4222-21` est toujours cité en contexte 1 de l'obligation, et
n'a jamais été rouvert : au corpus, il est en `lecture: "agent_verbatim"`,
`luLe: "2026-08-26"`, **sans `citationCle` et sans `versionEnVigueur`
constatée**. L'export mécanique le signale de lui-même — la ligne porte
`SANS_VERBATIM` et `VERSION_JAMAIS_CONSTATEE` dans
`docs/relecture-references-2026-08-27.csv` comme dans l'export d'aujourd'hui.

Ce constat est donc **encore à instruire**, et l'instruire coûte une lecture
d'un seul article.

*Preuve :* `src/lib/referentiels/conformite/aeration.ts` (obligation) et
`src/lib/referentiels/corpus/code-travail-risque-chimique.ts` (entrée corpus,
premier article du tableau).

---

**#4 — `incendie-registre-securite` / `L. 4711-5` · CORRIGÉ**

Le constat : « C'est une FACULTÉ de fusionner des registres ("est autorisé à"),
pas l'obligation d'en tenir un. Le socle est L. 4711-1 et L. 4711-2. »

Corrigé le **2026-08-31** par `35c5f90`, et le commit dit que ce n'était pas
prévu : *« Trouvaille hors brief : la branche travail du registre reposait sur
L. 4711-5, c'est-à-dire sur une faculté. »* `L. 4711-1`, `L. 4711-2`,
`D. 4711-2` et `D. 4711-3` ont été ajoutés, chacun avec son verbatim relevé le
2026-08-31, et dépouillés au corpus. `L. 4711-5` reste cité, requalifié dans
son propre libellé de référence : « **faculté de regroupement, PAS un
fondement** ».

Le remède est exactement celui que le constat prescrivait. Il a été retrouvé
indépendamment, cinq jours plus tard, par un lot qui ne cherchait pas cela —
c'est-à-dire au prix d'une seconde découverte.

*Preuve :* `src/lib/referentiels/conformite/incendie.ts`, obligation
`incendie-registre-securite` ; réserve `L. 4711-5` dans
`src/lib/referentiels/corpus/code-travail-incendie.ts`.

---

**#5 — `esp-personnel-formation` / `R. 4323-1` · PARTIEL**

Le constat : « Porte une INFORMATION, pas une formation. La formation
renouvelée est à R. 4323-3 et R. 4323-4. »

Ce qui couvre le constat : le libellé de la référence dit
« `R. 4323-1 à R. 4323-5` (information et formation à l'utilisation des
équipements de travail) » et son URL pointe la **section** entière
(`LEGISCTA000018489707`), donc R. 4323-3 et R. 4323-4 avec. Mais ce libellé
date de `2d341ac` (**2026-08-25**) : il est antérieur au constat, et rien n'a
été fait depuis.

Ce qui ne le couvre pas, et c'est mesurable :

- la **clé d'article** de la référence est `R. 4323-1` seul. `R. 4323-3` et
  `R. 4323-4` **ne sont pas au corpus** — vérifié : `grep -o 'ref: "R\. 4323-[0-9-]*"'
  sur `src/lib/referentiels/corpus/` rend 43 clés, dont `R. 4323-1`, `R. 4323-22`
  à `-28`, `R. 4323-55` à `-57` et `R. 4323-58` à `-90` ; ni `-3` ni `-4` ;
- ils ne sont donc **ni déclarés lus, ni surveillés par la veille** ;
- `R. 4323-1` lui-même est en `lecture: "agent_verbatim"` sans `citationCle` :
  l'article dont le constat conteste le contenu n'a jamais été rouvert.

C'est le motif exact que le dépôt a nommé le lendemain, dans `9f54964` : *« Dix-sept
références nomment plusieurs articles et ne portent qu'une clé — R. 4544-9 à
-11 ramené à R. 4544-10. Les autres ne sont ni déclarés lus ni surveillés :
c'est le mécanisme exact qui avait fait rater R. 4544-11-1. »* Le constat #5
est un cas de ce motif ; il a été nommé, jamais traité sur cette ligne.

*Preuve :* `src/lib/referentiels/conformite/equipement-sous-pression.ts` ;
`src/lib/referentiels/corpus/code-travail-risque-chimique.ts`.

---

### § 5 — Les six « fondements à recaler »

Même méthode, même relevé à deux dates. Le constat porte ici sur l'**ordre** :
`referencesLegales[0]` est le fondement (ADR-003), et le reproche est qu'il
désigne l'article qui parle du sujet plutôt que celui qui prescrit.

| # | Obligation | Fondement au 26/08 | Fondement aujourd'hui | Ce que le constat demandait | État |
|---|---|---|---|---|---|
| 1 | `elec-erp-mise-en-service` | `GE 6` (+ `EL 19`) | inchangé | `GE 7` / `GE 8 § 1` via `EL 19 § 2` | **NON CORRIGÉ** |
| 2 | `cuisson-erp-extinction-automatique-annuelle` | `GC 22` | `GC 22` (+ **`MS 73`**, **`GC 8`**) | `MS 73` | **PARTIEL** |
| 3 | `cuisson-erp-verification-initiale` | `GC 22` (+ `GE 6`, `GC 1`) | inchangé | `GE 7` / `GE 8` | **NON CORRIGÉ** |
| 4 | `incendie-erp-baes-annuelle` | `EC 15` (+ `EL 19`) | inchangé | `EL 19 § 3` | **NON CORRIGÉ** |
| 5 | `aeration-erp-chauffage-ventilation-annuelle` | **`CH 58`** (+ `CH 57`) | inchangé | `CH 58` | **SANS OBJET** |
| 6 | `incendie-travail-exercice-semestriel` | **`R. 4227-39`** (+ `R. 4227-34`) | inchangé | `R. 4227-39` | **SANS OBJET** |

**Deux sur six sans objet, et de peu.** `CH 58` était devenu le fondement de
son obligation à `86346e9`, le **2026-08-26 à 19:19** — *quatre heures avant*
le dépôt du document qui le réclame. Les six agents ont travaillé sur un état
du référentiel antérieur à leur propre nuit.

**Trois sur six sont ouverts, et pour un motif commun :** `GE 7` et `GE 8`
**n'existent pas au corpus**. Vérifié : `grep 'ref: "GE '` sur
`src/lib/referentiels/corpus/` ne rend que `GE 6` et `GE 4`. Les deux articles
que le constat désigne comme le vrai fondement de trois obligations n'ont
jamais été ouverts. Tant qu'ils ne le sont pas, ces trois lignes ne peuvent pas
être recalées — la règle du dépôt interdit d'appuyer une obligation sur un
texte non lu.

Le cas #2 mérite sa nuance : `491157c` (2026-08-27) a bien ajouté `MS 73`
**et** `GC 8` (celui-ci lu en première main, avec verbatim), en constatant que
« l'expression [extinction automatique] n'apparaît pas [dans GC 22], et ses
deux listes sont fermées ». Mais `GC 22` est resté en position de fondement.
Le contenu du constat est traité, sa conséquence sur l'ordre ne l'est pas — et
l'ordre n'est pas cosmétique : le test anti-doublon compare les obligations sur
leur article fondateur, ce que la note de `elec-travail-consignation-registre`
documente noir sur blanc.

*Preuve :* `pnpm relecture --csv`, colonnes `obligation`, `rang`, `article`.

---

### § 2.1 — « Des périodicités attribuées à des articles qui ne les portent pas » · ENREGISTRÉ, 10 lignes ouvertes

Le document ne tranchait pas : il disait que ce constat systémique « est une
requête mécanique à écrire, pas une relecture ».

**La requête a été écrite**, le lendemain, par `9f54964` : c'est
`scripts/export-relecture.ts` (`pnpm relecture`), qui déplie une ligne par
couple obligation × référence — précisément parce que « le dossier de relecture
PDF n'imprime qu'une référence par obligation […] et replie les autres dans un
"+ 1 réf." ». Le constat mécanique s'appelle `PERIODICITE_SANS_TEXTE_PORTEUR`.

Il rend aujourd'hui **10 lignes sur 10 obligations** :

`elec-salarie-attestation-medicale-voisinage` (quinquennale) ·
`incendie-travail-exercice-semestriel` (semestrielle) ·
`formation-securite-salarie-cse-sst` (quadriennale) ·
`sante-travail-salarie-vip` (quinquennale) ·
`sante-travail-salarie-sir` (quadriennale) ·
`sante-travail-salarie-sir-visite-intermediaire` (biennale) ·
`sante-travail-etablissement-liste-postes-risques` (annuelle) ·
`sante-travail-salarie-vip-adaptee` (triennale) ·
`sante-travail-salarie-sir-categorie-a` (annuelle) ·
`conduite-salarie-attestation-medicale` (quinquennale)

Neuf des dix relèvent du Code du travail (santé au travail, formation,
conduite) : le motif est bien celui que le document annonçait — le Code renvoie
la périodicité à un arrêté, et la citer sans l'arrêté attribue un chiffre à un
texte qui ne le porte pas. Le sur-appel que le document avait déjà détecté
(`elec-travail-periodique-annuelle`, qui cite bien l'arrêté du 26 décembre 2011)
n'apparaît pas dans la liste : la requête ne le lève pas à tort.

**Ce qui manque : la lecture.** L'outil dit *où regarder*, il ne dit pas si le
chiffre est faux. Aucune de ces dix lignes n'a été instruite.

*Preuve :* `pnpm relecture` (bloc « Constats mécaniques »).

---

### § 2.3 — « Champs d'application plus larges que ce qu'on retient »

| Constat | État aujourd'hui | Preuve |
|---|---|---|
| `R. 4224-17` vise tout le bâti technique, rattaché aux seules portes automatiques | **NON CORRIGÉ** — cité en contexte de `porte-auto-dossier-maintenance` et `porte-auto-maintien-en-etat`, et de rien d'autre | export `--csv` |
| `R. 4224-12` (« toutes les portes et portails ») absent du corpus | **NON CORRIGÉ** — toujours absent du référentiel et du corpus | export `--csv` |
| `R. 4323-22/-23/-25/-28` visent tous les équipements de travail, pas le levage | **NON CORRIGÉ** — les quatre ne servent que des obligations `levage-*` (10 rattachements, tous du domaine levage) | export `--csv` |
| `R. 4544-11` (travaux sous tension) : « un cas d'usage entier manque » | **ENREGISTRÉ** — l'article est entré au corpus le 2026-08-31 en `obligation_manquante`, motif : « DEUX obligations d'employeur, distinctes de l'habilitation ordinaire de R. 4544-10 […] et aucune des deux n'est encodée ». Le manque est déclaré, il n'est pas comblé | `corpus/code-travail-electricite.ts` |
| `R. 4227-39` impose des essais **et** visites périodiques semestriels, pas seulement l'exercice | **NON CORRIGÉ** — `incendie-travail-exercice-semestriel` reste la seule ligne semestrielle de l'article | export `--csv` |
| `R. 4412-38` : le CSE est destinataire au même titre que les travailleurs | **NON CORRIGÉ** — l'article fonde `stockage-dangereux-fiches-donnees` et `-formation-personnel` ; aucune ne porte le CSE. Un motif voisin est en revanche tracé : `35c5f90` refuse de rebrancher cet article au porteur établissement, « déclencheur non implémenté » | export `--csv` ; `35c5f90` |

**Cinq ouverts sur six, un enregistré.** C'est la section la moins traitée du
document, et c'est la plus coûteuse : un champ d'application trop étroit
produit un faux négatif, c'est-à-dire un silence — l'erreur que
`35c5f90` décrit ainsi : « *le trou se voit, le faux négatif rassure à tort* ».

---

### § 3 — Rythmes trouvés que le référentiel ne porte pas

| Article | Rythme | État |
|---|---|---|
| `DF 10 § 3` — triennale par organisme agréé si désenfumage mécanique **et** SSI catégorie A ou B | **NON CORRIGÉ, et motivé** — `incendie-erp-desenfumage-annuelle` porte l'annuelle et rien d'autre. Le document donnait déjà la cause : la condition croise deux catégories d'équipement, « le modèle ne sait pas l'exprimer ». Cette cause n'a pas été levée. |
| `CH 58` — triennale sur les dispositifs de sécurité des systèmes thermodynamiques | **NON CORRIGÉ** — `aeration-erp-chauffage-ventilation-annuelle` se fonde sur `CH 58` mais n'en porte que l'annuelle. Le constat était marqué « à contre-vérifier » ; il ne l'a pas été. |
| `PE 4 § 1` — contrat **annuel** d'entretien de la détection incendie, locaux à sommeil | **ENREGISTRÉ** — la réserve portée sur `PE 4` au corpus le dit : « Le § 1 impose un contrat annuel d'entretien du système de détection automatique d'incendie, restreint aux établissements comportant des locaux à sommeil : il attend l'attribut ». Le § 2 (triennal), lui, est encodé. |
| `R. 4226-21` — vérification des installations électriques **temporaires** | **NON CORRIGÉ** — l'article est absent du référentiel comme du corpus. |

---

### § 4 — Sur-couvertures possibles

| Constat | État |
|---|---|
| `MS 73` : la triennale ne vaut que pour les SSI A/B et les sprinkleurs | **CORRIGÉ, et par une distinction explicite** — le référentiel porte deux lignes séparées, `incendie-erp-ssi-annuelle` (annuelle) et `incendie-erp-ssi-triennale` (triennale), toutes deux fondées sur `MS 73`. `491157c` a par ailleurs tranché le cas voisin : « La triennale par organisme agréé du même MS 73 § 2 ne vise QUE les SSI de catégories A et B et les sprinkleurs : un système sous hotte de friteuse relève bien de l'annuelle ». |
| `GE 4` : ce n'est pas une périodicité unique, le tableau croise type × catégorie et donne 3 ou 5 ans | **NON CORRIGÉ** — `GE 4` n'est cité qu'en contexte de `incendie-erp-5-visite-commission`, en `quinquennale` constante. Voisin, mais distinct : `PE 37` a été rouvert le 2026-08-31, et sa réserve au corpus documente le débat sur-application / sous-application. |
| `R. 4412-87` : ne vise que les agents CMR, rattaché à une obligation générique | **NON CORRIGÉ** — cité en contexte de `stockage-dangereux-formation-personnel`, qui n'est pas restreinte aux CMR. |

---

### § 6 — Textes modifiés récemment · PARTIELLEMENT INSTRUMENTÉ

Trois constats distincts, trois sorts différents.

- **Refonte GZ (GZ 1–30 → GZ 1–15, arrêté du 23 février 2025).** *Sans objet
  pour le référentiel* : aucune obligation ne cite d'article `GZ` — l'export ne
  rend aucune ligne. Le document notait lui-même que l'abrogation de GZ 30
  était « déjà traitée ». Reste vrai comme consigne : toute citation `GZ`
  future est à contrôler.
- **Seize versions postérieures à 2024 relevées.** *Non instrumenté comme
  telles* : ces dates ont été relevées dans un document, pas inscrites au code.
  Le champ qui les porterait est `versionEnVigueur` au corpus, et l'export
  compte aujourd'hui **119 lignes / 74 obligations** en
  `VERSION_JAMAIS_CONSTATEE`. Autrement dit : le relevé de la nuit du 26 n'a pas
  réduit cette dette, parce qu'il n'a pas été reversé dans le code.
- **Fins de version programmées** (`GE 6` au 1er juin 2027, `R. 4227-37` au
  1er janvier 2027). **INSTRUMENTÉ.** L'export rend exactement trois lignes
  `VERSION_FUTURE` : `elec-erp-mise-en-service` (`GE 6`),
  `cuisson-erp-verification-initiale` (`GE 6`) et
  `incendie-travail-consigne-affichee` (`R. 4227-37`). Le mécanisme adjacent
  existe aussi : `src/lib/referentiels/conformite/veille-textes.ts` porte les
  textes à application différée qui ne visent aucune ligne existante, avec un
  test qui échoue le jour venu, et un champ `verifieLe` qui date la lecture de
  la disposition d'entrée en vigueur à la source.

---

### § 9.1 — Ascenseurs, corroboration indépendante

- **Le sur-appel sur les slugs** (`examen-annuel-securite` /
  `examen-semestriel-secours` « inversés ») : le document le tranchait déjà —
  les identifiants sont sous contrainte d'unicité en base, leur contenu est
  juste. **Sans objet, et il l'était déjà.**
- **`R. 134-6 d)` — nettoyage annuel de la cuvette, du toit de cabine et du
  local des machines. NON CORRIGÉ.** `CCH R. 134-6` sert quatre obligations
  (`ascenseur-visite-six-semaines`, `-entretien-contrat`,
  `-examen-semestriel-secours`, `-examen-annuel-securite`) ; aucune ne porte le
  nettoyage. Le constat était marqué « à contre-vérifier, et neuf ».
- **`R. 134-11` — compatibilité des moyens d'alerte hors RTC et 3G. NON
  CORRIGÉ.** L'article fonde `ascenseur-controle-technique-quinquennal` ;
  l'exigence nouvelle n'y apparaît pas.

---

### § 9.2 — Sept rythmes trouvés, hors du référentiel

| Article | Rythme manquant | État |
|---|---|---|
| `Arrêté 2011-12-26 art. 3` | l'annuelle peut passer à deux ans si le rapport précédent est sans observation | **NON CORRIGÉ** — cité en contexte de `elec-travail-periodique-annuelle`, qui reste annuelle sans alternative |
| `GH 5` (IGH) | quatre rythmes (6 mois, 1 an, 2 ans, 5 ans) + règle des 20 %/an | **NON CORRIGÉ** — fonde `elec-igh-annuelle` et `incendie-igh-moyens-secours-annuelle`, une seule fréquence chacune. L'IGH est hors cible produit, ce qui atténue la portée sans annuler le constat |
| `Arrêté 1987-10-08 art. 4` | annuel **et** semestriel en présence d'un recyclage | **CORRIGÉ HORS `main`** — voir l'encadré ci-dessous |
| `Arrêté 2017-11-20 art. 15` | six régimes d'inspection | **NON CORRIGÉ** — fonde `esp-inspection-periodique`, en `triennale` unique |
| `Arrêté 2017-11-20 art. 18` | six échéances de requalification + régime des extincteurs | **NON CORRIGÉ** — l'article est absent du référentiel |
| `Arrêté 2015-06-01 art. 22` | tests semestriels des dispositifs actifs de drainage | **NON CORRIGÉ** — cité en contexte de `stockage-dangereux-retention`, en `periodicite: autre` |
| `PS 32` | quinquennale par organisme agréé + vérification à la mise en service | **NON CORRIGÉ** — fonde les deux lignes `aeration-erp-ps-surveillance-qualite-air-*` (biennale et annuelle selon le seuil de 250 véhicules), sans la quinquennale |

> **Le cas du semestriel de recyclage, et pourquoi il compte plus que les six
> autres.** Ce constat est le seul des sept à avoir été traité — dix jours plus
> tard, par `f758fb8`, *« Le contrôle semestriel des gaines de recyclage, lu
> depuis dix jours et jamais posé »*. Le titre du commit dit l'échec de mémoire
> mieux que ce document ne pourrait le faire.
>
> Mieux : le défaut était **doublement enregistré et resté sans suite**. La
> `notesInternes` de `aeration-controle-installations-r4222-20` l'écrit depuis
> le 2026-08-27 : « Ce dernier cas **N'EST PORTÉ PAR AUCUNE OBLIGATION** […]
> C'est un manque réel, et il n'est pas de mon fait — il précède ce chantier. »
> Un constat écrit dans le code, en majuscules, n'a pas suffi.
>
> **Et il n'est toujours pas sur `origin/main` au 2026-09-01.** `f758fb8` vit
> sur `integration/2026-09-01-recadrage`. Un correctif sur une branche non
> intégrée n'est pas un correctif : c'est le motif « Vercel déploie main ».
> **À rouvrir au merge, pas avant.**

---

### § 9.3 — URLs fausses dans le corpus · CORRIGÉ (5/5)

Le constat listait cinq identifiants Légifrance faux ou déplacés. Les quatre
qui appelaient une correction d'identifiant sont en place aujourd'hui — vérifié
par recherche directe des identifiants prescrits :

| Prescrit | Présent dans |
|---|---|
| `JORFTEXT000025055364` (arrêté 2011-12-14 éclairage) | `corpus/arrete-2011-12-14-eclairage.ts` |
| `JORFTEXT000025167121` (arrêté 2011-12-30 IGH) | `corpus/arrete-2011-12-30-igh.ts`, `types-communs.ts` |
| `JORFTEXT000026286347` (arrêté 2012-08-07) | `corpus/arretes-ascenseurs.ts`, `conformite/ascenseurs.ts` |
| `JORFTEXT000030673177` (arrêté 2015-06-01 art. 22) | `corpus/icpe-stockage.ts` |

Le cinquième — « `C. env. R. 557-14-1` est dans le code de l'environnement, pas
dans l'arrêté » — est respecté : l'article est cité comme `C. env. R. 557-14-1`
partout où il apparaît (`components/equipements/EquipementForm.tsx`,
`lib/equipements/schema.ts`, `lib/equipements/esp.test.ts`).

C'est la seule section du document intégralement soldée, et ce n'est pas un
hasard : le document la qualifiait lui-même de « concret et mécanique à
corriger ». **Le corollaire est le vrai enseignement : ce qui a été appliqué
est ce qui ne demandait pas de lecture.**

Une garde existe depuis, `src/lib/referentiels/urls-legifrance.test.ts` — un
article de code cité deux fois doit pointer le même identifiant. Elle dit
elle-même ce qu'elle ne prouve pas : « qu'un article servi par un seul
identifiant DISTINCT soit servi par le bon », et les 41 occurrences dont la
référence voisine nomme un article d'arrêté (« MS 73 », « EL 19 ») restent hors
de sa portée.

---

### § 9.4 — Autres fondements mis en cause

| Constat | État |
|---|---|
| `PS 32` : nos deux obligations isolent la qualité de l'air, que l'article **exclut** du contrôle quinquennal | **NON CORRIGÉ** — les deux lignes `aeration-erp-ps-surveillance-qualite-air-*` portent toujours ce seul champ |
| `C. env. L. 512-1` ne traite que de l'autorisation ; le régime déclaratif est à `L. 512-8` | **NON CORRIGÉ** — `stockage-dangereux-declaration-icpe` se fonde sur `L. 512-1` ; `L. 512-8` est absent du référentiel |
| `CCH R. 134-1` est un article de définition ; les moyens d'alerte sont au 6° de `R. 134-2` | **NON CORRIGÉ** — `ascenseur-telealarme-liaison` se fonde sur `R. 134-1` ; `R. 134-2` est absent |
| `Arrêté 2004-03-01 art. 20` : le « 6 mois » est une condition de dispense, pas une périodicité de VGP | **À INSTRUIRE** — l'article est cité en contexte 2 de `levage-vgp-semestrielle-chariot-gerbeur`, dont la semestrialité est fondée ailleurs (`Arrêté 2004-03-01 art. 23`, `R. 4323-23`). Le constat ne dit pas que la périodicité est fausse, il dit que cet article ne la porte pas : à requalifier en note, pas à retirer |
| `Arrêté 1993-12-21 art. 2` ne vise que le passage de véhicules | **SANS OBJET** — le document le note lui-même : « cohérent avec la correction faite ce soir sur `porte-auto-portail-piete-coulissant` » |

---

### § 1, § 7, § 8 — ce qui ne demande rien

- **§ 1 « Appliqué cette nuit »** — PO 8 § 1 / PO 12 (commit `9f13f91`) et le
  second attribut « très petit hôtel » de PO 13. Rien à rouvrir sur le premier.
  Le second est un besoin de modèle, tracé ailleurs.
- **§ 7 « PE 4, texte intégral confirmé »** — le point décisif (« la liste se
  termine par *etc.*, elle n'est pas limitative ») est **tenu par le code** :
  `PE 4` porte au corpus une réserve qui distingue le § 2 encodé du § 1 en
  attente d'attribut, et `incendie-erp-pe4-entretien-installations-techniques`
  existe en `triennale`. Constat **appliqué**.
- **§ 8 « Confirmé sans réserve »** — aucune action attendue. C'est la seule
  section du document qui n'a pas vieilli, parce qu'elle n'affirme rien sur le
  code.

---

## 2.B — Ce que le code porte déjà, et qui n'a pas besoin de ce document

Trois registres vivent dans le code et se mesurent. Ils sont la partie du
constat qui **ne se périmera pas**, et il ne faut pas les recopier ici.

| Registre | Où | Compte aujourd'hui |
|---|---|---|
| Articles lus qui imposent une obligation que le référentiel ne porte pas | `statut: "obligation_manquante"` au corpus | **19** |
| Articles écartés par un choix explicite de ne pas les porter | statuts `hors_perimetre` / `sans_objet` | **28**, dont **1 sans mention à l'utilisateur** |
| Réserves de lecture — ce qu'un article dit et que le modèle ne sait pas exprimer | champ `reserve` | **42** |
| Dette de lecture | articles au corpus jamais lus | **2** sur 276 |

*Mesuré par `pnpm relecture` et par parcours de `CORPUS`.*

Et quatre constats mécaniques, également mesurés à chaque exécution :

| Constat | Lignes | Obligations |
|---|---|---|
| `SANS_VERBATIM` — article retenu sans citation relevée | 114 | 72 |
| `VERSION_JAMAIS_CONSTATEE` | 119 | 74 |
| `PERIODICITE_SANS_TEXTE_PORTEUR` | 10 | 10 |
| `CORPUS_NE_RENVOIE_PAS` | 11 | 9 |
| `VERSION_FUTURE` | 3 | 3 |
| `TITRE_HORS_CATALOGUE` | 1 | 1 |

**Le chiffre à retenir : 72 obligations sur 116 s'appuient sur au moins un
article retenu sans verbatim relevé.** La nuit du 26 août a fait lire 123
articles ; elle n'a pas fait baisser ce compte, parce que ses relevés sont
restés dans un document.

---

## 2.C — La qualité de lecture, mesurée

Le corpus distingue trois provenances (`SourceLecture`, `corpus/types.ts`), et
la distinction est le cœur du dossier :

- `premiere_main` — « Lu sur Légifrance, verbatim relevé par la personne qui
  l'encode » ;
- `agent_verbatim` — « Lu sur Légifrance par un agent, qui en a rapporté le
  verbatim et la date de version. **Vaut constat, pas garantie** : le verbatim
  n'a pas été recoupé » ;
- `indirect` — « Lu ailleurs qu'à la source […] **NE PEUT PAS fonder une entrée
  du référentiel** : deux reproductions concordantes peuvent dériver du même
  relevé, et aucune ne porte la date de version faisant foi ».

Répartition aujourd'hui, mesurée sur `src/lib/referentiels/corpus/` :

| Provenance | Articles |
|---|---|
| `agent_verbatim` | **238** |
| `premiere_main` | **36** |
| `indirect` | **0** |
| *(total dépouillé)* | *274* |

**87 % du corpus tient sur une lecture d'agent non recoupée.** C'est le régime
normal du dépôt et ce n'est pas un défaut en soi — le type dit que cela « vaut
constat ». Ce qui est un défaut est de l'oublier : c'est exactement le
mécanisme qui a produit les deux références fausses, dont un article abrogé
depuis quatre mois, qui ont motivé l'invention du champ `lecture`.
L'interdiction du niveau `indirect` est, elle, **tenue** : zéro entrée.

---

## 2.D — Les pièges de Légifrance, constatés

Ce registre existe parce que trois lots successifs ont buté sur les mêmes
mécanismes sans qu'aucun sache des autres. **Il est le pendant de la liste de la
skill `veille-reglementaire`** — celle-ci dit comment lire, celui-ci dit ce
qu'on a vu mentir, avec la date et l'article sur lequel ça s'est produit.

| # | Le piège | Constaté sur | Ce qui le déjoue |
|---|---|---|---|
| **1** | **`curl` et `fetch` reçoivent un 403.** Le site refuse les clients HTTP ordinaires, même avec un User-Agent de navigateur | partout | `WebFetch`. Ne pas contourner par un script |
| **2** | **Une URL `article_lc` ne rend parfois qu'une table des matières** | codes | basculer sur la page de section, rendue côté serveur. *Ne marche PAS sur les textes LODA* : `/loda/section_lc/…` rend un **404** et `/loda/id/<TEXTE>/<LEGISCTA>/` redirige vers l'accueil. Sur un arrêté, il faut y aller **article par article** (constaté le 2026-09-04) |
| **3** | **Un renvoi peut pointer vers une numérotation abrogée** | arrêté du 25 juin 1980 → `R. 123-11` CCH | signaler, ne pas recopier |
| **4** | **La page consolidée FABRIQUE du contenu** | arrêté 1986, art. 100 : « le propriétaire doit veiller à la conformité du bâtiment » alors que l'article traite de l'affichage des consignes (2026-09-01) | ne rien retenir d'une page consolidée |
| **5** | **La page consolidée INVENTE des périodicités** | arrêté 1986, art. 102, annuel qu'il ne porte pas (2026-09-01) | idem |
| **6** | **La page consolidée produit des FAUX NÉGATIFS** | arrêté 1986 : « aucune occurrence » d'« une fois par an » ni de « contrôle » entre les art. 5 et 96, alors que l'art. 78-1 contient les deux. **Reproduit à l'identique le 2026-09-04**, la même page affichant pourtant le lien de l'art. 78-1 | **un négatif rendu par une page consolidée ne vaut rien.** Ouvrir les articles |
| **7** | **La page consolidée FABRIQUE DES TEXTES MODIFICATEURS** — le pire des trois, parce que c'est ce dont `versionEnVigueur` et `modifiePar` dépendent | arrêté 1986, art. 78-1 : la page consolidée annonce « Création par arrêté du **28 octobre 2021** », la page d'article annonce « Arrêté du **27 juillet 2026** » (2026-09-04) | ne prendre d'une page consolidée **qu'un identifiant de lien**, puis vérifier en ouvrant la page qu'il désigne |
| **8** | **Un article long peut être rendu SILENCIEUSEMENT RÉSUMÉ.** Ce n'est pas un refus, c'est une paraphrase : la page rend bien le texte, la lecture automatique en rend un abrégé, sans le dire | `GH 61 § 5` amputé de la phrase portant les cinq ans ; art. 78-1 amputé de son 7° et de son contrôle annuel (2026-09-03) ; art. 14, 15, 53 et 54 de l'arrêté 1986 abrégés au premier appel (2026-09-04) | redemander le paragraphe décisif **seul**, mot pour mot, puis poser une **question fermée** sur le point qui tranche |
| **9** | **Deux lectures concordantes peuvent partager le même angle mort** — c'est la limite de la parade n° 8, et elle a failli coûter `GH 61` | 2026-09-04 | chercher un **second article** qui dit la même chose. `GH 5 § 3.1.4` a confirmé la quinquennale de `GH 61 § 5` : c'est le seul recoupement du dossier qui ne partageait aucun angle mort |
| **10** | **Une lecture automatique peut aussi AJOUTER une conclusion de droit** que le texte ne porte pas | arrêté 1986, art. 62 : « contrôlable et remplaçable » rendu avec le commentaire « cela implique une obligation de vérification du propriétaire », que le texte ne dit pas (2026-09-04) | ne retenir que ce qui est **entre guillemets dans le texte** |
| **11** | **Le fil d'Ariane rendu peut être faux** alors que l'article, lui, est le bon | arrêté 1986, art. 21 et 26 : chemin annoncé « Titre II » pour des articles du titre III (2026-09-04) | recouper le chemin sur les **articles voisins** avant de s'en servir pour appliquer une exclusion |

**Trois contrôles suffisent à valider une page d'article**, et ils ont tenu sur
les 82 lectures du 2026-09-04 : la page **annonce elle-même son numéro
d'article**, elle **nomme le texte** dont elle relève, et son contenu est
**assez court pour être rendu mot pour mot**. Quand le troisième n'est pas
satisfait, la parade n° 8 s'applique.

---

## Partie 3 — Pour que ce document ne se périme pas

Un journal qu'il faut reconstituer à la main est un journal qui mourra une
seconde fois. Celui-ci a été reconstitué en une session, et il ne faut pas
recommencer.

### Ce qui a tué les documents précédents

**Trois documents de ce dépôt sont morts de la même façon**, et le mécanisme
est chaque fois identique : *le document a raison le jour où il est écrit, le
code bouge, le document ne bouge pas, et quelqu'un s'y fie.*

1. **`docs/relecture-source-2026-08-26.md`** — il annonce « rien n'est
   appliqué » ; six jours plus tard, deux de ses cinq rattachements sont
   corrigés, sa section URL est soldée, et quatre de ses constats visaient déjà
   un état révolu. Le document, lui, dit toujours la même chose. C'est celui
   qui a coûté la journée du 1er septembre.
2. **`docs/carto-obligations-hors-equipement.md`** — honnête sur elle-même
   (« ⚠️ Les références ci-dessous sont présumées […] pas d'une lecture de
   Légifrance »), et pourtant recopiée sans recoupement dans deux briefs du
   31 août : `a2186cf` en tire le constat que « les deux erreurs ont la même
   cause : la carto et une note recopiées sans être recoupées ». Aujourd'hui
   son premier paragraphe est faux — il fonde tout le document sur le fait que
   « `Obligation.categoriesEquipement` est obligatoire et non vide
   (`types.ts:168`) », que l'ADR-022 a levé, et la ligne citée désigne
   désormais autre chose.
3. **Une `notesInternes` de `incendie.ts`** — pas un document, et c'est le plus
   inquiétant : le code lui-même a menti. La note annonçait trois corrections
   « non réparées » ; deux l'étaient. Le brief du palier 1 l'a lue et l'a prise
   pour l'état du code. Le lot a fini par écrire la leçon dans le fichier :
   **« une note qui décrit un état révolu finit par faire refaire le travail »**
   — et `a2186cf`, plus court : **« Une note qui dit "à faire" ne dit pas que ça
   reste à faire. »**

**Le contre-exemple existe, et il est dans le dépôt.**
`docs/couverture-declaree-du-produit.md` a remplacé une carte vivante par une
liste figée — la mort programmée — et n'est pas mort, parce que `7d71b72` lui a
adossé `src/lib/referentiels/corpus/doc-couverture.test.ts` : le test lit le
`.md`, le compare au corpus **dans les deux sens**, et le message d'échec dit
quoi écrire et où. Il a attrapé un écart dès sa première exécution.

C'est le patron à reprendre. Il tient en une phrase : **un document qui affirme
quelque chose du code doit échouer quand le code le dément.**

### Les quatre gestes, et qui les porte

**Geste 1 — au moment de la lecture, par la session qui lit.**
*Règle : un commit qui pose ou modifie un `luLe` au corpus touche ce fichier.*
Cinq lignes en partie 1 : date, sha, périmètre chiffré, provenance de lecture
(`première main` / `agent` / `indirect`), et — la seule qui compte — **ce qui a
été appliqué et ce qui ne l'a pas été**. La chronologie s'écrit au fil de
l'eau ou elle ne s'écrit pas : elle a coûté une session à reconstituer sur
douze jours, elle coûtera une heure à reconstituer sur trois mois.

Cette règle est mécaniquement vérifiable en CI sur un diff (`git diff` touche
`corpus/` avec un `luLe:` ajouté **et** ne touche pas
`docs/journal-des-verifications.md` → échec). **Ne l'automatisez pas tout de
suite** : commencez par la règle de revue, et n'ajoutez la garde que si elle
est enfreinte. Une garde posée avant que le défaut existe est une garde qu'on
apprend à contourner.

**Geste 2 — dans le dépôt, une fois, par la prochaine session qui touche au
référentiel.**
Un test du genre de `doc-couverture.test.ts`, sur ce fichier, qui porte
**deux** garanties et pas une de plus :

- *(a)* tout identifiant d'obligation cité entre accents graves dans ce journal
  existe encore au référentiel, ou figure dans `OBLIGATIONS_RETIREES`. Sans
  cela, le journal parlera un jour d'une ligne qui n'existe plus, et personne
  ne le saura.
- *(b)* **le sens qui compte** : chaque constat marqué `NON CORRIGÉ` sur
  l'ABSENCE d'un article — `R. 4224-12`, `R. 4226-21`, `C. env. L. 512-8`,
  `CCH R. 134-2`, `Arrêté 2017-11-20 art. 18` — **fait rougir la suite le jour
  où l'article entre au référentiel**, avec pour message : *« cet article est
  désormais cité ; le constat de la partie 2 est peut-être corrigé — relisez-le
  et changez son état. »*

C'est (b) qui a manqué en août. Un constat qui devient faux doit se signaler
lui-même ; sinon il reste ouvert dans un document pendant qu'il est clos dans
le code, ce qui est exactement l'état trouvé le 1er septembre.

> **La liste de (b) n'est pas une liste exhaustive du référentiel**, et c'est
> ce qui la rend légitime : elle énumère les constats OUVERTS de ce journal,
> et sa réparation — retirer une ligne parce que son constat a été tranché —
> **est le geste qu'on veut**. Une liste qu'on répare en recopiant cesse de
> vérifier ; celle-ci, on la répare en décidant.

**Geste 3 — à chaque intégration, par la session qui assemble.**
Rejouer `pnpm relecture` et **recoller les compteurs** des tableaux de la
partie 2.B depuis la sortie, sans les retaper. Six chiffres, trente secondes.
Ils sont l'unique mesure de progrès du dossier : la nuit du 26 août a fait lire
123 articles sans faire baisser `SANS_VERBATIM`, et seul ce compteur pouvait le
dire.

**Geste 4 — celui qui aurait évité la journée du 1er septembre, et il est
gratuit.**
Mettre ce journal **sur le chemin de celui qui va lire un texte**. Concrètement :
`AGENTS.md` et `.claude/CLAUDE.md` doivent porter la consigne *« avant d'ouvrir
un texte de droit, lis `docs/journal-des-verifications.md` § 2 — il a peut-être
déjà été lu, et le constat qui te concerne y est peut-être déjà tranché »*, et
la compétence `veille-reglementaire` doit renvoyer ici avant sa première étape.
Un document que personne n'ouvre au bon moment est mort quel que soit son
contenu.

### Ce qu'il faut faire des documents morts, maintenant

Ne pas les supprimer : ils portent des verbatims et des raisonnements qu'on ne
refera pas. **Les dater et les renvoyer ici.** Un bandeau de trois lignes en
tête suffit, et il est posé sur `docs/relecture-source-2026-08-26.md` par le
même commit que ce journal.

Restent à traiter, et ce n'est pas le périmètre de ce travail :
`docs/carto-obligations-hors-equipement.md`, dont le premier paragraphe fonde
tout le document sur une contrainte que l'ADR-022 a levée.

### Ce que ce journal ne doit jamais devenir

Il ne doit **pas** recopier le registre qui vit dans le code. Les 19
`obligation_manquante`, les 42 réserves de lecture, les 28 articles écartés se
mesurent par `pnpm relecture` et se périment à la seconde où on les recopie
ici. La partie 2.B en donne les **compteurs**, pas les listes, et c'est
délibéré.

Ce journal porte ce que le code ne sait pas dire : **qui a lu quoi, quand,
comment — et ce qu'on en a fait.**
