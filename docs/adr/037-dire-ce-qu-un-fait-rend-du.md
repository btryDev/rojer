# ADR-037 — Dire ce qu'un fait rend dû, sans jamais le dater

- **Statut** : **PROPOSÉE le 2026-09-20, CODÉE SUR SA BRANCHE le 2026-09-21**
  (`lot/surface-evenementiel`) pour être jugée sur pièce — non fusionnée, et les
  quatre questions du § 7 restent à la propriétaire. ~~Rien n'est codé.~~
  Deux écarts à ce texte, écrits au § 8. Quatre questions
  attendent la propriétaire (§ 7) ; les recommandations y sont écrites, et
  l'ADR se lit « acceptée telle que recommandée » si elle les retient toutes.
- **Amende** : l'ADR-022 (qui nomme l'axe « événement » sans mécanisme) et
  l'ADR-026 (qui pose les natures `evenementielle` et `ponctuelle` sans leur
  donner d'écran). **Ne renverse rien** : il n'y a toujours pas de sixième
  déclencheur.
- **Portée prévue** : `src/lib/etats-permanents/regle.ts` (un prédicat),
  `src/lib/surfaces/obligations-sans-surface.ts` (une troisième surface),
  un module et une page neufs, `conformite/types.ts` (un champ).

## 1. Le problème, mesuré

Le registre de dette du 2026-09-20 (`docs/chantiers-ouverts.md` § 3 bis,
`corpus/registre-dette.test.ts`) classe les soixante-cinq obligations lues et
non portées. **Neuf des cinquante qui touchent la cible ont la même cause**,
`evenement` : le texte les déclenche sur un fait que le produit n'observe pas.
C'est la cause la plus lourde du registre, sans en être la moitié.

| Article | Le fait | Ce qui est dû |
|---|---|---|
| `R. 4624-31` | un salarié reprend après un arrêt | saisir le service de santé au travail, examen sous huit jours |
| `R. 4624-28-2` | fin d'exposition, départ ou retraite d'un salarié en suivi renforcé | en informer le service de santé, puis l'intéressé |
| `R. 4141-8` | accident grave, ou accidents répétés à un poste | refaire la formation à la sécurité |
| `R. 4141-12` | modification des conditions de circulation | former de nouveau |
| `R. 4121-2` | décision d'aménagement important, information nouvelle | mettre à jour le document unique |
| `L. 8222-5` | signalement écrit d'une irrégularité d'un sous-traitant | l'enjoindre aussitôt de la faire cesser |
| `R. 4463-4` | épisode de chaleur intense | eau fraîche en quantité suffisante, tenue au frais |
| `R. 4463-5` | un travailleur signalé vulnérable à la chaleur | adapter les mesures, avec le service de santé |
| `R. 4463-7` | épisode de chaleur intense | mettre en œuvre les mesures définies |

**Deux lignes ont quitté ce tableau à la contre-lecture du registre**, et la
raison vaut d'être gardée : la transmission du document unique à chaque mise à
jour (`L. 4121-3-1` VI) et l'information de l'inspection à l'ouverture de
travaux (`R. 4512-12`) se déclenchent sur un fait que l'OUTIL CONNAÎT — la
validation d'une version, la date de début d'un plan. Ce ne sont pas des
événements inobservables mais des manques de module : cette page ne les sert
pas, et les y ranger aurait caché un travail à faire ailleurs.

Et le référentiel porte DÉJÀ des obligations de cette nature que personne ne
voit : `SANS_SURFACE` en inscrit neuf, avec ce motif répété — « aucune surface
ne sert les obligations événementielles ». Trois sont portées par
l'établissement (`formation-securite-etablissement-information`,
`-travail-sur-ecran`, `co-activite-etablissement-protocole-securite`).

**Ce qui bloque n'est pas le modèle, c'est une confusion.** Chaque motif écrit
« le produit n'observe pas le fait, donc il ne peut pas la dater » — et s'arrête
là, comme si ne pas pouvoir DATER interdisait de DIRE. Un dirigeant qui ignore
qu'une reprise après un long arrêt l'oblige à saisir son service de santé ne
l'apprendra pas d'un calendrier ; il peut l'apprendre d'une page.

## 2. Ce qui existe déjà, et qu'on étend

Le patron est livré, pour deux porteurs sur trois.
`estDeclencheeParUnFait` (`etats-permanents/regle.ts`) dit :
`nature === "evenementielle"` et aucun rendez-vous. La fiche d'un SALARIÉ
(`salaries/obligations-evenementielles.ts`) et celle d'un ÉQUIPEMENT
(`equipements/fiche.ts`) montrent ces obligations « sur la fiche de leur
sujet », avec cette règle écrite en tête : **pas de date, pas d'état, pas de
retard**.

