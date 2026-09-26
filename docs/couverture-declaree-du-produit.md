# Ce que Rojer couvre, et ce qu'il ne couvre pas

Rédigé le 2026-08-28, à la sortie du chantier B (lot 6). **Document interne** :
il sert au point que la propriétaire veut faire sur ce que le produit fait
réellement, et pour qui.

Il remplace la carte « Ce que Rojer ne couvre pas » du tableau de bord, retirée
pour une raison qui vaut d'être écrite ici : **déclarer à chaque dirigeant ce
que le produit ne couvre pas, avant d'avoir tranché ce qu'il couvre, met la
charrue avant les bœufs.** Le mécanisme reste ; c'est sa surface généraliste
qui part.

> Ce document est l'adresse citée par le champ `declareA` des articles
> `non_couvert` du corpus. Un manque doit toujours avoir une adresse — sans
> quoi « on le dit clairement » est un silence documenté en interne.

---

## 1. Six axes actifs, et ce que chacun établit vraiment

`AxeCouverture` porte **six** membres, relevés en le lisant. Deux autres ont
existé et sont retirés : `famille_obligation`, qui a duré une journée — le
§ 3 bis dit pourquoi —, et `public_recu`, parti le 2026-09-03. Tous deux
restent au tableau, barrés, parce que les comprendre est nécessaire pour lire
le § 3. La ligne « six axes » a dit « quatre » puis « sept » ; elle se
remesure en ouvrant le type, jamais en recopiant la précédente.

*(Relevé au 2026-09-03. Ce tableau a retardé sur le code une première fois : il
en annonçait quatre alors que `public_recu` et `famille_habitation` tournaient
déjà. Un document de référence qui retarde envoie chercher un axe là où il n'y
en a plus — ou fait croire qu'un manque n'est annoncé à personne.)*

`src/lib/perimetre/couverture.ts` rend deux listes — des **manques** (faits
établis) et des **indéterminations** (questions ouvertes dont la réponse
appartient au dirigeant). Jamais un total, jamais un score : quatre manques sur
quatre axes ne font pas « 4 », ils font quatre phrases vraies de quatre choses
différentes. Un chiffre laisserait croire à une mesure de complétude que rien
ne fonde.

Le module **n'ajoute aucune source de vérité** : il projette celles qui
existent. C'est la règle à tenir dans toute évolution — un axe qui déclare au
lieu de projeter en fait une troisième déclaration de ce que le produit couvre,
ce que le dépôt s'interdit.

| Axe | Ce qu'il établit | Ce qu'il n'établit **pas** | Source projetée |
|---|---|---|---|
| `igh` | L'établissement est déclaré IGH, donc hors du régime que le référentiel connaît | Que rien ne lui soit dû : le règlement IGH est dépouillé sur son seul article « GH 5 », qui porte deux obligations annuelles. La colonne disait « pas dépouillé du tout » jusqu'au 2026-09-03 — même défaut que la phrase de l'écran, corrigé le même jour | `Etablissement.estIGH` |
| `categorie_erp` | L'ERP relève d'une catégorie 1 à 4, donc le livre II s'applique en entier (PE 1 § 1) | L'ampleur du manque. On sait qu'il existe, pas de combien | `CATEGORIES_COUVERTES` |
| `secteur_duerp` | Ce que le DUERP déclare ne pas couvrir, et si son référentiel est celui du code NAF | Que le reste du DUERP soit complet — « aucun manque identifié » n'est pas « complet » | ADR-020 (`duerps/couverture.ts`) + `perimetre/secteur.ts` |
| `domaine_equipement` | Des appareils du parc ne déclenchent aucune obligation du référentiel | Qu'aucune vérification ne leur soit due. C'est un fait sur l'outil, pas sur le droit | `equipements/hors-referentiel.ts` |
| ~~`public_recu`~~ **(retiré le 2026-09-03)** | Le nombre de personnes habituellement présentes manque, et le repli du moteur écartait des obligations qui en dépendent | — Le repli a changé de sens le même jour : la catégorie d'ERP déduit le franchissement du seuil dès la 3ᵉ, et sous la borne l'obligation est retenue « à confirmer » au lieu d'être retirée. Plus rien n'est suspendu, donc plus rien à annoncer : c'est la ligne servie qui porte l'information | néant (`matching/public-recu.ts` supprimé) |
| `famille_habitation` | L'immeuble d'habitation n'a pas de famille renseignée, et les obligations lui sont donc toutes servies | Que l'outil ne couvre pas le régime — il le couvre, et sert large en attendant. **Indétermination** | `Etablissement.familleHabitation` |
| `effectif` | L'effectif dépasse la borne au-delà de laquelle la création d'un dossier est refusée (ADR-031 § 1 bis) | Que le dossier soit fermé : la borne ne vaut qu'à la création, un client qui embauche reste servi | `EFFECTIF_MAX` (`etablissements/schema.ts`), passé en fait par `faits.ts` |
| ~~`famille_obligation`~~ **(retiré, § 3 bis)** | Des articles lus imposent quelque chose que le produit ne porte pas | **Qu'ils visent cet établissement-là.** Voir § 2 | statut `non_couvert` du corpus |

