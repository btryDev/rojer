# Notes sur le cadre juridique : ce que Rojer suit, et pourquoi

Ouvert le 2026-10-15 à la demande de la propriétaire (« on a intérêt à bien
boucler les textes juridiques »). Ce n'est pas un ADR : c'est le carnet des
lignes de partage tranchées en séance, avec le cas qui les a fait naître. On
s'y réfère avant de classer un article nouveau ; on y ajoute toute règle
nouvelle, datée. Règle 11 : une ligne qui cesse d'être vraie se raye et se
date.

## Les lignes de partage

### 1. Rojer suit des obligations d'exploitation, pas des conditions d'existence

Un texte qui **subordonne le droit d'exercer une activité** à des conditions
(aménagement, ventilation, emplacement, produits interdits, contrat exigé en
contrepartie) ne crée pas une obligation que Rojer rythme : ces conditions se
remplissent pour avoir le droit d'exercer, et c'est l'installateur ou la
commission de sécurité qui les contrôle. Rojer sert **le reste du dossier**
comme pour tout établissement (DUERP, vérifications des équipements, ERP
général, Code du travail).

- *Cas fondateur* : le pressing en magasin, `M 40 § 3` (2026-10-15). Les
  conditions a) à d) et les produits interdits sont écartés ; le contrat
  d'entretien e) est classé **hors cadre** (§ 7 de
  `couverture-declaree-du-produit.md`), pas parmi les exclusions.
- *Pourquoi pas une exclusion* : une exclusion (`perimetre.ts`) dit « aucune
  obligation d'exploitant n'en découle ». Le contrat EN est une ; le ranger
  parmi les exclusions cacherait une dette (garde : `corpus.test.ts`, « un
  manque de couverture n'est jamais rangé parmi les exclusions »).

### 2. Construction et dotation : pas nous

Dégagements, isolement, résistance au feu, nombre d'extincteurs, type
d'alarme : c'est l'affaire du constructeur et de la commission. Rojer suit les
vérifications des équipements qui existent, pas leur dimensionnement.

- *Cas* : les chapitres N, M, W, O du livre II, titre II (2026-10-14) :
  55 articles `construction`, 53 `sans_objet`, 12 retenus.

### 3. Règle de comportement sans acte ni pièce : pas une ligne

Une interdiction d'usage (bougies, moteurs thermiques, ballons au gaz) ou une
obligation de résultat sans geste daté ne fait pas une ligne : une case
cochée ressemblerait à une preuve (ADR-027).

- *Cas* : `MS 69`, le stock permanent de rechange de l'alarme — un stock, pas
  un acte, hors cadre (2026-10-14).

### 4. Hors du champ santé-sécurité : pas nous, même si c'est légal

Rojer reprend le Code de l'environnement seulement quand il porte sur la
sécurité des installations ou des personnes.

- *Cas* : l'entretien annuel des chaudières de 4 à 400 kW (`R. 224-41-4`
  C. env.) relève de la pollution de l'air et de l'énergie : hors cadre
  (2026-09-20, confirmé sur pièces le 2026-10-14), dit dans l'aide de la
  catégorie « Installation de gaz ».

### 5. Un cas de niche ne coûte pas une question à la majorité

On ne pose pas une question au parcours pour un cas rare de la cible : on
l'annonce, ou on le classe hors cadre.

- *Cas* : les atmosphères explosives (silos, meunerie), annoncées plutôt que
  questionnées (2026-10-14, PR #30).

### 6. Dire là où l'utilisateur rencontre le sujet

Ce qui touche un matériel se dit **au matériel** (recherche, encart, fiche,
PDF), pas sur la page « Ce que Rojer ne couvre pas ». Cette page garde ce que
l'utilisateur ne croise nulle part ailleurs (une activité, une exposition).

- *Cas* : la liste des matériels non couverts (`materiels-non-couverts.ts`),
  le gaz, l'escalier mécanique, l'eau, l'échelle déplacés (2026-10-14).
- *Cas* : `L. 8222-1-1` (vigilance du sous-traitant accepté) — une phrase
  discrète sur la page Prestataires, et nulle part ailleurs (2026-10-14).
- *Corollaire* : un utilisateur qui ne déclare pas un matériel en porte la
  responsabilité ; la clause générale des mentions légales le couvre.

### 7. Un motif « hors cible » antérieur au 2026-10-12 est suspect

La cible est devenue « ce que l'onboarding ne refuse pas » (catégories d'ERP 1
à 4 comprises). Tout ce qui avait été écarté parce que « seule la 5ᵉ est
couverte » est à revoir.