Le troisième porteur n'a pas de fiche. L'établissement EST le dossier : ses
obligations événementielles n'ont nulle part où se montrer.

## 3. Décision

**Une page, « Quand ça arrive », qui est la fiche du troisième porteur.**

1. **Ce qu'elle liste.** Les obligations portées par l'établissement, applicables
   à CE dossier (passées par `determineObligationsApplicables`, comme tout le
   reste), et déclenchées par un fait (`estDeclencheeParUnFait`). Rien d'autre :
   les événementielles d'un salarié ou d'un appareil restent sur leur fiche.
2. **Ce qu'une ligne dit.** Le fait, dans les mots du texte ; ce qui est dû ; le
   délai quand le texte en écrit un (« au plus tard huit jours ») ; l'article.
   Groupées par domaine, comme « Ce qui doit être en place ».
3. **Ce qu'une ligne ne porte JAMAIS.** Ni date, ni état, ni case, ni compteur,
   ni retard. Elle n'entre ni dans le score, ni dans le tableau de bord, ni dans
   les sorties remises à un tiers comme un élément d'état. Une obligation
   événementielle redevient due au fait suivant : toute case cochée mentirait
   le lendemain (c'est l'argument de `regle.ts`, il vaut ici tel quel).
4. **Un champ neuf au référentiel : `faitGenerateur`.** Requis quand la nature
   est `evenementielle`, interdit sinon — union discriminée, comme `porteur`.
   C'est la phrase « quand… » de la ligne ; aujourd'hui elle n'existe que noyée
   dans `description`. Elle n'entre pas dans `empreinteReferentiel()` : elle ne
   change ni le nombre de lignes de calendrier ni leurs dates.
5. **`surfacesDe` apprend une troisième surface, `faits`**, dérivée de la même
   règle que la page appelle. Conséquence mécanique : les trois inscriptions
   d'établissement quittent `SANS_SURFACE`, et les trois événementielles de
   salarié et d'équipement aussi — elles ONT une surface depuis leur fiche, que
   ce module ne savait pas compter. Le plafond descend de 9 à 3.

## 4. Ce que la décision n'est pas

- **Pas un sixième déclencheur.** `CLAUDE.md` l'écrit : un fait DATE une
  obligation, il ne la fait pas naître. L'applicabilité reste décidée par les
  cinq déclencheurs ; la page ne fait que présenter autrement une nature.
- **Pas un journal d'événements.** Le dirigeant ne « déclare » pas qu'un
  salarié a repris. Consigner des faits datés, leur rattacher une action et la
  suivre, c'est le module Interventions que l'ADR-018 a retiré — et pour un
  arrêt de travail, c'est une donnée que `docs/rgpd.md` interdit de détenir.
- **Pas une notification.** Hors périmètre, et sans objet : le produit ne sait
  pas que le fait est survenu.
- **Pas une promesse de conformité.** La page dit la règle. Elle ne dit jamais
  que rien n'est dû en ce moment.

## 5. Ce que cela débloque

- Les **neuf manquantes** du § 1 deviennent encodables, en `evenementielle` /
  `autre`, porteur établissement — chacune après relecture de son article sur
  sa page propre. `R. 4624-31` et `R. 4624-28-2` visent un fait qui concerne UNE
  personne ; elles se portent pourtant sur l'établissement, parce que la règle
  est la même pour tous et que la fiche d'un salarié ne doit rien laisser
  deviner d'un arrêt (même raisonnement que `R. 4463-5` au corpus).
- `cause: "evenement"` tombe de neuf à zéro pour la cible, et le registre le
  montrera sans qu'on y touche.

## 6. Coût et risque

Aucune migration, aucune donnée nouvelle en base, aucune écriture : la page est
une lecture du référentiel filtrée par le moteur. Le risque est éditorial —
neuf phrases « quand… » à écrire dans les mots des textes, sans ajouter ni
qualifier. C'est le même risque que partout ailleurs dans le référentiel, et les
mêmes gardes le tiennent (`citations-ecran`, contre-lecture par lot).

Le champ `faitGenerateur` n'entre pas dans l'empreinte ; **l'encodage des neuf
obligations, lui, change le référentiel**, donc le sceau : une régénération des
calendriers à l'ouverture, sans qu'aucune échéance ne bouge.

## 7. Quatre questions à la propriétaire