**Une unité du manque de l'axe `categorie_erp`, écrite le 2026-09-20 : le
défibrillateur automatisé externe.** L'axe établit « qu'il existe » un manque,
« pas de combien » ; en voici une conséquence nommable. `R. 157-1` CCH (lu le
2026-09-01, version en vigueur depuis le 7 décembre 2025 — détail et verbatim
dans `docs/revues/lot-d3-recoupement-droit.md` § 3) soumet à la détention d'un
DAE les ERP de catégories 1 à 4, et, en 5ᵉ catégorie, huit familles seulement
(accueil de personnes âgées ou handicapées, santé, sport clos et couvert, danse
et jeux, gares, aéroports, hôtels-restaurants d'altitude, refuges), sous deux
conditions : une implantation de plus de trois mois, écrite dans l'article, et
un nombre minimal de personnes accueillies, renvoyé à un arrêté. **Aucun des trois secteurs cibles n'y figure en
5ᵉ catégorie** : le référentiel n'encode donc rien, et ce n'est pas un trou. Le
jour où les catégories 1 à 4 seraient COUVERTES, le DAE deviendrait dû sans
condition et redeviendrait une obligation d'établissement à encoder — avec une
réserve : `R. 157-4` fait peser la maintenance sur le PROPRIÉTAIRE du
défibrillateur, pas sur l'exploitant. La déclaration à la base nationale relève
de textes non lus : ne rien en affirmer.

Deux garanties de construction méritent d'être connues avant de toucher au
module :

- **`secteur_duerp` lit l'ADR-020, il ne la redéclare pas.** Le type
  `EtatCouverture` est importé et consommé par un `switch` exhaustif terminé
  par un `never`, sans `default`. Le jour où l'ADR-020 gagne un état, la
  compilation s'arrête là et quelqu'un doit décider de la phrase. C'est la
  seule chose qui empêche cet axe de dériver en seconde source de vérité.
- **Le module est pur et sans arête sortante au runtime** — que des imports de
  type. Les faits lui sont donnés ; `faits.ts` les collecte (Prisma),
  `familles.ts` et `secteur.ts` isolent les lectures du référentiel. Le cycle
  `referentiels → perimetre → referentiels`, annoncé par le commentaire de
  `CATEGORIES_COUVERTES`, reste à distance.

### Une affirmation que le mécanisme a faite, et qui a tenu trois jours

**« Le règlement intérieur n'est pas porté par cet outil. »** Elle se lisait sur
`/perimetre` et en tête du registre de sécurité, à deux endroits — l'indication
du refus d'effectif et la conséquence de l'axe `effectif`. Le lot 8 avait livré
l'obligation le 2026-08-31 (`prevention-etablissement-reglement-interieur`,
porteur établissement, `effectifMin: 50`, fondée sur `L. 1321-1` 1°). Un dossier
passé à cinquante-cinq salariés lisait donc la ligne dans ses états permanents
et son absence sur la page qui déclare les manques.

Ce n'est pas une phrase à retoucher : c'est **le** mode de défaillance de cette
page. Une page dont la raison d'être est de dire la vérité sur ce qui n'est pas
couvert, et qui annonce un trou comblé, fait douter de tout le reste — qui est
juste.

**La garde posée le 2026-09-03** (`perimetre/non-couverture.ts` et son
balayage) tient trois règles, toutes dérivées d'`obligationsConformite` et
d'aucune liste recopiée :

1. toute obligation nommée comme non portée passe par `nonPorte("…")`, et le
   référentiel ne doit rien lui répondre ;
2. toute obligation nommée comme portée passe par `porte("…")`, et le
   référentiel doit lui répondre — le défaut retourné, promettre ce qu'on ne
   livre pas ;
3. toute `pieceAttendue` du référentiel qui apparaît dans un texte de couverture
   doit être à l'intérieur de l'un des deux — c'est la règle qui ferme le chemin
   d'entrée, puisque le lot 8 n'a pas menti dans un marqueur mais sous une prose
   que personne n'avait déclarée.

Ce qu'elle ne voit pas : une obligation **sans** `pieceAttendue` nommée par une
prose muette. Les vingt pièces attendues du référentiel sont le filet, pas le
mur.

### Deux affirmations que le mécanisme a failli faire, et ne fait pas

