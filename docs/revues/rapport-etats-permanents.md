# Rapport — l'écran des états permanents

Branche `feat/etats-permanents`, sur `origin/integration/2026-08-31` (`d562981`).
**1824 tests verts**, `tsc` propre, un avertissement eslint préexistant
(`normaliserFormData`).

> Le § 10, en fin de document, porte les trois retours du contrôle visuel et
> leur correction — dont un quatrième défaut que la garde écrite pour le
> troisième a trouvé toute seule.

La seconde des quatre natures d'obligation de l'ADR-022 a un écran. Elle était la
seule à n'avoir ni surface ni support de persistance, alors que trois lots
avaient dépouillé des textes pour l'alimenter.

---

## 1. La mesure — avant et après, sur un dossier neuf

Établissement de travail, non-ERP, **six personnes, aucun équipement déclaré**.
Chiffres obtenus en appelant le moteur, pas écrits à la main.

| | avant | après |
|---|---|---|
| Obligations que le moteur calcule | 18 | 18 |
| Visibles au **calendrier** | 2 | 2 |
| Visibles sur le **nouvel écran** | 0 | **13** |
| Visibles nulle part | **16** | **3** |

Les treize se répartissent en **sept domaines**, douze sous le verbe « déclaré en
place » et une sous « fait le ». Trois portent une `pieceAttendue` que l'écran
nomme sans la demander.

À douze salariés, quatorze lignes : le CSE s'ajoute. C'est la contre-épreuve que
le compteur est calculé sur **ce dossier** et non sur le référentiel.

**Les trois qui restent invisibles sont les événementielles** — informer les
salariés, la formation au travail sur écran, le protocole de sécurité de
chargement. Le brief l'établit et ce lot ne le corrige pas : « en place » leur
ment puisqu'elles redeviennent dues au fait suivant, « fait le » aussi puisque
l'acte n'est pas dû tant que le fait n'a pas eu lieu. C'est écrit au § 6.

---

## 2. Où l'écran vit — quatrième item de « À faire », sans entrée de rail

L'ADR-015 a été ouverte plutôt que son résumé. Sa décision 4 : le panneau
« À faire » « ne porte que des activités » et « aucune entrée n'est l'état filtré
d'une autre ». Les deux conditions tiennent.

**C'est une activité.** Mettre en place ce qui doit l'être, et c'est même la
seule chose à faire d'un dossier neuf — dont le calendrier ne porte que deux
lignes.

**Ce n'est pas un filtre du calendrier**, et la raison est structurelle et non
contingente : `estSansRendezVous` fait que ces lignes **ne peuvent pas** exister
comme `Verification`. Un filtre suppose que l'objet soit là ; ici il n'y est pas
et n'y sera jamais. Le défaut que l'ADR-015 veut éviter — « deux lignes voisines
qui décrivent partiellement le même objet avec deux compteurs de périmètres
différents » — suppose deux lignes ; il n'y en a qu'une.

L'ADR-022 nomme quatre natures ; la première a son écran sous « À faire », la
deuxième se range à côté d'elle parce que les deux répondent à la même question
du dirigeant.

**Aucun compteur au rail**, délibérément : le badge du Calendrier compte des
retards, et ici rien n'est en retard puisque rien n'a d'échéance. Un compteur
voisin d'un autre périmètre est exactement ce que la décision 5 du même ADR
interdit.

Le libellé affiché est « **Ce qui doit être en place** » et non « États
permanents » : le second est le vocabulaire de l'ADR-022, pas celui d'un
dirigeant. L'identifiant et la route gardent le terme technique — c'est le rôle
de `LABEL_ITEM` que de les découpler.

---

## 3. La persistance — `DeclarationEtatPermanent`, sur le patron de `TitreSalarie`

```prisma
model DeclarationEtatPermanent {
  id              String   @id @default(cuid())
  etablissementId String
  obligationId    String   // pas de FK : référentiel TypeScript (ADR-003)
  declareLe       DateTime @default(now())
  note            String?
  @@unique([etablissementId, obligationId])
}
```

Migration **additive** : une table neuve, aucune ligne existante touchée.

**Pourquoi pas une `Verification` sans date.** C'est précisément ce que le
générateur refuse, et pour une raison qui tient : une `Verification` porte une
échéance, donc **une affirmation datée**. C'est ce qui l'oblige, quand son
obligation quitte le référentiel, à tout l'appareil `aArchiver` /
`marquerNonApplicable` de la boucle finale du générateur — une ligne orpheline
qui porte une date ment. Une déclaration ne porte aucune échéance : il n'y a rien
à barrer.

