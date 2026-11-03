# ADR-031 — Refuser à l'entrée ce qu'on ne sait pas servir du tout

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe)
- **Portée** : `src/lib/onboarding/` (schéma, actions),
  `src/components/onboarding/validation.ts` (la validation client du wizard —
  elle vit sous `components/`, pas sous `lib/`),
  `src/lib/etablissements/schema.ts` (`etablissementCreationSchema`),
  `src/lib/perimetre/exclusions.ts` (`refusAlEntree`, catalogue des ~~deux~~
  [2026-10-18 : trois] refus de taille et d'IGH),
  ~~`src/lib/etablissements/types-refuses.ts` (`refusDuFiltre`, le filtre à
  l'accueil — 2026-10-18),~~ [2026-11-03 : retiré avec le filtre, réalignement]
  `src/lib/perimetre/couverture.ts`, `src/lib/referentiels/corpus/perimetre.ts`
- **Amende** l'ADR-020, qu'elle ne renverse pas · **Découle de** l'ADR-025

> ~~**Amendée le 2026-10-18.** Le filtre à l'accueil (#68, décisions de la
> propriétaire du 2026-10-17) refuse aussi des types d'ERP : J, U, les
> établissements spéciaux PA, CTS, SG, OA, REF, GA, EF, et R quand il accueille
> des enfants. Le critère de cette ADR ne change pas — on refuse ce qu'on ne
> sait pas servir *du tout* — et c'est lui qui fonde ces refus. Voir
> « Amendement du 2026-10-18 » en fin de document.~~ [2026-11-03 : amendement
> annulé par le réalignement, ci-dessous.]

> **Amendée le 2026-11-03 — réalignement CCH + Code du travail.** Rojer sert
> tout le CCH et tout le Code du travail (santé-sécurité) adressés à
> l'exploitant ou à l'employeur, pour tous les types d'établissement. **On
> refuse seulement ce qui est hors cible par la taille ou l'IGH ; tout le reste
> s'accepte et se déclare.** Le filtre à l'accueil du 2026-10-17 est levé. Voir
> « Amendement du 2026-11-03 (ter) » en fin de document.

> **Amendée le 2026-11-03.** La borne d'effectif passe de cinquante à
> **quarante-neuf** (`EFFECTIF_MAX = 49`), sur le site comme dans
> l'entreprise. Voir « Amendement du 2026-11-03 » en fin de document.

## Le problème

La doctrine du produit est de **nommer ce qu'il ne couvre pas plutôt que de
refuser**. Elle est portée par l'ADR-020, par `perimetre/couverture.ts` — qui
rend des manques et des indéterminations, jamais un score —, par
`docs/couverture-declaree-du-produit.md` sous la garde d'un test, et par le
bandeau du calendrier. Elle a une bonne raison : refuser un dossier au motif
qu'un point n'est pas couvert ferme la porte à un dirigeant qui aurait profité de
tout le reste. C'est exactement la faute qu'a corrigée `onboarding/scope.ts`, qui
refusait la création hors des trois secteurs de DUERP instruits et bloquait ainsi
l'accès au référentiel de conformité, lequel ne lit jamais le code NAF.

Le cadrage du 2026-09-01 demande pourtant un **refus à l'entrée** pour une liste
de régimes. Il faut donc dire précisément où passe la frontière, sinon la
prochaine session appliquera l'une ou l'autre doctrine au hasard de celle qu'elle
aura lue.

## La décision

**On refuse ce que le produit ne sait pas servir *du tout*. On déclare ce qu'il
sert incomplètement.**

Le critère est la nature du manque, pas sa taille.

| | Refus à l'entrée | Déclaration continue |
|---|---|---|
| **Ce qui le déclenche** | Ce que le produit ne peut pas servir **du tout** : la structure sort de sa taille, ou son régime rouvre un règlement entier jamais dépouillé | Tout le reste — un régime servi dont une partie manque |
| **Ce qui refuse, au 2026-09-01** | ~~**Deux cas, et deux seulement**~~ ~~[2026-10-18 : deux au 2026-09-01 ; trois depuis le 2026-09-26 (§ 1 ter) ; plus les types d'ERP du filtre à l'accueil depuis le 2026-10-17, voir « Amendement du 2026-10-18 »]~~ [2026-11-03 : deux au 2026-09-01 ; trois depuis le 2026-09-26 (§ 1 ter) ; le filtre à l'accueil du 2026-10-17 est levé — voir « Amendement du 2026-11-03 (ter) »] : plus de cinquante travailleurs ; un ERP situé dans un immeuble de grande hauteur | ERP de 1ʳᵉ à 4ᵉ catégorie, IGH seul, ICPE, tout type d'ERP non instruit, secteur de DUERP non instruit, équipement hors référentiel, obligations suspendues au public reçu, expositions spécialisées (ATEX, amiante, plomb, radon, CMR, rayonnements ionisants) |
| **Ce que voit le dirigeant** | La création s'arrête et dit pourquoi | Le dossier vit et le prévient en permanence |

**La liste des refus est courte, et elle a été raccourcie en séance.** Un premier
jet refusait une douzaine de régimes. La propriétaire l'a ramenée à deux cas le
2026-09-01, et son critère est meilleur que celui qui présidait : **on refuse ce
qu'on ne peut pas servir, pas ce qu'on ne couvre pas entièrement.** Une TPE qui
manipule un agent CMR reste un employeur ordinaire pour tout le reste — sanitaires,
électricité, incendie, DUERP — et lui fermer la porte lui retirerait tout au motif
qu'on ne lui donnerait pas tout. Le mécanisme de déclaration existe précisément
pour ce cas.

**Le cumul ERP + IGH, et lui seul.** Un ERP dans un immeuble de grande hauteur
relève du règlement de sécurité des IGH, jamais dépouillé. **L'IGH seul n'est pas
refusé** : un employeur locataire de bureaux dans une tour relève du Code du
travail, que le produit sert entièrement, et les obligations du règlement IGH
pèsent sur l'exploitant de l'immeuble, pas sur lui. Conséquence utile : les neuf
obligations `igh` du référentiel cessent d'être des lignes mortes.

**L'ADR-020 n'est pas renversée.** Son mécanisme — ce qu'un DUERP ne couvre pas
se déclare et se grave avec la version — reste entier, et le module de couverture
avec lui : ils gouvernent toute la colonne de droite. Ce que cette ADR ajoute est
une classe de cas traitée **en amont**, avant que le dossier n'existe.

Trois précisions, parce que chacune a failli être prise à l'envers.

**1. La borne d'effectif porte sur les travailleurs, et sur eux seuls.** Le
public reçu ne la déclenche jamais. Un restaurant de huit salariés qui sert trois
cents couverts est classé en 3ᵉ catégorie d'ERP : la catégorie mesure le public,
la borne mesure les salariés, et les confondre reviendrait à refuser la cible du
produit. Un test le verrouille.

**1 bis. Elle vaut à la création, pas en édition.** Un client qui
passe de quarante-cinq à soixante salariés reste servi : lui fermer son dossier
parce qu'il a embauché serait absurde. Mais la promesse implicite doit rester
explicite — au-delà de ~~cinquante~~ [2026-11-03 : quarante-neuf], son dossier porte un manque de couverture qui
le dit. C'est le même traitement d'honnêteté que les ERP de 1re à 4e catégorie.

**1 ter. La borne vaut aussi pour l'effectif de l'entreprise (2026-09-26,
décision de la propriétaire : « c'est la limite de Rojer »).** Depuis C37, le
produit tient deux effectifs : les travailleurs du site et les salariés de
l'entreprise, sur lesquels se comptent les seuils du CSE, du règlement
intérieur et du programme annuel. La même borne (`EFFECTIF_MAX`) s'applique
aux deux, par le même mécanisme : refus à la création (parcours d'entrée et
création d'une entreprise), jamais en édition — une entreprise qui franchit le
seuil en cours de route garde son dossier, qui porte le manque (axe
`effectif` de la couverture). ~~Les refus à l'entrée passent ainsi à trois.~~
[2026-10-18 : ce « trois » comptait les refus de taille et d'IGH — effectif du
site, effectif de l'entreprise, ERP situé dans un IGH (`refusAlEntree`, clés
`effectif`, `effectif_entreprise`, `erp_en_igh`). Le filtre à l'accueil en
ajoute d'autres, qui portent sur le type d'ERP : voir « Amendement du
2026-10-18 ».]

**2. Le refus ne borne jamais le déclenchement d'une obligation.** Les seuils du
référentiel se lisent sur ce qu'ils visent : `personnesPresentesHabituellement`
n'est pas plafonné par la borne d'effectif, et un établissement de trente
salariés qui reçoit soixante personnes déclenche toujours la consigne et
l'exercice semestriel. Un test verrouille ce cas précis : c'est exactement le
genre de conséquence qu'une borne posée trop haut dans la pile emporterait sans
bruit.

**3. Un refus n'est jamais un cul-de-sac.** L'écran de refus nomme le régime,
dit pourquoi le produit ne le sert pas, et renvoie vers la page des éléments
exclus, qui donne des indications. Refuser sans expliquer serait pire que servir
mal.

## Ce que ça coûte si on se trompe

Un refus est plus dur à découvrir qu'un bandeau : la personne refusée ne
reviendra pas dire qu'elle l'a été à tort. La liste des régimes refusés est donc
un objet à relire — pas une constante qu'on augmente au fil des cas gênants.
Chaque ajout à cette liste passe par une décision, comme celui-ci.

## Amendement du 2026-10-12 — la cible, c'est ce que la porte laisse entrer

Décision de la propriétaire du 2026-10-12, appliquée le 2026-10-13. La
question « quelle est la cible ? » restait listée ouverte
(`docs/chantiers-ouverts.md` § 3 bis) alors que cette ADR y répondait déjà :
**la cible du produit est ce que l'onboarding ne refuse pas** — au plus
~~cinquante~~ [2026-11-03 : quarante-neuf] travailleurs (sur le site comme dans l'entreprise, décision du
2026-09-26), et pas d'ERP situé dans un IGH. Au sens large : les TPE/PME.
[2026-10-18 : et, depuis le filtre à l'accueil du 2026-10-17, pas d'ERP de
type J, U, ni d'établissement spécial PA, CTS, SG, OA, REF, GA, EF, ni de type
R qui accueille des enfants — « Amendement du 2026-10-18 ».]

Trois notions, à ne pas confondre :

| Notion | Ce qu'elle dit | Où elle vit |
|---|---|---|
| **Refusé** | La porte ne crée pas le dossier | `refusAlEntree()`, `perimetre/exclusions.ts` — ~~trois refus [2026-10-18 : de taille et d'IGH ; plus le filtre à l'accueil, `refusDuFiltre()`, `etablissements/types-refuses.ts`]~~ [2026-10-18, revue : sept refus — les trois de taille et d'IGH, et les quatre du filtre à l'accueil, que `refusAlEntree()` sonde sur la porte ; la règle du filtre vit dans `refusDuFiltre()`, `etablissements/types-refuses.ts`] |
| **Cible** | Tout le reste : le dossier se crée, et ce qui lui manque se déclare | Le registre de dette du corpus (`toucheLaCible`) se mesure sur elle |
| **Couvert entièrement** | Ce que le produit sert sans manque déclaré | `CATEGORIES_COUVERTES` (`perimetre/couverture.ts`), aujourd'hui `["N5"]` |

Un ERP de 3ᵉ catégorie, un hôtel ou un immeuble d'habitation sont donc
**dans la cible** sans être couverts entièrement : ils sont acceptés, et le
produit leur dit ce qu'il ne suit pas.

Conséquence au corpus (2026-10-12) : les quinze `obligation_manquante` dites
« hors cible » sous l'ancienne lecture (`CATEGORIES_COUVERTES`) y sont entrées.
La propriétaire les a classées le 2026-10-13 selon la grille C45 : trois
encodées (le chapitre hôtels, PO 1 § 3, PO 7, PO 12), ~~quatre~~ ~~six~~ sept
annoncées (GZ 13, GZ 14, AS 10, arrêté du 23 février 2018 art. 26 § 3 ; puis,
après la revue indépendante du même jour, arrêté du 31 janvier 1986 art. 78-1
et 102, et R. 4544-11), ~~huit~~ ~~six~~ cinq hors cadre — `docs/couverture-declaree-du-produit.md` § 7 et § 8.

## ~~Amendement du 2026-10-18 — le filtre à l'accueil~~ [annulé le 2026-11-03]

> **Annulé le 2026-11-03** par le réalignement CCH + Code du travail (voir
> « Amendement du 2026-11-03 (ter) »). Le texte ci-dessous est gardé tel quel :
> il décrit le filtre tel qu'il a vécu, du 2026-10-17 au 2026-11-03, et ne
> décrit plus le code.

Décisions de la propriétaire du 2026-10-17, relayées par c6
(`propositions/maj-referentiel-constats-2026-10-17.md` § 4 et § 5, hors dépôt ;
plan de la page « Ce que Rojer ne couvre pas »,
`propositions/plan-page-ne-couvre-pas-2026-10-17.md`), mises en code par le
lot du filtre à l'accueil (#68). Ce qui suit est relu dans
`src/lib/etablissements/types-refuses.ts` et ses tests, pas recopié d'une
liste.

**Le critère ne change pas.** On refuse ce que le produit ne sait pas servir
*du tout* ; on déclare ce qu'il sert incomplètement. Ces types-là sont refusés
parce que leurs obligations propres relèvent de textes que Rojer ne couvre
pas, pas parce qu'un point manque.

| Refus | Ce que le code refuse | Motif |
|---|---|---|
| **Type J** (structures pour personnes âgées ou handicapées) | `TYPES_ERP_REFUSES`, phrase `PHRASE_REFUS_J` | ~~Hors cible, décision de la propriétaire du 2026-10-17.~~ [2026-10-18, revue : refusé, décision de la propriétaire du 2026-10-17 — « hors cible » tournait en rond, la cible étant ce que la porte ne refuse pas.] Ses obligations propres ne sont pas servies (J 33, gaz médicaux, classé hors cadre ; J 35, J 39, J 40 tombent avec le refus — constats § 4). |
| **Type U** (établissements de soins) | idem, `PHRASE_REFUS_U` | ~~Hors cible, même décision.~~ [2026-10-18 : refusé, même décision.] Mêmes raisons (U 62, U 64, PU 5 hors cadre ; U 41, U 43, U 47, U 48, PU 6 tombent avec le refus). |
| **Établissements spéciaux PA, CTS, SG, OA, REF, GA, EF** | idem, une seule phrase `PHRASE_REFUS_SPECIAUX` | ~~Leurs dispositions propres (le « livre IV » du règlement de sécurité) n'ont jamais été lues.~~ [2026-10-18, revue : faux pour EF, qui n'est pas au livre IV.] Le livre IV de l'arrêté du 25 juin 1980 n'a jamais été lu pour PA, CTS, SG, OA, REF, GA — seul PS est au corpus (`arrete-1980-livre-4-parcs.ts` ; dénominateur, `docs/revues/denominateur-livre-2-erp.md` l. 193-194, qui compte au livre IV PA, CTS, SG, OA, REF, PS, GA). EF relève d'un autre texte, non lu : l'arrêté du 9 janvier 1990 relatif aux mesures de sécurité applicables dans les établissements flottants ou bateaux stationnaires et les bateaux en stationnement sur les eaux intérieures recevant du public (ERP type EF), `LEGITEXT000006075247`, en vigueur, modifié par l'arrêté du 27 octobre 2025 — contre-vérifié le 2026-10-18 sur Légifrance par le **bac à sable PISTE** (aucun MCP Légifrance chargé). **PS (parcs de stationnement couverts) reste accepté.** |
| **Type R qui accueille des enfants** (crèche, école, centre de loisirs) | `refusDuFiltre`, champ `accueilEnfants`, `PHRASE_REFUS_ENFANTS` | L'accueil d'enfants relève d'obligations propres d'autres codes (CSP, CASF, Code de l'environnement : 9 à 13 obligations pour une micro-crèche — constats § 5). **La formation pour adultes reste acceptée.** |

Ce que le code fait de ces refus, et qu'il faut savoir avant d'y toucher :

- **Trois portes, une règle.** Le refus est posé par
  `etablissementCreationSchema` (création, y compris d'un second établissement,
  ADR-028), par `onboardingSchema` (serveur du parcours) et par
  `components/onboarding/validation.ts` (refus à l'étape), ~~tous par
  `appliquerFiltre`~~ [2026-10-18, revue : faux côté client, qui appelle
  `refusDuFiltre(...)[0]` directement] tous par `refusDuFiltre` (via
  `appliquerFiltre` côté schémas).
- **À la modification, à la transition seulement.** `modifierEtablissement`
  refuse un type refusé qui n'était pas déjà en base, et ne pose la question
  des enfants qu'à l'entrée de R. Un dossier créé avant le filtre s'enregistre
  comme avant — même logique que le § 1 bis pour l'effectif.
- **Type principal et autres types.** Le refus vaut pour chacun des types
  déclarés (ADR-045).
- ~~**Hors ERP, rien.**~~ [2026-10-18, revue : trop large] **Hors ERP, aucun
  type n'est refusé.** Un type resté en mémoire sur un établissement qui n'est
  pas un ERP ne refuse rien. Mais une réponse « accueil d'enfants » envoyée là
  où la question n'est pas posée est refusée (`appliquerFiltre`, « La question
  de l'accueil d'enfants n'est posée qu'au type R. »).
- **R : « oui » refuse, « non » passe, le silence redemande** (« Indiquez si
  vous accueillez des enfants. »). La réponse **n'est pas stockée** : elle ne
  sert qu'à refuser.
- **Les phrases expliquent sans qualifier** : ~~toutes commencent~~
  [2026-10-18 : les quatre phrases de refus — J, U, spéciaux, enfants —
  commencent] par « Rojer ne prend pas en charge ».

~~**Un point reste ouvert, et il est écrit ici pour ne pas se perdre.**
`refusAlEntree()` (`perimetre/exclusions.ts`) projette la porte par des
dossiers-sondes, et ne sonde que la taille et l'IGH : les refus du filtre n'y
figurent pas. L'annexe du document de relecture (`detailHorsPage`) qui liste
les refus ne les dit donc pas. Ce n'est pas un écran — la page « Ce que Rojer
ne couvre pas » ne montre plus les refus (plan du 2026-10-17, Q5) —, mais la
parité page ↔ document le demandera.~~ [2026-10-18, revue : la dernière phrase
était fausse — l'inventaire figé de la page (`inventaire-page-a493461c.ts`) ne
porte que les trois refus de taille et d'IGH, aucun test ne réclamait ceux du
filtre. Le point est fermé dans ce lot :]

**L'annexe dit les sept refus (2026-10-18, accord de la propriétaire).**
`refusAlEntree()` sonde aussi le filtre, sur la même porte
(`etablissementCreationSchema`) : un ERP de 5ᵉ catégorie de type J, un U, un
PA, un R qui répond « oui » à l'accueil d'enfants — avec la réponse « non » au
sommeil pour J, U et R, que ces types déclenchent, pour que chaque sonde ne
change qu'une chose. Quatre clés s'ajoutent à `CleRefus` : `type_j`, `type_u`,
`etablissements_speciaux`, `r_accueil_enfants`. Chaque refus de type nomme ses
types (`types`), et une garde soumet chaque type de GN 1 à la porte : les types
refusés doivent être exactement l'union de ces listes. Les sondes inverses —
PS, et R qui répond « non » — passent. L'annexe imprime donc sept régimes, avec
la phrase de la porte et une indication.

## Amendement du 2026-11-03 — la borne à quarante-neuf

Décision de la propriétaire du 2026-11-03 : « on ne fait que du moins de
cinquante ». `EFFECTIF_MAX` passe de 50 à **49** ; la porte refuse désormais à
partir de cinquante travailleurs sur le site ou de cinquante salariés dans
l'entreprise.

**Pourquoi.** L'art. L. 4121-3-1, III, 1° impose le programme annuel de
prévention (PAPRIPACT) aux entreprises dont l'effectif est « supérieur ou égal
à cinquante salariés », et L. 2312-27 le fait présenter au CSE. Rojer ne le
produit pas. Avec une borne à cinquante, un dossier de cinquante salariés
pile entrait avec ce manque déclaré dès sa création. Sous cinquante, le texte
ne demande que la liste d'actions consignée au DUERP (III, 2°), que Rojer
sert. Le critère de l'ADR ne change pas : on refuse ce qu'on ne sait pas
servir du tout, et l'obligation propre à cette taille en est un.

**Ce qui ne change pas.** § 1 bis : un dossier déjà ouvert qui atteint ou
dépasse cinquante garde son dossier, sans borne en édition, et porte le
manque. Les obligations dues seulement dès cinquante (règlement intérieur,
local de restauration de `R. 4228-22`) restent au référentiel : elles naissent
du dossier qui grandit. La garde `obligations-atteignables.test.ts` le
modélise : ses profils passent la porte à la borne puis portent l'effectif
réel, sans exemption ni liste d'identifiants.
**Ce qui change pour un compte existant à cinquante.** Il garde ses
dossiers. Mais un nouvel établissement rattaché à son entreprise passe par la
même porte, qui lit l'effectif de l'entreprise reprise
(`onboarding/actions.ts`, `RefusEffectifEntreprise`) : à cinquante, il est
refusé. C'est la règle qui valait déjà pour une entreprise ayant franchi
cinquante et un ; elle s'étend à cinquante, et c'est voulu — un site de plus
n'enlève pas l'obligation de programme annuel qui vient avec la taille.

La branche de `axeEffectif` qui parlait d'un dossier servi de cinquante
salariés ne parle plus à personne ; elle reste pour le jour où la borne
remonterait.

## Amendement du 2026-11-03 (bis) — la borne se lit sur la somme des sites, et vaut aussi dans Équipe

Décision de la propriétaire du 2026-11-03, sur la question laissée ouverte
par l'ADR-028 (« si deux établissements ont le même SIREN, cumule-t-on les
salariés ? ») : **oui**. Chaque établissement montre ses salariés ; la
société les cumule, et ses obligations transverses (CSE, règlement
intérieur) s'affichent sur chacun de ses sites. Et « du moment où ça dépasse,
on bloque » — à l'entrée, et à l'ajout dans Équipe.

**L'effectif de l'entreprise est calculé** (`entreprises/effectif.ts`, seule
écriture) :

    Entreprise.effectif = Σ (effectifSurSite − apprentisSurSite) + effectifHorsRojer

- `apprentisSurSite` : apprentis et contrats de professionnalisation, que
  L. 1111-3 (1° et 6°) écarte du calcul de l'effectif — décision de la
  propriétaire, « la loi dit quoi » : la loi les écarte, Rojer aussi ;
- `effectifHorsRojer` : les salariés de la société dans ses établissements que
  Rojer ne suit pas. Sans lui, un seul site suivi sur trois ferait passer une
  société de quarante salariés pour une de dix, et taire son CSE.

Les trois nombres se saisissent dans la page Équipe (carte « Effectif »), et
nulle part ailleurs : la fiche établissement et la fiche entreprise les
affichent et renvoient à Équipe. Le parcours d'entrée demande toujours
l'effectif de l'entreprise d'une société NOUVELLE, et en déduit les deux
nombres (l'écart sous le site est fait d'apprentis, l'écart au-dessus
travaille hors de Rojer).

**La borne refuse ce qui fait CROÎTRE la société au-delà de `EFFECTIF_MAX`,
ou un site seul** :
- à l'onboarding, un établissement rattaché à une société suivie s'ajoute à
  la somme (refus en direct dans le parcours, et au serveur) ;
- dans Équipe, en augmentant un effectif, en diminuant les apprentis, en
  augmentant les salariés hors Rojer ;
- en ajoutant une fiche ou en réintégrant une personne : une fiche est une
  personne, et des fiches actives au-delà de l'effectif déclaré le font monter
  d'autant (`effectifSuitLesFiches`).

**Ce qui amende le § 1 bis.** Un dossier qui dépasse déjà la borne garde son
dossier, et baisser n'est jamais refusé. Mais il ne grandit plus dans Rojer :
« jamais en édition » ne vaut plus pour l'effectif. Le manque de couverture
(axe `effectif`) reste, pour les dossiers ouverts avant la règle.

**Ce qui reste ouvert.** Avec des apprentis déclarés, l'écart site / société
n'est plus un doute : la prudence de `effectifRetenuPourSeuil` (retenir le
site « à confirmer » quand la société est sous le seuil) pourrait se lever.
C'est une règle du moteur ; elle n'est pas touchée ici.

## Amendement du 2026-11-03 (ter) — réalignement CCH + Code du travail

Décision de la propriétaire du 2026-11-03, relayée par la session de
coordination (état des lieux : `alignement-cch-ct.html`, hors dépôt).

**La règle.** Rojer sert tout le code de la construction et de l'habitation
et tout le Code du travail (santé-sécurité) qui s'adressent à l'exploitant ou
à l'employeur, pour tous les types d'établissement. On ne refuse et on
n'exclut plus rien parce qu'un autre code s'applique aussi (code de la santé
publique, code de l'action sociale et des familles, code de l'environnement,
code du sport…) ou parce que le cas est particulier. Les autres codes ne sont
pas servis, et ne refusent personne.