Elles sont notées parce qu'elles se reproduiront à la prochaine évolution.

**« Aucun référentiel n'est instruit pour votre activité. »** Une première
version le disait dès que le secteur retenu différait de celui du code NAF. Or
la comparaison n'établit que la différence. Une boulangerie-salon de thé en
`47.24Z` a bien son référentiel commerce, instruit et recommandé — et la page
de choix offre quand même « Changer de secteur ». Le produit lui affirmait donc,
jusque dans le PDF remis à un tiers, un fait qu'il ne savait pas. Corrigé par un
troisième état qui porte le référentiel que le NAF désigne.

**« Aucun référentiel sectoriel ne correspond à l'activité de cet
établissement », dès la création du dossier.** Même faute, quinze lignes plus
haut, laissée intacte quand la première a été corrigée. `duerps/actions.ts` crée
le DUERP **sans secteur** puis redirige vers l'écran de choix : pendant tout cet
intervalle — et définitivement si le dirigeant abandonne — la même boulangerie
lisait cette phrase pendant que l'écran suivant lui recommandait Commerce de
détail. L'état `secteur_inconnu` de l'ADR-020 recouvre trois situations, et une
seule autorise cette affirmation. Il en rend trois phrases distinctes.

**Le silence sur un établissement sans code NAF propre.**
`Etablissement.codeNaf` est optionnel — renseigné seulement s'il diffère de
celui de l'entreprise. Lu seul, il faisait taire l'axe sur exactement le dossier
qu'il devait signaler. Le repli vit désormais dans `nafEffectif`, et le **type**
exige les deux codes : l'oubli est devenu une erreur de compilation, pas un
sixième `??` recopié.

---

## 2. La liste des familles non portées vaut pour le produit, pas pour l'établissement

C'est la limite la plus importante de ce document, et la raison directe du
retrait de la carte.

Les 26 articles ci-dessous sont ceux que le dépouillement a lus, qui imposent
quelque chose à un exploitant, et que le référentiel ne porte pas. **Rien ne les
restreint aux établissements que leur chapitre vise.** Un bureau tertiaire les
voyait tous, y compris les onze articles propres aux hôtels.

**Le chiffre a bougé quatre fois : 28 → 19 le 2026-09-01, 19 → 20 le
2026-09-03, 20 → 25 le 2026-09-20, puis 25 → 26 le 2026-09-26 (`GN 13`, voir sa famille au § 3)** (arrêté du 1er février 2010,
légionelles, et l'article 36 de l'arrêté du 23 juin 1978 : cinq entrées, avec une adresse visible — voir sa famille au § 3). Neuf articles du chapitre III
du Livre III (locaux à sommeil) sont sortis de cette liste, et le § 3 dit
comment. Les « 27 » et « 28 » qui subsistent plus bas dans ce document
racontent une histoire datée — ils ne décrivent pas l'état d'aujourd'hui.

**Le dernier entré, `R. 4323-63`, n'est pas de la même espèce que les autres,
et c'est ce qui le rend gênant.** Les autres visent des établissements que le
produit ne sert pas — hôtels, établissements de soins, équipements sportifs :
le manque de rattachement les affiche trop largement, mais aucun ne concerne
réellement un restaurant, un commerce ou un bureau.
`R. 4323-63` en concerne un sur deux. C'est le premier article de cette liste
dont le manque touche les secteurs cibles eux-mêmes, et le rattachement par
`Etablissement.typeErp` réclamé ci-dessus ne le résoudrait pas : il n'y a pas de
type d'ERP à qui ne pas le montrer.

Le rattachement manque côté corpus, pas côté base : `Etablissement.typeErp`
existe depuis l'ADR-004 et porte déjà `O` pour un hôtel, `U` pour un
établissement de soins. Ce qu'il faudrait est un champ sur l'article disant quel
type d'ERP il vise. Le déduire du préfixe de la référence (« PO » → hôtel)
serait une heuristique sur du texte libre, ce que ce dépôt refuse partout.

**C'est la suite naturelle de ce socle**, et c'est littéralement ce que
réclamaient les `declareA` d'origine : « Un exploitant hôtelier ne verra rien
qui l'avertisse que ces trois obligations lui manquent. »

### Une asymétrie signalée et non corrigée

`app/duerp/[id]/secteur/page.tsx` lit `duerp.entreprise.codeNaf` **seul**,
jamais celui de l'établissement — l'inverse du repli appliqué partout ailleurs,
et l'inverse de ce que fait désormais l'axe `secteur_duerp`.

Quand l'établissement porte un code propre — siège en `56.10A`, secondaire en
`47.24Z` —, la recommandation de l'écran vient donc de l'entreprise pendant que
le dossier nomme un référentiel tiré de l'établissement. **Le dossier peut ainsi
nommer un référentiel déduit d'un code que les écrans DUERP n'affichent jamais.**