**Les deux contraintes du brief sont satisfaites sans machinerie :**

- *survivre à la régénération* — par construction : le générateur ne lit ni
  n'écrit cette table, il n'y a rien à lui apprendre ;
- *ne pas devenir orphelin* — l'écran **liste les obligations que le moteur rend
  et y joint les déclarations, jamais l'inverse**. Une déclaration dont
  l'`obligationId` a quitté le référentiel cesse simplement de s'afficher. La
  ligne est conservée : si l'obligation revient, la déclaration revient avec
  elle. C'est déjà la propriété de `TitreSalarie`.

**Le verbe n'est pas persisté.** « Déclaré en place » et « fait le » se déduisent
de la `nature`, qui vit au référentiel. Une obligation qui change de nature au
prochain dépouillement change de verbe sans migration.

**Aucun appel au générateur dans les actions**, contrairement à toutes les autres
mutations du produit. La règle « toute mutation relance `genererCalendrier` »
existe parce qu'un titre ou un équipement **change les échéances** ; une
déclaration n'en change aucune. C'est la traduction en code de la contrainte
« une déclaration n'allume rien ailleurs ».

`ADR-027` porte la décision, et son cœur n'est pas le modèle mais la
**distinction déclaration / preuve** — c'est elle qui se reperd, et elle a déjà
coûté un défaut le même jour.

---

## 4. Le critère — deux corrections au brief, mesurées

Le brief pose `nature === "etat_permanent"`, **trente lignes**. Vérifié en
comptant : la table 65 / 30 / 9 / 12 est juste au chiffre près. Mais le critère
ne peut pas être la nature seule, et l'exclusion des titres de salarié ne compte
pas ce que le brief annonce.

### a) `nature === "etat_permanent"` seul donnerait une double surface

Un état permanent sur trente produit **quand même** une ligne de calendrier :
`porte-auto-portail-piete-coulissant`, porté par un équipement, en
`mise_en_service_uniquement` — que le générateur **date** de la mise en service
au lieu de la sauter. Le retenir lui aurait donné une ligne au calendrier **et**
une case ici : deux états qui divergent à la première correction, exactement ce
que la journée du 2026-08-31 a passé à retirer sur deux widgets jumeaux.

Le critère effectif est donc `nature === "etat_permanent"` **et le générateur
n'en produit aucune ligne** — soit **29**, et non 30. La seconde moitié se lit
sur la périodicité **effective**, surcharge de prescription particulière comprise
(ADR-035) : un arrêté préfectoral qui donne un rythme à une obligation qui n'en
avait pas la fait passer de l'écran au calendrier.

### b) « Les quatre titres de salarié » en sont un seul

Le brief demande de ne pas dupliquer quatre titres que l'écran Équipe sert déjà.
Mesuré : **une seule** obligation `etat_permanent` est portée par un salarié
(`conduite-salarie-autorisation`). Le « quatre » était le compte sous l'ancien
critère `periodicite: "autre"`, où cinq titres remplissent la condition
aujourd'hui — l'un d'eux ayant été ajouté le jour même.

Et l'exclusion n'a rien coûté : le moteur **ne rend jamais** une obligation
portée par un salarié (ADR-023, leurs instances naissent d'un `TitreSalarie`
déclaré). Aucun filtre n'a été écrit ; un test vérifie que rien de ce que l'écran
affiche n'est un titre.

### c) Le second verbe porte trois lignes au catalogue, une sur un dossier neuf

Quatre obligations sont `echeance_recurrente` avec `periodicite: "autre"`, moins
l'exception `incendie-erp-5-visite-commission` que le brief écarte à raison —
l'administration la déclenche, l'employeur ne la « fait » pas. Sur un dossier
neuf, une seule s'applique.

---

## 5. La règle est partagée, pas recopiée

Trois duplications ont été supprimées plutôt que créées, en application de la
ligne tracée le 2026-08-31.

**`estSansRendezVous`** — `generateur.ts` portait `if (periodicite === "autre")
continue;`. L'écran a besoin exactement du complémentaire. La condition vit
maintenant dans `etats-permanents/regle.ts` et le générateur l'appelle : écrite
des deux côtés, elle aurait fini par diverger, et le jour où elle diverge une
obligation apparaît aux deux endroits ou à aucun.