- *Cas* : le défibrillateur (`R. 157-1` CCH), écarté le 2026-09-01, encodé le
  2026-10-14 ; le livre II, titre II, jamais ouvert, lu le même jour.

### 8. Ne jamais qualifier

Rojer dit ce que le texte dit, cité, ou ce que Rojer fait. Jamais « conforme »,
« en règle », « en infraction » (garde : `rendu/sans-qualification.test.ts`).

- *Cas* : la phrase `L. 8222-1-1` disait « que ce sous-traitant est en
  règle » ; elle reprend désormais « s'acquitte des formalités prévues aux
  articles L. 8221-3 et L. 8221-5 » (2026-10-15).

### 9. Rythme : écrit d'abord, « annuel par défaut » seulement si un texte impose une action répétée

Un rythme vague (« appropriée », « régulière ») sur une action qu'un texte
impose donne « au moins une fois par an », affiché comme défaut (ADR-039).
Une action qui n'est pas répétée par le texte n'a pas de rythme du tout.

- *Cas* : la maintenance du défibrillateur (`R. 157-4`) — annuelle par défaut ;
  la déclaration Géo'DAE — aucun rythme (2026-10-14).
- *Cas* : `N 20`, « fréquemment » — ni ligne ni défaut annuel, rattaché à la
  consigne incendie existante (2026-10-14).

### 10. Une présence requise pendant l'ouverture ou le fonctionnement est un état permanent

Quand un texte exige qu'une personne soit présente — un personnel qualifié
pendant la présence du public, un personnel de service pendant le
fonctionnement d'un appareil, un tableau d'alarme surveillé —, ce n'est pas
une règle sans acte (ligne 3) : c'est un état à constituer puis à maintenir,
que Rojer peut servir comme les autres états permanents (ADR-026, ADR-027).
Si Rojer ne le suit pas, c'est un choix de couverture (`non_couvert`, dit et
annoncé), jamais « sans acte ni pièce ».

- *Politique sœur* : `EL 18 § 2`, la présence physique d'une personne
  qualifiée en 1ʳᵉ et 2ᵉ catégorie, encodée en
  `elec-erp-presence-personne-qualifiee` (2026-09-01).
- *Cas* (2026-10-17, revue de `lot/ref-a-corpus-titre-1`, décision de c6) :
  `GC 15` (personnel présent pendant le fonctionnement des îlots de cuisson),
  `MS 52 § 1` (exploitant présent pendant la présence du public), `MS 66 § 1
  et § 5` (tableau surveillé, personnel qualifié pour la temporisation),
  `MS 57 § 1`, `M 35` (machines-outils sous surveillance), passés en manques ;
  `T 29 § 3`, `T 33 § 2`, `MS 50 § 3`, `S 18`, `T 48` restent ou passent
  `non_couvert`, annoncés, et leur motif ne dit plus « sans acte ».
- *Ce que la règle ne vise pas* : une faculté ouverte sous condition de
  dotation (`J 21`, des clés remises au personnel de surveillance), le
  destinataire d'une alarme (`AS 3 § 3`, « un responsable désigné par
  l'exploitant »), un moyen pour la personne secourue de signaler sa présence
  (`CO 59 g`).

### 11. Un affichage prescrit est un état permanent, pas une dotation

Quand un texte fait afficher, apposer ou rappeler une mention destinée à
informer ou avertir les occupants ou le personnel — une consigne, un plan, une
interdiction rappelée, un avertissement —, c'est un état à constituer puis à
maintenir, comme les autres états permanents (ADR-026, ADR-027). La règle de
niche (ligne 5) décide ensuite si Rojer en fait une ligne ou l'annonce.