Non corrigé volontairement : ce n'est pas un oubli symétrique du précédent, c'est
une question de fond — lequel des deux codes doit gouverner le choix du
référentiel sectoriel ? Elle se tranche avec la propriétaire, pas dans un lot de
couverture.

---

## 3. Les 26 articles lus et non portés

Cinq familles, une sixième étant sortie de la liste le 2026-09-01 (voir
ci-dessous). Les motifs sont ceux du corpus, cités et non réécrits : ils ont
été rédigés par la personne qui a lu l'article, et une reformulation ici
vieillirait à part de la source.

### Locaux à sommeil, 5ᵉ catégorie — la famille est SORTIE de cette liste (2026-09-01)

Neuf articles y figuraient — PE 28 à PE 36 —, sous ce motif : « Ce qui manque
est chez nous — l'attribut « locaux à sommeil » n'existe pas en base, alors que
quatre articles du Livre III s'y adossent. » L'attribut existe désormais
(`Etablissement.comporteLocauxSommeilPublic`, migration 20260901180000), et le
chapitre III a été relu à la source article par article avant d'être reclassé.
Le résultat n'est pas « neuf obligations de plus » :

- **Deux articles sont couverts** : PE 33 § 2 (consigne d'incendie affichée dans
  chaque chambre) et PE 35 (plan de l'établissement, plans d'orientation et de
  repérage). Le référentiel les porte. PE 4 § 1 — le contrat annuel d'entretien
  du système de détection — est couvert par le même lot, et il ne figurait pas
  dans cette liste : il vivait en `reserve` sur un article `retenu`.
- **Quatre passent `hors_perimetre`, motif `construction`** : PE 28 (structure
  et planchers coupe-feu), PE 29 (cloisons et portes), PE 30 (couloirs et
  désenfumage), PE 31 (cheminées à foyer ouvert). Ce sont des exigences de
  l'ouvrage, adressées au constructeur.
- **Trois passent `sans_objet`** : PE 32 (dotation en SSI de catégorie A),
  PE 34 (symboles de sécurité et régime des portes) et PE 36 (dotation en
  éclairage de sécurité). Règles de dotation sans récurrence, exactement comme
  PE 24 et PE 26 le sont depuis le premier dépouillement.

**Ce reclassement retire neuf lignes du décompte, et il faut dire pourquoi ce
n'est pas une rustine.** Ranger un manque parmi les exclusions le fait
disparaître de la dette : c'est la faute que `corpus/perimetre.ts` interdit en
tête de fichier. Ici le motif d'origine était l'attribut manquant, et lui seul ;
une fois l'attribut posé, la question « qu'est-ce que ces articles imposent à un
exploitant ? » a été reposée à la source, et sept des neuf n'imposent aucun acte
datable. Le motif de chacun est écrit dans le corpus, article par article. Ce
qui reste dû et non porté y est nommé aussi — l'exception de PE 32 repose sur un
fait que le modèle n'a pas (« simple rez-de-chaussée dont les locaux à sommeil
débouchent directement sur l'extérieur »), et le renvoi de PE 35 § 1 à MS 41 n'a
pas été ouvert.

### Hôtels (type O), 5ᵉ catégorie — 10 articles

`PO 2` · `PO 3` · `PO 4` · `PO 5` · `PO 6` · `PO 9` · `PO 10` · `PO 11` ·
`Annexe à l'article PO 11`

> Chapitre IV — règles spécifiques aux hôtels (type O), établissements de
> 5ᵉ catégorie. PO 1 § 3 et PO 7 portent les périodicités chiffrées du
> chapitre IV — PE 37 en porte une autre, la visite quinquennale de commission :
> contrôle biennal des installations techniques, annuel pour l'électricité et la
> détection, et deux séances d'instruction du personnel par an. Un très petit
> hôtel est exactement le genre de TPE que le produit sait servir par ailleurs —
> le manque est un choix, pas une impossibilité.

`PO 13` porte son propre motif, et c'est le plus intéressant du lot :

