# ADR-039 — Une norme peut donner le rythme, et un rythme vague devient annuel, déclaré comme tel

- **Statut** : acceptée, 2026-10-07 — décisions de la propriétaire (a) et (b)
  du même jour, à la suite de la relecture du préventeur
  (`relecture-jc-2026-10/`). Lot 2 de cette relecture : **le modèle seul**.
  Aucune obligation existante n'est modifiée ici ; le contenu (extincteurs,
  EPI, formation…) est le lot 3.
- **Amende** : ADR-003 (notes de conformité), ADR-023 § 6, ADR-026 § 2,
  ADR-027 (« Ce que la décision interdit »), ADR-032 (le problème, la ligne
  qu'on ne franchit pas). Chacune porte en tête un renvoi daté.
- **Portée** : `src/lib/referentiels/conformite/types.ts` (`SourceLegale`
  `NORME`, `RythmeRetenu`, `ObligationCommune.rythmeRetenu`),
  `conformite/rythme-retenu.ts` (`periodiciteEffective`, les règles, la
  mention), `conformite/index.ts` (empreinte), `corpus/normes.ts` et le statut
  de corpus `norme`, `calendrier/generateur.ts`, `etats-permanents/regle.ts`,
  `matching/prescriptions.ts` et `prescriptions/schema.ts`, et les surfaces qui
  montrent un rythme : calendrier, fiches vérification / équipement / salarié,
  registre et dossier PDF (`LigneVerif`), README du ZIP de contrôle, grille des
  équipements, export de relecture, serveur MCP.

## 1. Le problème

Le dépôt s'interdisait deux choses, par des règles écrites à six endroits
(ADR-003, 023 § 6, 026, 027, 032, `types.ts`, `CLAUDE.md` règle 6) :

1. **citer une norme** — NF, EN — comme source d'une obligation ou d'un rythme,
   au motif qu'« une norme n'est pas opposable » ;
2. **poser un rythme que le texte ne chiffre pas** — « périodicité inventée ».

La conséquence, relevée par le préventeur le 2026-10-07 : là où le texte dit
« entretenus et vérifiés suivant une périodicité appropriée » (`R. 4224-17`),
« maintenus en bon état de fonctionnement » (`R. 4227-29`), « maintenus en état
de conformité » (`R. 4322-1`), « répétée périodiquement » (`L. 4141-2`), Rojer
ne montrait **aucune échéance**. Le texte impose pourtant de refaire l'acte ;
il délègue seulement le rythme. Un dirigeant non expert lit l'absence de date
comme l'absence d'obligation, et c'est l'erreur la moins visible de toutes :
personne ne s'aperçoit d'une échéance qui n'existe pas.

Les extincteurs sont le cas d'école : la vérification annuelle d'un extincteur
hors ERP vient de la NF S 61-919, § 5.1.1 — « La personne compétente doit
effectuer tous les ans, avec une tolérance de plus ou moins deux mois, la
maintenance, conformément au présent document. » Le dépôt l'avait retirée le
2026-08-27 comme « norme non opposable ».

## 2. La décision

### (a) « Rien qui ne soit pas légal » inclut la norme

Une norme (NF, EN) **peut fonder une obligation ou un rythme**, même si aucun
texte ne la rend obligatoire. Elle est citée **comme norme** — intitulé,
édition, paragraphe ou annexe —, **jamais présentée comme un article de loi**.

- Une source `NORME` entre dans `SOURCES_LEGALES`, libellée « Norme ».
- Une référence `NORME` a, comme toute référence, une clé `article` présente
  dans un corpus lu : le corpus `corpus/normes.ts`. Le statut de corpus
  `norme` dit « lue ; c'est une norme ; Rojer peut en retenir le rythme » et
  nomme les obligations qui le retiennent (vide tant que le lot 3 n'a rien
  posé). Ce n'est ni `retenu` (qui dit qu'un article de droit fonde une
  obligation) ni `sans_objet` (une norme qui donne un rythme n'est pas sans
  objet).
