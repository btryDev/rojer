# ADR-022 — Une obligation naît d'un déclencheur et se porte sur un sujet

- Statut : acceptée
- Date : 2026-08-27
- Portée : `src/lib/referentiels/conformite/types.ts` (`Obligation`,
  `SOURCES_LEGALES`), `src/lib/matching/engine.ts`, `src/lib/calendrier/generateur.ts`
  (clé de réconciliation), `prisma/schema.prisma` (`Verification.equipementId`,
  l'unicité), la migration `porteur_etablissement`
- Dépend de : ADR-003 (référentiel en TypeScript), ADR-010 (registre des sources
  d'échéances), ADR-012 (conservation et idempotence), ADR-014 (prescriptions
  particulières), ADR-016 (nature d'échéance), ADR-019 (le bâtiment est un lieu)

## Contexte

`Obligation.categoriesEquipement` est un tuple non vide : le type impose qu'une
obligation soit déclenchée par au moins une catégorie d'équipement déclaré. Les
85 obligations livrées respectent cette forme parce qu'elles n'ont pas le choix.

Le domaine, lui, ne s'y plie pas. Deux articles en vigueur le montrent sans
ambiguïté, et ils ne sont pas marginaux — ce sont les plus universels du corpus :

**`PE 4 § 2`** (arrêté du 25 juin 1980, version du 01/07/2026) : « Tous les trois
ans au plus, l'exploitant doit procéder, ou faire procéder, par des techniciens
compétents, aux opérations d'entretien et de vérification des installations
techniques ». Son champ passe par `PE 2 § 3` (version du 01/01/2026), qui maintient
`PE 4` — entier — pour les établissements de 5ᵉ catégorie recevant au plus
19 personnes. C'est-à-dire pour ceux qui ont le **moins** déclaré.

**`R. 4222-20`** (Code du travail, version du 01/05/2008) : « L'employeur maintient
l'ensemble des installations mentionnées au présent chapitre en bon état de
fonctionnement et en assure régulièrement le contrôle ». Le chapitre est *Aération,
assainissement* ; l'employeur visé est **tout** employeur.

Aucun des deux ne nomme d'équipement. Les deux visent un ensemble, éventuellement
vide, et l'obligation d'entretien porte sur l'exploitant. Faute de pouvoir les
écrire, le référentiel a fait deux choses, toutes deux mauvaises :

1. Il les a **découpés en fragments** accrochés à des catégories d'équipement
   (`VMC`, `CTA`, `STOCKAGE_MATIERE_DANGEREUSE` pour `R. 4222-20`). Un
   établissement qui n'a déclaré aucun de ces équipements ne voit rien — et
   l'obligation, elle, continue de lui incomber.
2. Il a **sur-appliqué volontairement** neuf lignes — six dans `incendie.ts`,
   trois dans `electricite.ts` — chacune close par la même note : « La ligne est MAINTENUE
   volontairement : la retirer créerait un faux négatif muet chez 100 % des
   utilisateurs, alors qu'une sur-application visible et documentée reste
   corrigeable. À reprendre lorsque le référentiel saura porter PE 4 § 2, dont le
   porteur est l'établissement et non un équipement. »

La dette est donc déjà nommée dans le code, avec sa condition de levée. Cet ADR
est cette condition.

## Décision

### 1. Cinq déclencheurs, dont un seul est implémenté

Une obligation naît de l'un de ces cinq faits :

| Déclencheur | Exemple | État |
|---|---|---|
| **Équipement déclaré** | vérification annuelle d'un ascenseur | livré (85 obligations) |
| **Statut d'employeur** | formation à la sécurité dès le premier salarié | à venir |
| **Effectif** | seuils 11, 25, 50 | à venir |
| **Typologie et caractéristiques du bâtiment** | ERP, locaux à sommeil, année du permis | à venir |
| **Activité réellement exercée** | habilitation électrique, conduite d'engins | à venir |

**L'événement n'est pas un sixième déclencheur, faute d'objet.** Un accident, une
embauche, un chantier *datent* une obligation, ils ne la font pas naître. La carto
lui prêtait quatre lignes : deux (déclaration d'AT `CSS L. 441-2`, registre des
accidents bénins `CSS L. 441-4`) sont hors périmètre produit ; les deux autres
(formation à l'embauche `L. 4141-2`, VIP `R. 4624-10`) sont classées ponctuelle et
récurrente par la carto elle-même ; et le chantier a déjà son module
(`PlanPrevention`, `R. 4512` et s.). Concevoir une branche de moteur pour un
ensemble vide serait un contournement de plus. L'axe est nommé ici pour qu'on
sache qu'il a été examiné, pas retenu.

### 2. Trois porteurs. Pas de porteur bâtiment.

Une échéance se porte sur un **équipement**, un **salarié**, ou l'**établissement**.

Le porteur bâtiment n'est pas ajouté, et ce n'est pas un oubli. L'ADR-019 a tranché
que « ce qui se déduit, ne se stocke pas » : `Verification` n'a pas de `batimentId`
parce que le bâtiment d'une échéance se lit en remontant la chaîne par l'équipement.
Aucune obligation de ce lot n'a besoin d'autre chose — `PE 4 § 2` et `R. 4222-20`
sont portées par l'exploitant, pas par un corps de bâtiment. Rouvrir un ADR accepté
pour servir des obligations qui ne sont pas dans le lot serait de l'élargissement
gratuit.

**Le cas qui le demandera vraiment, quand il viendra, est le DTA** — il se déclenche
sur l'année du permis de construire, et un établissement peut occuper deux corps,
l'un de 1970 et l'autre de 2010, dont un seul en doit un. Il est bloqué par **deux**
manques distincts : un porteur bâtiment, **et** un attribut de date de construction
que `Batiment` ne porte pas (`nom`, `complementAdresse`, `ordre`, et rien d'autre).

Ce besoin **n'est pas** celui de l'`EnsembleClasse` que l'ADR-019 réserve. Cette
entité est faite pour les **régimes** — flags ERP/IGH, catégorie, effectif accueilli.
L'année du permis est une propriété physique, indépendante du régime : les deux corps
de l'exemple ci-dessus ont un classement ERP identique. Ranger le DTA dans l'ensemble
classé, ce serait le mettre là où personne ne l'y cherchera. Quand il viendra, il
faudra le décider pour lui-même.

### 3. Le porteur est une union discriminée, pas un champ optionnel

```ts
type DeclencheurEquipement = {
  porteur: "equipement";
  categoriesEquipement: [CategorieEquipement, ...CategorieEquipement[]];
  conditions?: ConditionApplication[];
};

type DeclencheurEtablissement = {
  porteur: "etablissement";
  // pas de categoriesEquipement : l'obligation ne se déclenche sur aucun équipement
  equipementsEnContexte?: CategorieEquipement[];
};
```

Rendre `categoriesEquipement` simplement optionnel perdrait la garantie que le type
offre aujourd'hui — une obligation d'équipement sans catégorie compilerait. L'union
discriminée la conserve des deux côtés : catégorie **requise et non vide** quand le
porteur est un équipement, **interdite** sinon.

`equipementsEnContexte` n'est pas un déclencheur. C'est la liste que l'interface
affiche à titre indicatif sous une obligation d'établissement — « chauffage,
éclairage, installations électriques, appareils de cuisson, ascenseurs… ». Le texte
de `PE 4 § 2` finit par « etc. » ; le produit ne doit pas prétendre le contraire, et
la mention « liste non limitative » accompagne l'affichage.

### 4. Une obligation d'établissement produit UNE ligne, pas N

C'est le point qui commande tout le reste. Décomposer `PE 4 § 2` en une ligne par
installation produirait **zéro ligne** chez les établissements que `PE 2 § 3` vise —
ceux qui n'ont rien déclaré. On corrigerait le faux négatif d'un côté en le
réintroduisant de l'autre, sur l'obligation la plus universelle du corpus.

`PO 1 § 3` confirme par la forme : « l'ensemble des installations techniques […] **à
l'exception** des installations électriques et des systèmes de détection incendie ».
Un tout avec des retraits nommés, pas une énumération. (`PO 1` relève du chapitre IV,
*règles spécifiques aux hôtels* — hors des trois secteurs cibles : il illustre la
forme, il ne justifie pas de contenu.)

### 5. La clé d'identité d'une ligne inclut le porteur — en base **et** en mémoire

C'est le vrai coût du chantier, et il a deux moitiés.

**En base.** `Verification.equipementId` devient nullable, et le
`@@unique([etablissementId, obligationId, equipementId])` ne suffit plus : en
PostgreSQL, deux `NULL` ne se conflictent pas, l'unicité ne s'appliquerait plus aux
lignes d'établissement. L'index est reposé en SQL manuel avec `NULLS NOT DISTINCT`
(PostgreSQL ≥ 15 ; la production est en 17.6). Prisma ne génère pas cette clause :
la migration est éditée à la main et `@@unique` cède la place à un
`@@index` déclaratif plus l'index unique créé en SQL.

**En mémoire, et c'est le piège.** `generateur.ts:472` construit la clé de
réconciliation `${obligationId}::${equipementId}` dans une `Map`, **avant** que
Postgres n'entre en jeu. Avec `null`, deux porteurs distincts produisent la même
clé `"obl::null"` et s'écrasent : une seule ligne survit au plan, et l'autre est
comptée comme disparue du référentiel. `NULLS NOT DISTINCT` ne protège pas de ça.

Une seule fonction produit la clé, des deux côtés :

```ts
export function cleDeLigne(obligationId: string, equipementId: string | null) {
  return `${obligationId}::${equipementId ?? "@etablissement"}`;
}
```

Le sentinelle est préfixé `@` parce qu'aucun `cuid()` ne commence par `@` : la
collision avec un identifiant d'équipement réel est impossible par construction.

### 6. Une échéance sans équipement ne se masque jamais

Plusieurs requêtes filtrent par `equipement: { batimentId }` ou
`equipement: { actif: true }`. Prisma en fait des `INNER JOIN` : une ligne dont
`equipementId` est `null` en **disparaît sans erreur de compilation**. Ce serait
exactement ce que l'ADR-010 et l'ADR-019 interdisent — « les masquer ferait mentir
le calendrier par omission ».

Les **quatre** filtres par bâtiment passent par `porteeBatiment()`
(`src/lib/calendrier/portee.ts`), qui rend
`OR: [{ equipementId: null }, { equipement: { batimentId } }]` : la ligne
s'affiche étiquetée « Tout l'établissement », comme les échéances de niveau
établissement du registre des sources. La règle vit dans **une** fonction, pas
recopiée sur quatre sites — c'est ce qui la rend testable et ce qui empêche le
cinquième site d'oublier.

Un cinquième reste volontairement en jointure interne :
`src/lib/batiments/queries.ts`, qui calcule la charge **par bâtiment**. Une
échéance d'établissement n'est dans aucun bâtiment ; la compter dans chacun
gonflerait autant de pastilles qu'il y a de corps, dans un seul serait
arbitraire. La distinction est celle entre *lister sous un filtre* et
*répartir entre des contenants*.

### 7. L'incertitude ne réduit jamais la couverture

`null` ne vaut pas « non ». Une obligation conditionnée à un attribut
d'établissement non renseigné s'affiche « à confirmer » ; un allègement de régime
conditionné à l'absence de cet attribut ne s'applique pas tant que l'absence n'est
pas déclarée.

C'est **l'inverse** d'`equipement_propriete_booleenne`, où l'absence rend la
condition non satisfaite, et le contraste est volontaire : une propriété
d'équipement absente dit « cet équipement n'a pas cette caractéristique », une
propriété d'établissement absente dit « on ne sait pas encore ».

Deux attributs faisaient l'inverse de cette règle, et étaient recensés ici pour ne
pas être oubliés : `manipuleMatieresR422722` absent lu « non », et
`personnesPresentesHabituellement` absent retombant sur `effectifSurSite`.

**Le second est rentré dans le rang le 2026-09-03** (décision de la propriétaire).
Le moteur ne remplace plus le nombre manquant : il en déduit une borne basse — la
catégorie d'ERP, puis l'effectif salarié — qui ne conclut que vers le haut, et
retient l'obligation « à confirmer » quand elle ne conclut pas et que
l'établissement reçoit du public. Un établissement de travail seul reste comparé à
son effectif, qui y est le total et non une borne. Voir `evaluerPersonnesPresentes`
dans `src/lib/matching/engine.ts`.

**Le premier reste**, et c'est la seule entorse qui subsiste : `champR422734` est
une branche qui ne fait qu'AJOUTER des cas à un champ déjà ouvert par le seuil, si
bien que le silence n'y retire rien tant qu'une autre porte existe. Il en retirerait
le jour où une obligation s'appuierait sur cette branche seule — le corpus
`code-travail-matieres-inflammables.ts` le dit article en main. Toute condition
d'établissement **nouvelle** suit la règle du non-renseigné.

Le canal d'affichage manque : `EcheanceCalendrier.tone` est binaire et
`EvenementGrille.tone` n'a que trois valeurs, `warn` étant pris par « à planifier ».
Aucune obligation de ce lot n'a de condition incertaine — `PE 4 § 2` et
`R. 4222-20` s'appliquent sans condition d'attribut — donc « à confirmer » n'a pas
de porteur visuel à livrer maintenant. Les briques existent quand il le faudra :
`a_confirmer` (`onboarding/deduction-erp.ts`), `indetermine` (`equipements/esp.ts`),
`equipement_propriete_non_infirmee` (`matching/engine.ts`).

### 8. Quatre natures ; une seule est datable aujourd'hui

Une obligation prend l'une de quatre natures : **échéance récurrente**, **état
permanent** à constituer puis maintenir, **obligation ponctuelle**, **obligation
événementielle**. Seule la première produit une ligne de calendrier.

L'état permanent n'a pas de représentation calendaire : `Periodicite.autre` sert de
proxy et le générateur le saute (`generateur.ts:140`), avec pour seule trace le
motif `aucune_echeance_datable`. Ce n'est pas résolu ici.

Cette taxonomie est **orthogonale** à `TypeEcheance` (ADR-016), qui classe l'objet
source — `verification`, `action-duerp`, `permis-feu`… — et non le régime temporel.
Les confondre ferait deux fois le même travail. `TypeEcheance` reste calculé à la
lecture et jamais stocké ; la nature, elle, vit dans le référentiel TypeScript.

### 9. `CSP` et `CSS` entrent dans `SOURCES_LEGALES`

Le Code de la santé publique (DTA, radon, plomb) et le Code de la sécurité sociale
(registre des accidents bénins, déclaration d'AT) sont des sources primaires
consultables sur Légifrance au même titre qu'un article du Code du travail.
L'ajout est additif ; aucune obligation de ce lot ne les cite encore.

## Ce que cet ADR ne décide pas

- **L'entité `Salarie`.** La décision « nominatif » tient — `R. 4544-10` délivre le
  titre d'habilitation à un travailleur désigné, et un suivi par poste produit un
  compteur, jamais une preuve. Mais le porteur salarié ouvre trois chantiers que
  celui-ci n'ouvre pas : la réécriture de `docs/rgpd.md` (**avant** la migration,
  pas après), le dépouillement d'INRS ED 6298, et un onglet Personnel. Il vient
  ensuite. La migration structurelle décidée ici lui sert telle quelle : elle ne
  sera pas à refaire.
- **`Etablissement.locauxSommeil`.** Attribut déclaré, jamais dérivé de `typeErp`
  (la dérivation est incomplète des deux côtés et `typeErp` est nullable — ADR-004).
  Il conditionne `PE 4 § 1`, `PE 28`, `PE 32`, `PE 37` et le régime allégé de
  `PE 2 § 3`. Aucune obligation de ce lot n'en dépend ; il vient avec la première
  qui en dépendra.
- **Le statut `archivee`.** L'ADR-012 laisse ouverte l'idée d'une valeur d'enum ou
  d'un booléen `applicable` plutôt que le marqueur dans le libellé. Ce lot ne
  tranche pas ; il ne l'aggrave pas non plus.
- **La prescription particulière portée par l'établissement.** Elle devient possible
  en base par la nullabilité, mais le formulaire continue d'exiger une catégorie ou
  un équipement (`prescriptions/schema.ts`). Les deux axes sont orthogonaux — la
  prescription dit *d'où vient la règle*, le porteur dit *sur quoi porte l'échéance*
  — et il n'y a pas de collision de mécanisme. Il y a un manque, déjà présent : un
  arrêté municipal prescrivant une visite périodique de l'établissement — le cas
  nominal de `CCH R. 143-45`, cité en tête de l'ADR-014 — n'est aujourd'hui pas
  saisissable. Ce lot le débloque en base ; le formulaire suivra.

## Conséquences

### La migration passe AVANT le code. Sans exception.

Ce n'est pas une recommandation de séquence, c'est une panne si on l'inverse.

`REFERENTIEL_VERSION` change, donc **tous** les établissements sont
désynchronisés et régénèrent leur calendrier à sa prochaine ouverture. La
régénération produit désormais des lignes à `equipementId` nul. Si la colonne
est encore `NOT NULL` en base, l'insertion viole la contrainte, la transaction
entière échoue — et `src/app/etablissements/[id]/calendrier/page.tsx` appelle
`genererCalendrier` **sans `try`/`catch`**. La page du calendrier tombe, pour
chaque utilisateur, à chaque chargement, jusqu'à ce que la migration passe.

Ordre : appliquer `20260827120000_porteur_etablissement`, puis déployer. Le
code lit sans problème une base déjà migrée comme une base qui ne l'est pas —
c'est l'écriture qui exige la colonne nullable.

Au passage, et sans le corriger ici : le chemin de régénération de
`lib/equipements/actions.ts` attrape l'échec et marque le calendrier périmé,
là où celui de la page laisse remonter. Cette asymétrie est antérieure à ce
chantier et le déborde ; elle mérite d'être reprise pour elle-même, parce
qu'une régénération qui échoue devrait dégrader, pas blanchir un écran.


- **L'état de conformité acquis n'est PAS reporté d'une obligation retirée
  vers celle qui l'absorbe.** `reconcilierCalendrier` indexe par
  `obligationId::equipementId` ; rien ne relie un id retiré à son successeur,
  et `OBLIGATIONS_RETIREES.absorbePar` — qui porte pourtant la donnée — n'est
  lu par aucun code. Conséquence pour un dirigeant qui aurait fait sa
  vérification triennale en 2025 : sa ligne est archivée (sa preuve est
  conservée, ADR-012), et une ligne neuve « à planifier », urgente et de
  criticité 5, apparaît pour un acte qu'il vient de faire faire. Aucune ligne
  réalisée ne portait un id retiré au moment du retrait — vérifié en base — donc
  l'effet est nul aujourd'hui. Mais le mécanisme est en place pour la prochaine
  absorption, et ce n'est pas une décision : c'est un manque. Le report suppose
  de trancher ce qu'on fait de N historiques d'équipement fusionnés en une
  ligne d'établissement, ce que ce lot ne tranche pas.
- **Le référentiel change de forme, donc tout le parc se réconcilie.**
  `empreinteReferentiel()` couvre les champs de déclenchement ;
  `REFERENTIEL_VERSION` est incrémentée, et chaque établissement régénère son
  calendrier à sa prochaine ouverture, sans que personne appuie sur un bouton
  (ADR-012). C'est le comportement voulu, mais il n'est pas silencieux : deux lignes
  nouvelles apparaissent chez **tous** les utilisateurs.
- **`porteUnePreuve` devient un point d'extension obligatoire.** Il ne compte
  aujourd'hui que `rapports` et `actions`, et c'est lui seul qui autorise la
  suppression physique d'une ligne (la boucle finale de `reconcilierCalendrier`). Le booléen est calculé
  dans `calendrier/actions.ts:162`, **hors** de la fonction pure qui décide : aucun
  test du générateur ne peut attraper l'oubli. Tout futur porteur de preuve — une
  attestation nominative de salarié, en premier lieu — doit y entrer **dans le même
  commit** que le modèle qui le porte, sous peine de faire disparaître en silence
  une ligne et ce qu'elle prouvait.
- **Le tout absorbe ses fragments.** Trois obligations ont été **retirées** le
  2026-08-27 : `elec-erp-cat5-quinquennale` et
  `cuisson-gaz-installations-triennale` (fragments « électricité » et « gaz »
  de PE 4 § 2), `aeration-travail-entretien-annuel` (fragment « VMC/CTA » de
  R. 4222-20). Aucune n'avait de fondement propre : leur article fondateur
  était celui-là même que le référentiel porte désormais en entier, et le
  découpage n'existait que parce que le modèle exigeait un déclencheur
  d'équipement. Les garder aurait fait, chez un ERP de 5ᵉ catégorie équipé,
  **trois lignes triennales pour un seul acte** — c'est-à-dire maintenu la
  décomposition que le § 4 ci-dessus écarte.

  L'objection est réelle : « l'ensemble des installations techniques » est
  moins actionnable pour un dirigeant que « les installations électriques ».
  La réponse est `equipementsEnContexte`, affiché sous la ligne unique avec la
  mention que la liste n'est pas limitative. Le texte dit « etc. » ; le produit
  ne doit pas prétendre le contraire, et il n'a pas non plus à faire croire
  que ce qu'il énumère épuise ce qui est dû.

  **Aucune preuve n'est détruite, et ce n'est pas une chance.** La
  réconciliation ne supprime physiquement qu'une ligne sans rapport, sans
  action et sans date de réalisation ; toute ligne porteuse d'une preuve est
  archivée, libellé marqué (ADR-012). La garantie est structurelle, pas
  circonstancielle. Constat en base avant le retrait, à titre de vérification :
  six lignes au total, aucune preuve, aucune réalisation.

  Ce que le tout absorbe aussi : la criticité la plus haute de ses fragments
  (5, du gaz) et l'union de leurs réalisateurs. Retirer une option que
  l'utilisateur avait serait une perte silencieuse de plus.

  Les identifiants retirés entrent dans `OBLIGATIONS_RETIREES`
  (`conformite/index.ts`) et un test interdit leur réemploi : un id survit à
  son obligation dans `Verification.obligationId`, et le réemployer
  rattacherait les lignes de l'ancienne à la nouvelle — leurs dates, leurs
  statuts, et les rapports qui y pendent.

- **Les neuf sur-applications ne sont pas levées ici, et c'est délibéré.** Leurs notes annonçaient « à reprendre lorsque le référentiel saura
  porter PE 4 § 2 » ; il le sait désormais. Mais savoir le porter n'est que la
  moitié de la condition. L'autre moitié est un point de droit, article par
  article : ces lignes se disent aussi fondées, chez un employeur, sur le Code du
  travail, qui s'applique indépendamment du classement ERP. Tant que cela n'a pas
  été relu sur Légifrance, les retirer supprimerait chez l'utilisateur des
  échéances dont on n'a pas établi qu'elles ne sont pas dues — et en silence, la
  réconciliation supprimant physiquement toute ligne sans preuve attachée
  (ADR-012). Chacune porte désormais l'état exact de sa condition de levée. La
  relecture réglementaire est un chantier distinct, pas un effet de bord de
  celui-ci.
- **Le mode *explain* sait dire pourquoi une obligation d'établissement
  s'applique**, et rien de plus. Il reste muet sur ce qui **ne** s'applique
  pas : `matchEquipements` rend `ok: false` sans raison, `evaluerObligation`
  rend `null` juste après, et rien ne remonte l'obligation écartée. Une
  première rédaction construisait un message dans cette branche ; il a été
  retiré parce qu'aucun appelant ne le lisait — une explication calculée et
  jamais affichée fait croire que le trou est bouché. Le combler suppose un
  canal de sortie pour les obligations écartées et un écran qui s'en serve ;
  ce n'est pas fait ici.
- **Les deux lignes naissent « à planifier » et basculent « dépassée » le
  lendemain, chez tout le monde à la fois.** *(Depuis le 2026-09-14, plus
  aucun statut ne bascule : `depassee` a quitté l'enum et la ligne « à
  planifier » se lit en retard sur sa date dès le lendemain. L'effet décrit
  ici — tout le parc en retard le même jour — reste exact.)* Sans historique ni mise en
  service — et une obligation d'établissement n'a pas de mise en service —
  le générateur pose `datePrevue = aujourd'hui` et `estUrgent`. À la
  régénération suivante, la date est passée : `depassee`. C'est la convention
  existante pour toute ligne neuve, mais elle n'avait jamais frappé la totalité
  du parc en même temps. Le score et le bandeau « brief » se dégradent d'un
  coup, sans qu'aucun acte n'ait été dû à cette date. Ce n'est pas corrigé
  ici : le point de départ juste d'un premier cycle porté par l'établissement
  est une question ouverte (la date d'autorisation d'ouverture ? la création
  de l'établissement ?), et la trancher à la légère produirait un retard
  inventé — ce que le générateur refuse déjà de faire pour les équipements
  (« un retard calculé sur ce silence serait une invention »).
- **PE 4 § 2 est rangé en domaine `incendie`, ses deux fragments en
  `electricite` et `cuisson_hotte`.** Le filtre par domaine du calendrier ne
  les rassemblera donc jamais : qui filtre « électricité » ne verra pas la
  ligne qui couvre ses installations électriques. Le domaine est un rangement
  d'affichage, et `PE 4` appartient au règlement de sécurité incendie — mais
  le choix a un coût de navigation, et il se rediscutera avec la question du
  double comptage.
- **Un critère d'acceptation externe existe.** Les cinq lignes
  `FONDEMENT_NON_RETENU` de `docs/relecture-referentiel-par-reference-2026-08-27.md` portent sur
  `PE 4` et `R. 4222-20`. Elles doivent s'éteindre d'elles-mêmes. Si elles ne
  s'éteignent pas, le lot est incomplet.