**`projeterEtablissement`** — le guide « Comprendre » et le générateur
construisaient à la main le même objet de onze champs. Le commentaire du guide
raconte encore le défaut que ça a produit : il n'en portait que neuf, et un
établissement manipulant des matières `R. 4227-22` voyait son calendrier
engendrer trois obligations incendie quand la page n'en annonçait qu'une. Écrire
une **troisième** recopie aurait été refaire le défaut sciemment. La projection
est extraite, les trois appelants l'utilisent.

**`SURFACES_DE_DEPOT`** — deux tests gardent désormais des chemins différents
pour des raisons différentes : la frontière médicale interdit le dépôt dans le
module du salarié (RGPD), cet écran l'interdit parce qu'une déclaration n'est pas
une preuve (ADR-027). Les deux ont besoin de la même liste ; elle est extraite
dans `rgpd/surfaces-depot.ts`. Les messages d'erreur, eux, restent distincts —
les raisons diffèrent.

Côté rendu, rien n'est partagé et c'est voulu : la seconde moitié de la garde est
« pas la mise en page ». `LigneEtat` ne connaît pas la règle, elle reçoit un mode
et un verbe.

---

## 6. Ce que l'écran ne fait pas, et le dit

- **Aucune surface de dépôt.** Tenu par un test qui balaie les trois chemins du
  module, et non par une intention.
- **Aucune relance, sous aucune forme**, pas même un badge « à revoir ». Aucun de
  ces textes n'écrit de rythme ; en poser un serait une périodicité inventée.
- **Rien ne s'allume ailleurs.** Aucun « % prêt », aucun indicateur, aucune
  entrée du ZIP. Le compteur reste dans l'écran.
- **« Déclarés en place par vous »**, jamais « conformes » (règle 8 de
  `CLAUDE.md`).
- **Les événementielles n'y sont pas**, et les trois qu'un dossier neuf déclenche
  restent donc sans surface. C'est le manque que ce lot laisse ouvert ; il est
  nommé dans l'ADR-027 § « Ce que la décision ne tranche pas ».

Le bloc de bas de page qui explique tout cela au dirigeant est **dérivé des
compteurs**, jamais écrit en dur — l'écran Équipe a fait l'expérience inverse :
son paragraphe « ce qui n'est pas couvert » a menti pendant une journée en
énumérant comme absentes trois obligations affichées deux lignes plus haut.

---

## 7. Le ton

Le critère de réussite du brief n'est pas une liste d'affichage : qu'un dirigeant
de six personnes puisse dire vite ce qui est déjà vrai chez lui, et n'en sorte
pas coupable.

L'en-tête dit « une bonne partie est sans doute déjà vraie chez vous — de l'eau
au robinet, des toilettes, une affiche au mur ». Le bas de page dit « une ligne
non cochée n'est pas un manquement constaté : c'est une question à laquelle vous
n'avez pas encore répondu ».

**Le contre-test du brief — pourrait-il tout cocher sans rien avoir fait ?** Oui,
et c'est assumé : c'est ce que « déclaration » signifie. Ce qui empêche l'écran
d'être un formulaire de complaisance n'est pas un obstacle au clic, c'est que la
déclaration **ne rapporte rien** — elle n'allume aucun indicateur, n'entre dans
aucun export, ne fait progresser aucun pourcentage. Cocher à vide ne gagne rien
d'autre qu'une ligne grise et une date. Un dispositif qui récompenserait la coche
serait un formulaire de complaisance ; celui-ci n'a rien à donner.

---

## 8. Garanties éprouvées en réinjectant le défaut

| Garantie | Défaut injecté | Résultat |
|---|---|---|
| Pas de double surface | le critère ne lit plus que `nature` | **3 tests tombent**, dont celui qui nomme `porte-auto-portail-piete-coulissant` |
| Aucun dépôt sur l'écran | un `<input type="file">` dans `LigneEtat` | **tombe**, avec le nom du fichier fautif |
| La règle est partagée | le générateur réécrit sa propre condition, en y ajoutant `mise_en_service_uniquement` | **4 tests du générateur tombent** |
| La garde garde quelque chose | — | un témoin vérifie que `SURFACES_DE_DEPOT` n'est pas vide, sans quoi le balayage serait vert pour toujours |

Un cinquième test est tombé **sans qu'on le provoque**, pendant l'écriture :
« tout ce que le calendrier ne prend pas est nommé quelque part » a trouvé
`incendie-erp-5-visite-commission`. C'est l'exception voulue ; elle est désormais
nommée dans l'assertion plutôt que filtrée en amont, pour qu'une **seconde**
exception se voie.

---

## 9. Ce que je n'ai pas fait

