# Chantiers ouverts

**Arrêté au 2026-09-02**, au sortir de la journée qui a fermé le référentiel :
trois trous du guide professionnel comblés, le Code cartographié, et trois
cliquets à zéro.

Ce document est la **liste de ce qui reste**, pas un rapport. Chaque entrée dit
ce qu'il y a à faire, pourquoi, et ce qui la bloque quand quelque chose la
bloque. Une entrée sans blocage nommé est prête à être prise.

Il existe parce que la liste vivait dans des messages de commit, des rapports
d'agent et une conversation — trois endroits qu'on ne rouvre pas. Voir aussi
`docs/dette-chantier-porteur-echeance.md`, borné au chantier du 2026-08-27, et
`docs/journal-des-verifications.md` pour l'état des relectures.

---

## 1. Ce qui reste du champ de R. 4227-34 — `manipuleMatieresR422722`

**Le gros de l'entrée est fait, le 2026-09-03.** La question « personnes
habituellement présentes » n'est pas revenue au parcours, le repli a changé de
sens et le bandeau a quitté le calendrier. Ce que le moteur fait désormais est
écrit dans `evaluerPersonnesPresentes` (`src/lib/matching/engine.ts`) et dans
l'ADR-022 § 7 : borne basse par la catégorie d'ERP puis par l'effectif salarié,
« à confirmer » sous la borne pour qui reçoit du public, rejet pour
l'établissement de travail seul où l'effectif EST le total. L'axe `public_recu`
de la couverture est parti avec sa cause, et `matching/public-recu.ts` avec lui.

**Ce qui reste est le second attribut**, que l'ADR-022 recensait avec le
premier : `manipuleMatieresR422722` absent est lu « non ». Il ne retire rien
aujourd'hui — sa branche n'ajoute des cas qu'à un champ déjà ouvert par le seuil
de personnes présentes. Il en retirerait le jour où une obligation s'appuierait
sur cette branche seule, et le corpus dit lequel :
`code-travail-matieres-inflammables.ts` a relevé le 2026-09-02 que `R. 4227-22`
oblige sans condition d'effectif ni d'équipement, qu'il vise « entreposées OU
manipulées » là où l'attribut ne demande que la manipulation, et que deux états
permanents en découlent que le référentiel ne porte pas.

**Ce qui le bloque** : rien de technique. C'est une décision sur le champ de la
question posée au dirigeant — l'élargir à l'entreposage ferait entrer dans les
obligations de `R. 4227-34` des établissements que ce texte-là ne vise pas.

## 2. La date de remise de l'attestation de vigilance

**Recommandé par le lot du 2026-09-02, non fait** : c'est un champ, donc une
migration.

`opposabiliteUrssaf()` compte les six mois de `D. 8222-5` depuis
`prestataire.updatedAt`. Ce n'est pas un décalage borné, c'est **une remise à
zéro à chaque écriture** : la fiche d'un prestataire actif est retouchée plus
souvent que tous les six mois, donc la borne n'arrive jamais. L'écran reste vert
indéfiniment, et rien dans le calcul ne peut le rattraper.

Depuis le 2026-09-02, l'écran **le dit** — c'est le palliatif, pas le remède.

La même migration servirait la seconde exigence de `D. 8222-5`, aujourd'hui
impossible à porter : l'attestation doit **dater de moins de six mois** à la
remise, et le produit ne stocke qu'une fin de validité, jamais une date
d'émission. Un `DateTime?` nullable suffit, la borne actuelle servant de repli
tant qu'il est vide.

**À trancher avec** : est-ce la date de remise ou la date d'émission qui pilote
quoi. Les deux sont exigées et ne servent pas la même règle.

---

## 3. Deux obligations que rien ne bloquait — CLOS LE 2026-09-04

Les deux sont encodées. Ce paragraphe reste, avec sa date, parce que la leçon
qu'il porte ne se lit pas dans le diff : **une entrée `obligation_manquante` qui
écrit elle-même que rien ne la bloque n'attend pas un ADR, elle attend une
heure de travail.** Les deux motifs le disaient depuis deux jours, mot pour mot.

- **`R. 4223-11`** — l'employeur *fixe les règles d'entretien périodique* du
  matériel d'éclairage, consignées dans un document communiqué au CSE. Jumeau
  exact de `R. 4222-21`, et `R. 4224-17` — déjà au corpus — **agrège nommément
  les deux documents** alors que sa réserve n'en relevait qu'un. Dépouillé le
  2026-09-02. **Encodé le 2026-09-04** :
  `eclairage-etablissement-regles-entretien`, porteur établissement,
  `etat_permanent`, `pieceAttendue` nommée. Il a fallu un domaine neuf —
  `eclairage` —, le référentiel n'en ayant aucun pour l'éclairage ORDINAIRE.
  La réserve sur le CSE est tranchée dans le sens littéral : l'article fait deux
  phrases, seule la seconde suppose l'instance, donc aucun `effectifMin`.
  **La réserve de `R. 4224-17` est corrigée du même mouvement.**
- **`R. 4323-24`** — la liste des personnes qualifiées, tenue à la disposition de
  l'inspection du travail. Vaut pour tout employeur détenant un équipement soumis
  à vérification générale périodique, et le lot « compacteur » du 2026-09-02 a
  **augmenté le parc concerné sans la traiter**. **Encodée le 2026-09-04** :
  `prevention-etablissement-liste-personnes-qualifiees`, porteur établissement,
  `etat_permanent`, dans le domaine `organisation_prevention` et non `levage` —
  la liste est UNE pour tout l'établissement et couvre toutes les vérifications
  générales périodiques du parc. Sur-application nommée : un établissement sans
  aucun équipement soumis à VGP reçoit la case, le porteur établissement ne
  sachant pas poser cette condition.

**Ce qui reste, et qui est de la même espèce.** Trois écrits que le modèle sait
porter et que personne ne réclame, chacun en réserve au corpus sous son
article : la **consigne d'utilisation de la ventilation** (`R. 4222-21`, jumelle
de celle de l'éclairage, toujours `obligation_manquante`), le **livret
d'entretien de l'installation de filtration** (`CH 39 § 1`), et le **stock
permanent de fournitures de rechange de l'alarme** (`MS 69`).

---

## 4. Ce qui attend une décision, pas un développement

**La vigilance prestataires est dans le périmètre servi et hors du périmètre
déclaré.** Le chapitre est en huitième partie — travail illégal, pas
santé-sécurité — et `CLAUDE.md` écarte le « RH non-SST ». Mais le produit a un
module entier et vingt citations dessus. Deux issues : l'assumer, ou déclarer le
**module** hors référentiel comme le plan de prévention l'est déjà. Ne pas
choisir « ne pas lire les articles ».

**Blocage technique pour cette décision** : `EXCLUSIONS` (`corpus/perimetre.ts`)
est un ensemble fermé de quatre motifs, et **aucun ne dit « RH non-SST »**.
`L. 8221-5` a dû être classé `sans_objet`, qui dit autre chose. Son commentaire
prévoit qu'une exclusion « se discute et s'ajoute là ».

~~**Le type ERP `J` n'existe pas dans l'enum**, et `R` n'est pas subdivisé en
`R(1)` / `R(2)`. Un EHPAD ne peut pas se déclarer pour ce qu'il est.~~ Origine
établie : la liste d'`ADR-004` a été écrite une fois avec la mention « ~20
valeurs » et jamais reconfrontée à la nomenclature.

> **`J` EST FAIT DEPUIS LE 2026-09-03** (`4467e79`, migration
> `20260903120000_type_erp_structures_accueil`, `ADD VALUE IF NOT EXISTS 'J'
> BEFORE 'PA'`). Un EHPAD peut se déclarer pour ce qu'il est. Les quatre copies
> sont alignées — `enum TypeErp`, `TYPES_ERP`, `TYPE_ERP`, `LABEL_TYPE_ERP` —,
> `GN 1` est dépouillé au corpus, et `types-erp.test.ts` **dérive** sa liste
> attendue du verbatim au lieu de la recopier : la cause est traitée, pas le
> symptôme.
>
> **Cette ligne a été lue comme ouverte le 2026-09-08**, quatre jours après sa
> correction, et rendue telle quelle à la propriétaire — deux fois. Troisième
> occurrence de la même faute cette semaine, après le § 5 et le § 7. Une liste
> qu'on ne raye pas fait refaire le travail ; ici elle a fait *rapporter* un
> défaut qui n'existait plus.

**`R` RESTE NON SUBDIVISÉ, ET LA LETTRE LE VEUT.** `GN 1 § 1` n'écrit qu'un seul
`R` ; les deux colonnes de `GE 4` sont deux régimes d'une même ligne, séparés par
l'hébergement (`GN 1 § 4`). L'encodage actuel met tout `R` de 4ᵉ catégorie à
trois ans (`incendie.ts`, `incendie-erp-visite-commission-cat4-triennale`), là où
le tableau met `R` sans hébergement à cinq : **sur-application assumée, du côté
court, seule des six colonnes.**

**Ce qui a changé sans que la note le sache, et c'est le point à trancher.** La
`notesInternes` de cette ligne dit que le manque à combler « n'existe pas » et
que le poser serait une migration. **Il existe depuis le 2026-09-01** :
`Etablissement.comporteLocauxSommeilPublic`, dont le libellé — « pour le public,
des locaux à sommeil : chambres d'hôtel, chambres d'hôtes, hébergement » — est la
définition même du § 4 de `GN 1`. Et le critère existe côté obligation
(`TypologieApplication.locauxSommeilPublic`), avec exactement les deux
sémantiques qu'il faut : critère vrai et attribut non renseigné ⇒ obligation
**retenue « à confirmer »** ; critère faux et attribut non renseigné ⇒
allègement **refusé**.

La partition est donc expressible **sans inventer de type ni migrer**, en
scindant la ligne triennale : `R` avec locaux à sommeil déclarés ⇒ trois ans (un
`R` non renseigné y reste, par la première sémantique) ; `R` sans ⇒ cinq ans
(l'allègement n'arrive que déclaré, par la seconde). Les autres colonnes de la
ligne — `J`, `O`, `U` — doivent alors sortir sur une ligne sans critère de
sommeil, sans quoi il les contraindrait aussi.

**À vérifier avant d'encoder** : l'attribut n'apparaît qu'au formulaire de
modification. Rien n'établit que le parcours d'accueil pose la question, donc
qu'un `R` puisse y répondre. Un allègement qui ne se déclenche que sur un écran
que personne n'ouvre est un allègement qui n'existe pas.

**Les `obligation_manquante` du corpus ne sont pas une liste de tâches.** La
plupart demandent un attribut de modèle, et dans le cadre arrêté le 2026-09-02
elles se **déclarent**, elles ne s'encodent pas.

---

## 5. Ce qu'aucun test ne comblera

**La vérification visuelle.** Cinquante-cinq commits ont touché `src/app` et
`src/components` depuis le 2026-08-31, dont une quinzaine de corrections
d'interface et de charte que personne n'a regardées à l'écran.

