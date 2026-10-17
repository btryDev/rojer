# ADR-027 — Une déclaration n'est pas une preuve

- **Statut** : accepté, 2026-08-31
- **Contexte** : lot « écran des états permanents » (`feat/etats-permanents`),
  à la suite de l'ADR-022 (les quatre natures d'obligation) et de l'ADR-026
  (la nature devient un champ)

## Le problème

L'ADR-022 nomme quatre natures d'obligation. Une seule — l'échéance récurrente —
avait un support de persistance, `Verification`, et un écran, le calendrier.

Le contrôle visuel du 2026-08-31, sur un dossier né de l'onboarding, l'a mesuré :
le moteur calculait dix-huit obligations, l'application en affichait deux. Les
seize autres n'étaient persistées nulle part. Le générateur les écarte à raison —
sans périodicité, pas de rendez-vous, et inventer une date serait pire que n'en
afficher aucune — mais la conséquence ne l'était pas : trois lots avaient
dépouillé des textes, encodé des obligations et écrit leurs tests, et **aucun
utilisateur ne les aurait jamais vues**.

Donner une surface à ces obligations suppose de persister quelque chose. Et c'est
là que le vrai risque apparaît, qui n'est pas technique.

## La décision

**Ce que l'employeur coche est une déclaration. Ce n'est ni un rapport de
vérification, ni une pièce, ni un constat du produit — et le produit ne doit
jamais les confondre.**

Trois conséquences, toutes trois contraignantes.

### 1. Un support distinct de `Verification`, et ce n'est pas un détail

`DeclarationEtatPermanent` : `etablissementId`, `obligationId` (sans clé
étrangère — le référentiel vit en TypeScript, ADR-003), `declareLe`, `note`,
unique sur le couple.

Une `Verification` sans date aurait été le raccourci évident. C'est exactement ce
que le générateur refuse, et pour une bonne raison : **une `Verification` porte
une échéance, donc une affirmation datée.** C'est ce qui l'oblige, quand son
obligation quitte le référentiel, à tout l'appareil `aArchiver` /
`marquerNonApplicable` de la boucle finale du générateur — une ligne orpheline
qui porte une date ment.

Une déclaration ne porte aucune échéance. Il n'y a rien à barrer. Elle survit à
la régénération **par construction**, le générateur ne lisant ni n'écrivant sa
table ; et une déclaration dont l'obligation a disparu cesse simplement de
s'afficher, parce que l'écran **liste les obligations que le moteur rend et y
joint les déclarations, jamais l'inverse**. La ligne est conservée : si
l'obligation revient, la déclaration revient avec elle.

Le patron est `TitreSalarie` (ADR-023), pas `Verification`.

### 2. Une déclaration n'améliore aucune valeur

Elle ne fait progresser aucun « % prêt », ne fait monter aucune note, n'entre
dans aucun export comme une pièce du dossier.

> **Reformulée le 2026-09-01.** Elle disait « n'allume rien ailleurs », et cette
> lettre a cessé d'être exacte le jour où le score a cessé de conclure
> « Situation satisfaisante » sur un dossier dont personne n'a répondu aux états
> permanents. Déclarer y **lève une indétermination** — ce qui n'est pas la même
> chose qu'améliorer une valeur : la note ne monte pas d'un point, et elle ne
> descend pas d'un point si personne ne coche jamais.
>
> L'arbitrage était entre reformuler cette décision et rendre le score muet à
> nouveau. **Le rendre muet aurait restauré le défaut** : un bureau de six
> personnes sortait à « 100 — Situation satisfaisante » avec treize états sans
> réponse, et `.claude/CLAUDE.md` promet que « l'outil ne ment pas sur son
> niveau de conformité ». Une décision qui protège d'une flatterie ne peut pas
> se payer d'une flatterie plus grosse.
>
> Ce que la reformulation conserve intact : rien de ce que l'employeur coche
> n'est présenté ailleurs comme vérifié, et **« lever une indétermination » ne
> vaut jamais « établir une conformité »**.