> Définit le « très petit hôtel » : « un établissement qui accueille 20 personnes
> au plus au titre du public dans les chambres et dont le plancher bas de l'étage
> le plus élevé accessible au public est situé à moins de 8 mètres du niveau
> d'accès des secours ». Ce seuil n'est PAS un régime allégé : il ouvre des
> atténuations (dispense d'encloisonnement des escaliers, dispense de BAEH) mais
> aussi une AGGRAVATION — « En aggravation de l'article PE 32, la détection
> automatique d'incendie est installée dans les circulations horizontales
> lorsqu'elles existent et dans tous les locaux, à l'exception des sanitaires. »
> L'exploitant qui renonce à l'encloisonnement hérite d'une détection
> généralisée. Aucune périodicité, mais un attribut d'établissement de plus que
> le modèle ne porte, distinct de « locaux à sommeil ».

### Petits établissements de soins (type U) — 6 articles

`PU 1` · `PU 2` · `PU 3` · `PU 4` · `PU 5` · `PU 6`

> Chapitre V — petits établissements de soins (type U). Ces articles n'imposent
> aucune échéance récurrente à l'exploitant : ce sont des règles de construction
> et d'équipement, plus un renvoi aux articles PE.

### Établissements sportifs — 1 article

`PX 1`

> Chapitre VI — établissements sportifs. Article de pur renvoi qui importe tout
> le chapitre XII du Livre II, non dépouillé. Les équipements sportifs figurent
> par ailleurs parmi les risques spécialisés que le produit déclare ne pas
> traiter.

### Gaz en habitation collective — 1 article

`Arrêté 23-02-2018 art. 26 § 6 et § 7`

> Le § 6° impose de retirer et remplacer toute tuyauterie ou accessoire en fonte
> grise dans l'année suivant le signalement de sa découverte (trois mois pour le
> distributeur). Le § 7° plafonne la durée d'exploitation des détendeurs — 10, 20
> ou 30 ans selon leur emplacement, avec des échéances calendaires échelonnées de
> 2024 à 2041. Aucune des deux ne se réduit à une périodicité : la première est
> un délai déclenché par un événement, la seconde une durée de vie maximale d'un
> composant. Le modèle ne porte ni l'un ni l'autre. Ces règles pèsent sur le
> distributeur et le propriétaire d'immeuble collectif, à la marge du périmètre.

### Immeubles de grande hauteur — 1 article

`GH W 5`

> LA SEULE OBLIGATION D'UN CHAPITRE DE CLASSE QUI PÈSE VRAIMENT SUR L'EMPLOYEUR
> OCCUPANT, et c'est pour cela qu'elle est dépouillée : c'était le meilleur
> candidat à une restriction `igh: { classes: [...] }`, et il ne tient pas. Trois
> raisons, dans l'ordre où elles mordent.
>
> (1) ELLE NE DISTINGUE PAS GH W1 DE GH W2. Le § 1 les distingue bien — un chef
> d'équipe pour GH W1, trois agents en permanence pour GH W2 — mais il compose le
> service CENTRAL, « sous la direction du chef de sécurité incendie de
> l'immeuble », c'est-à-dire du côté du propriétaire. Le § 2, celui de
> l'occupant, ne mentionne aucune des deux. Or GH W1 et GH W2 sont précisément
> les deux valeurs que le modèle offre : la question posée au dirigeant ne
> pourrait donc jamais moduler cette ligne.
>
> (2) GH 66 EN FAIT LE MAUVAIS ANCRAGE. Le déclencheur réel est d'occuper un
> COMPARTIMENT DE BUREAUX dans un IGH, ce que le produit sait déjà par la
> typologie de l'établissement ; la classe DÉCLARÉE de la tour, elle, peut être
> GH U ou GH Z pour ce même plateau.
>
> (3) LE PRODUIT NE LA COUVRE PAS, ET LE DIT. `non_couvert` et non
> `obligation_manquante` : l'obligation existe et vise un établissement que le
> produit sert, mais le service de sécurité incendie des IGH est déclaré hors
> couverture sur la page « Ce que Rojer ne couvre pas ». C'est aussi un ÉTAT
> PERMANENT — désigner des agents parmi son personnel permanent — et non une
> échéance ; la participation aux exercices du § 3 est portée par le service
> central, donc par le propriétaire, l'occupant n'étant tenu que d'y participer.

**C'est le vingtième article, et il entre le 2026-09-03 par une porte
inhabituelle** : un lot venu poser une tout autre question — la classe d'IGH
sert-elle à quelque chose ? — a dû balayer les chapitres de classe pour y
répondre, et a trouvé cela en chemin. Il a **une adresse visible**, contrairement
à `R. 4323-63` : la page « Ce que Rojer ne couvre pas » nomme déjà « le service
de sécurité permanent » et « les dispositions propres à la classe de l'immeuble »
parmi ce que l'outil ne porte pas. Le cliquet `MUETS` ne bouge donc pas.

### Légionelles, eau chaude sanitaire collective des ERP — 5 entrées (2026-09-20)

`Arrêté 01-02-2010 art. 3` · `Arrêté 01-02-2010 art. 4` ·
`Arrêté 01-02-2010 annexe 1` · `Arrêté 01-02-2010 annexe 2` ·
`Arrêté du 23 juin 1978 art. 36`