**Le blocage est levé depuis le 2026-09-03.** `scripts/seed-dossier-complet.ts`
(`pnpm seed:complet --user <uuid>`) **crée** un dossier de bout en bout sur une
base vide et migrée, là où les trois seeds précédents ne savaient que **remplir**
un dossier existant — et où `seed-demo.ts` codait en dur deux `cuid` d'une seule
machine. C'était la cause, mesurée, de ce que le contrôle visuel n'ait jamais pu
se faire ailleurs.

Le dossier semé porte 3 zones, 10 équipements sur 8 domaines, 5 salariés et
7 titres, un DUERP validé, 3 prestataires aux attestations échelonnées, permis de
feu, plan de prévention, carnet sanitaire, accessibilité publiée, 36 échéances
dont 6 en retard, et 28 actions. La prescription d'assureur y tombe **seule à
J+160** — sa voisine à 48 jours, au-dessus du seuil de regroupement de la frise —
pour que la pastille de l'ADR-032 soit jugeable, ce qu'elle n'était pas le
2026-09-02.

**Le calendrier semé est un point fixe de sa propre régénération**, vérifié à
blanc : `0 à créer · 0 à modifier · 0 à supprimer · 36 inchangées`. Ouvrir
`/calendrier` ne le déplace donc pas — ce qui est ce qu'il faut, l'ouverture de
cet écran écrivant (§ 7).

~~**Ce qui reste** : la passe elle-même, sur les sept écrans que personne n'a
jamais pu regarder avec des données — `/equipe`, `/duerp`, `/permis-feu`,
`/plan-prevention`, `/carnet-sanitaire`, `/accessibilite`, `/plan-actions`.~~

> ~~**À JOUR AU 2026-09-07 : il en reste trois** — `/permis-feu`,
> `/plan-prevention`, `/carnet-sanitaire`.~~ **IL N'EN RESTE AUCUN.** Les trois
> derniers ont été ouverts avec des données le 2026-09-07 même, sur le dossier
> semé `cmtko3ynv0002circ3350z6v0`, session ouverte par la propriétaire ; les
> quatre autres l'avaient été les 09-04 à 09-06 (détail au § 7). Le relevé
> intégral est dans `docs/revues/journal-controle-visuel-2026-09-07.md`, ce
> qu'il a rendu est au § 6 bis.
>
> **Cette ligne a fait commander deux fois la même lecture** : une session s'est
> appuyée dessus pour redemander les sept, cinq jours après que quatre eurent
> été faits. Une liste de « ce qui reste » qu'on ne raye pas devient une liste
> de ce qu'on refera — d'où la rature ci-dessus plutôt qu'une réécriture.

Deux choses ne seront pas jugeables et ce n'est pas un défaut : les rapports de
vérification, signatures et jetons d'accès ne sont pas semés — ils exigent un
fichier réellement stocké, et en fabriquer produirait des entrées de registre
pointant vers un fichier absent ; et les déclarations d'états permanents non plus,
l'ADR-027 disant qu'une déclaration se coche et ne se sème pas.

## 6. Plus petit, mais mesuré

- **30 URL de section** au lieu d'URL d'article au corpus, sous cliquet
  (`PLAFOND_URLS_DE_SECTION`), aucune corrigée.
- ~~**`R. 4512-8`** — le contenu minimal du plan de prévention compte cinq
  rubriques, le produit n'en porte qu'une. Ni premiers secours, ni instructions
  aux travailleurs, ni organisation du commandement — alors que Rojer **émet** le
  document. Le corpus dit que ce n'est « qu'un formulaire à quatre champs près ».~~

  > **CORRIGÉ LE 2026-09-07** — les cinq rubriques sont au modèle, au formulaire,
  > à la fiche et au ZIP de contrôle. `PhaseDangereuse` porte le 1° (une relation :
  > le texte apparie les phases « ET les moyens de prévention spécifiques
  > **correspondants** »), quatre colonnes de texte portent les 2° à 5°. Migration
  > additive `20260907120000_plan_prevention_contenu_r4512_8`, liste et formatage
  > partagés dans `src/lib/plan-prevention/contenu-r4512-8.ts`, corpus repassé de
  > `obligation_manquante` à `sans_objet`.
  >
  > **Le compte était de quatre, il est de cinq**, et c'est une décision et non
  > une correction de calcul : les lignes risque ↔ mesures transcrivent le second
  > alinéa de `R. 4512-6` — l'**interférence** entre deux activités —, pas les
  > « phases d'activité dangereuses » de l'opération, qui existent sans
  > co-activité. Les tenir pour le 1° aurait fait porter à une rubrique le
  > contenu d'une autre.
  >
  > **Ce qui n'est pas fait, et qui ne se déduit pas de cette ligne** : rien
  > n'est bloquant. Une rubrique vide est *nommée* — la fiche la compte et cite
  > son alinéa, le ZIP écrit « NON RENSEIGNÉE » — mais aucune garde n'empêche
  > d'enregistrer ni de clore un plan vide, faute de porte de validation sur les
  > plans (§ 6 bis, états morts). Et le 4° ne se pré-remplit pas : aucun champ
  > d'`Etablissement` ne décrit le dispositif de secours, `R. 4224-16` est
  > détenu par le dirigeant et pas par la base.
- **Le seuil des 400 heures ne se recalcule pas en cours d'exécution**, alors que
  `R. 4512-7` le déclenche « dès lors qu'il apparaît » qu'elles seront atteintes.
  Depuis le 2026-09-02, l'aide de saisie le dit au dirigeant ; le module ne le
  fait toujours pas.
- **Comptes de test en production — à la main de la propriétaire, pas à
  supprimer d'office.** `contact+controle-pr10@btry.fr` et « Bistrot de la
  Verification SARL » (`cmtj4wq7y0002cigd4zauyfmw`) sont **gardés
  volontairement** ; ils ont servi au contrôle visuel du 2026-09-02 et le
  dossier a reçu une régénération de calendrier depuis. Une première version de
  cette liste les rangeait « à supprimer » : c'était une décision prise à la
  place de la propriétaire.

  S'y ajoute `controle-visuel-seed@btry.fr` (uuid
  `e2d350b2-534b-4500-8cc0-550d8e579047`), **créé par erreur** le 2026-09-03 par
  le lot du seed, sur le projet Supabase de production. Non confirmé, jamais
  utilisé. La cause est un défaut de brief : la session distante avait
  l'interdiction écrite de toucher la prod, ce lot-là ne l'avait pas — on lui
  demandait de traiter la question de l'authentification sans lui dire où il
  n'avait pas le droit de la traiter. **Tout lot qui approche l'auth doit porter
  cette interdiction explicitement**, l'auth vivant chez Supabase et non en base
  (ADR-005) : un `.env` qui pointe une base locale peut parfaitement écrire dans
  l'auth de production.

---

## 6 bis. Ce que la passe du 2026-09-07 a rendu — six constats, un corrigé

Relevés à l'écran sur `/permis-feu`, `/plan-prevention` et `/carnet-sanitaire`,
les trois derniers écrans jamais ouverts avec des données (§ 5). Le journal
complet, avec ce qui s'affichait et où, est dans
`docs/revues/journal-controle-visuel-2026-09-07.md` ; ce qui suit est la part
qui reste à faire. **Ils sont ici et pas seulement dans le journal parce qu'un
constat qui ne rejoint pas cette liste se perd** — c'est la leçon du § 7.

- ~~**`/plan-prevention` énonçait un fondement faux** : « seuil des 400 h
  franchi » sous « Durée estimée · 22 h », la note étant tirée de
  `ecritObligatoire` (le OU des deux branches de `R. 4512-7`) au lieu de
  `seuil400`.~~ **CORRIGÉ le 2026-09-07** (`0fe6643`) : `seuil400` exposé à part
  dans `schema.ts`, et la raison affichée depuis `raisons[]`, qui la calculait
  déjà. Trois cas de test, éprouvés en réinjectant le défaut.

- **La carte « Cycle de vie » n'offre que la suppression**, sur les deux fiches.
  L'énumération compte six états, la carte en sert trois : le plan en
  `inspection_faite` et le permis en `attente_signatures` à 0 signature n'ont
  sous ce titre qu'un bouton **Supprimer**. La condition
  `signatures.length >= 2` est juste, mais rien ne dit ce qui débloque — alors
  que la branche `en_cours` du permis, elle, explique son attente. Un titre qui
  promet un cycle et ne propose que le geste destructif.
  (`plan-prevention/[planId]/page.tsx:236`, `permis-feu/[permisFeuId]/page.tsx:266`)

- **Le carnet sanitaire affiche du vert sur une donnée de 34 jours** : « Dans la
  plage » et « 100% dans la plage » sur un relevé du 4 août, sans que rien ne
  dise quand le suivant est dû ni que le suivi a cessé. Le vert porte sur la
  dernière valeur mesurée, il se lit comme un état courant. Même famille que
  « À jour sur une zone à zéro équipement », corrigé le 2026-09-04 — et cette
  famille-là a déjà sa forme de correction : trois états fermés dont un
  `sansObjet` évalué avant tout comptage (`lib/batiments/etat-charge.ts`).

- **Trois écritures d'une même unité sur une seule carte** (`/carnet-sanitaire`,
  « Retour de boucle ») : `SEUIL MIN 50°C`, la valeur `55.0°`, l'axe
  `60°/50°/45°`, et `100%` sans espace. Le français écrit « 55,0 °C » et
  « 100 % » — et le produit écrit « 5 % » et « 80 % » ailleurs : la convention
  existe, elle n'est pas tenue ici.

- **La même statistique écrite de deux façons** : « 80 % des incendies »
  (`permis-feu/page.tsx:120`) contre « 80% des incendies »
  (`lib/permis-feu/referentiel.ts:140`).

- **Deux idiomes de navigation pour trois registres frères** : retour
  (« ← LE COMPTOIR DES HALLES ») sur `/permis-feu` et `/plan-prevention`, fil
  d'Ariane sur `/carnet-sanitaire`. L'ADR-014 sépare les deux assertions ; ici
  elles désignent la même relation.

- ~~**`SupprimerEtablissementButton` n'est monté sur aucun écran**, donc il
  n'existe aucun endroit d'où supprimer un établissement.~~ **RÉSOLU le
  2026-09-04 par `94e2f78`**, le commit qui répondait aux quatre constats de la
  passe précédente — celui-ci en était un. Le bouton est monté sur
  `/etablissements/[id]/modifier` (`page.tsx:7` et `:100`) ; à `7985c09`
  (09-04 12:39) le fichier existait sans le monter, à `94e2f78` (09-04 15:00) il
  le monte.

  **Il a pourtant été resservi au présent le 2026-09-07**, comme « toujours
  consigné nulle part », par la session qui l'avait relevé — un constat daté,
  rendu sans être rouvert sur `main`. Une première rédaction de cette liste l'a
  alors classé « réfuté », ce qui est le second mauvais mot : le contrôle ne
  s'était pas trompé, et quelque chose avait bien été fait. **Une liste qu'on ne
  raye pas fait refaire le travail ; une liste qu'on raye du mauvais mot en fait
  perdre la trace.** D'où la rature et la date, ici, plutôt qu'un retrait.