Le motif est précis : l'écran *Préparer un contrôle* est celui qu'on ouvre devant
un inspecteur. Y faire remonter une déclaration non vérifiée reviendrait à
récompenser une affirmation de l'employeur **là où la distinction coûte le plus
cher**. Ce dépôt a déjà rencontré le défaut sous une autre forme le même jour :
une coche verte à droite d'un badge rouge « En retard », sans rien qui dise ce
que la coche comptait.

Corollaire de rédaction : « 6 sur 12 **déclarés en place par vous** », jamais
« 6 sur 12 conformes ». Le produit assiste, il ne certifie pas (règle 8 de
`CLAUDE.md`).

### 3. Aucune surface de dépôt, mais l'écrit attendu se nomme

L'écran ne collecte aucune pièce. C'est juste pour une affiche au mur ou de l'eau
potable : demander un justificatif là où le texte n'en produit aucun ferait
cocher à vide.

Mais cocher « en place » sur un registre de sécurité **est** une déclaration qui
ressemble à une preuve. D'où `pieceAttendue` (ADR-026) : l'écran nomme l'écrit
que le texte attend — « Le texte attend un écrit : registre de sécurité » —
sans le demander. **Nommer n'est pas collecter**, et taire l'écart ferait cocher
sans savoir ce qu'on affirme détenir.

## Ce que la décision interdit explicitement

- ~~**Aucune relance, sous aucune forme**, y compris un badge « à revoir ». Aucun
  des textes concernés n'écrit de rythme : en poser un serait une périodicité
  inventée, ce que ce dépôt a déjà eu à retirer — un « triennal » qui venait
  d'une norme NF et non du droit. La date de déclaration s'affiche, le dirigeant
  juge lui-même.~~
  **Amendé par l'ADR-039 (2026-10-07).** Sur CET écran, toujours aucune
  relance : ce qui s'y montre n'a pas de rythme. Mais la prémisse a changé —
  quand le texte impose un entretien ou une vérification à rythme vague
  (« maintenus en bon état », « périodicité appropriée »), l'obligation reçoit
  un `rythmeRetenu` (norme lue, ou défaut annuel déclaré comme défaut). Son
  rythme effectif n'est plus `autre` : elle **quitte cet écran pour le
  calendrier**, exactement comme sous une prescription qui lui donne un
  rythme, et la règle « une surface, jamais deux » tient par
  `estSansRendezVous(periodiciteEffective(o))`. Le rythme n'est pas inventé :
  il est déclaré, et chaque surface dit d'où il vient.
- **Aucun historique de déclarations.** Redéclarer redate la ligne, elle ne
  s'empile pas. Un historique ressemblerait à une trace, et une trace ressemble à
  une preuve.
- **Aucune double surface.** Une obligation est au calendrier ou sur cet écran,
  jamais aux deux. Le partage se lit sur une fonction unique,
  `estSansRendezVous`, appelée par le générateur **et** par l'écran — écrite des
  deux côtés, elle aurait divergé, et c'est le défaut que la journée du
  2026-08-31 a passé à retirer sur deux widgets jumeaux.

## Le critère de sélection, et pourquoi il n'est pas celui qu'on croit

L'écran ne montre pas « les obligations sans périodicité ». Ce critère rassemble
quatre natures, et une case « déclaré en place » ment aux trois qui ne sont pas
des états — une obligation événementielle redevient due au fait suivant, et rien
dans le produit n'observe ce fait.

Il ne montre pas non plus « les états permanents » tout court : l'un d'eux
produit une ligne de calendrier (`mise_en_service_uniquement`, que le générateur
date au lieu de la sauter), et le retenir lui donnerait deux surfaces.

Le critère est donc **`nature === "etat_permanent"` ET le générateur n'en produit
aucune ligne**, cette seconde moitié étant lue sur la périodicité **effective**,
surcharge de prescription particulière comprise (ADR-035) : un arrêté préfectoral
qui donne un rythme à une obligation qui n'en avait pas la fait passer de l'écran
au calendrier.

### Un second verbe, pour ce qui revient sans rythme écrit