> Une obligation d'exploitation réelle, avec deux rythmes (annexe 2 : température
> mensuelle, légionelles annuelles) — que le RÉFÉRENTIEL ne porte pas, par
> décision du 2026-09-20. Son champ (art. 1 et 2) laisse dehors la cible du
> produit : restaurant, commerce de détail, bureau.

**Ces cinq-là ont une adresse visible** : la page du module « Carnet
sanitaire », qui outille le « fichier sanitaire » de l'article 3, cite le champ
des articles 1er et 2 au lieu d'affirmer « obligatoire pour tout établissement
avec ECS », et DIT ce que Rojer fait — rien tant qu'aucun carnet n'est ouvert,
puis un rappel annuel de l'analyse. Pour l'article 36 de 1978 (températures du
réseau), l'adresse est l'aide du seuil au formulaire de point de relevé. Le cliquet `MUETS` ne bouge
pas. Ce que le produit ne sait pas dire est QUI est concerné : il ne détient ni
le caractère collectif de l'installation, ni la présence d'un point d'usage à
risque.

### Travail en hauteur, tous secteurs confondus — 1 article

`R. 4323-63`

> L'ARTICLE DE LA SECTION QUI TOUCHE LE PLUS LES TROIS SECTEURS CIBLES, et le
> produit n'en dit rien. Un restaurant, un commerce et un bureau n'érigent
> pratiquement jamais d'échafaudage ni ne travaillent sur cordes ; tous les trois
> utilisent un escabeau, toutes les semaines — réassort d'un rayon haut,
> nettoyage d'une hotte, changement d'un tube, décoration de vitrine. C'est là
> que le risque de chute de hauteur se réalise dans ces secteurs, et c'est
> l'article qui l'encadre.
>
> Ce qu'il exige vraiment n'est PAS « l'escabeau est interdit ». C'est que
> l'usage comme POSTE DE TRAVAIL est interdit par principe, et que la dérogation
> est conditionnée — soit impossibilité technique, soit un risque évalué comme
> faible ET des travaux de courte durée ET non répétitifs, les trois conditions
> du second cas étant cumulatives. Un réassort quotidien en haut d'un escabeau
> est répétitif : il ne remplit pas la dérogation.
>
> Ce que le produit devrait en faire relève du DUERP — le risque « chute de
> hauteur depuis un escabeau » et sa mesure de maîtrise — et non du calendrier
> de conformité : il n'y a pas de rendez-vous à inscrire, il y a un risque à
> évaluer et une dérogation à justifier.

**Cet article-ci n'a jamais eu l'adresse visible dont parle le § 3 bis.** Il est
entré au corpus le 2026-09-01, plus de trois jours après le retrait de la carte,
et il n'a donc jamais été annoncé à personne. Les « 27 » du § 3 bis restent 27 :
ils comptent une histoire, pas un état.

### Travaux en présence du public, tous ERP — 1 article (2026-09-26)

`GN 13`

> Consigné le 2026-09-26 parce que l'écran du permis de feu en affiche le texte entre guillemets, et qu'aucun corpus ne le portait : l'extrait n'était confronté à rien (`verbatim/extraits-affiches.test.ts`). Un seul alinéa, section 4 « Travaux » du Livre Ier. C'est une INTERDICTION qui vise tout exploitant d'ERP, donc la cible du produit — restaurant, commerce, bureau recevant du public —, et que le référentiel ne porte pas : ni pièce ni rythme, rien ne s'en inscrit au calendrier. Il ne prescrit pas de permis de feu — l'écran le dit déjà.

**Celui-ci a une adresse visible** : l'écran du permis de feu, où la pastille
« Art. GN 13 · Règlement ERP » affiche le texte mot pour mot. Le cliquet
`MUETS` ne bouge pas. Il était entré au corpus le matin même comme
`sans_objet`, et il a été reclassé sur le précédent de `R. 4323-63` : une
obligation qui vise la cible et que le référentiel ne porte pas se déclare,
elle ne se nie pas.

---

## 3 bis. Ces 27 articles ont eu une adresse visible. Elle a été retirée.

À lire avant de conclure quoi que ce soit du § 3, parce que l'histoire compte
autant que la liste.

Entre le 2026-08-28 après-midi et le soir du même jour, ces 27 articles ont été
**annoncés à l'exploitant** : une carte en tête du tableau de bord de chaque
établissement les nommait un par un, avec leur motif, et les 25 `declareA` qui
disaient « Non déclaré à ce jour » ont été réécrits pour pointer vers elle. Le
cliquet `MUETS` est passé de 31 à 0.