**Ce que la passe a confirmé sans le corriger** : le contenu minimal de
`R. 4512-8` (§ 6) passe de « mesuré » à « constaté à l'écran » — la fiche d'un
plan porte la nature des travaux, l'inspection commune, les risques
d'interférence et les signatures, mais ni premiers secours, ni instructions aux
travailleurs, ni organisation du commandement. Et Rojer émet le document.

> **Corrigé le jour même**, quelques heures après ce constat : voir la rature du
> § 6. Le constat visuel est ce qui l'a fait décider — il avait été *mesuré* le
> 2026-09-02 et n'avait bougé personne pendant cinq jours.

**Ce qui est bon et mérite d'être dit** : la check-list INRS ED 6030 du permis
(14 points, trois groupes, « 1 obligatoire non cochée » en rouge), le tableau
risque ↔ mesure en vis-à-vis des deux entreprises du plan de prévention, et les
graphiques du carnet avec leur bande rouge sous le seuil se lisent sans effort
et ne trichent pas.

---

## 7. Ce que le contrôle visuel a rendu — 2026-09-02

Passe faite sur `42df046` par une session distante, sur un dossier construit à
la main : **6 corrections confirmées à l'écran, 2 défauts toujours là, 11 constats
neufs.** ~~Aucun n'est corrigé.~~

> **AUDITÉ CONTRE LE CODE LE 2026-09-07 : sept des onze sont clos, et aucun
> n'était barré.** L'audit vient de la session distante ; quatre de ses sept
> constats ont été rouverts indépendamment dans le dépôt et tiennent. Chaque
> entrée ci-dessous porte désormais son état et de quoi le recontrôler.
>
> **Ce paragraphe est la leçon, et elle a coûté cher :** un document de constats
> que personne ne barre au fur et à mesure fait refaire le travail. Entre le
> 2026-09-04 et le 2026-09-06, quatre des sept écrans du § 5 ont été ouverts par
> une session, pendant qu'une autre les commandait à nouveau sur la foi de ce
> document. Voir aussi la note qui clôt le § 7 : un `grep` naïf trouve encore la
> phrase fautive de `/equipements`, dans les commentaires qui racontent sa
> correction.

**Le contrôle n'est pas un second œil indépendant, et l'agent l'a dit lui-même** :
ses seize constats de la veille étaient dans sa fenêtre, il ne pouvait pas les
désapprendre. Il a compensé en donnant ce qu'il voit plutôt que ce que le commit
annonce, et en consacrant la moitié de la passe à des écrans jamais ouverts — d'où
viennent presque tous les constats neufs.

### Les trois qui comptent

**L'îlot de navigation est encore translucide sur la section CLAIRE.** Le
correctif du 2026-09-01 n'a traité que le fond sombre. À une position de
défilement intermédiaire, on lit « Dépassée depuis lundi · 6 appareils » *à
travers* la barre de navigation, et la photo du héros transparaît sur sa moitié
gauche. Sur la page de vente. Demi-correction, pas correction.

> **TRAITÉ, RESTE À CONFIRMER À L'ŒIL.** L'opacité est passée de 58 % à **88 %**
> de blanc (`globals.css:682`), calculée sur le pire fond pour tenir 4,5:1. Il
> reste 12 % de transparence : c'est un chiffre, pas un jugement, et seul un
> regard à la bonne position de défilement dit si ça suffit.

~~**`/equipements` tranche une ambiguïté du mauvais côté.** Sous les compteurs :
« Les chiffres ci-dessus et les familles ci-dessous portent sur tout
l'établissement. » C'est faux — ils portent sur les équipements seuls. La phrase
existe pour lever la confusion et elle la scelle à l'envers.~~ L'écart est
exactement la répartition du référentiel : 86 obligations portées par un
équipement, 45 par l'établissement, 14 par un salarié.

> **CLOS.** La phrase n'existe plus comme chaîne vivante. Elle ne subsiste que
> dans **deux commentaires qui documentent sa correction** — `BandeauParc.tsx:23`
> et `porteurs-comptes.ts:6` —, ce qui en fait le meilleur piège du document :
> un `grep "portent sur tout l'établissement"` la trouve encore et fait conclure
> qu'elle est toujours à l'écran. Rouvrir le fichier, pas le `grep`.

**Quatre comptes divergents pour le même dossier** : 22 dépassées au tableau de
bord, 19 sur la carte de zone, « 22 datées · 5 à planifier » au calendrier,
« 19 en retard · 1 à planifier » sur `/equipements`. L'écart s'explique — porteur
équipement contre porteur établissement — mais **aucun écran ne le dit**.

> **Les quatre écrans le disent depuis le 2026-09-03**, et depuis le 2026-09-04
> ils le disent chacun une fois : les phrases se répétaient d'un écran à l'autre
> et deux fois sur `/calendrier`. **Ce qui reste ouvert, et qui n'est pas la
> même chose** : les quatre comptes divergeaient aussi dans leurs MOTS —
> « DÉPASSÉES », « à traiter », « EN RETARD », « 5 dépassées » pour un seul
> état. Le mot vit désormais dans `LIBELLE_ETAT` (`lib/calendrier/etats`), avec
> la couleur qui y vivait déjà, et `vocabulaire-etats.test.ts` refuse qu'un
> écran en réécrive un. Une divergence de la même famille a été trouvée en le
> faisant : la carte d'un appareil comptait « N à venir » sur `proche` +
> `lointain` réunis quand le bandeau du parc comptait « N sous 30 j » sur
> `proche` seul — deux mots voisins pour deux ensembles différents, et une
> pastille bleue « lointain » posée sur un compte qui pouvait n'être que
> proche. Les deux états sont maintenant deux signaux.

### Les autres

- ~~`J−3` affiché sur une ligne « en retard » : le signe est inversé, et il se lit
  « dans trois jours » à qui a déjà dépassé.~~ **CLOS.** `temps.ts:142` et `:152`
  (`src/components/dashboard/widgets/`) rendent `` `${-j} j de retard` `` ;
  `:163` porte la même légende sur le compte à rebours. Rouvert dans le dépôt le
  2026-09-07.
- ~~« 22 échéances à traiter cette semaine » au-dessus de « 22 dépassées · 0 sous
  30 j » : le titre annonce un délai que ses propres chiffres démentent.~~
  **CLOS LE 2026-09-04.** Le titre dit désormais « N échéances ont dépassé leur
  date ». Ce que `e.retards.total` agrège a été mesuré avant d'écrire : toutes
  les familles, les trois porteurs, tout l'établissement, et **aucune fenêtre de
  temps** — `repartirRetards` retient une ligne sur son ton, jamais sur sa date.
  `brief-perimetre.test.ts` tient la mesure en faisant compter une occurrence de
  quatre mois. Le titre du dossier calme est passé de « cette semaine » à
  « dans les trente jours » avec la même cause : sa branche n'est atteinte que
  si `sous30j` est nul.
- ~~Deux espaces manquantes après un `<strong>` : « couvertespar l'application »
  (`/registre`, dans un H2) et « tous les six mois**l'attestation** »
  (`/prestataires`). Deux pages, donc un `grep` plutôt que deux correctifs.~~
  **CLOS, et mieux que demandé.** `JaugeRegistre.tsx:102` et
  `prestataires/page.tsx:154` portent leur `{" "}` — mais surtout la famille est
  fermée **structurellement** : `src/lib/rendu/espaces-avalees.test.ts` balaie
  tout `src` par `readdirSync`, il n'y a pas de liste de fichiers à tenir à jour.
  C'est la différence entre un correctif et une garde. Rouvert le 2026-09-07.
- ~~La troisième carte de zone est tranchée en plein glyphe : « At », « 0 équ »,
  une pastille réduite à un « À ».~~ **CLOS** — `hero-batiments.tsx:85`,
  `LARGEUR_PLANCHER = 116` et une prop `souple`. Relevé par la session distante,
  non rouvert ici.
- ~~« À jour » affiché sur une zone à **zéro équipement** — on certifie à jour un
  lieu où rien n'a jamais été déclaré.~~ **CLOS.** `lib/batiments/etat-charge.ts`
  pose trois états fermés et `:75` retourne `sansObjet` **avant tout comptage** :
  il n'existe plus de chemin qui mène à `aJour` avec un parc vide. Rouvert le
  2026-09-07.
- ~~Pastille ambre « Engagement d'assurance » absente du widget « À faire », alors
  que la ligne a de la place.~~ **TRAITÉ, reste à confirmer à l'œil** —
  `echeances.tsx:154` et `:288`. Qu'elle existe dans le code ne dit pas qu'elle
  s'affiche là où on la cherche.
- **TOUJOURS OUVERT, non vérifié.** Le guide reste à « étape 4 sur 6 » alors que
  l'étape 5 paraît satisfaite ; un bouton primaire y est indiscernable d'un choix
  déjà fait.
- **TOUJOURS OUVERT, non vérifié — et il ne se mesure pas en `next dev`.** Le
  héros de la page d'accueil reste un aplat noir ~4 s avant que la photo arrive.
  Pas cassé, lent — sur la première image d'une page de vente. À juger sur un
  `next build`, faute de quoi on relèvera la compilation à la demande comme un
  défaut de produit.

### Et un fait de conception, découvert en le cherchant

**Charger la page calendrier ÉCRIT.** `calendrier/page.tsx:296-306` appelle
`regenererSansInvalider(id)` dès que le calendrier est désynchronisé. C'est la
régénération idempotente de l'ADR-012, pas un défaut — mais elle a pour
conséquence qu'**une consigne de « lecture seule en naviguant » n'est pas tenable
sur ce produit**, ce qui a été demandé à tort à la session distante et exécuté sur
la base de production. À savoir avant de refaire regarder un dossier réel.

### Ce qui reste injugeable sans le seed du § 5

~~`/equipe`, `/duerp`, `/permis-feu`, `/plan-prevention`, `/carnet-sanitaire`,
`/accessibilite` et `/plan-actions` s'affichent vides~~ — un écran vide ne prouve
rien sur une correction de charte. S'y ajoutent tout l'onboarding, le refus de la
4ᵉ zone et le reset du formulaire de prescription : ce sont des écritures.