- **Aucun contrôle visuel.** Je n'ai pas ouvert l'application. L'écran est écrit
  sur la charte board et sur le patron de liste (`equipements/page.tsx`), mais la
  vérification à 638 px — la largeur qui a tronqué un libellé en silence le
  2026-08-31 — reste à faire.
- **Aucune donnée d'illustration.** Les compteurs viennent tous du moteur ; il
  n'y a pas une date en dur sur cet écran.
- **Le Bistrot du Marché n'est pas exercé.** Mes mesures portent sur un dossier
  sans équipement. Un dossier avec parc fera apparaître les états permanents
  portés par un équipement — et c'est là que la garde de la double surface se
  joue vraiment, `porte-auto-portail-piete-coulissant` étant porté par un
  portail. Le test la couvre au niveau du référentiel ; l'écran, lui, n'a pas été
  vu sur ce dossier.
- **Les trois écarts de chiffres du message de délégation** (« trois affichées »,
  « quinze autres », « quatorze des quarante-trois ») ne sont pas repris : le
  brief fait foi, et mes propres mesures le confirment sur deux points et le
  corrigent sur deux autres (§ 4).

---

## 10. Après le contrôle visuel — trois retours, et un quatrième défaut trouvé en route

Le contrôle a validé les deux points que je lui avais signalés : le portail est
**au calendrier et absent de cet écran** (pas de double surface, sur le dossier
avec parc que je n'avais pas exercé), et le compteur n'absorbe rien — 0 sur 12
chez Atelier Vermeil, 0 sur 19 au Bistrot, une ligne « fait le » exclue de chaque
côté. Tout cocher est gratuit et **rien ne bouge ailleurs** : le « % prêt » de
Préparer un contrôle reste à 67 % avant comme après.

### a) La distinction de verbe ne se lisait pas — corrigée par le regroupement

Verdict du contrôle : « en l'état, c'est une note interne ». Deux lignes voisines
dans la même carte, **deux pastilles strictement identiques**, et la seule
différence dans les trois mots du bouton. Or l'écran demande qu'on clique vite —
et il a raison de le demander : le relecteur a coché douze lignes **en sept
secondes sans en lire une seule**. Dans ce geste, deux pastilles qui se
ressemblent sont la même action. Mon explication existait, mais en pied de page,
« là où l'on arrive après avoir tout coché ».

Ce qui a été fait : les lignes « fait le » sortent des cartes de domaine et
forment **leur propre section**, « Ce qui revient, sans rythme écrit », avec
l'explication **à côté d'elles** et non en bas.

Pourquoi le regroupement plutôt qu'une teinte ou une icône : une différence de
couleur seule est interdite par la charte et ne survit pas à un lecteur d'écran ;
une icône se décode, donc se lit. Un groupe se voit sans se lire, et il ne coûte
rien à la vitesse — à l'intérieur de chaque section, cliquer reste immédiat.

### b) Le tableau de bord contredisait l'écran — corrigé en rédaction

Le relecteur déclare le service de santé au travail « en place », et l'accueil
affiche toujours « **Aucun** service de prévention et de santé au travail
**déclaré** ». Les deux constats sont justes et différents — l'un parle de
l'annuaire des prestataires, l'autre de l'état déclaré — mais ils employaient
**le même verbe pour dire l'inverse**.

C'était la double surface que ce lot retirait, revenue par la rédaction. Le titre
dit maintenant « … **à votre annuaire** », et la raison est écrite dans
`prestataires/domaines.ts` pour que personne ne la reprenne.

### c) Deux fautes de texte, dont une d'assemblage — et une garde

« ce qui restera décochera » → « ce qui restera **décoché dira** ».

Et « Elles **n'entrepas** dans le compte », qui venait de
`{n === 1 ? "Elle n'entre" : "Elles n'entrent"} pas`. **Le défaut n'est pas
l'espace perdu, c'est la coupure** : couper une locution au milieu confie sa
cohésion à une règle de mise en page, et personne ne relit une phrase qui
n'existe nulle part en entier — ni un humain, qui ne voit que des fragments, ni
un test, qui ne lit pas du JSX.

Toutes les phrases qui s'accordent vivent donc dans `etats-permanents/phrases.ts`
et en sortent **complètes**. Deux gardes les tiennent :

1. **l'égalité exacte, branche par branche** — une première version cherchait les
   collages par expression régulière ; elle attrapait « n'entrepas » parce qu'on
   l'avait écrit en dur dans le motif, et laissait passer « lignereste ». Un
   collage entre deux mots minuscules n'est pas reconnaissable sans
   dictionnaire. L'égalité, si : quelqu'un écrit la phrase telle qu'elle doit se
   lire, et toute jonction manquée fait diverger la chaîne ;
2. **aucun ternaire de chaîne dans les `.tsx` de l'écran** — la règle
   structurelle, celle que le contrôle demandait : « si celle-ci est cassée, les
   autres peuvent l'être dans une branche non exercée ».

**La seconde garde a trouvé un quatrième défaut, que le contrôle n'avait pas
vu.** `LigneEtat` rendait `{verbe} {formaterDateFr(date)}`, où `verbe` sortait
d'un ternaire — le même montage, deux composants plus loin. Il n'avait pas encore
produit de collage visible ; il attendait son tour. Verbe, date et libellés de
bouton sortent maintenant entiers de `phrases.ts`.

Éprouvé en réinjectant le défaut : remettre le ternaire dans `LigneEtat` fait
tomber la garde avec le fichier et la ligne (`LigneEtat.tsx:54`).

**1824 tests verts** après correction.

---

## 11. Second passage du contrôle — la forme disait « encore un domaine »

Le contrôle garde la section : *« on ne peut plus atteindre le bouton sans avoir
l'explication au-dessus des yeux, et la ligne n'a plus de voisine "Déclarer en
place" à côté d'elle. »* C'est l'adossement de l'explication à la ligne, et c'est
ce que le repli — assumer que la distinction ne sert qu'au compteur — aurait fait
perdre.

**Ce qui n'allait pas était la forme du sur-titre, pas le regroupement.**
Je l'avais composé exactement comme un nom de domaine : mêmes petites capitales,
même graisse, même gris, même place en tête de carte. À l'œil qui parcourt,
« CE QUI REVIENT, SANS RYTHME ÉCRIT » occupait la place où l'on attend « PREMIERS
SECOURS ». Les mots différaient, la forme non — donc le groupe se lisait comme un
dixième domaine et non comme une autre nature de chose.

La correction vient du barème de la charte (§ 3), qui distingue deux **rôles** :

| Rôle | Motif |
|---|---|
| Sur-titre de section | `board-eyebrow text-[10.5px] tracking-[0.18em]` |
| Titre de section / carte | `board-titre m-0 text-[22px]` |

Un domaine porte un **sur-titre**, la section porte un **titre**. Ce n'est pas
une décoration mais une place dans la hiérarchie, et l'interdit 11 est respecté —
jamais deux niveaux de titrage dans une carte : la section porte un titre et
aucun sur-titre, les cartes de domaine l'inverse.

**Et c'est ce qui tient quand la section portera cinq lignes.** L'avertissement du
contrôle est juste : ce qui rend la section visible aujourd'hui est un
déséquilibre — trois lignes d'explication pour une ligne d'obligation — et il
disparaîtra tout seul dès qu'un dossier en portera quatre. Un titre reste un
titre quel que soit le nombre de lignes en dessous ; un sur-titre identique à
celui d'à côté ne l'aurait jamais été.

**Deux sur-titres étaient par ailleurs au mauvais barème** — 10 px / 0.16em,
c'est-à-dire le motif « sur-titre de LIGNE » employé pour coiffer des cartes.
Corrigés.

### Ce que la section ne fait pas, et qui est écrit dans le code

Elle **ne sauve pas des sept secondes** : celui qui déroule en cliquant cliquera
« Marquer comme fait » aussi vite qu'il cliquait « Déclarer en place ». Ce qu'elle
change, c'est qu'on ne peut plus atteindre ce bouton sans avoir l'explication
au-dessus des yeux, et que les deux verbes ne se touchent plus. **Elle aide celui
qui s'arrête** ; la version d'avant n'aidait personne. C'est un progrès réel et
incomplet — le dire vaut mieux que de laisser croire la distinction résolue. La
phrase est aussi dans l'en-tête de `page.tsx`, là où le prochain lecteur du code
la trouvera.

### Ce que je n'ai pas gardé sous test, et pourquoi

La distinction des deux rôles typographiques **n'a pas de garde automatique**.
J'ai envisagé un test comparant les chaînes de classes des deux titres — il
attraperait une réunification future —, et je l'ai écarté : un test qui compare
du CSS casse pour de mauvaises raisons à chaque refonte et finit par être
neutralisé plutôt que lu. L'autorité ici est le barème de `docs/charte-board.md`,
et le commentaire du composant cite le défaut qu'il corrige. C'est moins solide
qu'un test, et c'est dit plutôt que masqué.