**Elle a été retirée le soir même, par décision produit, et non parce qu'elle
était fausse.** La raison est la seule qui compte pour qui relit ceci : déclarer
sur l'écran de chaque dirigeant ce que le produit ne couvre pas suppose d'avoir
tranché ce qu'il couvre — et cette question n'est pas encore tranchée. L'axe
répondait à une question qui n'était pas posée.

Deux conséquences à ne pas perdre :

- **`MUETS` est remonté à 27**, et le nombre doit se lire avec sa cause. Il ne
  remonte pas parce que le référentiel a régressé : il remonte parce que la
  surface qui déclarait ces articles a été retirée. Le laisser à 0 aurait fait
  affirmer au test que 27 manques sont annoncés à quelqu'un, ce qui est faux —
  et un cliquet qui ment est pire que pas de cliquet. Le faire redescendre
  suppose de **couvrir** ces obligations, ou de leur rendre une adresse
  **visible par l'exploitant**. Pas de trouver un autre document interne où les
  ranger : ce document-ci n'en est pas une, et son `declareA` le dit en
  toutes lettres.

  **27 et non 25**, parce que le prédicat du cliquet compte désormais les notes
  internes. Les deux `declareA` qui citaient déjà
  `docs/veille-arbitrage-2026-08-26.md` le passaient pour la mauvaise raison :
  un document de travail n'annonce rien à un exploitant, et le chiffre les
  tenait pourtant pour déclarés. Le compte n'a pas augmenté de deux — c'est la
  mesure qui a cessé de se tromper de deux.

  **Puis 28, le 2026-09-01**, et pour une troisième raison encore, qu'il faut
  distinguer des deux précédentes. Ni régression, ni correction de la mesure :
  le dépouillement du travail en hauteur a lu un texte que personne n'avait
  ouvert et y a trouvé un manque réel de plus, `R. 4323-63`. Le cliquet a
  fonctionné exactement comme son commentaire l'annonçait — « un 28ᵉ article
  `non_couvert` ajouté sans adresse le fait passer à 28 et le test tombe ». Le
  chiffre monte donc parce qu'on a lu, pas parce qu'on a cassé quelque chose, et
  c'est le seul cas où le laisser monter est juste. Il redescendra par les deux
  mêmes voies que les 27 autres, et par aucune troisième : couvrir, ou rendre
  une adresse visible par l'exploitant.
- **Le mécanisme, lui, est intact.** Les quatre autres axes tournent, les
  bandeaux et le PDF les portent. Réactiver `famille_obligation` est un ajout
  de quelques lignes le jour où la question sera tranchée — de préférence
  après le rattachement article → `typeErp` du § 2, qui le rendra propre au
  dossier plutôt que général.

Ce qui a été appris au passage, et qui survit au retrait : **le champ `declareA`
mélange deux choses de nature différente** — une adresse produit, visible par
l'exploitant, et une note interne comme ce document. Le cliquet les compte
pareil. La distinction reste à trancher (elle relève du lot 3) ; elle n'est pas
théorique, puisque le même chantier a produit les deux formes en une soirée.

---

## 4. Ce que la construction a appris, et qui vaut pour le point à faire

**Le corpus attendait déjà cette surface.** Au 2026-08-28, les 27 articles
`non_couvert` portaient tous un `declareA`, dont 25 disaient « Non déclaré à ce
jour. » — un champ qui déclare ne rien déclarer. Deux d'entre eux nommaient le
défaut mot pour mot :

> « Le bandeau de couverture annonce la catégorie d'ERP, pas les locaux à
> sommeil. »
>
> « Un exploitant hôtelier ne verra rien qui l'avertisse que ces trois
> obligations lui manquent. »

Et `corpus.test.ts` portait un cliquet dessus — `MUETS`, avec la consigne « ce
chiffre doit descendre, soit en couvrant, soit en déclarant ». **La question
« que ne couvre-t-on pas ? » n'a donc pas été ouverte par ce chantier : elle
était posée, comptée et suivie depuis le dépouillement.** Ce qui manquait était
une adresse. C'est ce document, désormais.

**Trois limites du cliquet, à connaître avant de s'y fier** (les deux dernières
relèvent du lot 3, non traité ici) :

0. **Il est saturé.** 27 muets pour un plafond de 27, c'est-à-dire la totalité
   des articles `non_couvert`. Vérifié par mutation : retirer le `declareA`
   d'un article ne le fait plus bouger, puisqu'il était déjà compté. Il protège
   encore contre l'**arrivée** d'un manque muet — un 28ᵉ article sans adresse
   le fait tomber — mais plus contre la **perte** d'une adresse existante.
   Conséquence mécanique du retour à 27, et raison de plus de lui préférer
   l'invariant du point 2.


