# Chantier A — le porteur d'échéance

**Objectif** : permettre qu'une obligation naisse d'autre chose qu'un équipement déclaré, et
qu'une échéance soit portée par un salarié ou par l'établissement.

Rédigé le 2026-08-27 par la session qui a instruit le sujet. **Ce document n'est pas un ordre
de mission : la section « Ce que vous devriez contester » compte autant que les autres.**

> **Relu le 2026-08-27** par une seconde session, qui a vérifié chaque affirmation sur `main` et
> relu les six articles sur Légifrance. Le fond tient. Cinq points ont été corrigés dans le texte
> ci-dessous, signalés par « *corrigé à la relecture* » : la citation de `incendie.ts` (elle
> n'existait pas), l'état de l'ADR-019 (livrée), le fichier de l'étape 6, le nombre d'articles à
> rythme manquant, et les versions 2026 de `PE 2`, `PE 4` et `PE 27`. Deux obstacles absents ont
> été ajoutés aux contraintes.

---

## Pourquoi ce chantier existe

`Obligation.categoriesEquipement` est obligatoire et non vide
(`src/lib/referentiels/conformite/types.ts`). Conséquence : toute obligation dont le
déclencheur n'est pas un équipement est soit absente, soit accrochée à un équipement
arbitraire — et elle disparaît alors **en silence** pour l'établissement qui n'a pas déclaré
cet équipement.

Ce n'est pas une hypothèse. Six articles en vigueur portent ce motif, dont deux qui visent la
totalité de la base :

| Article | Ce qu'il impose | Pourquoi il ne rentre pas |
|---|---|---|
| `R. 4222-20` (01/05/2008) | « L'employeur maintient **l'ensemble des installations mentionnées au présent chapitre** en bon état de fonctionnement et en assure régulièrement le contrôle » | Découpé en 3 fragments (`VMC`, `CTA`, `STOCKAGE_MATIERE_DANGEREUSE`). Vise **tout employeur** |
| `PE 4 § 2` (01/07/2026) | « **Tous les trois ans au plus**, l'exploitant doit procéder, ou faire procéder, par des techniciens compétents, aux opérations d'entretien et de vérification » | Découpé en 3 fragments par domaine. Via `PE 2 § 3`, vise **100 % de la base** |
| `PO 1 § 3` (30/10/2011) | contrôle biennal, hors élec et SDI annuels | Ensemble moins des retraits nommés |
| `PE 4 § 1` (01/07/2026) | contrat annuel du SDI | Condition « locaux à sommeil », attribut inexistant |
| `PE 27 § 5` (01/05/2026) | instruction du personnel | Porteur salarié |
| `R. 4544-11-1` (01/10/2025) | attestation médicale quinquennale conditionnant l'habilitation au voisinage | Porteur salarié **et** donnée médicale |

*Corrigé à la relecture* — les versions ci-dessus ont été relues sur Légifrance le 2026-08-27, et
trois d'entre elles sont plus récentes que le premier jet :

- **`PE 2 § 3`** (version du **01/01/2026**, arrêté du 1ᵉʳ décembre 2025) ne renvoie plus à
  « PE 4 § 2 et § 3 » mais à « **PE 4, PE 10 B, PE 24 § 1, PE 26 § 1 et PE 27** ». L'argument
  « une ligne, pas N » en sort renforcé : c'est `PE 4` entier qui survit en régime allégé.
- **`PE 4`** (version du **01/07/2026**, même arrêté) : « En cours d'exploitation » est devenu
  « Tous les trois ans au plus », et un chapeau neuf soumet les installations de gaz à `PE 10 B`.
- **`PE 27`** (version du **01/05/2026**, arrêté du 4 février 2026) : § 5 inchangé.
- **`R. 4222-20`** : le chemin hiérarchique est *Chapitre II — Aération, assainissement*. « L'ensemble
  des installations mentionnées au présent chapitre » désigne donc les installations de ventilation
  et d'assainissement, **pas** toutes les installations techniques. Le périmètre matériel est plus
  étroit que la formule ne le laisse croire hors contexte ; le champ personnel, lui, reste
  « tout employeur ».
- **`R. 4544-10`** porte une transition que le premier jet ne mentionnait pas : les attestations
  d'aptitude délivrées avant le 01/10/2025 restent valides **jusqu'au 01/10/2030**.
- **`PO 1 § 3`** appartient au chapitre IV, *règles spécifiques aux hôtels* — **hors des trois
  secteurs cibles**. Il illustre la forme (un tout avec des retraits nommés), il ne justifie pas
  à lui seul du contenu.

*Corrigé deux fois à la relecture, et la seconde correction porte sur la première.*

Le premier jet annonçait ici « trois faux négatifs documentés dans le référentiel lui-même, à
`src/lib/referentiels/conformite/incendie.ts`, sous "LIMITE CONNUE, NON CORRIGÉE ICI" ». La
relecture a d'abord écrit que **cette chaîne n'avait jamais existé** — `git log -S` ne rendait
aucun commit. C'était faux, et la faute était dans la commande : lancée sur `main` seul. Sur
`--all`, la chaîne apparaît bien, introduite dans `incendie.ts` par le commit `7736869` du
2026-08-26. Elle a disparu parce qu'un rebase a laissé ce commit derrière et que sa rapatriation
n'en a repris qu'une partie.

Donc : le brief décrivait un état qui a réellement existé, la relecture décrivait l'état courant,
et le coupable est un rebase — pas une invention. **La note a été restaurée** dans
`incendie.ts`, sur l'obligation `incendie-registre-securite`, avec ce que le même rebase a
emporté d'autre (trois corrections réglementaires sur R. 143-44, non réparées, signalées).

Reste que `docs/carto-obligations-hors-equipement.md` pointait `incendie.ts:162`, qui est
aujourd'hui une note sur `CCH R. 141-10` : la référence par numéro de ligne était périmée.

Ce que le référentiel porte réellement est **l'inverse** : **neuf sur-applications assumées** —
six dans `incendie.ts`, trois dans `electricite.ts` — chacune close par la même phrase — « La ligne est MAINTENUE
volontairement : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors
qu'une sur-application visible et documentée reste corrigeable. À reprendre lorsque le référentiel
saura porter PE 4 § 2, dont le porteur est l'établissement et non un équipement. »

Des faux positifs délibérés, donc, posés pour éviter des faux négatifs — et qui nomment déjà ce
chantier comme leur condition de levée. C'est un argument **plus fort** que celui du premier jet :
la dette n'est pas seulement connue, elle est datée et sa levée est déjà écrite.

L'inventaire complet — 62 obligations hors équipement — est dans
`docs/carto-obligations-hors-equipement.md`.

---

## Ce qui est tranché

Chaque décision est donnée **avec sa raison**, pour que vous puissiez juger si elle tient.
Rouvrez-en une si vous avez un argument, pas par principe.

### Le porteur salarié est nominatif

`R. 4544-10` fait délivrer le titre d'habilitation **à un travailleur désigné**. Idem pour une
attestation SST, un CACES, une autorisation de conduite. Un porteur « poste » produit un
compteur — « 2 caristes à habiliter » — et ne permet jamais de prouver quoi que ce soit en
contrôle.

Base légale du traitement : **obligation légale de l'employeur** (RGPD 6.1.c), jamais le
consentement, qui n'est pas libre en situation de subordination.

**Frontière sur la santé.** Contrainte légale : aucun élément de diagnostic ne parvient à
l'employeur, le dossier médical appartient au service de prévention. Choix produit assumé,
plus strict que le texte : on ne stocke que l'existence de la pièce, sa date et son échéance —
`R. 4544-11-1` autorise pourtant l'employeur à en conserver copie. La raison de ce choix est
dans `CLAUDE.md`, section « Registre des obligations ».

### L'incertitude ne réduit jamais la couverture

`null` ne vaut pas « non ». Une obligation conditionnée à un attribut d'établissement non
renseigné s'affiche « à confirmer » ; un allègement de régime conditionné à l'absence de cet
attribut ne s'applique pas tant que l'absence n'est pas déclarée.

C'est **l'inverse** de `equipement_propriete_booleenne`, où l'absence rend la condition non
satisfaite. Le contraste est volontaire : une propriété d'équipement absente dit « cet
équipement n'a pas cette caractéristique », une propriété d'établissement absente dit « on ne
sait pas encore ».

### Une obligation portée par l'établissement produit UNE ligne, pas N

Argument décisif : `PE 2 § 3` maintient `PE 4` pour les ERP de 5ᵉ catégorie sans locaux à
sommeil recevant au plus 19 personnes — donc pour les établissements qui ont le **moins**
déclaré. Une décomposition par installation produirait **zéro ligne** chez eux : on corrigerait
le faux négatif d'un côté en le réintroduisant de l'autre, sur l'obligation la plus universelle
du lot.

`PO 1 § 3` confirme par la forme : « l'ensemble des installations techniques […] **à
l'exception** des installations électriques et des systèmes de détection incendie ». Un tout
avec des retraits nommés, pas une énumération.

Les équipements déclarés s'affichent **en contexte**, avec la mention explicite que la liste
n'est pas limitative — le texte dit « etc. », le produit ne doit pas prétendre le contraire.

### Locaux à sommeil : attribut déclaré, pas dérivé

`PE 4 § 1`, `PE 28`, `PE 32`, `PE 37` s'y adossent, et `PE 2 § 3` en fait le critère du régime
allégé. La dérivation depuis `typeErp` est incomplète des deux côtés (un type N peut comporter
des chambres, un R sans internat n'en a pas) et `typeErp` est nullable (ADR-004). Une
dérivation muette rendrait « non » par défaut : le faux négatif exact qu'on supprime.

---

## Contraintes vérifiées

Relevées en première main sur `main`, pas de mémoire.

| Contrainte | Où | Ce que ça impose |
|---|---|---|
| `@@unique([etablissementId, obligationId, equipementId])` | `prisma/schema.prisma` | **Le vrai obstacle.** Rendre le champ nullable ne suffit pas : en Postgres deux `NULL` ne se conflictent pas, on obtiendrait des lignes en double. La prod est en **PostgreSQL 17.6** (vérifié), donc `UNIQUE NULLS NOT DISTINCT` est disponible |
| **`parCle` écrase en mémoire** | `src/lib/calendrier/generateur.ts:472` | *Ajouté à la relecture.* La clé de réconciliation `${obligationId}::${equipementId}` est construite **en mémoire**, avant Postgres. Avec `null`, deux porteurs distincts produisent la même clé `"obl::null"` et s'écrasent dans la `Map` : une seule ligne survit au plan. `UNIQUE NULLS NOT DISTINCT` règle la base, **pas ça** |
| **Jointures internes silencieuses** | `batiments/queries.ts:121`, `calendrier/queries.ts:62` et `:155`, `dashboard/queries.ts:143`, `etablissements/[id]/page.tsx:97` | *Ajouté à la relecture.* `equipement: { actif: true }` et `equipement: { batimentId }` génèrent des `INNER JOIN` : ils **excluent sans erreur TS** toute ligne sans équipement. Une échéance d'établissement disparaîtrait sous un filtre par bâtiment — exactement ce qu'interdisent l'ADR-010 et l'ADR-019 (« les masquer ferait mentir le calendrier par omission ») |
| `matchEquipements` rend `ok: false` sans déclencheur | `src/lib/matching/engine.ts:386-391` | Il faut une branche « pas de déclencheur équipement », pas seulement un champ optionnel. La branche d'échec ne renseigne pas non plus `raison` : le mode *explain* est muet là où il devrait parler |
| Invariant testé `categoriesEquipement.length > 0` | `src/lib/referentiels/conformite/conformite.test.ts` | À revoir avec le type |
| `porteUnePreuve` ne compte que `rapports` et `actions` | `src/lib/calendrier/actions.ts` | **Piège** : un nouveau porteur de preuve non déclaré fait supprimer la ligne en silence, avec ce qu'elle portait |
| `empreinteReferentiel()` couvre `categoriesEquipement` | `src/lib/referentiels/conformite/index.ts:128-155` | Toute modification réconcilie les calendriers de **tous** les établissements à leur prochaine ouverture, sans que personne appuie sur un bouton. *Nuance ajoutée à la relecture* : l'empreinte elle-même n'est comparée **qu'en test** (`conformite.test.ts:808`, garde-fou CI). À l'exécution, c'est `REFERENTIEL_VERSION` contre `Etablissement.referentielVersionCalendrier` (`calendrier/queries.ts:211-221`) qui déclenche la régénération. L'effet décrit est réel, mais le maillon est **humain** : le test dit d'incrémenter, il n'incrémente pas |
| `equipementId` — 64 occurrences, 14 fichiers hors tests | `generateur.ts` en concentre 11 | Périmètre de revue borné |
| Le `.env` pointe sur la production | — | Aucune commande Prisma à l'aveugle. Les migrations additives (ajout de valeur d'enum) sont sûres, le reste ne l'est pas |

---

## Étapes proposées

L'ordre est contraint : le modèle doit pouvoir porter le contenu avant qu'on écrive le contenu.
Toute entrée écrite avant l'étape 3 serait un contournement de plus.

1. **Réécrire `docs/rgpd.md`** — il affirme que l'outil ne stocke aucun identifiant personnel de
   salarié. Faux dès que l'entité existe. Un encadré de péremption y est déjà posé, avec la
   liste de ce qu'il faut traiter. **Avant la migration, pas après.**
2. **ADR** — déclencheur, porteur, nature temporelle, règle du non-renseigné. Prochain numéro
   libre : **022** — *corrigé à la relecture* : le 019 **est livré sur `main`** depuis le
   2026-08-21 (`b0c489e`), le 021 aussi. Aucun `022-*` n'existe sur aucune référence. À signaler
   au passage : **deux fichiers portent le numéro 014** (`014-prescriptions-particulieres.md` et
   `014-provenance-navigation.md`), et `CLAUDE.md` n'indexe que le second.
3. **Élargir le type `Obligation`** — `categoriesEquipement` optionnel, `declencheur`, `porteur`.
   Ajouter **CSP** (santé publique — DTA, radon, plomb) et **CSS** (sécurité sociale — registre
   des accidents bénins, déclaration d'AT) à `SOURCES_LEGALES`, avec un commentaire justificatif
   sur le modèle de celui de `REGLEMENT_UE`.
4. **Moteur de matching** — la branche sans déclencheur équipement. Le mode *explain* doit savoir
   dire pourquoi l'obligation s'applique quand ce n'est pas un équipement qui la déclenche.
5. **Migration** — entité `Salarie`, `equipementId` nullable, `UNIQUE NULLS NOT DISTINCT`,
   `Etablissement.locauxSommeil`. Puis la revue des 14 fichiers.
6. **Calendrier** — générateur, réconciliation (ADR-012), et `porteUnePreuve`. *Corrigé à la
   relecture* : la réconciliation ne vit **pas** dans `src/lib/calendrier/reconciliation.ts`, qui
   fait 45 lignes et n'expose que `marquerCalendrierPerime`. Elle vit dans
   `src/lib/calendrier/generateur.ts` (fonction `reconcilierCalendrier`). Le doute exprimé plus bas était fondé.
7. **Le test du lien retour** — un champ `rythmes` sur l'entrée de corpus, comparé au nombre
   d'obligations distinctes citant l'article. Écrivable seulement depuis que chaque référence
   porte une clé d'article canonique. *Corrigé à la relecture* : **neuf** articles à rythme
   manquant sont déclarés `obligation_manquante` dans le corpus, pas six — `PE 4`, `PE 27`,
   `PE 37`, `PO 1 § 3`, `PO 7`, `PO 12`, `R. 4544-11-1`, `R. 4222-20` et l'arrêté du 23/02/2018
   art. 26 § 3. Et « avec leur verbatim » est optimiste : un seul porte un `citationCle` structuré
   (`R. 4544-11-1`), les autres ont leur verbatim noyé dans `motif`, en prose. Trois `bloquePar`
   sur neuf seulement sont des clés machine — à normaliser en même temps que `rythmes`.
8. **Contenu, par lots sourcés** — les 13 formations depuis INRS **ED 6298** en premier :
   périmètre fini, source unique, gratuite, citable.
9. **Onglet Personnel** — une habilitation se périme par personne et se prouve par une
   attestation nominative.

---

## Ce que vous devriez contester

Cette section est là parce que deux sessions se sont mutuellement corrigées hier, et que chaque
correction valait plus que ce qu'elle a coûté. Ce qui suit est fragile — cherchez-y les erreurs.

**Je n'ai pas lu le code de réconciliation en profondeur.** L'étape 6 est écrite depuis
`porteUnePreuve` et le nom des fichiers, pas depuis une lecture ligne à ligne de
`reconciliation.ts`. Il peut y avoir là des invariants que je n'ai pas vus, et qui changent le
coût de l'étape 5.

*Lu à la relecture.* Le doute payait. Trois trouvailles :
1. `reconciliation.ts` n'était pas le bon fichier (45 lignes, `marquerCalendrierPerime` seul) — la
   réconciliation est la fonction `reconcilierCalendrier` de `generateur.ts` (un
   numéro de ligne se périme à la première édition ; le nom, non).
2. `parCle` (`generateur.ts:472`) écrase deux porteurs en mémoire : c'est le **second** obstacle,
   à côté du `@@unique`, et le brief ne le voyait pas. Ajouté aux contraintes.
3. `porteUnePreuve` est **plus fragile** qu'annoncé : le booléen est calculé dans
   `calendrier/actions.ts:162`, hors de la fonction *pure* de `generateur.ts` qui décide de la
   suppression. Aucun test du générateur ne peut attraper l'oubli d'un nouveau porteur de preuve.

Un invariant non vu, à ne pas casser : `aGenerer` doit être produit **sans historique**
(`generateur.ts:455-461`). Lui passer `verificationsPrecedentes` ferait disparaître de sa sortie
les obligations `mise_en_service_uniquement` déjà réalisées, qui seraient alors prises pour des
obligations retirées du référentiel et **archivées à tort**.

**Le sixième déclencheur est affirmé, pas conçu.** J'ai d'abord classé l'événement (un accident,
un chantier, une embauche) comme une *nature* temporelle, puis reconnu que c'est aussi un
déclencheur. Je n'ai pas instruit ce que ça implique dans le moteur. Il se peut que ce soit un
mécanisme entièrement distinct qui n'a rien à faire dans ce chantier.

*Instruit à la relecture, et il sort.* Le déclencheur événementiel ne sert **aucune obligation du
périmètre** : les deux seules lignes réellement événementielles de la carto — déclaration d'AT
(`CSS L. 441-2`) et registre des accidents bénins (`CSS L. 441-4`) — sont déclarées **hors
périmètre** dans `CLAUDE.md` ; les deux lignes « embauche » sont classées PONC et RÉC par la carto
elle-même ; et le cas du chantier a déjà son module (`PlanPrevention`, `R. 4512` et s.). Concevoir
une branche de moteur pour un ensemble vide serait le contournement que ce brief dit vouloir
éviter. Il est **nommé** dans l'ADR-022 comme axe, sans mécanisme.

**Le porteur « bâtiment » manque peut-être à ma liste.** Le modèle `Batiment` existe, et un DTA
se déclenche sur l'année du permis de construire — donc par bâtiment, pas par établissement, qui
peut en occuper plusieurs d'époques différentes.

*Répondu à la relecture, et la réponse est non.* L'ADR-019 n'est pas sur une branche : elle est
livrée sur `main`, et elle tranche déjà — « `Verification` et `Action` n'ont pas de `batimentId` :
une vérification porte sur un équipement, une action sur une vérification ou un risque. Le bâtiment
d'une échéance se lit en remontant la chaîne. Une donnée dérivée ne se désynchronise pas. » Aucune
obligation du lot en cours n'a besoin d'un porteur bâtiment : `PE 4 § 2` et `R. 4222-20` sont
portées par l'établissement. Rouvrir un ADR accepté pour servir des obligations hors lot serait de
l'élargissement gratuit. **Trois porteurs**, donc.

Le DTA, lui, reste bloqué par **deux manques distincts** : un porteur bâtiment *et* un attribut de
date de construction — `Batiment` ne porte que `nom`, `complementAdresse` et `ordre`, pas d'année
de permis. Et il ne faut **pas** le renvoyer à l'`EnsembleClasse` que l'ADR-019 réserve : cette
entité est faite pour les **régimes** (flags ERP/IGH, catégorie, effectif accueilli). L'année du
permis est une propriété physique, pas un régime — un établissement peut occuper deux corps, l'un
de 1970 et l'autre de 2010, de classement ERP identique et dont un seul doit un DTA. Ranger le DTA
dans l'ensemble classé, c'est le mettre là où personne ne l'y cherchera.

**L'entité `Salarie` est peut-être trop lourde pour commencer.** La décision « nominatif » tient
sur le fond, mais rien n'oblige à livrer d'un coup un référentiel du personnel. Un porteur
minimal — nom, poste, échéances — peut suffire au premier lot et éviter d'ouvrir un module RH.

*Tranché à la relecture, et la question se déplace.* `Salarie` minimal n'achète **rien** sur le
coût structurel : n'importe quel porteur non-équipement, minimal ou complet, exige exactement la
même migration (`equipementId` nullable + `UNIQUE NULLS NOT DISTINCT` + clé mémoire). Ce qu'il
achète est du coût **produit**, et là l'écart est net — le chemin salarié traîne trois dépendances
que le chemin établissement n'a pas : réécriture de `docs/rgpd.md`, dépouillement d'ED 6298, et un
onglet Personnel.

D'où l'ordre retenu : **le lot 1 est le porteur établissement**, pas le porteur salarié. `PE 4 § 2`
et `R. 4222-20` ont leur verbatim déjà relevé en première main dans le corpus, ils sont universels,
et ils touchent les établissements qui ont le **moins** déclaré — l'argument décisif de ce brief
vaut donc pour l'ordre des lots autant que pour « une ligne, pas N ». La décision « nominatif »
reste entière pour le lot suivant : minimal veut dire peu de champs, jamais un compteur par poste.

**Une septième source d'échéances existe et n'est pas dans ce brief** : la prescription
particulière (ADR-014, modèle `PrescriptionParticuliere`) — arrêté du maire, mise en demeure,
PV de commission. Elle est traitée à part, et bien. Vérifiez qu'elle ne rentre pas en collision
avec le nouveau `porteur`.

**Enfin : ce brief a été écrit sans que son auteur implémente quoi que ce soit.** Les estimations
d'effort en sont absentes pour cette raison. Si une étape se révèle beaucoup plus coûteuse que
son rang ne le suggère, c'est le brief qui a tort.

---

## Ce que la relecture a laissé debout

Pour que la liste des corrections ne fasse pas croire à une réfutation : le raisonnement du brief
tient **en entier**. Vérifiés en première main sur `main` — `categoriesEquipement` non vide garanti
par le type (tuple, pas seulement un test) ; le `@@unique` triple comme vrai obstacle ;
`matchEquipements` qui exige une branche et pas un champ optionnel ; le piège `porteUnePreuve` ;
la réconciliation silencieuse de tout le parc ; `022` libre ; le porteur salarié nominatif et sa
frontière santé ; « une ligne, pas N » — dont l'argument sort **renforcé** de la relecture de
`PE 2 § 3` en version 2026.

Un critère d'acceptation gratuit, trouvé en chemin : les cinq lignes `FONDEMENT_NON_RETENU` de
`docs/relecture-referentiel-par-reference-2026-08-27.md` portent sur `PE 4` et `R. 4222-20`. Quand le porteur
établissement existera, **elles doivent s'éteindre d'elles-mêmes**. Si elles ne s'éteignent pas,
le lot est incomplet.