| # | Question | Recommandation |
|---|---|---|
| **Q1** | Où vit la page ? | Sous **« À faire »**, quatrième entrée du panneau, après « Ce qui doit être en place ». Elle répond à « qu'est-ce que je dois faire » — à une condition près. Pas sous « Comprendre » : ce n'est pas de la lecture générale, la liste dépend du dossier. |
| **Q2** | Les obligations **ponctuelles** (dues une fois : la qualification ICPE avant exploitation) y vont-elles ? | **Non, pas dans ce lot.** Une ponctuelle se SOLDE : elle appelle un « fait le », donc une déclaration au sens de l'ADR-027 — un autre mécanisme. Trois inscriptions restent à `SANS_SURFACE`, nommées. |
| **Q3** | Le dirigeant peut-il noter qu'un fait est survenu ? | **Non.** Voir § 4. Si le besoin se confirme, il se discutera contre l'ADR-018, pas en passant. |
| **Q4** | Encoder les neuf dans le même lot que la page, ou après ? | **Après, en un lot à part.** La page se livre sur les trois obligations déjà au référentiel : elle se juge à l'écran avant qu'on y verse neuf lignes. |

## 8. Ce que le code a fait autrement, et pourquoi (2026-09-21)

- **`faitGenerateur` n'est pas une union discriminée sur la nature** (§ 3, point
  4). `Obligation` en est déjà une sur `porteur` ; les croiser doublait chaque
  branche du type. Le champ est facultatif au type, et
  `quand-ca-arrive/lignes.test.ts` tient la règle dans ses deux sens : toute
  obligation que la page peut présenter porte son fait ; aucun fait n'est posé
  hors de la nature `evenementielle`.
- **Une dette a failli partir avec une inscription.** `SANS_SURFACE` disait du
  protocole de sécurité qu'un SECOND régime (`R. 4515-9`, opérations
  répétitives, état permanent) n'était encodé nulle part. L'obligation ayant
  désormais une surface, l'inscription tombe — mais pas le manque : il est
  devenu une `reserve` du corpus, donc toujours compté.
- ~~**Une contre-épreuve ne rougit pas, et c'est un mutant équivalent.**~~
  **C'ÉTAIT UN TROU DE TEST, et cette puce affirmait le contraire.** Retirer le
  filtre `releveDeLaPage` de la boucle laissait la suite verte, et j'avais écrit
  que le test de porteur « tient alors, et il rougit bien ». La contre-lecture a
  fait l'épreuve : filtre retiré, `faitGenerateur` posé en mémoire sur
  `froid-controle-etancheite-apres-modification`, neuf tests verts et une ligne
  d'APPAREIL sur la page. Le test n'éprouvait que la fonction, jamais que la
  boucle l'appelle ; et tous les tests de liste passaient `[]` comme parc. La
  boucle est sortie dans `lignesDepuis`, à qui le test passe une obligation
  d'appareil fabriquée, portant un fait : elle rougit.
- **Le délai n'a pas de champ, et il n'en aura pas.** Le § 3 (point 2) promettait
  « le délai quand le texte en écrit un », en pensant aux « huit jours » de
  `R. 4624-31`. Relu à la source le 2026-09-21 : ces huit jours s'attachent à
  l'ORGANISATION de l'examen par le service de santé au travail ; le seul terme
  de la saisine, qui est l'acte de l'employeur, est « dès que ». Un champ
  « sous 8 jours » aurait dit au dirigeant ce que le texte ne dit pas. La
  description porte la phrase entière ; c'est elle qui fait foi.
- **Huit obligations de plus sur la page le 2026-09-21** : les trois de la
  chaleur intense, puis cinq relues à la source (`R. 4624-31`, `R. 4624-28-2`,
  `R. 4141-8`, `R. 4141-12`, `R. 4121-2` 2° et 3°). `L. 8222-5` n'y est PAS :
  elle attend la décision sur le module de vigilance. La question Q4 (« la page
  d'abord, les obligations ensuite ») est donc dépassée par les faits — la page
  n'est pas déployée, et la propriétaire la jugera avec ses onze lignes.
- **Les chiffres du § 1 sont ceux du 2026-09-20.** Au 2026-09-21 le registre
  compte 65 manquantes dont 50 dans la cible (− `R. 4222-21`, − `PE 27`,
  + `R. 4224-3`) ; `evenement` y pèse toujours neuf.
- **La page dit où vivent les AUTRES événementielles.** Celles d'une personne et
  d'un appareil se lisent sur leur fiche ; le chapeau et l'état vide le disent,
  faute de quoi un dossier sans employeur mais avec une chambre froide lisait
  « rien de cette nature » alors que sa fiche d'appareil en porte une. Le renvoi
  vers « Ce que Rojer ne couvre pas » est retiré : cette page-là ne dit rien des
  obligations événementielles non portées.
