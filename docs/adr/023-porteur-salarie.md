# ADR-023 — Le salarié porte ses titres, et l'outil n'en garde que l'échéance

- Statut : acceptée
- Date : 2026-08-27
- Portée : `prisma/schema.prisma` (`Salarie`, `Verification.salarieId`, l'index
  d'unicité), `src/lib/referentiels/conformite/types.ts`,
  `src/lib/matching/engine.ts`, `src/lib/calendrier/generateur.ts`
  (`cleDeLigne`), la migration `porteur_salarie`
- Dépend de : ADR-005 (auth), ADR-010 (registre des sources d'échéances),
  ADR-012 (conservation des preuves), ADR-016 (nature d'échéance),
  ADR-022 (porteur d'échéance)
- Préalable levé : `docs/rgpd.md`, réécrit le 2026-08-27 **avant** cette
  migration, comme son propre encadré de péremption l'exigeait

## Contexte

L'ADR-022 a livré deux porteurs sur trois et réservé le troisième : « `salarie`
n'est pas encore une valeur : il ouvre la réécriture de `docs/rgpd.md`, le
dépouillement d'ED 6298 et un onglet Personnel. L'union est faite pour
l'accueillir **sans rien changer d'autre**. »

Cette dernière phrase était fausse, et l'instruction de ce lot l'a montré. Trois
ruptures attendaient, dont aucune ne produit d'erreur de compilation :

1. **`engine.ts`** — la branche non-équipement est écrite en négation
   (`if (!estPorteeParEquipement(o))`) et conclut `porteur: "etablissement"` **en
   dur**. Une obligation à porteur salarié aurait été silencieusement
   requalifiée en obligation d'établissement.
2. **`generateur.ts`** — la boucle des porteurs est un ternaire, pas une
   analyse de cas exhaustive : tout ce qui n'est pas `"etablissement"` retombe
   côté équipement. Un porteur salarié aurait produit **zéro ligne**, ce qui est
   exactement le faux négatif muet que l'ADR-022 existe pour supprimer.
3. **`cleDeLigne`** — deux paramètres, une sentinelle. Deux salariés porteurs de
   la même obligation auraient produit la même clé ; la réconciliation en aurait
   pris un pour disparu et l'aurait archivé, voire supprimé. L'ADR-022 avait
   prédit ce cas **mot pour mot** dans le commentaire de cette fonction, sans le
   traiter.

En base, la sémantique est aujourd'hui binaire : `equipementId` non nul vaut
« équipement », nul vaut « établissement ». Il n'y a pas de colonne
discriminante, donc **le troisième porteur ne peut pas se faire en surchargeant
ce `null`**.

## Décision

### 1. `Salarie` est une entité, minimale et nominative

```prisma
model Salarie {
  id              String   @id @default(cuid())
  etablissementId String
  nom             String
  prenom          String
  poste           String?
  entreLe         DateTime?   // date d'entrée dans l'effectif
  actif           Boolean  @default(true)
  echeances       Verification[]
}
```

Cinq champs, et le compte est le point. Ce qui n'y est **pas** est aussi décidé
que ce qui y est : pas de date de naissance, pas de NIR, pas d'adresse, pas de
coordonnées privées, pas de rémunération. Aucune obligation de santé-sécurité
n'en a besoin, et les demander « au cas où » ferait de ce produit un fichier du
personnel, ce qu'il n'est pas.

`entreLe` est optionnel et sert un usage précis : c'est le point de départ des
obligations « à l'embauche » — formation à la sécurité, visite d'information et
de prévention. Sans lui, ces obligations n'auraient d'autre date de départ que
« aujourd'hui », c'est-à-dire un retard inventé le jour de la saisie.

`actif` plutôt qu'une suppression : un salarié qui quitte l'entreprise garde ses
titres tant qu'ils sont dans leur délai de conservation. C'est cette trace qui
prouve qu'il était habilité **au moment où il a opéré**, et c'est elle qui
protège l'employeur lors d'un contrôle portant sur une période passée
(`docs/rgpd.md` § 4.3).

### 1 bis. Les instances viennent d'une déclaration, pas d'une dérivation

C'est la correction que l'instruction a imposée à ce lot, et elle rectifie une
hypothèse implicite de l'ADR-022.

Le moteur de matching dérive les obligations d'équipement d'un fait déclaré : la
catégorie de l'appareil. **Il n'a aucun fait équivalent pour un salarié.** Rien
ne dit qu'une personne opère sur des installations électriques, conduit un
chariot ou travaille en hauteur : c'est le cinquième déclencheur — « activité
réellement exercée » — qui le dirait, et il n'est pas implémenté.

Appliquer `R. 4544-11-1` à tout l'effectif parce qu'il existe une installation
électrique serait un **faux positif de masse** : l'outil réclamerait une
attestation médicale à la caissière comme à l'électricien. Ce serait pire que le
faux négatif que l'ADR-022 vient de corriger — un faux négatif prive d'une
information, un faux positif en noie mille.

**Décision** : une obligation à porteur salarié est déclarée applicable *à une
personne donnée* par l'employeur, qui seul sait qui fait quoi. Le référentiel
fournit le catalogue — la nature du titre, sa périodicité quand un texte en
porte une, ses références légales ; l'employeur fournit le fait — « cette
personne détient ce titre, délivré à cette date ».

Le précédent est dans le dépôt : c'est exactement ainsi que fonctionnent les
attestations d'un prestataire (`src/lib/prestataires/`). L'outil ne devine pas
qu'un prestataire doit une attestation URSSAF, il l'inscrit et en suit
l'échéance.

Conséquence sur le type : `porteur: "salarie"` reste une propriété de
l'**obligation** — elle dit que cette obligation est nominative par nature, et
c'est vrai indépendamment de qui la détient. Ce qui change est la provenance des
**instances** : elles ne sortent pas de `determineObligationsApplicables`, qui
ne connaît que l'établissement et ses équipements.

### 2. Ce que l'outil ne stocke pas d'une pièce médicale

Trois choses seulement : qu'elle existe, sa date, son échéance. Jamais le
motif, jamais le sens détaillé, jamais le fichier.

C'est **plus strict que le droit** : `R. 4544-11-1` autorise expressément
l'employeur à conserver copie de l'attestation d'absence de contre-indication.
Le choix est assumé et motivé dans `docs/rgpd.md` § 2.3. Il est révisable, mais
il ne doit pas se défaire par inadvertance : **ajouter un champ de téléversement
sur une échéance médicale suffirait à le défaire**, sans que personne ne
tranche quoi que ce soit.

### 3. La clé d'identité d'une ligne devient un triplet

`cleDeLigne` prend désormais le porteur, pas seulement l'équipement :

```ts
cleDeLigne(obligationId, { equipementId, salarieId })
```

avec la sentinelle `@etablissement` quand les deux sont nuls. Le `@` reste
impossible dans un `cuid()`, donc aucune collision avec un identifiant réel.

La même règle vaut en base : l'index unique passe à quatre colonnes
(`etablissementId, obligationId, equipementId, salarieId`) et conserve sa clause
`NULLS NOT DISTINCT`, que Prisma ne sait toujours pas exprimer. La migration la
réécrit à la main, sous le même nom, et
`src/lib/migrations-contraintes.test.ts` continue de vérifier qu'elle y est et
qu'aucune migration ultérieure ne la retire.

Le nom de l'index **change** : Prisma tronque à 63 caractères, `_key` compris,
d'où `…_equipementId_sala_key`. C'est bien le nom qu'il attend, donc
`migrate diff` ne voit aucune dérive — mais ce n'est pas le même qu'avant, et le
test ne peut donc pas suivre un nom figé. Il cherche la clause sur la
**dernière** migration qui pose l'index : la chercher dans l'historique cumulé
la trouverait pour toujours dans une migration ancienne, et ne prouverait plus
rien du schéma courant.

**Une contrainte CHECK complète le dispositif** : `equipementId` et `salarieId`
ne peuvent pas être renseignés ensemble. Une ligne a un porteur, pas deux. Comme
le XOR d'origine des actions (ADR-002), elle n'est pas exprimable en Prisma et
vit dans le SQL — donc elle est testée là où les autres le sont.

### 4. Le porteur se lit par analyse de cas exhaustive, jamais par négation

`porteurDe(o)` reste le seul lecteur autorisé, et les deux points de bascule
cessent d'être des ternaires :

- `engine.ts` teste le porteur **cas par cas, en retours anticipés**, et non
  par un `switch` : `porteur === "salarie"` rend `null`, `porteur ===
  "etablissement"` a son bloc, et le cas équipement qui reste est gardé par
  `estPorteeParEquipement(o)`. C'est cette garde qui tient lieu d'analyse de
  cas : une quatrième valeur de porteur y rendrait `false` et l'obligation
  serait **écartée bruyamment**, jamais requalifiée en silence dans le cas
  précédent.
- `generateur.ts` porte le `switch`, pour choisir ce sur quoi il boucle : un
  équipement, un salarié, ou rien. Il **a** une branche par défaut, et c'est sa
  valeur : elle affecte `oa.porteur` à un `never` — donc la disparition d'un
  `case` cesse de compiler — puis lève en nommant l'obligation et la valeur
  fautive. Le défaut ne conclut pas à la place d'un cas manquant, il refuse.

*(Rédaction corrigée le 2026-08-28 : ce paragraphe attribuait le `switch` à
`engine.ts` et affirmait qu'aucune branche ne concluait par défaut. Les deux
étaient faux — le `switch` est dans `generateur.ts` et son `default` est
délibéré. Le principe, lui, tient : le porteur se lit par analyse de cas, et
jamais par négation.)*

Ce n'est pas du style. Une négation (`!estPorteeParEquipement`) est une porte
qui s'ouvre à tout ce qu'on ajoutera ensuite, et qui l'attribue au cas précédent
sans le dire. C'est précisément ce qui aurait cassé ici.

**Le motif s'est rejoué le 2026-08-28, sur le même sujet et dans le même
sens.** `typeDeVerification()` — le lecteur qui déduit la nature d'une ligne de
son porteur (§ 7, amendement) — a d'abord été écrit
`salarieId === null ? "verification" : "titre-salarie"`. Une négation, encore :
tout ce qui n'est **pas** exactement `null` conclut au titre. Un objet dont le
`select` omet `salarieId` porte `undefined`, et rangeait donc **toutes** les
vérifications d'équipement en famille « Personnel » — sans erreur de
compilation, la signature promettant `string | null`. Le défaut a été trouvé
par un test existant, pas par relecture.

La règle se formule donc plus largement que « pas de ternaire » : **le test
porte sur le cas qu'on affirme, pas sur son complément.** Il faut un
identifiant pour conclure au porteur salarié ; son absence, sous quelque forme
qu'elle se présente, vaut « pas de porteur salarié ». Une nullité écrite en
négation n'est pas une analyse de cas, c'est la même porte, plus étroite.

### 5. `porteUnePreuve` accueille l'attestation nominative dans le même commit

L'ADR-022 le posait en obligation : « Tout futur porteur de preuve — une
attestation nominative de salarié, en premier lieu — doit y entrer **dans le
même commit** que le modèle qui le porte, sous peine de faire disparaître en
silence une ligne et ce qu'elle prouvait. »

**Rien n'était à faire, et il faut dire pourquoi plutôt que de le laisser
croire.** Ce lot n'introduit aucun porteur de preuve nouveau : une ligne à
porteur salarié reçoit ses rapports et ses actions par les mêmes relations que
les autres (`Verification.rapports`, `Verification.actions`), donc
`porteUnePreuve` la couvre sans modification. L'obligation de l'ADR-022 est
respectée par constat, pas par ajout.

Elle se rouvrira au premier modèle qui portera une preuve **hors** de ces deux
relations — un justificatif attaché au `TitreSalarie` plutôt qu'à l'échéance,
par exemple. Le piège reste donc entier : le booléen est calculé dans
`calendrier/actions.ts`, **hors** de la fonction pure qui décide de la
suppression, et aucun test du générateur ne peut attraper l'oubli.

### 6. L'habilitation électrique est un état permanent, pas une échéance

C'est la décision de contenu de ce lot, et elle repose sur une relecture en
première main du 2026-08-27.

`elec-travail-habilitation-personnel` est encodée `triennale`. **Aucun texte ne
porte ce chiffre.** Vérifié :

- `R. 4544-9` (01/07/2011) : les opérations « ne peuvent être effectuées que par
  des travailleurs habilités ». Aucune périodicité.
- `R. 4544-10` (01/10/2025) : « L'employeur délivre, maintient ou renouvelle
  l'habilitation **selon les modalités contenues dans les normes** mentionnées
  à l'article R. 4544-3. » Aucun chiffre.
- `R. 4544-3` (01/07/2011) : ces normes contiennent « les modalités
  **recommandées** pour leur exécution ».

Le Code prescrit donc de suivre des modalités qu'il qualifie lui-même de
recommandées, et n'écrit aucune durée. Le triennal vient de la NF C 18-510 —
une norme, que le référentiel exclut comme source opposable.

**Décision** : l'habilitation passe en `periodicite: "autre"` — un état
permanent à constituer puis maintenir, sans échéance datée. Et la ligne datable
devient l'**attestation médicale quinquennale** de `R. 4544-11-1`, dont les cinq
ans sont écrits dans le texte.

Le dépôt a déjà tranché ce cas de figure, et cette décision s'y aligne plutôt
que d'en inventer une : le Kbis d'un prestataire est délibérément suivi sans
statut d'expiration, au motif que « le texte n'assortit pas la pièce d'une
périodicité citable […] le produit informe, il ne décrète pas »
(`src/lib/prestataires/vigilance.ts`).

**Ce que l'utilisateur perd, et il faut le dire** : une ligne d'échéance à trois
ans qu'il voyait jusqu'ici. Ce qu'il gagne : elle est remplacée par une échéance
réelle — l'attestation médicale — et par un état permanent qui dit ce que le
droit dit vraiment. Une échéance inventée dans un outil de conformité est pire
qu'une échéance absente : elle se présente à un contrôle.

### 7. Une échéance de salarié n'a pas de lieu

Elle porte `equipementId: null`, donc `porteeBatiment()` la laisse passer sous
tous les filtres par bâtiment — comme les échéances d'établissement, et pour la
même raison (ADR-010 : « les masquer ferait mentir le calendrier par
omission »).

**Elle ne rejoint PAS la famille `personnel`, et ces deux paragraphes ont
longtemps affirmé le contraire.** Rectifié le 2026-08-28, après vérification :

- `FAMILLE_DE_TYPE` ne rend `personnel` pour aucun type. Le commentaire de
  `calendrier/echeances.ts` dit toujours « réservée aux modules à venir ». La
  famille reste orpheline.
- `FAMILLES_FILTRABLES`, dans la page du calendrier, garde ses quatre entrées
  et exclut toujours `personnel`.

**Le produit est cohérent malgré tout, et c'est pourquoi personne ne l'a vu :
les deux manques se compensent.** Faute de famille rattachée, une échéance de
titre tombe dans `controle` — donc elle s'affiche, se compte dans les retards,
et reste filtrable. Rien n'est cassé.

**Corriger l'un sans l'autre casserait le filtre** : rattacher le type à
`personnel` sans ajouter la famille à `FAMILLES_FILTRABLES` rendrait les
échéances de titres visibles dans « Tout » mais infiltrables — exactement le
défaut que ce paragraphe prétendait avoir corrigé. Les deux changements vont
ensemble, ou aucun.

Reste que `controle` porte le badge « Contrôles matériel », qui « nomme ce qui a
un calendrier réglementaire d'équipement » : une attestation médicale n'en est
pas un. C'est le vrai motif de rattacher un jour la famille `personnel`, et il
est consigné au registre de la dette.

**Amendement du 2026-08-28 — la dette est levée, et les deux changements sont
partis ensemble.** Ce qui précède décrit l'état antérieur ; il reste écrit
parce qu'il énonce le piège. Ce qui a changé :

- `FAMILLE_DE_TYPE` rattache un type nouveau, `titre-salarie`, à `personnel`.
  Il se déduit du porteur écrit sur la ligne (`Verification.salarieId`), par
  `typeDeVerification()` — jamais du référentiel : une obligation retirée
  rendrait la nature indéterminable sur une ligne pourtant bien là.
- `FAMILLES_FILTRABLES` prend `personnel` et **quitte la page** pour
  `calendrier/echeances.ts`, à côté de `FAMILLE_DE_TYPE`. Les deux listes se
  sont contredites sans que rien ne le dise ; un test tient désormais
  l'invariant — aucune famille produite par un type n'est absente du filtre.
- **Un troisième point, que ni l'audit ni cet ADR n'avaient vu** :
  `repartirRetards` posait `parFamille.controle = verifsEnRetard` en bloc.
  Sans le scinder, le compteur aurait attribué à « Contrôles » des lignes
  devenues « Personnel ». Il prend maintenant une ventilation par nature, et
  `compterEtatCalendrier` la produit d'une seule lecture.

Ce que l'utilisateur voit : la pilule « Titres du personnel » apparaît et
filtre ; la ventilation du board et la phrase du brief nomment les titres au
lieu de les fondre dans les vérifications ; la fiche d'une ligne de titre cesse
d'afficher le pictogramme des contrôles. Le compteur de retards du rail garde
sa valeur — il est de toute façon annoncé toutes familles confondues.

**Ce que l'utilisateur ne voit PAS, et qu'une première rédaction de cet
amendement annonçait à tort** : le badge « Contrôles matériel » ne cesse rien,
parce qu'**il n'existe plus**. L'ADR-015 l'a retiré du rail, qui ne porte
qu'`enRetardTotal` ; la chaîne ne figure plus dans aucun texte rendu, seulement
dans des commentaires et des noms de tests. Et `RetardsParFamille.verifications`,
le champ qu'il lisait, **n'a plus aucun lecteur** hors tests : sa correction est
juste et sans effet visible. *(Le champ est retiré le 2026-09-17,
`lot/salarie-inactif-et-menage`.)*

La leçon vaut d'être gardée : le commentaire de `retards.ts` décrivait ce badge
au présent bien avant ce lot. Un commentaire périmé qui dort est une dette ; le
promouvoir en effet utilisateur constaté, sans vérifier que la chaîne existe
encore à l'écran, en fait une affirmation fausse dans un document de décision.
La règle du dépôt — ouvrir le fichier avant de qualifier ce qu'il contient —
vaut aussi pour ce qu'on hérite d'un commentaire.

`REFERENTIEL_VERSION` **n'a pas bougé** : `empreinteReferentiel()` ne hache que
l'identifiant, la périodicité, le libellé, les réalisateurs, les typologies,
les conditions, les catégories d'équipement, le porteur et
`equipementsEnContexte`. Ce lot ne touche aucun de ces champs — la nature est
déduite à la lecture, rien n'est écrit en base — donc aucune réconciliation de
parc n'est déclenchée.

## Ce que cet ADR ne décide pas

- **Le contenu au-delà d'une obligation.** Les 19 lignes à porteur salarié
  recensées dans `docs/carto-obligations-hors-equipement.md` attendent leur
  dépouillement. Le corpus n'a **rien** sur `R. 4141-*` (formation à la
  sécurité), `R. 4624-*` (suivi médical), `R. 4224-14` à `-16` (secourisme),
  `R. 4323-55` et `-56` (autorisation de conduite), ni sur le CACES. Ce lot
  livre le modèle et **une** obligation nouvelle — l'attestation médicale de
  `R. 4544-11-1`, seul verbatim relevé en première main du périmètre salarié.
  Le référentiel passe de 84 à 85. Le reste est un lot de contenu.
- **INRS ED 6298.** La brochure est un point d'entrée, pas une source :
  les articles qu'elle cite seront relus sur Légifrance avant tout encodage.
  À noter que la « liste des 13 formations » n'existe nulle part — c'est un
  total, dans un tableau dont deux autres cases ne bouclent plus. Le lot de
  contenu devra produire la liste, pas la citer.
- **L'export par personne et le texte d'information des salariés**
  (`docs/rgpd.md` § 5.3). Dus dès que des salariés réels sont saisis.
- **La journalisation des accès** aux données de salariés. Sans objet tant qu'il
  n'y a qu'un compte par entreprise ; due avec le multi-utilisateur.
- **Le report de l'état de conformité** d'une obligation retirée vers celle qui
  l'absorbe — manque hérité de l'ADR-022, inchangé ici.

## Conséquences

- **La migration passe avant le code, sans exception**, pour la raison exposée
  dans l'ADR-022 : `REFERENTIEL_VERSION` change, tout le parc régénère à la
  prochaine ouverture du calendrier, et cette page appelle `genererCalendrier`
  sans `try`/`catch`.
- **L'entrée de rail « Équipe » devient active.** Son commentaire actuel la
  justifie par le multi-utilisateur — un sujet distinct, et hors périmètre. Le
  motif est corrigé en même temps que le lien, sans quoi la prochaine lecture
  conclura que le multi-utilisateur est arrivé.
- **`Users` cesse d'être une icône univoque.** Elle désigne déjà les
  prestataires dans le rail, la famille `personnel` au calendrier et le type
  `attestation`. Le fichier pose pourtant la règle inverse : « la même icône ne
  peut pas nommer un objet ici et une action là ». Le type nouveau en prend une
  autre.
- **Une obligation cesse d'avoir une échéance datée en production.**
  `elec-travail-habilitation-personnel` **garde** son porteur équipement et son
  déclencheur `INSTALLATION_ELECTRIQUE` — une première rédaction de cet ADR
  disait qu'elle « passe par salarié », c'était faux. Seule sa `periodicite`
  passe de `triennale` à `autre`.
  L'effet est réel malgré tout : une obligation en `autre` ne produit aucune
  ligne, donc ses lignes existantes n'apparaissent plus dans ce que le
  générateur rend. La réconciliation sait désormais distinguer ce cas d'un
  retrait — sans quoi elle les aurait barrées d'un « Ne s'applique plus »
  factuellement faux. Sans preuve, elles sont supprimées : elles n'auraient
  jamais dû porter de date. Avec une preuve, elles restent, telles quelles.

  **Constat en base, fait le 2026-08-27 avant la migration** :
  `elec-travail-habilitation-personnel` porte **3 lignes**, dont **0 réalisée**,
  **0 rapport** et **0 action**. Aucune preuve n'est donc en jeu ; les trois
  lignes seront supprimées physiquement à la première régénération, sans
  avertissement à l'utilisateur — c'est la limite de l'ADR-012 rappelée
  ci-dessus, pas un effet de ce lot. Le chiffre est daté : il doit être
  re-constaté si la migration est appliquée bien plus tard.
