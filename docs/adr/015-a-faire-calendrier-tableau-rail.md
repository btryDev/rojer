# ADR-015 — « À faire » est un écran, pas un dossier : le calendrier en devient la porte

> **Remplacée le 2026-09-01 par l'ADR-030.** Le rail ne porte plus les cinq
> entrées décrites ici mais trois axes thématiques — santé-sécurité, équipement
> et bâtiment, documentation — plus « À faire » et « Paramètres ». Ce que cette
> ADR pose sur la nature d'une entrée (une page réelle, jamais une
> approximation ; cliquer navigue *et* ouvre le panneau) est conservé par
> l'ADR-030.

- Statut : acceptée, **révisée le jour même** (voir « Révision » en fin de
  page), puis **amendée par l'ADR-017** (une cinquième entrée de rail,
  « Opérations », recueille le permis de feu et le plan de prévention, qui
  n'étaient pas des registres), puis **révisée une seconde fois** : le
  tableau de bord n'a plus d'entrée de rail du tout (voir « Révision — la
  marque remplace l'entrée », en fin de page), puis **révisée une troisième
  fois** : le compte quitte le rail pour la barre haute et le guide perd son
  entrée (voir « Révision — le rail ne garde que les questions du dossier »).
  L'ADR-018, lui, a retiré « Interventions » du panneau « À faire » avec son
  module
- Date : 2026-08-20
- Portée : `src/components/layout/sidebar-nav.ts`, `AppSidebar.tsx`,
  `src/lib/navigation/`, `src/lib/calendrier/retards.ts`, la page calendrier
- Dépend de : ADR-010 (registre d'échéances du calendrier), ADR-014
  (provenance de navigation)

## Contexte

La section « À faire » du panneau listait cinq destinations : Tableau de
bord, Calendrier, Plan d'actions, Interventions, Préparer un contrôle. Un
test produit a montré que cette liste ne se laisse pas lire.

**Le tableau de bord n'est pas une chose à faire.** C'est un résumé — le
board de widgets, le brief du jour. Le ranger en tête d'une liste de tâches
oblige le dirigeant à traverser « À faire » pour atteindre l'écran qui lui
dit, justement, ce qu'il y a à faire. La porte d'entrée du produit était
cachée dans un tiroir.

**Le calendrier disait déjà tout, sans le dire.** Depuis l'ADR-010, il
fusionne deux flux : les vérifications périodiques et le registre des autres
échéances (actions, interventions, permis, plans de prévention, mise à jour
du DUERP, attestations de vigilance). C'est-à-dire **tout ce qui est daté et
qui attend le dirigeant**. Il portait pourtant le nom d'un module parmi
d'autres, et un `<h1>` — « Vérifications périodiques » — qui décrivait un
seul de ses quatre flux.

**Aucun écran ne montrait les contrôles matériel seuls.** Le filtre existait
(`?famille=controle`, `FAMILLES_FILTRABLES`), mais enfoui dans un popover
« Filtres ». Le dirigeant qui demande « où je vois mes contrôles ? » n'avait
pas d'entrée de navigation à cliquer.

**Deux compteurs « en retard » se contredisaient.** Le badge de la sidebar
comptait les vérifications ; le bandeau du calendrier comptait toutes les
familles. L'écart était si visible qu'il avait fini par être *documenté*
dans l'aide de l'écran (« le badge de la barre latérale ne compte, lui, que
les vérifications périodiques : 3 sur 11 »). Un produit qui explique son
incohérence au lieu de la corriger a déjà perdu la confiance qu'il demande.

**Enfin, le rail ne naviguait pas.** Cliquer « À faire », « Établissement »
ou « Registres » ouvrait un panneau sans changer de page : deux clics
obligatoires pour arriver quelque part, et une icône de premier niveau qui
ne mène nulle part.

## Décision

**1. Le tableau de bord monte au rail, en première position.** Entrée
autonome, lien direct, sans panneau. C'est l'écran d'atterrissage à la
connexion ; il mérite le premier niveau et ne se range plus sous une
catégorie qui le contredit.

**2. « À faire » est une catégorie de rail dont la page d'entrée est le
calendrier.** Le rail « À faire » mène à `/calendrier`, toutes familles
confondues. Le `<h1>` suit le filtre actif : « Calendrier » sans filtre, le
libellé long de la famille sinon.

**3. Règle de rail : une entrée = une page d'entrée + un panneau.** Cliquer
une catégorie navigue **et** ouvre son panneau — À faire → `/calendrier`,
Établissement → `/equipements`, Registres → `/duerp`. Le choix manuel de
panneau reste possible et survit jusqu'à la navigation suivante, comme
avant. Corollaire : `RailCategorie.href` devient obligatoire.

Sur une catégorie **sans** panneau (Tableau de bord, Comprendre,
Connecter), le panneau s'efface au lieu de se rabattre sur celui de « À
faire » : un panneau qui n'a aucun item surligné décrit un endroit où
l'on n'est pas. Le board de widgets y récupère ses 224 px.

**4. Le panneau « À faire » ne porte que des activités** : Calendrier ·
Plan d'actions · Interventions · Préparer un contrôle. Aucune entrée n'est
l'état filtré d'une autre. « Comprendre » sort de la section — le rail y
mène déjà.

Un filtre est un **réglage d'écran** : il vit dans l'écran. Le promouvoir en
entrée de navigation crée deux lignes voisines qui décrivent partiellement le
même objet avec deux compteurs de périmètres différents — exactement le
défaut que la décision 5 corrige par ailleurs. Corollaire : l'arborescence
tient **entièrement dans le chemin**, `deduireActif` ne lit pas la query.

**5. Un seul compteur de retard, un seul périmètre.** Le badge « Calendrier »
porte les retards **toutes familles** (`enRetardTotal`). Une fonction unique,
`repartirRetards` (`src/lib/calendrier/retards.ts`), sert la sidebar **et** le
bandeau du calendrier : les deux lectures ne peuvent plus diverger. Le
paragraphe d'aide qui documentait l'écart est supprimé.

`RetardsParFamille` expose aussi `verifications` et `parFamille`, que la
navigation ne lit plus : deux compteurs voisins de périmètres différents sont
précisément le défaut qu'on corrige. Ils restent disponibles pour une surface
qui a besoin du détail — la page Équipements, par exemple.

**6. Les mêmes compteurs partout.** `chargerSidebarCounts` est partagée par
le shell établissement et le shell DUERP, qui montait la sidebar sans
`counts` : les pastilles disparaissaient dès qu'on entrait dans le wizard.

**7. Ce qui est sans date est signalé, pas caché.** Une action sans échéance
n'a pas de jour où se poser — l'ADR-010 refuse d'en inventer un. Elle est
désormais **annoncée** : pilule « N action(s) sans échéance — les dater » sur
la vue Tout du calendrier, tuile « À dater » sur le plan d'actions, toutes
deux issues de `compterActions().sansEcheance`. Le calendrier reste un
écran de dates ; il ne prétend plus être exhaustif en silence.

## Ce qui n'a pas été fait, et pourquoi

**Plan d'actions et Interventions ne deviennent pas des filtres du
calendrier.** La tentation était forte — tout y est déjà, famille `travaux`.
Mais le calendrier ne montre que du daté : une action sans échéance et un
ticket sans date n'y apparaissent jamais. Faire pointer « Plan d'actions »
vers `?famille=travaux` aurait rendu ces objets **invisibles depuis leur
propre entrée de navigation**. Les deux pages restent autonomes ; le
calendrier en est une lecture datée, pas le contenant.

**« Préparer un contrôle » reste dans « À faire ».** La question ouverte du
backlog est tranchée dans le sens de la contre-proposition : se tenir prêt
est un entretien continu, pas un événement subi.

## Conséquences

- `LABEL_ITEM` reste la table unique des noms d'écran, partagée avec
  `src/lib/navigation/provenance.ts` : par l'ADR-014, le rail et le fil de
  retour nomment un écran de la même façon, sans table parallèle.
- `deduireActif` garde sa signature d'origine : la query ne gouverne pas
  l'arborescence.
- ~~La maquette de la landing (`components/landing/TableauDeBord.tsx`) suit la
  même arborescence : elle montre le produit, elle ne peut pas montrer un
  autre produit.~~ [2026-11-06 : la maquette est retirée de la page publique,
  remplacée par « Un outil simple et transparent » (`OutilSimple.tsx`), qui
  montre une vraie visite de l'app.]

## Révision — le panneau ne décline pas le calendrier en filtres

La première rédaction faisait du panneau « À faire » cinq entrées, dont
« Contrôles matériel » — un état filtré du calendrier. Un inventaire des cinq
écrans a montré trois défauts que cette entrée créait :

1. **Double compte.** « Tout » portait les retards toutes familles (actions
   datées comprises), « Plan d'actions » les actions ouvertes et en cours. Une
   action datée et dépassée était comptée **deux fois, en deux sémantiques**,
   sur deux lignes voisines. C'est l'incident que la décision 5 venait de
   corriger, réintroduit un cran plus loin.
2. **Faux miroir.** Le calendrier agrège **sept** sources ; le panneau n'en
   expose que deux en écran propre (actions, interventions). DUERP,
   prestataires, permis de feu, plans de prévention et légionelles ont leurs
   écrans dans « Mes registres » et « Mon établissement ». « À faire » n'est
   pas le sommaire du calendrier, et ne peut pas le devenir.
3. **Homonyme.** « Préparer un **contrôle** » (la visite d'un tiers) était posé
   sous « **Contrôles** matériel » (vérifier un extincteur) — deux sens du même
   mot à deux lignes d'écart.

L'inventaire a aussi corrigé la prémisse invoquée pour justifier le mélange.
Le clivage n'est pas « lectures filtrées » contre « écrans autonomes portant du
travail » : sur les cinq écrans, **quatre sont des lectures pures** (zéro server
action mutante) et seul Interventions permet de créer depuis sa liste. Tous les
verbes vivent aux fiches de détail. Le clivage réel est **daté** (le calendrier)
/ **à dater ou non datable** (action sans échéance, ticket sans échéance,
attestation jamais fournie, risque DUERP qui n'a aucun champ de date) /
**sortie** (préparer un contrôle) — et c'est ce qui justifie que Plan d'actions
et Interventions restent des portes : ils montrent ce que le calendrier ne peut
structurellement pas montrer.

Le besoin d'origine — « où en est chaque appareil ? » — n'est pas satisfait par
une entrée de navigation de plus, mais par la page **Équipements**, aujourd'hui
un inventaire nu (catégorie, libellé, localisation) qui ne dit rien de l'état de
vérification de chaque appareil. C'est là que la question se pose.

## Révision — la marque remplace l'entrée « Tableau de bord »

La décision 1 sortait le tableau de bord du panneau « À faire » pour lui
donner une entrée de rail : un résumé n'est pas une tâche, et la porte
d'entrée du produit ne devait plus être rangée dans un tiroir. Le diagnostic
tient, le remède était une entrée de trop.

Le rail porte les **questions du dirigeant** — qu'est-ce que je dois faire,
qu'est-ce qui est encadré, qu'est-ce que j'ai déclaré, qu'est-ce que je peux
présenter. Le tableau de bord n'en est pas une : il y répond toutes. Le
mettre au même rang, avec la même tuile et le même libellé, en faisait une
cinquième question — et sa tuile allumée, sur l'écran d'atterrissage,
signalait un endroit où l'on est toujours arrivé sans l'avoir demandé.

**Le retour au tableau de bord passe désormais par la marque**, en tête de
rail : « Rojer » en toutes lettres, à la place du logo abstrait. Un logo
ramène à l'accueil — c'est le seul geste de navigation que tout le monde
connaît déjà, et il n'occupe pas une place dans la liste des questions.
Conséquences :

- Le panneau ne répète plus le nom du produit : il était affiché deux fois
  côte à côte dès que le panneau s'ouvrait. Son en-tête ne porte plus que le
  bouton de repli.
- `construireRail` ne rend plus de catégorie `tableau`. `categorieDeItem`
  continue d'en rendre l'id — c'est ainsi que le panneau sait qu'il n'a rien
  à montrer sur cet écran, et le rail reste seul.
- Aucune tuile n'est allumée sur le tableau de bord. C'est exact : on n'y est
  dans aucune des quatre catégories.

## Révision — le rail ne garde que les questions du dossier

Deux entrées de premier niveau sont tombées, pour la même raison que le
tableau de bord à la révision précédente : elles n'étaient pas des questions
du dirigeant sur son dossier.

**Le compte part dans la barre haute** (`BarreCompte`). La règle qui régit la
cohabitation d'une sidebar et d'une barre haute est un partage des rôles :
la sidebar porte la hiérarchie de navigation du produit, la barre haute les
utilitaires de session — identité, déconnexion, retour à l'accueil. Tant que
le compte vivait en pied de rail, la barre n'avait rien à porter et restait
une bande vide ; c'est ce déménagement qui la justifie.

**« Comprendre » perd son entrée, sa page reste.** Le guide n'est pas un
endroit où l'on va décider quelque chose : on l'ouvre depuis l'écran qui
soulève la question. Il se rejoint donc depuis « Préparer un contrôle »,
depuis « Connecter » et depuis la fiche d'un équipement — trois endroits où
la question se pose vraiment, contre une tuile permanente qu'on ne cliquait
qu'une fois.

**« Connecter » devient « Paramètres »**, une entrée sans panneau : régler le
dossier et y brancher un assistant en lecture seule sont le même geste, du
point de vue du dirigeant.

Conséquence sur la décision 3 : `categorieDeItem` rend désormais `null` pour
une page sans entrée de rail. Le guide était rattaché à son voisin le plus
proche, ce qui allumait « Paramètres » sur un écran qui n'en fait pas partie,
et la tuile allumée menait ailleurs. Une entrée de rail désigne une page,
pas une approximation : quand aucune ne convient, aucune ne s'allume — c'est
déjà ce que fait le tableau de bord depuis la révision précédente.

## Lexique — un mot par objet

Le produit nommait le même objet de quatre façons selon l'écran. Un canal
graphique posé sur un lexique divergent ne vaut rien : les mots sont fixés.

| Objet | Mot retenu | Écartés |
|---|---|---|
| `Verification` | **Vérification** | Contrôle, Contrôles matériel |
| Visite d'un tiers | **Contrôle** | — le mot lui est réservé |
| `Intervention` | **Intervention** | Ticket, Signalement |
| `Action` | **Action** | Action corrective, Correction |

« Contrôle » est rendu au sens qu'un dirigeant comprend d'emblée : **quelqu'un
qui vient**. L'objet périodique reprend le mot du droit — art. R. 4323-23,
« vérifications générales périodiques ». Un extincteur se *vérifie*, une
inspection se *subit*. Les libellés de la famille `controle` suivent :
« Vérifications », « Vérifications périodiques », « Vérification ».

**Exception : les citations réglementaires gardent leurs mots.** Le référentiel
(`src/lib/referentiels/`) reproduit des intitulés officiels — « arrêté du
8 octobre 1987 relatif au **contrôle** périodique des installations » — et une
référence ne se réécrit pas pour la confort d'un lexique produit. Le lexique
régit ce que Rojer dit en son nom propre, jamais ce qu'il cite.