Quelques obligations sont des échéances récurrentes que le texte fait revenir
sans dire à quel intervalle. Elles tiennent sur cet écran à deux conditions :

- **le verbe change** — « fait le », jamais « en place » : un fait daté vieillit,
  un état ne vieillit pas ;
- **elles n'entrent pas dans le compteur d'en-tête**, qui porte une affirmation
  et non un décompte.

Le verbe **n'est pas persisté** : il se déduit de la nature, qui vit au
référentiel. Le stocker dupliquerait une règle qui existe déjà, et une obligation
dont la nature change au prochain dépouillement changerait de verbe sans
migration.

## Où l'écran vit

Quatrième item du panneau « À faire », **sans nouvelle entrée de rail**.

La décision 4 de l'ADR-015 pose que ce panneau « ne porte que des activités » et
qu'« aucune entrée n'est l'état filtré d'une autre ». Les deux conditions
tiennent : mettre en place est une activité — c'est même la seule chose à faire
d'un dossier neuf, dont le calendrier est presque vide — et ce n'est pas un
filtre du calendrier pour une raison structurelle et non contingente, puisque ces
lignes **ne peuvent pas** exister comme `Verification`. Un filtre suppose que
l'objet soit là ; ici il n'y est pas et n'y sera jamais.

L'ADR-022 nomme quatre natures ; la première a son écran sous « À faire », la
deuxième se range à côté d'elle parce que les deux répondent à la même question
du dirigeant.

Pas de compteur au rail, délibérément : le badge du Calendrier compte des
retards, et ici rien n'est en retard puisque rien n'a d'échéance. Un compteur
voisin portant un autre périmètre est ce que la décision 5 du même ADR interdit.

## Ce que la décision ne tranche pas

- **Les deux natures restantes.** L'obligation ponctuelle n'a pas besoin d'un
  écran mais d'une date, et le mécanisme existe. L'événementielle n'a toujours
  aucune surface, et cet ADR n'en crée pas : « en place » lui mentirait, « fait
  le » aussi.
- ~~**Le ton devant un contrôle.**~~ **Tranché le 2026-09-01**, voir
  l'amendement ci-dessous.

---

# Amendement du 2026-09-01 — ce que la déclaration devient dans le dossier remis à un tiers

Cet amendement ferme la seconde question laissée ouverte ci-dessus. Il ne
retire rien à la décision 2 ; il en lit le qualificatif.

## Le constat qui l'appelle

**Aucun générateur de document n'appelait le moteur de matching.** Vérifié :
sur les sept appelants de `determineObligationsApplicables`, aucun n'était un
générateur — ni `pdf/builders.ts`, ni `api/etablissements/[id]/controle-zip`.

Conséquence, mesurée et non supposée : trente obligations en
`nature: "etat_permanent"` vivaient sur un seul écran (**trente-trois** au soir
du même jour, les lots suivants du recadrage en ayant ajouté trois ; le compte
qui suit garde le chiffre du constat, et le raisonnement ne dépend pas de lui). **Un dirigeant qui avait
coché ses douze états ne pouvait le montrer à personne**, et le document qu'on
présente à un inspecteur est précisément celui qui n'en portait rien.

Le silence n'était donc pas neutre. Il coûtait au dirigeant sérieux exactement
ce que la revue en revanche lui refusait de gagner à bon compte.

## La décision

**Le dossier de conformité porte les états permanents — nommés comme des
déclarations, et jamais comme des pièces.**

Trois conséquences, du même ordre de contrainte que les trois décisions
d'origine.

### 4. Les lignes non déclarées s'impriment autant que les déclarées

N'imprimer que les cases cochées ferait du document une **sélection
avantageuse** : douze coches, et rien sur les dix-huit autres. C'est
l'inversion exacte du défaut que cet ADR corrige, obtenue en le corrigeant.

Le précédent est dans le dépôt : le registre de sécurité imprime ses
quarante-neuf fiches « y compris celles que l'application ne recueille pas »,
parce que « les taire au PDF ferait exactement ce que l'écran a cessé de faire :
laisser croire le document complet » (`pdf/builders.ts`).