> **Quatre des sept ont été ouverts avec des données**, les 2026-09-04 à 09-06,
> sur la machine distante : `/equipe` (liste et fiche salarié), `/duerp` (unités,
> risques, import, synthèse), `/accessibilite` (page publique des deux
> établissements et affiche A4) et `/plan-actions` (fiche d'action). Une
> quinzaine de constats en sont sortis, dont plusieurs déjà corrigés depuis.
>
> **Réellement jamais ouverts, et c'est tout ce qui reste :** `/permis-feu`,
> `/plan-prevention`, `/carnet-sanitaire`.

### Comment la session s'ouvre, et pourquoi ça ne s'improvise pas

**La propriétaire se connecte elle-même**, dans son navigateur, sur
`localhost:3000/login` ; son gestionnaire de mots de passe préremplit, elle
clique. L'agent ne soumet jamais le formulaire — ce n'est pas son mot de passe.
Le dossier local est rattaché à son UUID Supabase par le `--user` du seed, et
tout s'ouvre. C'est la voie employée depuis le 2026-09-04.

**C'est exactement là que le lot du 2026-09-03 a dérapé** : il a cherché à
*fabriquer* une session au lieu de *demander* qu'on lui en ouvre une, et il a
créé `controle-visuel-seed@btry.fr` sur le Supabase de production (§ 6). La
règle qui en sort : **si un lot n'a pas la propriétaire sous la main, la réponse
n'est ni « projet Supabase local » ni « contournement de session en dev » —
c'est que ce lot ne fait pas de contrôle visuel.** Les deux contournements ont
été proposés le 2026-09-07 dans un brief, et refusés par l'agent qui les
recevait.

### Trois choses qu'un brief de contrôle visuel doit porter

Relevées le 2026-09-07, chacune parce qu'elle a manqué :

1. **« Base vide et migrée » ne s'écrit pas, ça se vérifie** —
   `prisma migrate status`. Trois migrations manquaient à la base distante, et
   sans elles les écrans du parc rendaient une erreur de colonne absente qu'on
   aurait relevée comme un défaut d'interface. Appliquer par
   `prisma migrate deploy`, **jamais** `migrate dev`, qui vide la base de
   `DIRECT_URL` — c'est ce qui a effacé la production le 2026-08-27.
2. **Ne pas spécifier les détails locaux d'une machine qu'on ne connaît pas.**
   Un brief a prescrit le port 5433 en recopiant l'autre machine ; la bonne
   valeur était 5435. De même, aucun `git remote set-url` n'est nécessaire après
   un renommage de dépôt : GitHub redirige.
3. **Demander l'observable, pas le verdict.** « Le bandeau dit *N* et la carte
   dit *M* », pas « le compteur est faux ».

---

## 7 bis. Les équipements de protection — ce qu'on ne sait pas déclarer

**Relevé le 2026-09-04, à la demande de la propriétaire.** Un dirigeant ne peut
déclarer ni un casque, ni un harnais, ni des chaussures de sécurité : les
**dix-neuf catégories d'équipement** vont de l'installation électrique au
compacteur, et aucune ne porte un équipement de protection. **Zéro obligation du
référentiel ne les vise.**

Le DUERP, lui, les traite — il porte les mesures de prévention, et le dossier de
démonstration y nomme chaussures antidérapantes, gants anti-coupure et gants
chimiques. C'est le bon endroit pour l'évaluation du risque. **Ce n'est pas un
suivi de vérification.**

### Le motif d'exclusion écrit ne couvre pas ce qui manque

`.claude/CLAUDE.md` range en hors périmètre « registres non couverts : […] EPI ».
Le mot qui compte est **registre**. Ce motif n'écarte ni :

| Article | Ce qu'il impose | État |
| --- | --- | --- |
| `R. 4321-4` | Mise à disposition des EPI et des vêtements de travail, et veiller à leur **utilisation effective** | dépouillé le 2026-09-02, non encodé |
| `R. 4323-99` à `-103` | **Vérifications générales périodiques** des EPI, dont la liste et la périodicité sont fixées par arrêté | `R. 4323-99` dépouillé, les autres non |
| `R. 4323-106` | — | non ouvert |

**Et voici le point qui rend l'omission difficile à défendre** : `R. 4323-99` est
**la même mécanique d'habilitation par arrêté que `R. 4323-23`** — un article du
Code qui renvoie à un arrêté pour la liste des équipements soumis et leur
rythme. Le dépôt a instruit `R. 4323-23` par l'arrêté du 1ᵉʳ mars 2004 (levage),
puis par celui du 5 mars 1993 (machines hors levage). **On a suivi deux branches
du même mécanisme et laissé la troisième.**

### Ce qu'il faudrait pour l'ouvrir

1. **Dépouiller l'arrêté** que `R. 4323-99` habilite — le dépôt ne le connaît pas.
   Attention : il ne s'agit **pas** de l'arrêté du 19 mars 1993, qui est celui des
   travaux dangereux du plan de prévention et que le corpus porte déjà.
2. **Une ou plusieurs catégories d'équipement.** Un EPI se déclare-t-il comme un
   appareil, ou par nature — « protection antichute », « protection
   respiratoire » ? Le texte le dira : le lot « compacteur » du 2026-09-02 a
   montré qu'une catégorie mal nommée produit soit un faux négatif muet, soit du
   bruit sur tout le parc.
3. **Trancher le porteur.** Un EPI est remis à une personne — `R. 4323-99` porte
   sur l'équipement, mais l'attribution est nominative. C'est le même partage que
   `R. 4224-14` (le matériel de secours, porteur établissement) et `R. 4224-15`
   (le secouriste, porteur salarié) : deux articles voisins, deux porteurs, et
   les fondre serait le défaut que l'ADR-022 a corrigé sur `PE 4`.

**La protection collective** n'existe pas davantage comme objet. Ce qui s'en
approche est traité par domaine — garde-corps sous le travail en hauteur,
signalisation, désenfumage —, jamais comme une famille.

### Ce qu'on dit aujourd'hui, et qui reste vrai

Que les EPI sont **évalués au DUERP** et que **leur vérification périodique n'est
pas suivie**. C'est exact et c'est dicible ; ce qui ne l'est pas, c'est de
laisser croire que le motif « registre EPI non couvert » recouvre la question.

---

## 8. Ce que l'onboarding permet de déduire — à instruire, bas de liste

**Idée de la propriétaire, 2026-09-03.** Le lot « personnes habituellement
présentes » a montré qu'une question posée au dirigeant était **déjà répondue**
par une autre : dès la 3ᵉ catégorie d'ERP, le public dépasse 301, donc les 51 de
`R. 4227-34`. La question a pu partir.

Il y a probablement **d'autres cas du même genre**, et il se peut aussi que le
produit les traite déjà très bien — c'est à mesurer, pas à supposer.

### La ligne de partage, à poser avant d'instruire

Sans elle, ce chantier contredirait la décision du 2026-09-01, dont le commit
s'intitule « L'onboarding cesse de deviner ». Les deux se concilient, et la
distinction est nette :

- **Deviner un fait** — ce qui a été retiré. Le parcours déduisait la catégorie
  d'ERP d'un effectif de public saisi, puis **l'inscrivait au dossier comme si
  elle avait été constatée**. Un dirigeant connaît son classement : il est sur
  son arrêté d'ouverture ou au procès-verbal de la commission. On le lui demande.
- **Tirer la conséquence d'un fait déclaré** — ce qui est légitime, et ce que
  fait le lot `R. 4227-34`. La catégorie est déclarée par le dirigeant ; le
  franchissement du seuil de 51 en découle par le texte, sans qu'on demande rien
  et sans qu'on écrive au dossier un fait que personne n'a constaté.

**La règle** : on ne déduit jamais une donnée qui sera stockée et présentée comme
déclarée. On déduit des **conséquences** — quelles obligations s'appliquent,
quelles questions deviennent inutiles.

Et une seconde règle, tirée du même lot : **une déduction ne vaut que dans le
sens où elle est sûre.** La catégorie donne une borne basse du public, ce qui
suffit à conclure « au-dessus de 51 » et jamais « en dessous ». Une déduction
retournée devient une sur-application ou un faux négatif.

### Un constat déjà sorti par cette méthode, le 2026-09-03

En mesurant ce que chaque déclaration déclenche à elle seule — moteur appelé,
aucun équipement — une anomalie est apparue tout de suite :

| Déclaré | Obligations |
| --- | --- |
| rien | 0 |
| travail seul | 25 |
| ERP seul, 5ᵉ catégorie, type N | 6 |
| travail + ERP 5ᵉ | **32** |
| travail + ERP 3ᵉ | **28** |
| travail + habitation 3ᵉ famille A | 28 |

**Un ERP de 3ᵉ catégorie reçoit moins d'obligations qu'un ERP de 5ᵉ.** Il perd
cinq lignes `PE` — `PE 4`, la visite de commission de 5ᵉ, et les trois lignes de
locaux à sommeil — et n'en gagne qu'une, la visite quinquennale de 3ᵉ.

**En droit c'est correct** : les articles `PE` du Livre III régissent le second
groupe, c'est-à-dire la 5ᵉ catégorie. La 3ᵉ relève du **Livre II**. Mais voilà ce
que le corpus en porte :

| | articles au corpus | étendue |
| --- | --- | --- |
| Livre III — 5ᵉ catégorie | 59 | **`integral`** |
| Livre II — catégories 1 à 4 | **18** | `articles_cites` |

**Plus l'établissement est grand, plus la couverture est mince — et rien ne le
dit au dirigeant.** Un restaurant de 3ᵉ catégorie voit un dossier qui a l'air
complet.

**Réserve** : le dénominateur du Livre II n'est pas établi. On sait qu'on en cite
dix-huit articles, on ne sait pas combien il en compte. Le mesurer est le premier
geste, avant toute conclusion sur l'ampleur.

Ce n'est pas un défaut de déduction, et ce chantier n'est donc pas son remède :
c'est un **trou de couverture**, qui relève du mécanisme de déclaration
(`corpus/perimetre.ts`, page « Ce que Rojer ne couvre pas ») et non de
l'encodage. Il est ici parce que c'est la méthode de ce chantier qui l'a trouvé,
et que ça vaut démonstration : **on ne le voit pas en lisant le code, on le voit
en demandant au moteur ce que chaque réponse déclenche.**

### Un second constat, et il a été soldé le 2026-09-03

La même méthode — appeler le moteur pour chaque valeur d'une réponse, plutôt que
lire le code — a rendu un résultat plus net encore, et cette fois **la
conséquence a été tirée**.

| Question | Valeurs | Obligations rendues |
| --- | --- | --- |
| Classe d'IGH | les 10 de `R. 146-4`, plus `null` | **le même jeu pour les 11** |
| Famille d'habitation | les 5 de l'article 3, plus `null` | **le même jeu pour les 6** |
| « Robinets d'incendie armés » (sur chaque extincteur) | `oui`, `non`, absent | **le même jeu pour les 3** |

Trois questions, dont deux **obligatoires**, qui ne changeaient rien sur 145
obligations. La suite n'est pas allée au chantier : les trois questions ont été
retirées le jour même, après lecture des textes.

**CE QUE L'ÉTAPE DE LECTURE A APPORTÉ, ET QUE LE COMPTAGE NE POUVAIT PAS DONNER.**
Un comptage dit « cette question ne sert pas aujourd'hui ». Il ne dit pas si elle
DEVRAIT servir — c'est-à-dire s'il existe, dans le texte, une obligation qu'on
aurait dû encoder avec cette restriction. Seule l'ouverture du règlement le dit,
et la réponse s'y trouve toujours au même endroit : **à qui le texte s'adresse.**

- Les vérifications périodiques des IGH (`GH 5`) visent « les propriétaires »,
  et ne varient pas par classe. La seule périodicité que l'arrêté indexe sur la
  classe (`GH 4 § 3`) a pour sujet « la commission de sécurité ». Et `GH 66`
  achève : le classement retient « l'usage principal de l'immeuble », les
  dispositions de chaque classe s'appliquant « dans chacune des parties
  concernées » — la classe déclarée d'une tour ne décrit pas le plateau qu'on y
  occupe. **La classe n'était pas seulement inutile : c'était le mauvais objet.**
- L'obligation périodique centrale de l'arrêté du 31 janvier 1986 (art. 101)
  vise « le propriétaire » et ne mentionne aucune famille. Les familles
  gouvernent la construction.

**LA LECTURE A RAPPORTÉ PLUS QUE LA QUESTION QU'ELLE VENAIT TRANCHER**, et c'est
l'argument pour ne jamais retirer une question sans ouvrir son texte :

- `GH 61 § 5` — vérification **quinquennale** de la charge calorifique par
  organisme agréé, que le texte met à la charge des « **occupants** » des locaux
  autres que d'habitation. C'est l'employeur locataire de bureaux dans une tour,
  c'est-à-dire l'utilisateur même du produit, et cela ne dépend d'aucune classe.
  Le corpus la connaissait de loin par le renvoi de `GH 5 § 3.1.4` et en donnait
  une raison de non-encodage **fausse** — « faute de catégorie d'équipement »,
  alors que son porteur est l'établissement. **Rien au modèle ne la bloque.**
- Arrêté du 31 janvier 1986, **art. 78-1** — créé le 27 juillet 2026, en vigueur
  depuis le 3 août : un contrôle visuel annuel des boxes de stockage d'un parc
  annexe, consigné au registre de l'article 101. Il dément la phrase que le
  corpus portait depuis deux jours — « la seule obligation périodique du texte
  est l'article 101 ». Bloqué, lui : pas d'attribut de parc annexe, et un
  débiteur — « le gestionnaire » — que le modèle ne connaît pas.

Les deux sont au corpus en `obligation_manquante`, aucune n'est encodée : une
obligation ne s'encode pas en effet de bord d'une question à laquelle elle ne
répond pas.

### Ce qu'il faudrait établir

Pour chaque réponse d'onboarding — régime travail / ERP / IGH / habitation, type
et catégorie d'ERP, effectif, secteur d'activité, zones, équipements déclarés
(la famille d'habitation et la classe d'IGH ont quitté cette liste le
2026-09-03 : les questions n'existent plus) :

1. **Ce qui en découle mécaniquement** aujourd'hui, mesuré en appelant le moteur
   et non en lisant le code.
2. **Ce qui pourrait en découler et n'en découle pas** — le gisement.
3. **Quelles questions ultérieures deviennent alors inutiles**, comme
   « personnes habituellement présentes » l'est devenue pour les catégories 1 à 3.

Le sens du chantier n'est pas d'ajouter des déductions : c'est de **retirer des
questions**. Chaque question de moins à l'accueil est un dirigeant de plus qui
finit son dossier.

**Point de départ** : `src/lib/matching/engine.ts` pour ce qui découle déjà,
`docs/adr/004-typologie-etablissement.md` pour les seuils, et le mode `explain`
du moteur — qui sait déjà dire *pourquoi* une obligation s'applique chez vous, et
qui est donc l'inventaire des déductions existantes.

---

## 9. Les listes fermées du modèle ne sont attachées à aucune source

**Constat du 2026-09-03, et c'est un axe entier que rien n'avait regardé.**

Le référentiel dit ce que la loi exige. Le **modèle** — `prisma/schema.prisma` —
dit ce qu'un dossier peut **dire de lui-même** : c'est le vocabulaire dans lequel
le dirigeant décrit son établissement. Une obligation ne se déclenche que sur ce
que ce vocabulaire sait exprimer. **Un mot manquant dans le modèle rend muette
une obligation juste.**

### Ce qui est mesuré

Le modèle porte **25 listes fermées**. La plupart sont des états de flux —
`StatutVerification`, `TypeAction`, `MethodeSignature` — que le produit invente
légitimement et qui n'ont pas de source.

**Sept transcrivent une nomenclature écrite dans un texte.** Aucune ne l'avait
jamais été confrontée ; les sept le sont désormais.

> ⚠ **CE PARAGRAPHE PORTAIT DES MARQUEURS DE CONFLIT GIT NON RÉSOLUS**
> (`<<<<<<< HEAD`, `=======`, `>>>>>>>`), livrés tels quels sur `main` en
> `c928a98`. Deux versions du tableau des sept listes y coexistaient — celle
> d'avant le lot du 2026-09-03 et celle d'après —, ce qui rendait la section
> illisible et contradictoire : la même ligne y disait `ClasseIgh` « non
> vérifiée » et « était fausse, corrigée ». Résolu le 2026-09-03 par un lot
> voisin, qui devait écrire dans cette section et ne pouvait pas le faire
> par-dessus des marqueurs. **Le tableau retenu est le plus récent** ; les
> analyses des deux côtés sont conservées, elles portent sur des listes
> différentes et ne se contredisent pas.

| Liste | Sa source **établie** | État au 2026-09-03 |
| --- | --- | --- |
| `TypeErp` | `GN 1 § 1`, arrêté du 25 juin 1980 | **était fausse — `J` manquant** ; corrigée et gardée par `types-erp.test.ts` |
| `CategorieErp` | `R. 143-19` CCH — **pas** `GN 2` | liste juste ; **source présumée fausse** ; gardée par `categories-erp.test.ts` |
| `ClasseIgh` | `R. 146-4` CCH — **pas** l'arrêté de 2011 | **était fausse — `GHTC`, `GHW1`, `GHW2` manquants, `GHW` en trop** ; manquants ajoutés, `GHW` **encore dans l'énumération** (§ 9 bis). **La QUESTION est retirée du produit le 2026-09-03** : elle ne décidait d'aucune obligation |
| `FamilleHabitation` | art. 3, arrêté du 31 janvier 1986 | liste juste, source juste. **La QUESTION est retirée du produit le 2026-09-03**, pour la même raison |
| `HandicapAccessible` | **`L. 114` CASF** — *pas* le droit de l'accessibilité | **il en manquait deux** ; corrigée et tenue par `handicap-accessible.test.ts` |
| `NatureTravauxPointChaud` | **aucune** — voir ci-dessous | convention de produit, assumée et bornée par `nature-travaux-point-chaud.test.ts` |
| `Realisateur` | **aucune liste** — dix textes, un par valeur | ancrée valeur par valeur, tenue par `realisateur.test.ts` |

**Les sept sont confrontées, et trois étaient fausses** — `TypeErp`, `ClasseIgh`,
`HandicapAccessible`. **Deux des sources présumées n'existaient pas** :
`HandicapAccessible` ne vient pas du droit de l'accessibilité mais de `L. 114`
du code de l'action sociale et des familles, et `NatureTravauxPointChaud` n'a
aucune source du tout.

**ET UNE LEÇON QUE CE TABLEAU NE POUVAIT PAS DONNER, ajoutée le 2026-09-03.**
Confronter une liste à son texte dit si elle est JUSTE. Cela ne dit pas si elle
SERT. `ClasseIgh` et `FamilleHabitation` sont sorties de cet exercice justes
toutes les deux — et les deux questions qui les posaient au dirigeant ont été
retirées trois jours plus tard, parce qu'aucune obligation du référentiel n'en
dépendait : les dix classes, les cinq familles et l'absence de réponse rendaient
le même calendrier, mesuré en appelant le moteur. Une liste fidèle à son texte
peut n'avoir aucun effet ; les deux questions se posent séparément, et la seconde
ne se pose qu'en ouvrant le règlement pour y chercher **à qui il s'adresse**.

### Ce que la seconde passe a appris, et qui n'était pas dans la première

**LA SOURCE PRÉSUMÉE EST AUSSI PEU FIABLE QUE LA LISTE.** Deux des trois sources
citées ci-dessus étaient fausses, et de la même façon : elles désignaient le
RÈGLEMENT DE SÉCURITÉ là où la nomenclature est au CODE. `GN 2` de l'arrêté du
25 juin 1980 traite du classement des GROUPEMENTS d'établissements, pas des
catégories ; `GH 1` de l'arrêté du 30 décembre 2011 renvoie explicitement au CCH
« pour les prescriptions générales communes aux diverses classes ». Le règlement
EMPLOIE une nomenclature que le code POSE.

Ce n'est pas une nuance d'érudition : **c'est ce mauvais renvoi qui a coûté trois
classes à `ClasseIgh`.** Le titre III de l'arrêté de 2011 groupe GH W 1 et GH W 2
sous un chapitre unique « GH W », et c'est ce chapitre — pas une classe — que le
modèle avait recopié. Chercher une liste dans le texte qui l'applique au lieu du
texte qui la définit produit une liste plausible et fausse.

**UN MEMBRE EN TROP SE PAIE COMME UN MANQUANT.** `GHW` n'était pas une valeur
inoffensive : un exploitant de tour de bureaux la cochait, enregistrait une classe
qui n'existe pas, et n'était jamais interrogé sur la hauteur du plancher bas — le
seul fait qui sépare GHW 1 de GHW 2. **Mais un membre en trop ne se retire pas
comme on ajoute un manquant** : l'ajout est additif, le retrait réécrit la
colonne. C'est ce qui a scindé le lot en deux, et le § 9 bis en porte la suite.

**LES LIBELLÉS SE CONFRONTENT AU TEXTE, PAS SEULEMENT LES CLÉS.** Le lot `TypeErp`
l'avait déjà relevé ; les trois listes suivantes le confirment. « GHZ · Mixte »
désignait, dans le texte, un immeuble à usage PRINCIPAL D'HABITATION entre 28 et
50 mètres : un syndic cherchait « habitation », trouvait GHA, et se rangeait dans
la mauvaise classe. Les gardes vérifient désormais que les libellés portent les
CHIFFRES du texte — hauteurs pour les classes d'IGH, seuils d'effectif pour les
catégories d'ERP —, jamais ses mots : exiger les mots interdirait de rendre la
nomenclature lisible, et un plancher de longueur forcerait à rallonger
« Y · Musée ».

**La première qu'on a ouverte était fausse. La cinquième aussi.** Trois de plus ont
été ouvertes le 2026-09-03, et le résultat le plus utile est que **deux des trois
« sources » du tableau d'origine n'existaient pas** :

- **`HandicapAccessible` ne vient pas du droit de l'accessibilité.** Toute la chaîne
  a été ouverte — `L. 161-1` et `L. 164-1` du CCH, `R. 164-6` qui institue le
  registre, les quatre articles de fond de l'arrêté du 19 avril 2017 qui en fixe le
  contenu — et aucun ne répartit les personnes handicapées : les quatre disent « les
  personnes handicapées ». La seule énumération du droit français est `L. 114` du code
  de l'action sociale et des familles, écrit par l'article 2 de la loi du 11 février
  2005 : cinq familles de fonctions, **plus le polyhandicap et le trouble de santé
  invalidant**, mis sur le même plan. Ces deux-là manquaient aux **quatre**
  déclarations — c'est le défaut du type `J` : un établissement adapté au
  polyhandicap ouvrait la liste et n'y trouvait pas la sienne. Migration
  `20260903120000_handicap_polyhandicap_trouble_sante_invalidant`, additive.
  « Les quatre familles de handicap », au passage, n'est dans aucun de ces textes :
  la formule vient du document ministériel d'aide à l'accueil que l'arrêté fait
  **annexer** au registre sans en édicter le contenu.
- **`NatureTravauxPointChaud` n'a aucune source, et c'est le résultat.** ED 6030 est
  une brochure de l'INRS — association loi 1901 — que l'ADR-032 nomme parmi les
  référentiels privés jamais opposables. Et elle ne porte pas de nomenclature non
  plus : sa définition est ouverte par construction (« découpage, meulage,
  ébarbage… », puis « de manière générale, cette désignation comprend tous les
  travaux générateurs d'étincelles ou de surfaces chaudes »), et sa seule liste
  cochable en compte **quatre**, avec deux lignes vides imprimées pour en ajouter.
  Onze valeurs face à quatre items : il n'y a rien à comparer, dans aucun sens. Le
  droit ne nomme qu'un seul travail par point chaud — arrêté du 19 mars 1993, art.
  1er, **21°**, « travaux de soudage oxyacétylénique exigeant le recours à un permis
  de feu » — et il le nomme pour dire qu'un plan de prévention doit être **écrit**,
  pas pour énumérer les points chauds. C'est la seule borne de droit de la liste, et
  le test ne tient qu'elle.
- **`Realisateur` n'est pas une transcription non plus.** `R. 4323-24`, donné pour sa
  source, ne nomme **qu'une** de ses dix valeurs (« des personnes qualifiées »). Il
  n'existe pas d'inventaire des qualifications admises : chaque texte nomme celle
  qu'il exige. La garde est donc de l'autre sens — chaque valeur désigne l'article
  dont le verbatim l'écrit, et le test relit ce verbatim. Aucun membre en trop, aucun
  membre sans texte ; deux divergent du mot du texte et le déclarent, dont
  `bureau_controle`, seul mot de métier de la liste — le droit dit « contrôleur
  technique ».

*(La phrase qui concluait ici « il reste trois listes non vérifiées :
`CategorieErp`, `ClasseIgh`, `FamilleHabitation` » datait de la passe précédente.
Les trois ont été ouvertes depuis, et le tableau ci-dessus en rend compte.)*
### Le défaut est à moitié couvert, et c'est ce qui l'a rendu invisible

Le dépôt **vérifie déjà** qu'on n'encode pas une obligation sur un attribut qui
n'existe pas : le lot « compacteur » du 2026-09-02 a refusé d'encoder une
vérification trimestrielle faute de catégorie d'équipement, plutôt que de
l'accrocher à `AUTRE` — ce qui aurait produit un faux négatif muet. Cette
discipline-là tient.

**Ce qui manque est l'inverse** : quand un texte porte une nomenclature, personne
ne vérifie que le modèle en a le vocabulaire **complet**. On demande « le modèle
peut-il porter cette obligation ? », jamais « le modèle dit-il tout ce que le
texte distingue ? ».

C'est la même famille que le § 8 : nos garanties répondent toutes à *« est-ce
juste ? »*, aucune à *« est-ce tout ? »*.

### Ce qu'il faut faire

Le lot `TypeErp` a posé le patron : ouvrir la source, relever la
nomenclature en verbatim, la porter au corpus, compléter l'enum, **et écrire un
test qui dérive sa référence du corpus** — jamais une liste recopiée, qui se
répare en recopiant et cesse alors de vérifier.

**Le lot du 2026-09-03 a montré que le patron ne suffit pas**, et c'est ce qu'il
faut retenir pour les trois restantes. Il suppose qu'une source existe. Sur deux
des trois listes ouvertes ce jour-là, elle n'existait pas — et la bonne réponse
n'était pas d'en trouver une approchante, mais de l'écrire. Le geste devient
donc : ouvrir la source **présumée**, et si elle ne porte pas la nomenclature,
**le dire et le vérifier** plutôt que rabattre la liste sur le texte le plus
proche. `nature-travaux-point-chaud.test.ts` et le dernier `it` de
`handicap-accessible.test.ts` montrent à quoi ressemble un test qui tient une
absence : il relit le verbatim d'un texte pour constater qu'il ne dit rien, et
rougit le jour où le texte se met à parler.

Les trois autres suivent le même chemin, chacune courte. Après quoi « est-ce
complet » a une réponse mécanique au lieu d'une affirmation.

**Origine du défaut, écrite pour qu'on ne la redécouvre pas.** `docs/adr/004-typologie-etablissement.md`
énonce la liste des types une seule fois, avec la mention **« (~20 valeurs) »**.
L'auteur savait sa liste approximative ; rien n'a jamais eu la charge de la
confronter. C'est l'archétype du défaut de tout ce paragraphe.

## 9 bis. `GHW` : retrait programmé, en attente d'un comptage en production

**Ouvert le 2026-09-03. C'est le temps 2 du lot « listes fermées » ; le temps 1
est livré.**

### Où en est la valeur

`GHW` n'existe pas à l'article `R. 146-4` du CCH. Le code écrit deux classes de
bureaux, `GHW 1` et `GHW 2`, que sépare la hauteur du plancher bas du dernier
niveau — plus de 28 mètres et au plus 50 pour la première, plus de 50 pour la
seconde. Le `GHW` unique du modèle venait du titre III de l'arrêté du
30 décembre 2011, qui groupe les deux sous un chapitre de règlement.

État au terme du temps 1 :

| surface | `GHW` y figure-t-il ? |
| --- | --- |
| `enum ClasseIgh` (PostgreSQL + `schema.prisma`) | **oui**, en sursis |
| `CLASSES_IGH` (`src/lib/referentiels/types-communs.ts`) — ce que la base peut CONTENIR | **oui**, en sursis |
| `CLASSES_IGH` (`src/lib/etablissements/schema.ts`) — ce qu'on peut DÉCLARER | non |
| `CHOIX_CLASSES_IGH` (grille d'onboarding) | non |
| `LABEL_CLASSE_IGH` (menu du formulaire) | non |

**Plus personne ne peut en créer ; un dossier qui en porte un l'affiche encore**,
marqué « classe retirée du règlement — à corriger », avec les deux hauteurs qui
permettent de choisir. La dérogation qui laisse `classes-igh.test.ts` vert
s'appelle `EN_SURSIS_JUSQU_AU_TEMPS_2` et ne couvre que les deux premières
lignes du tableau.

### Pourquoi ce n'est pas fini au même moment

Retirer une valeur d'un type énuméré PostgreSQL impose de recréer le type et de
**réécrire la colonne**, donc de donner un sort aux lignes qui la portent. `GHW`
n'a pas d'équivalent : il ne dit pas si la tour fait 40 mètres ou 60. `NULL` est
la seule valeur honnête, et c'est une **perte de donnée**.

Deux faits l'ont emporté :

1. **`package.json` porte `"build": "prisma generate && prisma migrate deploy && next build"`.**
   Pousser sur `main` joue la migration en production au prochain déploiement
   Vercel. Une migration destructive part donc sans qu'on la déclenche.
2. **On ignore s'il existe des lignes `GHW`.** La lecture de la base de
   production a été refusée par le classifieur de permissions, et elle n'a pas
   été contournée.

Et un comptage fait avant le temps 1 n'aurait rien prouvé : **tant que `GHW`
était offert au formulaire, un déclarant pouvait en écrire un entre la lecture et
le déploiement.** C'est le sens du palier — après lui, le compte ne peut plus
remonter.

> ⚠ **AMENDEMENT DU 2026-09-03 — LA QUESTION DE LA CLASSE A ÉTÉ RETIRÉE DU
> PRODUIT, ET CELA CHANGE DEUX CHOSES À CE PALIER. Le palier lui-même n'est pas
> touché** : l'énumération PostgreSQL porte toujours `GHW`, la dérogation
> `EN_SURSIS_JUSQU_AU_TEMPS_2` est intacte, aucune migration destructive n'a été
> écrite, et rien de la marche à suivre ci-dessous n'a été exécuté.
>
> **CE QUI S'EST PASSÉ.** Un lot voisin est venu établir si la classe d'IGH
> décide de quoi que ce soit pour l'utilisateur du produit. La réponse est non,
> et elle est fondée article par article — GH 5 met les vérifications à la
> charge des « propriétaires » sans les moduler par classe, GH 4 § 3 indexe bien
> une périodicité sur la classe mais son sujet est « la commission de sécurité »,
> et GH 66 dispose que le classement retient l'usage PRINCIPAL de l'immeuble,
> les dispositions de chaque classe s'appliquant « dans chacune des parties
> concernées ». La question a donc été retirée de l'onboarding et de la fiche.
>
> **(1) LE TEMPS 1 EST DÉSORMAIS ACQUIS PLUS FORTEMENT QUE PRÉVU.** Le palier
> visait « plus personne ne peut créer un `GHW` ». Le fait est maintenant : plus
> personne ne peut écrire une classe, quelle qu'elle soit. Le comptage du point 2
> ci-dessous reste donc valide, et le devient a fortiori. La garantie a suivi :
> `classes-igh.test.ts` ne vérifie plus qu'aucune valeur en sursis n'est offerte
> aux trois surfaces de déclaration — elles n'existent plus —, il vérifie que les
> deux schémas d'écriture rejettent TOUTE classe, y compris une classe valide.
>
> **(2) LE POINT 4 PERD SON MÉCANISME, ET C'EST LA VRAIE PERTE.** Il comptait
> sur ceci : « le formulaire de modification refuse déjà d'enregistrer un dossier
> resté en `GHW` et affiche pourquoi : dans bien des cas, la correction viendra
> d'elle-même à la première édition ». Ce menu n'existe plus. **Un dossier qui
> porte `GHW` ne peut plus être corrigé par son titulaire.** Si le comptage du
> point 2 n'est pas nul, l'auto-correction n'est plus une des issues, et il ne
> reste que celles qui demandaient déjà un moyen de joindre les dossiers
> concernés.
>
> **CE QUE CELA SUGGÈRE, SANS LE TRANCHER ICI.** La question posée au temps 2
> n'est plus tout à fait « comment retirer `GHW` de l'énumération » mais « à quoi
> sert encore cette colonne ». Une colonne que rien n'écrit, que rien ne lit, et
> dont aucune obligation ne dépend est candidate à disparaître entière plutôt
> qu'à être nettoyée d'une valeur. **Ce choix appartient à la propriétaire**, il
> est plus destructif que celui décrit ci-dessous, et il ne se prend pas en effet
> de bord d'un lot qui posait une autre question. La marche à suivre qui suit
> reste donc écrite telle quelle.

### Ce qu'il faut faire, dans cet ordre

1. **Déployer le temps 1** (ce lot) et le laisser en production.
2. **Compter**, sur la base de production :
   `SELECT count(*) FROM "Etablissement" WHERE "classeIgh" = 'GHW';`
   Le compte est définitif : plus rien ne peut en créer.
3. **Si le compte est nul** — écrire la migration destructive, sans clause de
   sauvetage puisqu'il n'y a rien à sauver : renommer le type, le recréer sans
   `GHW`, convertir la colonne avec un `USING` direct, supprimer l'ancien type.
   `Etablissement.classeIgh` est le seul usage de ce type, vérifié le 2026-09-03.
4. **Si le compte n'est pas nul** — ne pas ramener les lignes à `NULL` sans
   prévenir. Il faut d'abord **redemander la hauteur du plancher bas** aux
   dossiers concernés, et deux choses manquent pour ça :
   - un moyen de les joindre ou de les marquer, le produit n'ayant aujourd'hui
     aucune notion de « donnée à corriger » sur un établissement ;
   - la décision de ce qui se passe si personne ne répond. Le formulaire de
     modification refuse déjà d'enregistrer un dossier resté en `GHW` et affiche
     pourquoi : dans bien des cas, la correction viendra d'elle-même à la
     première édition. Le reliquat est ce qu'il faut trancher.

   Passer directement au `NULL` de masse est le seul geste explicitement écarté :
   la donnée disparaîtrait sans que celui qui la subit ait une chance de s'en
   apercevoir.
5. **Solder la dérogation.** Retirer `"GHW"` de `EN_SURSIS_JUSQU_AU_TEMPS_2` dans
   `src/lib/referentiels/classes-igh.test.ts`. Si la liste devient vide, retirer
   la constante et `ecartHorsSursis` avec elle, et rendre les cinq comparaisons
   strictes. **Le test y force** : une entrée en sursis qui ne figure plus dans
   l'énumération est signalée comme périmée et fait échouer la suite. La
   dérogation ne peut donc pas survivre à sa cause.
6. Retirer cette section et remettre la ligne `ClasseIgh` du § 9 à « corrigée ».

### Ce qui a été écarté, et pourquoi

- **Livrer le retrait tout de suite** : effacerait une donnée inconnue au
  prochain déploiement, sans que personne ne l'ait décidé.
- **Compter d'abord, livrer ensuite, en un seul lot** : le comptage ne conclut
  rien tant que la valeur reste créable.
- **Migrer `GHW` vers `GHW1`** « parce que c'est le cas le plus fréquent » :
  inscrirait au dossier une hauteur que personne n'a constatée. Une erreur
  invisible plutôt qu'une donnée manquante visible.

---

## 10. Le cycle de contre-signature du plan de prévention — DÉCIDÉ, à faire après

**Décidé par la propriétaire le 2026-09-07 : le processus de signature et de
contre-signature du plan de prévention est à mettre en place dans Rojer, une fois
finies les corrections en cours** sur le contenu minimal de `R. 4512-8`. Ce n'est
donc pas une question ouverte : c'est un chantier accepté, ordonnancé après.

**Il existe un précédent qui tourne**, dans un autre dépôt de la propriétaire
(`~/Documents/GestBAT`, module plan de prévention, relu en sécurité). Il est une
**référence à lire, jamais à copier** — les deux produits n'ont ni la même cible
ni le même périmètre : Rojer sert des TPE, l'autre gère des bâtiments, et un
mécanisme justifié là-bas peut être disproportionné ici. Ce qui suit décrit donc
les GARANTIES à obtenir, pas une implémentation à porter. **Aucune écriture dans
ce dépôt-là, sous aucun prétexte.**

### Ce que le processus garantit, et que Rojer ne garantit pas

- **Une signature est liée à une VERSION du document, pas au document.** Chaque
  signature emporte l'empreinte de ce que le signataire avait sous les yeux. Rojer
  calcule bien une empreinte (`src/lib/signatures/hash-objet.ts`), mais elle ne
  couvre pas tout ce que la fiche affiche — voir le chantier du sceau, ouvert le
  même jour.
- **Le lien de signature lui-même est lié à cette version.** Un lien émis pour une
  version du plan refuse la signature si le contenu a bougé entre l'envoi et le
  clic. C'est la garantie que Rojer n'a nulle part aujourd'hui.
- **L'entreprise extérieure peut DEMANDER une correction au lieu de signer.** La
  demande est une pièce datée, avec ce qui est proposé, qui l'a demandé, et
  l'empreinte de la version sur laquelle elle porte. Aujourd'hui, dans Rojer, une
  entreprise extérieure qui n'est pas d'accord n'a que le refus ou le téléphone.
- **Repasser en modification révoque les signatures déjà recueillies, sans les
  effacer.** Elles sont marquées révoquées et restent interrogeables — nom du
  signataire, horodatage, adresse IP, empreinte de la version signée. Une
  signature ne doit jamais disparaître : elle a été donnée, c'est un fait.
- **La transition vers « signé » est atomique et ne peut pas être écrasée.** Une
  demande de correction arrivant pendant qu'une signature se termine ne doit pas
  défaire l'état signé, et réciproquement.
- **Le document probant est figé une fois pour toutes au moment de la signature**,
  pas régénéré à chaque téléchargement — un document régénéré ne peut pas avoir
  la même empreinte, ne serait-ce qu'à cause de la date d'édition en pied de page.
  Rojer produit aujourd'hui son ZIP de contrôle à la volée.

### Ce qui se décide AVANT de commencer

- **Jusqu'où va la preuve.** Le précédent horodate l'empreinte chez un tiers de
  confiance (RFC 3161) et stocke le document scellé. C'est le point le plus lourd,
  et le plus discutable pour la cible de Rojer : à trancher explicitement, pas à
  reconduire parce que l'autre le fait.
- **Comment le tiers s'authentifie.** Le précédent envoie un code à usage unique
  par courriel et ne stocke que l'empreinte du jeton, jamais le jeton en clair.
  Rojer a déjà des `AccessToken` : leur niveau de protection est à mesurer avant
  d'en rajouter, pas après.
- **Ce que le porteur du lien voit.** Un lien de signature circule par courriel et
  ouvre des données d'entreprise sans mot de passe : c'est la surface la plus
  exposée du produit.
- **L'ordre de bataille.** Ce chantier suppose un chemin de modification d'un plan,
  qui n'existe pas non plus (§ 6 bis). Les deux se tiennent : une contre-signature
  sans modification possible n'a rien à corriger, et une modification sans
  révocation des signatures est précisément le défaut qu'on cherche à éviter.

---

## 11. Le réconciliateur de calendrier — seize constats, un plan ordonné

**Trois passes le 2026-09-09** : une revue à froid, deux contre-expertises, un
audit, et une passe sur base réelle. **C'est le premier audit de cette pièce** :
sur une quarantaine de revues, aucune ne l'avait prise pour sujet, alors que le
moteur de matching a été audité quatre fois. On avait beaucoup vérifié *ce qui
s'applique*, et jamais *ce que devient une ligne déjà posée*.

**Le verdict d'ensemble, et il compte autant que la liste : pas de refonte.** Le
cœur — la logique qui décide garder / créer / archiver / supprimer — est juste et
tenu : dix garde-fous purs sur onze rougissent quand on les casse, l'idempotence
tient à partir du 3ᵉ passage, `cleDeLigne` est la seule construction des deux
côtés, les contraintes SQL sont posées et vérifiées. Deux contre-expertises
indépendantes ont refusé d'y voir un défaut de conception, et aucun constat ne
demande de migration.

**Ce qui cède, ce sont les bords** : le câblage (comment on l'appelle et comment
on écrit son résultat), la lecture (deux classifieurs sur la même ligne), et les
tests (montés sur un faux Prisma qui ignore les `where`).

**Et le vrai défaut de qualité n'est pas le code, c'est l'écart entre le code et
ce qu'on a écrit de lui.** Au moins six promesses d'ADR sont plus larges que ce
que le code tient — dont une qui déclare impossible exactement ce qui a été
reproduit sur base réelle. C'est ce qui a fait passer cette pièce pour sûre :
elle était bien documentée, et la documentation était en avance sur la réalité.
**Le point à surveiller n'est pas le réconciliateur, c'est l'habitude d'écrire la
garantie avant de la tenir.**

### L'ordre, et pourquoi il n'est pas celui de la gravité

Plusieurs constats partagent une cause. Les corriger dans le désordre en rouvre
d'autres.

#### ~~Lot 0 — Le harnais de test. **Prérequis absolu, rien ne démarre avant.**~~ FAIT LE 2026-09-09 (`3b92a85`)

> **Les seize mutations rougissent désormais**, chacune sur un test qui NOMME la
> garantie retirée. Le faux client Prisma honore les `where` et **fait échouer le
> test sur toute clause qu'il ne sait pas interpréter** ; `$transaction` est
> séquentielle et atomique ; les fixtures rendent le monde complet ; le
> référentiel n'est plus simulé ; et le calendrier a enfin une suite qui tente la
> traversée entre clients. 188 fichiers, 2463 tests verts.
>
> **Une correction au passage** : elles étaient **quinze** aveugles, pas seize —
> `M12` était déjà tenue.
>
> **Les lots 1 à 5 sont donc débloqués.** Ce qui suit décrit l'état d'avant, gardé
> pour que le lecteur sache ce qui a été réparé et pourquoi c'était bloquant.

Seize garanties sur trente-deux restent vertes quand on retire ce qu'elles
prétendent vérifier — dont `assertEtablissementOwnership` et le scoping
`entreprise.userId` de trois lectures. Le **code est juste** ; c'est le faux
Prisma qui ignore les `where` et les fixtures qui pré-filtrent ce que le code
devrait filtrer.

Deux gestes : faire honorer les `where` au faux Prisma, et **appeler le vrai
référentiel au lieu de le simuler**. Le second est ce qui aurait empêché le
constat du mauvais grain d'exister : avec le vrai matching, écrire le test
« un équipement désactivé ne génère plus d'obligation » aurait exigé un
établissement dont le matching produit l'obligation, et la question « et s'il
reste un deuxième extincteur ? » se serait posée d'elle-même.

Et le calendrier n'a **aucune suite qui tente la traversée entre clients**, alors
que six existent ailleurs dans le dépôt. À poser ici.

#### ~~Lot 1 — L'écriture aveugle. Le plus grave, et le moins cher.~~ FAIT LE 2026-09-10

> **Les deux pertes de données sont fermées, et chacune a son test.** Le commit
> qui porte cette rature est celui qui corrige — pas de renvoi à un identifiant,
> il serait celui d'avant l'écriture de cette ligne.
>
> **Les écritures redisent en SQL ce que le plan a conclu en mémoire.** La
> suppression porte `rapports: { none: {} }`, `actions: { none: {} }` et
> `dateRealisee: null` ; la mise à jour est passée d'`update` par identifiant à
> `updateMany` conditionné sur les deux champs FACTUELS de la ligne — ceux
> qu'un dépôt de rapport modifie et que la régénération ne calcule pas seule.
> Une ligne qui a changé entre la lecture et la transaction sort du lot au lieu
> d'être écrasée.
>
> **L'écart plan / réel est lu, et il relance.** PostgreSQL rend un compte par
> écriture ; s'il est plus court que prévu, c'est que la condition a joué, et la
> passe recommence sur une lecture fraîche (trois au plus). Au-delà, le repère de
> version est effacé — le calendrier reste marqué périmé plutôt que de passer
> pour à jour.
>
> **Le harnais sait enfin décrire la fenêtre.** Le faux client honore les
> nouvelles clauses et expose un crochet `apresLecture`, qui écrit ENTRE la
> lecture et la transaction : c'est ce qui manquait pour qu'un test puisse
> reproduire les deux pertes. Retirer une clause conditionnelle fait rougir le
> test qui la nomme — vérifié par mutation, dans les deux sens.
>
> **Et la régénération ne fait plus échouer la mutation qui l'a déclenchée.**
> Sept appels à `genererCalendrier` régénéraient à nu ; un seul, celui des
> équipements, attrapait l'échec. Le garde est devenu
> `calendrier/regeneration-sure.ts` et sert les sept — un rapport déposé reste
> déposé même si le recalage échoue, donc plus de redépôt, donc plus de rapport
> en double.
>
> Ce qui suit décrit l'état d'avant, gardé pour que le lecteur sache ce qui a
> été réparé.

**Deux pertes de données, reproduites sur base réelle**, une seule cause : le plan
est calculé sur une lecture (`actions.ts:199`) puis écrit sans revérifier
(`update` par id `:337-349`, `deleteMany` par id `:305-307`). Aucun verrou nulle
part.

- un rapport déposé pendant une régénération **perd sa réalisation** : la ligne
  repasse `dateRealisee: null, statut: depassee` par-dessus, et rien ne redérive
  la réalisation depuis `rapports`. « Dépassée » avec un rapport conforme joint, à
  perpétuité ;
- une action corrective créée pendant une régénération qui supprime la ligne
  **disparaît par cascade** — mot pour mot ce que l'ADR-012 déclare impossible.

Correctif : écritures conditionnées sur ce que le plan a lu, compteurs comparés au
plan, relance si écart — la régénération est idempotente, relancer est gratuit.
**`actions.ts` seul, plus un test qui injecte l'écriture entre la lecture et la
transaction.**

Dans le même lot : le try/catch manquant sur `rapports/actions.ts:192,253` et
`prescriptions/actions.ts` — un échec de régénération fait échouer une action
serveur dont le rapport est **déjà commité**, l'utilisateur redépose et obtient
deux rapports.

#### ~~Lot 2 — Le grain de la clé.~~ FAIT LE 2026-09-10, **sauf une déclaration qui appartient à une autre branche**

> **La ligne gelée est corrigée** (commit portant cette note). Le garde-fou
> interroge désormais le porteur de LA LIGNE, et non la seule applicabilité de
> l'obligation : un appareil désactivé dont l'obligation vit chez son voisin voit
> sa ligne archivée si elle porte une preuve, supprimée sinon. Retirer le
> correctif fait rougir le test qui le nomme.
>
> **Le piège annoncé plus bas s'est révélé plus fin que « par porteur ».** Seul le
> porteur ÉQUIPEMENT se teste. Le porteur établissement ne disparaît jamais, et le
> porteur salarié disparaît sans que sa ligne soit barrée — l'ADR-023 l'a tranché,
> un test existant le tient, et le constat qui rangeait « salarié désactivé » parmi
> les lignes gelées à tort visait autre chose : non pas l'archivage, mais le fait
> qu'elle reste comptée en retard. **Ce point-là n'est PAS corrigé** ; il relève du
> statut, donc du lot 3.
>
> **Le second symptôme — la continuité d'identifiant — est corrigé aussi.**
> `OBLIGATIONS_RETIREES.absorbePar` portait la donnée depuis le 2026-08-27 et
> n'avait **aucun lecteur** ; il en a un. Une ligne dont l'obligation a été
> absorbée ne produit plus « ligne barrée + ligne neuve urgente » : l'obligation
> absorbante naît datée de l'héritage, donc en retard s'il y a lieu, tandis que
> la ligne d'origine est archivée AVEC sa preuve. La succession est **déclarée,
> jamais dérivée** (ADR-024) : rien ne devine qu'une obligation en remplace une
> autre par ressemblance.
>
> **Le report porte l'ÉCHÉANCE, pas la réalisation.** Écrire `dateRealisee` sur
> la ligne absorbante lui ferait attester un contrôle dont elle ne porte aucun
> rapport — la pièce est restée sur la ligne archivée, qui la conserve.
>
> **LA RÈGLE DE FUSION EST POSÉE À « LA PLUS ANCIENNE », ET C'EST UNE DÉDUCTION.**
> La veille du 2026-09-10 l'a cherchée aux sources primaires et ne l'a pas
> trouvée : `R. 4222-20` ne porte aucun chiffre, l'arrêté du 8 octobre 1987 dit
> « au minimum une fois par an » sans dire d'où part l'intervalle, l'INRS le
> reprend sans le préciser. Ce qui est écrit, c'est que l'obligation porte sur
> « tous les éléments » — donc le plus ancien commande. La règle vit dans une
> fonction nommée (`reprendreLaRealisation`) : la trancher autrement est une
> ligne à changer. La propriétaire n'a pas dit le contraire ; elle n'a pas dit
> oui non plus.
>
> **CE QUI RESTE, ET CE N'EST PAS DANS CE DÉPÔT-CI.** Le mécanisme sert deux cas ;
> un seul a sa déclaration. La FUSION est câblée, parce qu'`absorbePar` existe.
> La SCISSION — `worktree-ge4-r-hebergement` — n'a **aucune déclaration nulle
> part** : elle ne retire rien, elle ajoute deux identifiants et en rétrécit un
> troisième, donc `OBLIGATIONS_RETIREES` ne la voit pas. Il lui faut dire, sur
> ses deux obligations neuves, à quel identifiant elles succèdent. Cette
> déclaration appartient à cette branche-là, avec le lot qui crée la scission —
> l'ajouter ici serait poser un champ sans utilisateur et faire bouger
> l'empreinte du référentiel pour personne, c'est-à-dire refaire l'habitude que
> le § 11 désigne comme le vrai défaut : écrire la garantie avant de la tenir.
>
> Ce qui suit décrit l'état d'avant.

Le garde-fou d'applicabilité teste `obligationId` (`generateur.ts:877-881`) quand
une ligne existe par obligation **et porteur**. Deux symptômes, un défaut :

- la ligne d'un porteur disparu est **gelée** si l'obligation vit ailleurs : ni
  archivée, ni supprimée, ni relancée, comptée en retard indéfiniment — alors que
  le bouton de suppression promet « ne génère plus d'échéance » ;
- un identifiant qui change (scission, fusion, renommage) **casse la continuité** :
  archivage plus ligne neuve urgente, état acquis non reporté.

**À trancher avant de commencer** : quand N lignes d'équipement sont absorbées par
une ligne d'établissement, **laquelle garde l'état ?** L'ADR-022 dit lui-même que
ce n'est pas tranché. Sans réponse, ce lot ne démarre pas.

**Piège** : raisonner « par porteur » au lieu de « par clé » casserait la garantie
de l'ADR-023 — un test existant le montre.

#### Lot 3 — Un seul classifieur.

Trois constats, une cause : `repartirVerifications` et `lecturesCalendrier`
classent la même ligne et se contredisent.

- un contrôle dont la période est écoulée : **0 en retard** à l'en-tête et au
  score, **un rendez-vous rouge** dans la grille ;
- une échéance à vingt jours : « proche » sur trois surfaces, absente sur deux ;
- une ligne **archivée** : muette partout sauf sur sa fiche et dans le MCP, qui la
  disent « en retard » sur une obligation qui ne s'applique plus. Le marqueur
  d'archivage est lu par deux lecteurs sur cinq.

L'ADR-011 promet déjà que toutes les surfaces affichent le même compte.

#### Lot 4 — L'arithmétique des dates.

- **dérive d'un jour** sur les périodicités longues : annuelle depuis 2023-03-01 →
  2024-02-29 ; quadriennale toujours un jour trop tôt. ADR-011 promet l'inverse ;
- **deux règles de retard selon le porteur** le jour de l'échéance : une
  attestation de salarié est « en retard » le matin où elle expire, pas un
  équipement — contre la règle fondatrice de `retard.ts`.

Le dépôt a **déjà** un module de dates qui porte la bonne règle ; le calendrier ne
s'en sert pas et recalcule avec ses propres fonctions locales, en violation de la
règle 1 de l'ADR-011. **Le lot consiste à supprimer les fonctions locales, pas à
les corriger.**

#### Lot 5 — Ce qui n'est jamais relancé. Dépend des lots 3 et 4.

- **régime établi** : la page ne régénère que si le calendrier est vide ou
  désynchronisé, donc un dossier immobile garde « conforme » indéfiniment ;
- **ligne « mise en service »** : créée `a_planifier`, passée `depassee` par la
  régénération suivante — le jour même —, et comptée en retard dès le premier
  passage (4170 jours pour une MES de 2015). Idempotence rompue entre le passage 1
  et le 2.

### Le code mort, vérifié

Chacun donne l'illusion d'une garantie. À retirer ou à brancher, pas à laisser.

- **`Verification.referentielVersion`** (`schema.prisma:602`) : **aucun écrivain**
  dans tout `src/`. La colonne existe pour une resynchronisation jamais écrite.
- **`estUrgent`** n'est pas persisté : le correctif qui devait sortir les mises en
  service de la tête du calendrier change un champ que personne ne lit.
- **`OBLIGATIONS_RETIREES.absorbePar`** : donnée déclarée, aucun lecteur hors
  tests.
- La branche `datePrevueFaisantFoi` à statut réalisé (`generateur.ts:791`) :
  aucun chemin de production ne l'atteint.
- L'écriture `a_planifier` d'`uploadRapport:151-156`, réécrite `planifiee` par la
  régénération qui suit.

### Deux points mineurs, à prendre au fil

- une **action ouverte compte comme preuve** (`actions.ts:228`) alors qu'elle
  n'atteste d'aucun contrôle : ligne gelée « dépassée », comptée en retard ;
- « régime établi = zéro écriture » (ADR-012) est faux : le repère de version est
  toujours poussé, `Etablissement.updatedAt` bouge à chaque régénération et cesse
  de vouloir dire « modifié par l'utilisateur ».

### Les écarts ADR

Au moins six promesses plus larges que le code. **À reprendre dans le lot qui
corrige chacune, jamais dans une passe de ménage séparée** — sinon on réécrit une
promesse sans savoir si elle est tenue, ce qui est exactement le geste qui a créé
l'écart.

### Ce qui est sain, nommément

Idempotence à partir du 3ᵉ passage ; deux régénérations simultanées sur base vide
(0 doublon) ; `cleDeLigne` unique des deux côtés ; `porteeBatiment` à quatre sites
exactement ; les contraintes SQL (`NULLS NOT DISTINCT`, `porteur_xor`) posées et
gardées ; `empreinteReferentiel` couvre `premierDelai` ; le cloisonnement de la
régénération dans le code ; le salarié inactif traité conformément à `docs/rgpd.md`.