**Le critère devient** : on refuse seulement ce qui est hors cible par la
taille ou par l'IGH ; tout le reste s'accepte et se déclare. Il resserre celui
du 2026-09-01 (« ce qu'on ne sait pas servir *du tout* ») : un type d'ERP dont
le règlement n'est pas encore lu n'est plus un motif de refus — c'est un
manque, comme les catégories 1 à 4 l'étaient déjà.

| Refus maintenus | Levés le 2026-11-03 |
|---|---|
| Plus de quarante-neuf travailleurs sur le site | Type J |
| Plus de quarante-neuf salariés dans l'entreprise | Type U |
| ERP situé dans un immeuble de grande hauteur | Établissements spéciaux PA, CTS, SG, OA, REF, GA |
| | Établissement flottant (EF) |
| | Type R qui accueille des enfants — la question disparaît |

La question des locaux à sommeil reste posée (J, O, U, R, REF, OA) : elle ne
refuse personne.

**Ce qui est accepté se déclare** (`perimetre/couverture.ts`, axe `type_erp`) :
- J (catégories 1 à 4) et U (chapitre U du livre II ; articles PU du livre III
  en 5ᵉ) : dispositions lues le 2026-10-16, pas encore suivies ;
- PA, CTS, SG, OA, REF, GA : livre IV de l'arrêté du 25 juin 1980, non lu ;
- EF : arrêté du 9 janvier 1990, non lu.
PS, accepté avant le filtre et servi par PS 32, n'y entre pas : le reste du
chapitre PS, non lu, est un manque à déclarer au même titre (non fait ici).

**Ce que le code fait.**
- `src/lib/etablissements/types-refuses.ts` est retiré : plus de
  `refusDuFiltre`, ni de phrases de refus, ni de question sur l'accueil
  d'enfants. Le parcours, la fiche (`modifierEtablissement`) et les deux
  schémas n'y passent plus. Un client resté à l'ancien parcours qui poste
  `accueilEnfants` n'est ni refusé ni écrit.
- `refusAlEntree()` (`perimetre/exclusions.ts`) rend trois refus ; les quatre
  sondes et les clés `type_j`, `type_u`, `etablissements_speciaux`,
  `r_accueil_enfants` sont retirées. Une garde soumet chaque type de GN 1 à la
  porte : aucun n'est refusé (`exclusions.test.ts`,
  `types-acceptes.test.tsx`).