- **Une norme lue indirectement ne fonde rien.** NF C 18-510 est entrée au
  corpus parce que l'arrêté du 5 juillet 2024 la cite comme norme
  « recommandée » au titre de `R. 4544-3` ; son texte n'a pas été lu, son
  paragraphe de recyclage est « à préciser », et sa lecture est `indirect`. Un
  rythme retenu ne peut pas la citer tant qu'elle n'a pas été lue à la source.
- APSAD, CACES, recommandations CNAM : **inchangé**. Ce ne sont pas des normes
  au sens de cette décision ; la ligne de l'ADR-032 tient pour elles.

### (b) Un rythme vague devient « au moins une fois par an », affiché comme défaut

Quand un texte impose une vérification, un entretien ou une action
**récurrente** avec un rythme vague — « périodicité appropriée », « adaptée »,
« régulièrement », « répétée périodiquement », « maintenus en bon état / en
état de conformité » —, Rojer retient **au moins une fois par an**.

- **Un rythme écrit l'emporte toujours** — celui du texte, puis celui d'une
  norme. Le défaut annuel ne sert que là où rien n'est écrit.
- Le défaut est **affiché comme défaut** : « Le texte dit « périodicité
  appropriée » ; rythme retenu par défaut : annuel ». Jamais comme cité.
- « Chaque fois que nécessaire » est un **déclencheur événementiel**, pas un
  rythme vague : hors règle (nature `evenementielle`, ADR-037).

## 3. Le modèle

### `periodicite` reste le rythme du TEXTE

Le champ ne change pas de sens : il dit ce que le texte écrit, et `autre` reste
la bonne valeur pour « répétée périodiquement ». Le rythme retenu vit à côté :

```ts
type RythmeRetenu =
  | { motif: "norme"; periodicite: Periodicite; norme: string;
      reference: ReferenceLegale /* source NORME */; texteVague?: string }
  | { motif: "defaut_annuel"; periodicite: "annuelle"; texteVague: string };

ObligationCommune.rythmeRetenu?: RythmeRetenu;
```

Règles, tenues par `controlerRythmeRetenu` et ses tests :

1. **interdit si `periodicite` n'est pas `autre`** — un rythme chiffré du texte
   l'emporte, et `mise_en_service_uniquement` n'est pas un rythme vague ;
2. **interdit sur une obligation `evenementielle` ou `ponctuelle`** — un fait
   ou un acte unique n'a pas de rythme à retenir ;
3. `motif: "norme"` exige une référence de source `NORME`, dont la clé est au
   corpus des normes, lue autrement qu'indirectement, et dont la citation
   commence par l'intitulé `norme` ;
4. `motif: "defaut_annuel"` exige `periodicite: "annuelle"` (le type le tient
   aussi) et un `texteVague` **recopié mot pour mot** d'une citation du corpus
   pour l'une des références de l'obligation.

### Une seule fonction dit le rythme effectif

`periodiciteEffective(o)` rend `o.rythmeRetenu?.periodicite ?? o.periodicite`.
Elle est la seule lecture du rythme qui décide d'une ligne : générateur
(référentiel, titres de salarié, premier pas), `periodicitesEffectives` du
réconciliateur, états permanents (`estEtatADeclarer`, `estFaitADater`,
`modeDeclaration` : leur valeur par défaut est désormais le rythme effectif),
prescriptions, guide, grille, export, MCP, fiches. La surcharge d'une
prescription se pose **par-dessus**, comme avant.

### L'empreinte

`rythmeRetenu` décide de l'existence et de la date d'une ligne : il entre dans
`empreinteReferentiel()`. Il y entre **seulement quand il est présent**, en
segment ajouté : une obligation sans rythme retenu produit exactement la même
chaîne qu'avant, donc ce lot ne déplace ni l'empreinte ni
`REFERENTIEL_VERSION`. Le lot 3, qui en posera, la déplacera — c'est voulu.

### Une ligne sans rythme qui en reçoit un

Une obligation `autre` qui reçoit un rythme retenu **passe de l'écran « Ce qui
doit être en place » au calendrier**, exactement comme sous une prescription
qui lui donne un rythme (ADR-027, `estSansRendezVous` appelé avec le rythme
effectif). Une surface, jamais deux : c'est la règle de l'ADR-027 qui tient,
seule sa prémisse — « aucun texte n'écrit de rythme, donc aucune relance » —
est amendée. La ligne naît « à planifier » à l'origine de son suivi (ADR-036,
règles 4 et 5) : **aucun retard rétroactif**, la date de déclaration « en
place » antérieure n'est pas réinterprétée comme une réalisation.

