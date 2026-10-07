# ADR-026 — La nature d'une obligation est un champ, pas une déduction

- Statut : acceptée
- Date : 2026-08-31
- Portée : `src/lib/referentiels/conformite/types.ts`
  (`NatureObligation`, `LIBELLE_NATURE`, `ObligationCommune.nature`,
  `ObligationCommune.pieceAttendue`), les dix-sept fichiers de domaine de
  `src/lib/referentiels/conformite/`, `nature.test.ts`
- Dépend de : ADR-003 (référentiel en TypeScript), ADR-016 (nature d'échéance),
  ADR-022 (déclencheur et porteur), ADR-024 (mécanisme de conséquence)

## Contexte

L'ADR-022 § 8 écrit ceci :

> Une obligation prend l'une de quatre natures : **échéance récurrente**, **état
> permanent** à constituer puis maintenir, **obligation ponctuelle**, **obligation
> événementielle**. […] `TypeEcheance` reste calculé à la lecture et jamais
> stocké ; **la nature, elle, vit dans le référentiel TypeScript**.

Elle n'y vivait pas. `ObligationCommune` n'a jamais porté de champ `nature`, et
`grep -n "nature"` sur les deux fichiers de types ne rendait que de la prose. Ce
qui en tenait lieu était `Periodicite.autre`, dont le même paragraphe dit qu'il
« sert de proxy ».

**Un proxy qui recouvre trois régimes différents n'est pas un proxy, c'est une
confusion.** L'audit du 2026-08-31 (`docs/revues/rapport-audit-sans-surface.md`)
l'a établi sur trois obligations qui portaient la même valeur :

| Obligation | Ce que son propre texte en dit | Régime réel |
|---|---|---|
| `stockage-dangereux-declaration-icpe` | « Étape de qualification initiale » | **ponctuelle** |
| `froid-controle-etancheite-apres-modification` | « elle se déclenche sur un événement […] que l'outil n'observe pas » | **événementielle** |
| `incendie-erp-5-visite-commission` | « les établissements qui en comportent pour le public sont visités TOUS LES CINQ ANS (PE 37) » | **récurrente** |

Toutes trois en `periodicite: "autre"`, donc indiscernables pour toute machine.

Le coût s'est présenté sous une forme concrète. Un brief existait pour un écran
« Ce qui doit être en place »
(`docs/revues/brief-ecran-etats-permanents.md`) : le dirigeant coche, on date la
déclaration. Son critère naturel de sélection était `periodicite === "autre"`. Il
aurait donc offert une case à cocher à vie sur une visite quinquennale décidée
par l'administration, sur une qualification à refaire quand les quantités
changent, et sur un contrôle dû à chaque modification d'un circuit frigorifique.
**L'écran ne pouvait pas être écrit tant que le tri ne pouvait pas être fait.**

## Décision

### 1. `nature` est un champ requis sur `ObligationCommune`

Quatre valeurs, celles de l'ADR-022, désormais énumérées dans
`NATURES_OBLIGATION` :

```ts
export const NATURES_OBLIGATION = [
  "echeance_recurrente",
  "etat_permanent",
  "ponctuelle",
  "evenementielle",
] as const;
```

**Requis, et c'est le point.** C'est la quatrième fois que ce dépôt fait ce
choix — après `transmet` (ADR-024), `pieceMedicale` (ADR-023) et
`referencesLegales` — et pour le même motif, écrit à chaque fois : optionnel, le
champ se serait tu, et l'oubli aurait été la faute naturelle. Requis, l'oubli ne
compile pas. Les cent seize obligations livrées le portent — cent vingt et une
au soir du 2026-09-01, et c'est bien le point : cinq lignes de plus sont
entrées sans qu'aucune puisse omettre sa nature.

### 2. La nature est une propriété du TEXTE, jamais de ce que le produit sait en faire

> **Amendé par l'ADR-039 (2026-10-07)** — sans en changer la règle. Le couple
> `echeance_recurrente` + `autre` reste l'état légitime du TEXTE, et la nature
> comme `periodicite` continuent de dire ce que le texte écrit. Ce qui change :
> « on ne sait pas à quel rythme » n'est plus la fin de l'histoire. Quand le
> texte écrit un rythme vague (« répétée périodiquement », « régulièrement »,
> « périodicité appropriée »), l'obligation reçoit un `rythmeRetenu` — annuel
> par défaut, ou celui d'une norme lue —, affiché comme tel, et c'est
> `periodiciteEffective(o)` qui date la ligne. Le croisement ci-dessous compte
> le texte ; il reste juste.

C'est la règle qui empêche le champ de redevenir un synonyme de `periodicite`.

Une échéance récurrente dont l'article ne chiffre pas le rythme **reste
récurrente**. `L. 4141-2` écrit que la formation à la sécurité est « répétée
périodiquement dans des conditions déterminées par voie réglementaire ou par
convention ou accord collectif de travail » : le texte impose de la refaire, il
délègue seulement le rythme — à un règlement qui ne l'a pas fixé. `R. 4412-11`
écrit que l'exploitant vérifie « régulièrement » l'état de son stockage.

Le couple `nature: "echeance_recurrente"` + `periodicite: "autre"` est donc un
état légitime, et il se lit **« elle revient, on ne sait pas à quel rythme »**.
Quatre obligations le portaient au jour de cet ADR ; trois depuis l'amendement
du soir, ci-dessous.

Réciproquement, la nature ne se déduit pas de la périodicité, et le croisement le
montre :

| | rythme chiffré | `mise_en_service_uniquement` | `autre` |
|---|---|---|---|
| échéance récurrente | 62 | — | 3 |
| état permanent | — | 1 | 29 |
| obligation ponctuelle | — | 6 | 3 |
| obligation événementielle | — | 5 | 7 |

> **Amendement 2026-08-31, soir.** Une case a bougé : `incendie-erp-5-visite-commission`
> est passée de `autre` à `quinquennale`, la relecture de `PE 37` ayant confirmé le
> rythme que cet ADR signalait comme écrit mais non posé (§ *Ce que cet ADR ne
> décide pas*). Récurrentes à rythme chiffré : 61 → 62 ; récurrentes sans rythme
> écrit : 4 → 3. **La démonstration ne bouge pas** — `autre` recouvre toujours
> quatre natures, et c'est le champ `nature` qui a nommé le désaccord jusqu'à ce
> qu'il soit tranché.

> **Recalibrage du 2026-09-01.** Le tableau ci-dessus est le croisement au
> 2026-08-31, sur 116 obligations ; il est conservé tel quel, c'est lui que la
> démonstration commente. Le référentiel en porte **121** au soir du 2026-09-01,
> et la répartition par nature, mesurée en appelant le référentiel : **67**
> échéances récurrentes, **33** états permanents, **9** obligations ponctuelles,
> **12** événementielles. Le croisement avec `periodicite` n'a pas été
> recalculé ; les totaux par nature, si.

Les deux valeurs sans rythme recouvrent chacune trois natures. Un seul sens de
déduction tient, et il est verrouillé par un test : **un rythme chiffré impose
`echeance_recurrente`**, parce qu'un texte qui écrit une durée impose de refaire
l'acte.

### 3. Un article qui porte deux titres est encodé sur celui qui oblige à refaire l'acte

Certains articles en portent deux : « à la mise en service **ou après
modification** » (`R. 4226-14`), « à l'embauche **et chaque fois que
nécessaire** » (`R. 4141-2`), « renouvelée régulièrement **et lors de tout
changement notable** ».

La règle de résolution est, dans cet ordre : `echeance_recurrente`, puis
`evenementielle`, puis `ponctuelle`, puis `etat_permanent`.

Le motif est dans la conséquence, et non dans une hiérarchie abstraite : ce champ
sert à répondre à **« une déclaration unique suffit-elle ? »**. Elle suffit pour
un état permanent et pour une obligation ponctuelle ; elle ne suffit ni pour une
récurrente ni pour une événementielle, qui reviennent. Quand un texte porte les
deux, c'est celui qui revient qui commande — sinon l'écran mentirait.

`echeance_recurrente` passe avant `evenementielle` parce que, lorsque l'acte
revient à rythme, c'est ce rythme qui commande le suivi ; l'événement n'y ajoute
que des occurrences supplémentaires, et les deux excluent également la case
cochée une fois.

**Chaque ligne concernée le dit dans ses `notesInternes`, avec le verbatim.** Pas
de liste centrale : une liste se répare en la recopiant, la note vit avec
l'obligation qu'elle explique.

### 4. `pieceAttendue` nomme l'écrit quand l'écrit EST l'obligation

Second champ requis, `string | null` :

> Le nom que le texte donne à l'**écrit dont l'existence est elle-même
> l'obligation** — registre, carnet, dossier, contrat, consigne, protocole,
> liste, fiche, autorisation. `null` quand l'obligation porte sur un **acte**
> (une vérification, une formation, une visite) ou sur un **état matériel** (de
> l'eau potable, un extincteur accessible).

La distinction n'est pas cosmétique, et la nature ne la porte pas : `R. 4226-19`
et `R. 4224-14` sont tous deux des états permanents, mais le premier impose un
**registre** et le second impose du **matériel**. Seize obligations sur cent
seize portent une valeur.

Elle décide d'un comportement d'écran. Le brief de l'écran des états permanents
pose qu'une déclaration se fait sans pièce, et il a raison pour une affiche au
mur ou pour de l'eau potable. Il a tort pour un registre de sécurité, où une case
cochée sans rien derrière serait exactement la
déclaration-qui-ressemble-à-une-preuve que le même brief interdit dans sa
dernière section. `pieceAttendue` nomme les seize lignes où la case seule ne
suffit pas.

**Ce n'est pas `Transmission.modele_absent`**, et les deux ne se recouvrent pas.
`modele_absent` dit « le produit n'a pas de modèle Prisma pour recevoir cette
pièce », et sa documentation impose que le nom du modèle soit celui que
`docs/registre-securite-ecart.md` lui donne. `pieceAttendue` dit « le texte
exige cet écrit », sans rien préjuger du modèle qui le porterait. La seconde
n'a pas besoin de nomenclature ; c'est ce qui la rend écrivable aujourd'hui —
voir le § *Conséquences*.

### 5. Ni `nature` ni `pieceAttendue` n'entrent dans `empreinteReferentiel()`

L'empreinte détecte qu'une obligation **productrice de lignes** a changé, et
force la réconciliation de tous les calendriers du parc. Ni la nature ni la pièce
attendue ne décident de l'existence d'une `Verification` ou de sa date :
`periodicite` et `porteur` le font, et ils sont dans l'empreinte.

Les y faire entrer réconcilierait tout le parc pour un résultat identique — et,
plus grave, rendrait coûteuse la correction d'une nature mal posée, ce qui est
exactement ce qu'il ne faut pas décourager sur un champ neuf.

`REFERENTIEL_VERSION` n'est donc **pas** incrémentée par ce lot, et
`EMPREINTE_ATTENDUE` ne bouge pas. Deux tests le garantissent : l'un retourne la
nature de toutes les obligations et vérifie que l'empreinte ne bouge pas, l'autre
change une périodicité et vérifie qu'elle bouge — sans le second, le premier
serait vrai d'une empreinte qui ne verrait plus rien.

## Ce que cet ADR ne décide pas

- **Il ne corrige aucune périodicité.** Deux incohérences sont *nommées* par le
  croisement du § 2 et laissées telles quelles, chacune documentée dans les
  `notesInternes` de sa ligne :
  - `incendie-erp-5-visite-commission` est récurrente et `PE 37` en écrit le
    rythme — cinq ans — alors qu'elle porte `autre`. La corriger suppose de
    relire `PE 37` à la source ; une périodicité se pose sur un verbatim, jamais
    sur une description, et ce lot n'a relu aucun texte sur Légifrance.
  - `porte-auto-portail-piete-coulissant` est un état permanent qui porte
    `mise_en_service_uniquement`. Sa propre description le dit depuis le
    2026-08-26 : « C'est une exigence d'installation, non une échéance. » La
    corriger déplacerait des lignes chez tous les utilisateurs équipés d'un
    portail ; cela se décide pour soi-même.
- **Il ne crée aucun écran.** Il rend seulement écrivable le critère de
  sélection dont l'écran des états permanents a besoin.
- **Il n'ajoute pas de forme de `Transmission`.** Le § 3 montre que dix
  obligations portent un second déclencheur — une modification, une réparation,
  un changement de poste — que le produit n'observe pas. Une forme
  `declencheur_absent` les rendrait comptables au même titre que
  `attribut_absent` rend comptables les attributs manquants. Elle n'est pas
  créée ici : elle toucherait l'ADR-024, et la nature `evenementielle` suffit
  déjà à empêcher la faute que ce lot devait empêcher.
- **Il ne touche pas à `TypeEcheance` (ADR-016)**, qui classe l'objet source —
  `verification`, `action-duerp`, `permis-feu` — et non le régime temporel. Les
  deux axes restent orthogonaux, comme l'ADR-022 § 8 l'avait posé.
- **Il ne rouvre pas la typologie à quatre natures.** Elle a tenu sur les cent
  seize obligations, y compris sur les trois cas que l'audit désignait comme
  susceptibles de la faire craquer. Ce qui manquait n'était pas une cinquième
  valeur, c'était la **règle de résolution** du § 3 et le droit de dissocier la
  nature de la périodicité.

## Conséquences

- **`docs/registre-securite-ecart.md` ne pouvait pas porter les deux
  transmissions qu'on lui prêtait, et `pieceAttendue` les porte à sa place.**
  Deux obligations refusent depuis le lot 7 de déclarer `modele_absent`, à la
  même phrase près : « en inventer un ici sans avoir vérifié sa nomenclature
  créerait une référence fantôme ». Ce refus a été vérifié plutôt que levé : les
  huit entrées du § 6 du registre d'écart ont été lues une à une le 2026-08-31,
  et **aucune ne couvre** le document d'organisation des premiers secours
  (`R. 4224-16`) ni le protocole de sécurité de chargement (`R. 4515-4`) — pour
  une raison de fond, ce document étant l'écart d'un **registre de sécurité
  incendie**, où ces deux écrits n'ont pas leur place. Les deux obligations
  avaient donc raison. `pieceAttendue` nomme l'écrit sans inventer de modèle :
  le manque devient lisible par une machine, et la référence reste vraie.
- **La carto est corrigée sur un point.** `docs/carto-obligations-hors-equipement.md`
  range le protocole de sécurité (E14) en `PERM`. `R. 4515-9`, lu en entier, dit
  le contraire : le protocole unique n'est admis que pour des opérations
  répétitives « impliquant les mêmes entreprises », et ne reste applicable que
  « tant que les conditions de déroulement n'ont pas subi de modification
  significative ». La ligne est encodée `evenementielle`. Le document n'est pas
  réécrit ici ; la note de l'obligation porte la correction et la nomme.
- **Deux natures sont posées CONTRE le mot employé par la description de leur
  propre obligation**, et il faut le savoir avant de croire l'une ou l'autre :
  `formation-securite-etablissement-organisation` et
  `formation-securite-etablissement-information` sont toutes deux qualifiées de
  « permanentes » par leur description, alors que leurs articles écrivent
  respectivement « répétée périodiquement » et « chaque fois que nécessaire ».
  Les descriptions n'ont pas été réécrites — ce sont des textes relus, et les
  toucher demanderait de rouvrir leur relecture. Les `notesInternes` portent le
  désaccord et son motif.
- **L'écran des états permanents doit trier sur `nature`, pas sur
  `periodicite`.** Le critère est : `nature === "etat_permanent"` — vingt-neuf
  obligations en `autre`, plus une en `mise_en_service_uniquement` dont la
  périodicité est un défaut connu (trente au 2026-08-31 ; **trente-trois** au
  soir du 2026-09-01, le critère ne changeant pas). **Les quatorze autres des quarante-trois n'y
  ont pas leur place** : quatre reviennent à rythme inconnu, sept se
  redéclenchent sur un fait, trois sont soldées une fois. Il leur faut une
  surface, mais pas celle-là — et c'est le chiffre qui manquait au brief.
- **Le champ est déclaratif et ne se vérifie pas tout seul.** Rien ne peut
  contrôler qu'une nature est *juste* — seulement qu'elle est *cohérente* avec la
  périodicité, ce que fait `nature.test.ts`. La justesse repose sur la lecture du
  texte, et chaque ligne non triviale porte le verbatim qui la fonde dans ses
  `notesInternes`. C'est le même contrat que `criticite`, et la même limite.