### 5. Deux mises en garde, parce qu'il y a deux façons de mal lire

Le lecteur n'est plus le dirigeant, et les deux erreurs de lecture vont **en
sens contraires** :

- une case cochée se lit « conforme » — or elle n'est qu'une affirmation de
  l'employeur, que Rojer n'a pas vérifiée ;
- une case vide se lit « manquement » — or elle n'est qu'une question sans
  réponse, ce que l'écran dit déjà au dirigeant.

**Une seule mise en garde n'en couvre qu'une.** Le chapeau porte donc les deux,
et il est rendu **au-dessus du tableau** : le contrôle visuel du 2026-08-31 a
montré qu'une explication placée après une liste arrive une fois qu'on a fini
de la lire.

L'écrit que le texte attend est nommé en regard, comme à l'écran (décision 3),
avec la phrase qui empêche de le croire détenu : « Rojer ne le détient pas : la
pièce est à demander à l'employeur. » Nommer reste le contraire de collecter,
et **c'est ce qui donne au lecteur la bonne question à poser** plutôt qu'une
coche à croire.

### 6. Ce que le ZIP ajoute : rien

Le ZIP « Préparer un contrôle » ne reçoit **aucune entrée neuve**. Il embarque
déjà `01_Dossier_conformite.pdf`, rendu depuis `construireDossierConformiteData` :
il porte donc la section par construction.

Un `09_Etats_permanents.txt` aurait été une **seconde lecture des mêmes
chiffres**, et ce dépôt a payé deux fois pour cette forme-là — un compteur
d'agrégat SQL en face d'une liste filtrée en TypeScript (« 5 vérifications en
retard » puis 3 lignes), et un score composé de deux façons qui sortait
différent à l'écran et dans le document « à la même seconde ». La question
« le ZIP et le PDF doivent-ils dire la même chose ? » se règle en ne les
laissant pas être deux choses.

Pour la même raison, **le score et le tableau viennent d'un seul passage** :
`etatsPermanentsDuDossier` est lu une fois, la note en prend les deux
compteurs, le tableau en prend les lignes. Les lire deux fois aurait mis, dans
un même document, une note calculée sur un ensemble et un détail décrivant
l'autre.

## Ce que l'amendement ne change pas, et un point à ne pas lire de travers

La décision 2 tient, **et son qualificatif est le point** : une déclaration
« n'entre dans aucun export **comme une pièce du dossier** ». Elle y entre
maintenant, désignée comme ce qu'elle est. Elle ne devient toujours ni un
justificatif, ni une preuve, ni une ligne de pourcentage.

**Mais la décision 2 a déjà bougé ailleurs, et ce n'est pas cet amendement qui
l'a fait bouger.** Elle écrit qu'une déclaration « ne passe aucun indicateur au
vert ». Depuis `116a278` (2026-09-01), le score de conformité ne conclut plus
« Situation satisfaisante » tant qu'un état reste sans réponse : déclarer ses
états **est** devenu la condition pour qu'un dossier sans retard atteigne le
niveau haut. La lettre de la décision 2 n'est plus exacte.

L'esprit tient — la déclaration ne fait toujours pas *monter* la note, elle
lève une indétermination, et le score ne descend pas d'un point si personne ne
coche jamais. Mais l'écart est réel, il est écrit ici plutôt que découvert plus
tard, et **son arbitrage appartient à la propriétaire** : soit la décision 2 se
reformule, soit c'est le score qui redevient muet.

**Tranché le 2026-09-01 : la décision 2 est reformulée**, et le score reste
parlant. Le motif est écrit dans la décision elle-même. Le lot documentaire a
eu raison de ne pas trancher seul un point de score — et raison de l'écrire
plutôt que de le laisser se découvrir plus tard.

---

# Amendement du 2026-10-17 — l'écran se range par usage, le référentiel reste par domaine