1. Il cherche la chaîne littérale « Non déclaré », définie nulle part et écrite
   à la main dans chaque entrée. Une reformulation sort un article du compte en
   silence. La branche est aujourd'hui **morte** — plus aucun article ne la
   déclenche — donc le piège est armé sans occurrence.
2. Il vérifie qu'un `declareA` est **présent**, jamais que l'adresse citée
   **existe**. Un meilleur invariant serait : *tout article `non_couvert` a une
   adresse, et cette adresse mène quelque part.* Le premier est un plafond qu'on
   abaisse à la main, le second une garantie qui ne peut pas dériver.

**Le référentiel sectoriel du DUERP n'est pas un référentiel réglementaire.**
`restauration.ts`, `commerce.ts` et `bureau.ts` citent des articles
(`R. 4511-1`, `R. 4431-2`, `R. 4433-1`) mais tous en commentaire ou en prose :
zéro `ReferenceLegale` structurée, zéro `versionConstatee`, aucune ne produit
d'échéance. Ce sont des mentions, pas des obligations. Le socle documentaire est
INRS — ED 880, ED 840, OiRA.

**Et il n'existe aucune référence réglementaire du document unique par secteur.**
`L. 4121-3` et `R. 4121-1` disent « évaluez les risques » sans nommer ni secteur,
ni unité de travail, ni liste. Un secteur manque au produit quand l'INRS n'a pas
publié son guide : c'est une limite éditoriale, pas juridique. Ce constat a
défait le verrou d'onboarding, qui refusait la création d'un dossier hors des
trois secteurs « parce que le DUERP produit ne serait pas fiable » — un motif qui
invoquait un droit qui ne dit pas cela.

---

## 5. Ce qui reste à l'écran, et pourquoi

La carte du tableau de bord est retirée. Ce qui reste :

- **Le bandeau du calendrier et celui du registre.** Ils se lisent avant le
  contenu qu'ils qualifient — un dirigeant hors périmètre doit savoir que ce
  qui suit est incomplet avant de le lire, pas après. Ce sont les deux écrans
  qu'on suit pour savoir quoi faire, et les deux qu'on présente à une
  commission.
- **Le bloc « Ce que ce dossier ne couvre pas » du dossier de conformité PDF.**
  Le détail article par article n'y est **pas** imprimé : vingt-sept motifs de
  dépouillement rédigés pour un relecteur interne feraient passer une note de
  travail pour une pièce du dossier. Le décompte y est.
- **Tout le socle `perimetre/`**, inchangé.
- **La page des éléments exclus** (`etablissements/[id]/perimetre`), ouverte le
  2026-09-01 par l'ADR-025 § 8. Elle rend trois choses distinctes, et
  séparément : les manques et indéterminations de ce dossier (le bandeau, tel
  quel), les deux régimes que la création refuse (`perimetre/exclusions.ts`, qui
  interroge le schéma au lieu de le décrire), et les articles `hors_perimetre`
  du corpus, groupés par motif d'exclusion.

  **Elle ne donne PAS d'adresse aux 26 articles `non_couvert`**, et un test le
  verrouille. La tentation était forte — la page ressemble à l'endroit où les
  mettre — mais ce serait exactement la confusion que `corpus/perimetre.ts`
  interdit en tête de fichier : ranger un manque parmi les exclusions le fait
  disparaître du décompte, il cesse d'être une dette pour devenir une
  non-question. Le cliquet `MUETS` est descendu à 19 le 2026-09-01 — par la
  PREMIÈRE des deux voies, celle qui couvre : l'attribut « locaux à sommeil »
  a fait sortir neuf articles du décompte, dont deux en les couvrant et sept
  en établissant qu'ils n'imposent aucun acte à un exploitant. Il ne
  redescendra jamais par une troisième voie.

Aucune de ces surfaces ne qualifie la situation au regard du droit : ni
« conforme », ni « non conforme », ni « incomplet ». Elles décrivent ce que
l'outil sait, à sa version courante. Une obligation que le produit ne traite pas
reste due si un texte l'impose — et c'est la phrase que le chapeau du PDF doit
toujours porter.

---

## 6. La question ouverte, pour le point à venir

Ce document dit ce que le produit ne couvre pas. Il ne dit pas ce qu'il couvre,
et cette mesure manque toujours : **« 85 obligations » dit ce que le référentiel
porte, pas ce qu'un établissement donné déclenche.** Personne ne sait combien
d'obligations sont atteignables par un profil type — un restaurant de 6
personnes, un commerce de 3, un bureau de 12.

Elle est écrivable : le corpus porte des clés d'article, le moteur rend les
obligations applicables pour un couple (typologie, parc). C'est probablement le
premier chiffre à produire pour trancher « ce que Rojer fait réellement, et pour
qui ».