- *Politique sœur* : `GC 4 § 3` (consignes affichées près de l'arrêt d'urgence
  de cuisson), `CH 23 § 3` (plan schématique affiché près des chaudières).
- *Cas* (2026-10-17, revue de `lot/ref-a-corpus-titre-1`, décision de c6) :
  `CO 59 g)` (consignes dans l'espace d'attente sécurisé), `CH 52 § 4`
  (interdiction de remplir en marche, rappelée près de l'appareil), et, relus
  avec la règle, `CH 38 6°` (« Danger d'incendie, filtres empoussiérés
  inflammables »), `CO 47 § 2` (« Porte coupe-feu — Ne mettez pas d'obstacle à
  la fermeture »), `CO 45 § 5` (inscription « sans issue ») : manques.
- *Ce que la règle ne vise pas* : la signalétique qui IDENTIFIE un équipement
  pour les secours ou l'exploitant — plaque « évacuation de fumées » (`GC 11`,
  `GC 17`), pancarte d'un raccord de colonne sèche (`MS 19`, `MS 24`), trémies
  ou organes « signalés » (`MS 44`, `AS 7`), balisage des dégagements
  (`CO 42`), panneau de tonnage d'une voie engins (`CO 2`) : une dotation,
  posée avec l'équipement.

## Questions ouvertes

- **Monte-charge installé à demeure** (`D10`, `docs/revues/decisions-a-prendre-2026-09-27.md`) :
  l'arrêté du 1er mars 2004 l'exclut du levage ; le texte applicable (arrêté
  du 29 décembre 2010) n'est pas au corpus. Retiré de la recherche de
  matériel le 2026-10-14, en attendant.
- ~~**Cumul de types d'ERP** (`GN 2`) : un magasin avec restauration ne reçoit
  que les lignes de son type déclaré, `typeErp` étant unique.~~ [2026-10-17 :
  tranché, ADR-045 ; le moteur sait servir l'union des types (lots 0 et 1
  fusionnés), ~~mais tant que la colonne et l'écran (lots 2 et 3) ne sont pas
  livrés, la phrase ci-dessus reste vraie pour l'utilisateur~~.]
  [2026-10-17 (soir) : CLOS — colonne `typesErpAutres` (PR #50) et écrans
  (PR #51, `0f4da766`) fusionnés : un établissement déclare ses autres types,
  et reçoit les dispositions particulières de chacun.]
- ~~**Dix chapitres du livre II, titre II non lus** (L, P, R, S, T, U, V, X, Y, J) :
  hors des secteurs cibles, à classer si la cible s'élargit.~~ [2026-10-16 :
  tous lus. L par la session du chantier multi-types
  (`propositions/lecture-chapitre-L-2026-10-16.md`) — il n'est PAS au corpus,
  et y entrera avec son encodage ; les neuf autres en entier,
  classés au corpus `arrete-1980-livre-2-titre-2` (~~295~~ 296 entrées, X 1 § 2
  classé à part le 2026-10-17), avec le chapitre
  V du livre III (petits établissements de soins) — `lot/erp-chapitres-types-1016`.
  Les ~~dix-huit~~ vingt-huit manques sont au § 9 de `couverture-declaree-du-produit.md`
  (huit articles du titre Ier ouverts par les renvois s'y sont ajoutés le
  2026-10-17, et les deux actes « piscines » du type X), à
  évaluer. Ce qui reste ouvert : ~~l'exclusion « équipements sportifs, piscines »
  face à X 25, à l'annexe du type X et à X 1 § 2 (ligne de partage 7) ;~~
  [2026-10-17, sous-lot B, validé par la propriétaire : tranché — les
  équipements sportifs sortent de l'exclusion (X 25 au sous-lot E), les
  piscines y restent, l'annexe du type X et X 1 § 2 passent hors cadre (§ 7)] la
  classe GN 10 / A6, pour MS 41 et MS 70 § 5.]