Cet amendement ne touche à aucune des six décisions ci-dessus. Il ferme une
question que l'ADR n'avait pas posée : **dans quel ordre l'écran présente ses
lignes**. Il les rangeait par domaine juridique sans que rien l'ait décidé —
c'était l'ordre du référentiel, repris tel quel.

## Le constat qui l'appelle

Mesure du 2026-10-14 sur `origin/main` 517309db, quatre profils (restaurant
5ᵉ catégorie, magasin 3ᵉ, bureau, hôtel 5ᵉ) : **entre 29 et 33 lignes par
dossier, rangées en 12 ou 13 cartes**, une par domaine, triées par ordre
alphabétique. **Quatre cartes ne portaient qu'une ligne**, et les affichages
étaient éparpillés sur trois cartes. La propriétaire parle d'une « liste de
courses » : l'ordre de l'index d'un code, pas celui dans lequel un dirigeant
se demande ce qu'il doit avoir.

Le domaine est la bonne clé pour qui lit par texte. Ce n'est pas celle de qui
passe ses lignes en revue : l'extincteur, sa signalisation et l'instruction du
personnel qui doit s'en servir répondent à la même situation et vivaient dans
trois domaines.

## La décision

**L'écran range ses lignes par usage. Le référentiel reste par domaine, et
chaque ligne garde son article.**

### 7. Quatre familles, et la règle qui tranche une frontière

Ordre fixe (`etats-permanents/familles.ts`, `ORDRE_GROUPES`) :

1. **Incendie et secours**, en cinq sous-catégories qui suivent le déroulé
   d'un sinistre : *Prévenir*, *Alerter*, *Éteindre*, *Évacuer*, *Secourir* ;
2. **Le quotidien de vos salariés**, en deux : *Conditions de travail*,
   *Informer et former* ;
3. **Qui s'occupe de quoi**, sans sous-catégorie ;
4. **Vos installations et leurs registres**, sans sous-catégorie.

Sept sous-catégories en tout. Une famille ou une sous-catégorie vide pour ce
dossier ne s'affiche pas, et le sommaire ne lui fait pas d'ancre (charte,
interdit 19).

**Règle de frontière : une ligne se range dans la situation où l'on en a
besoin en premier.** Une consigne incendie affichée sert d'abord à alerter,
pas à informer ; le registre de sécurité sert d'abord aux installations qu'il
consigne. Quand deux familles paraissent convenir, c'est cette question qui
tranche, et non le domaine du texte.

À l'écran, au commit 6595b2b3 : **58 obligations** rangées (relevé de l'agent
structure). Le mouvement : 51 dans la table du plan, mesurée en appelant le
moteur sur 517309db, + 7 états permanents entrés avec les lots « catégories 1
à 4 » et défibrillateur, rangés par 6595b2b3 = 58. Ce chiffre est le nombre
d'obligations de l'écran au référentiel, pas le nombre de lignes d'un
dossier, qui reste celui que le moteur lui rend.

### 8. Une donnée d'écran vit dans le référentiel, et c'est voulu

Le rangement est **un champ requis de chaque obligation**,
`usageEcran: { groupe, sous } | null` (`referentiels/conformite/types.ts`),
et non une table d'identifiants tenue à côté de l'écran. Décision de la
propriétaire du 2026-10-17.

Mettre une donnée de présentation dans le référentiel n'est pas élégant, et
c'est le prix assumé. **Une table tenue à part ne voit pas un ajout au
référentiel** : la nouvelle obligation y manque, et il faut alors soit la
cacher — ce qui fausse le compteur —, soit la verser dans un groupe
« Autres » — ce qui recrée la liste de courses par le bas. Le champ requis
fait l'inverse : **la compilation oblige chaque ajout à se prononcer**, `null`
compris. C'est le précédent de `pieceMedicale` : optionnel, le champ se serait
tu, et l'oubli aurait été la faute naturelle.

Le type admet `null` et ne sait donc pas dire qu'une ligne de l'écran *doit*
être rangée. `familles.test.ts` tient le reste, sur ce que `regle.ts` dit de
chaque obligation et sans liste recopiée :