- Les douze manques du corpus que le filtre avait sortis de la cible (J 33,
  J 35, J 39, J 40, U 41, U 43, U 47, U 48, U 62, U 64, PU 5, PU 6) y
  reviennent (`toucheLaCible: true`) ; aucun n'est encodé.
- L'exclusion `risque_specialise` (`corpus/perimetre.ts`) devient « Relève
  d'un autre code » : installations classées, piscines, bains à remous,
  appareils de bronzage. L'ATEX et la radioprotection, qui relèvent du Code
  du travail, en sortent : la page les dit « pas encore » suivies (famille
  `code_du_travail_pas_encore`).

**Ce qui reste ouvert, écrit pour ne pas se perdre.**
- `Arrêté 2011-12-26 annexe IV` (installations électriques temporaires, Code
  du travail) est encore rangé sous `risque_specialise`, dont le nouveau motif
  ne le décrit pas ; son motif le dit. Le reclasser en manque annoncé demande
  une adresse d'annonce : lot d'encodage du Code du travail.
- Les autres motifs « cas particulier » du corpus ne sont pas relus ici.
- Le chapitre PS (livre IV), lu pour un article sur quarante-trois, n'a pas de
  manque déclaré.
- Les quatorze obligations du référentiel fondées sur un autre code restent
  en place ; l'établissement sans salarié n'est pas traité.