C'est vrai pour un état permanent (« maintenus en bon état ») comme pour une
échéance récurrente sans rythme (« répétée périodiquement ») : la décision (b)
nomme les deux.

### Préséance avec une prescription

- Face à un rythme **du texte**, une prescription n'est retenue que si elle est
  **strictement** plus stricte (inchangé, ADR-035).
- Face à un rythme **retenu** (norme ou défaut), une prescription est retenue
  dès qu'elle est **au moins aussi stricte**. Motif : le rythme retenu est un
  choix de Rojer, pas un acte ; une demande d'assureur ou un arrêté qui fixe
  le même rythme est une raison plus forte que la nôtre et doit rester
  visible — marquée contractuelle (ADR-032) ou d'autorité. L'écarter comme
  « rattrapée par le référentiel » ferait disparaître la seule trace d'un
  engagement réel derrière un défaut. Plus stricte, elle s'applique de toute
  façon.
- Une ligne surchargée par une prescription ne porte **pas** la mention de
  rythme retenu : son rythme est celui de la prescription.

`prescriptionRenforce(p, o)` porte cette règle une fois, pour le moteur et pour
le formulaire.

## 4. La mention

Deux formes, écrites une fois (`conformite/rythme-retenu.ts`), rendues par un
composant (`MentionRythmeRetenu`, sur le modèle de `MentionContractuelle`) et
par les surfaces texte (PDF, README, grille, export, MCP) :

- « Rythme de la norme NF S 61-919 » — en long, la référence complète ;
- « Rythme retenu par défaut » — en long, « Le texte dit « périodicité
  appropriée » ; rythme retenu par défaut : annuel. »

Elle ne qualifie pas : ni « opposable », ni « valeur légale »
(`sans-qualification.test.ts`).

## 5. Ce que la décision n'autorise pas

- Encoder un **référentiel privé** comme domaine d'obligations : APSAD, CACES.
- Un rythme retenu **sans** marquage, sur quelque surface que ce soit.
- Un défaut **plus strict** qu'annuel. Le défaut est un plancher (« au moins
  une fois par an »), pas une estimation du bon rythme ; un rythme plus serré
  doit être écrit — par un texte, une norme ou une prescription.
- Un `texteVague` paraphrasé. S'il n'est pas dans une citation lue, le test
  échoue : c'est ce qui empêche le défaut de s'appliquer à un texte qui ne dit
  rien du tout.

## 6. Conséquences

- Le lot 3 pose les rythmes retenus (extincteurs hors ERP : NF S 61-919 ; EPI,
  formation annuels selon les corrections du préventeur), et déplace l'empreinte.
  [2026-10-07, lot 3 livré (`lot/relecture-jc-3`, référentiel `2026-10-07.4`
  sur la branche, 174 + 5 − 0 = 179 ; servi sous `2026-10-07.5` avec les quatre
  autres lots de la relecture, 171 obligations) : neuf obligations portent un rythme retenu — trois de la
  NF S 61-919, six par défaut annuel. Partout où l'ERP a un rythme écrit pour
  le même acte, la ligne de lieu de travail porte `erp: false` (partition de
  typologie, pas `ExclusionMutuelle`). « À 5 et 15 ans » s'exprime sans
  étendre le modèle : `premierDelai` + rythme retenu. Les gardes qui lisaient
  `o.periodicite` là où le rythme effectif décide (anti-doublon, frontière
  calendrier / écran « en place ») lisent `periodiciteEffective`. Détail :
  journal, C59.]
- `nature.test.ts` : « un rythme chiffré impose `echeance_recurrente` » reste
  lu sur `periodicite`, le rythme du texte ; un état permanent à rythme retenu
  garde sa nature.
- Les comptes de l'ADR-026 (§ 2, croisement nature × périodicité) restent
  justes : ils comptent le texte.