- `usageEcran` est non nul **si et seulement si** `figureSurLEcranEnPlace` ;
- la sous-catégorie appartient à sa famille (`ORDRE_SOUS_CATEGORIES`).

Il n'y a **pas de groupe « Autres »**. Une ligne de l'écran sans rangement
fait échouer ce test, et `etatsPermanentsDuDossier` lève plutôt que de la
cacher ou de la ranger au hasard (`queries.ts`).

**Le champ n'entre pas dans `empreinteReferentiel()`**, comme `faitGenerateur`
(ADR-037) : il ne change ni le nombre de lignes de calendrier ni leurs dates,
seulement l'endroit de l'écran où elles se lisent. Changer une ligne de
famille ne déclenche aucune réconciliation.

### 9. Le document remis à un tiers garde l'ordre par domaine

Le PDF du dossier de conformité (décisions 4 à 6) **ne lit rien de
`familles.ts`**. `pdf/mentions-etats-permanents.ts` aplatit les familles puis
refait explicitement l'ordre par domaine — les domaines par libellé, puis dans
chacun `comparerLignes` (`ordre.ts`).

Le motif tient au lecteur, qui a changé (décision 5) : un contrôleur lit par
texte. L'usage aide celui qui met en place ; il égarerait celui qui cherche
l'article qu'il vient vérifier.

### 10. Le compteur d'une famille dit la même chose que celui de l'en-tête

Chaque famille porte son compteur, calculé comme celui de l'en-tête : il ne
compte que les lignes en mode « état », et la somme des familles est le total
(`queries.ts`). Sa phrase est **celle de l'en-tête, `phraseCompteur`**
(`etats-permanents/phrases.ts`) : « déclarés en place par vous », et, depuis
le lot #45, la part « établie d'après les titres déclarés » dite à part.

**Jamais « conformes », jamais un pourcentage.** Un compteur par famille est
une affirmation de plus à l'écran ; il ne peut pas en porter une autre que
celle que le corollaire de la décision 2 autorise. Une phrase propre aux
familles aurait été une seconde rédaction de la même chose, et ce dépôt sait
qu'elles divergent à la première correction.

### 11. Rien ne se replie, ni à la main ni tout seul

Aucune famille ne se replie quand ses lignes sont déclarées, et aucune ne se
replie à la demande. C'est l'argument de `ordre.ts`, qui vaut ici tel quel :
**rien ne bouge sous le curseur**. Une famille qui se referme au moment où
l'on déclare sa dernière ligne déplace tout ce qui suit, et deux clics au même
pixel déclarent deux obligations différentes — le défaut du contrôle visuel du
2026-09-03. L'ordre des familles, des sous-catégories et des lignes ne lit pas
la déclaration ; ce qu'il reste se lit aux compteurs.

## Les lectures écartées

- **Par geste** — la première proposition, en six familles. Écartée au profit
  des quatre groupes ci-dessus.
- **Par lieu** (cuisine, accueil, local technique…). Le moteur ne sait pas où
  s'applique une obligation d'établissement : elle porte sur l'établissement
  entier. Ranger par lieu aurait demandé d'inventer une localisation que ni le
  texte ni le dossier ne donnent.
- **Par moment** (à l'ouverture, chaque jour, à l'embauche…). Elle contredit
  l'objet de l'écran : un état est **en place**, il n'a pas de moment. Et elle
  se confond avec « Quand ça arrive » (ADR-037), dont l'objet est justement
  le moment — le fait qui rend une obligation due — et qui distingue par là
  l'événementiel de l'état.

## Ce que l'amendement ne change pas

- **Une déclaration n'est pas une preuve.** Ranger autrement ne change ni ce
  que la case affirme, ni la façon dont elle se nomme, à l'écran comme au
  document.
- **Une surface, jamais deux.** La sélection des lignes reste
  `estSansRendezVous` sur la périodicité effective ; `usageEcran` décide
  *où* une ligne de l'écran se lit, jamais *si* elle y est.
- **Aucune relance.** Ni badge, ni famille signalée « à revoir », ni ordre qui
  fait remonter ce qui n'est pas déclaré.
