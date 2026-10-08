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
  rythme retenu ne peut pas la citer tant qu'elle n'a pas été lue à la source. [Amendé le
  2026-10-08 — § 8 : sauf rythme relevé par le préventeur.]
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

> **Amendé le 2026-10-08 — ADR-040.** La promesse n'était tenue qu'à moitié :
> daté de l'origine, un « à planifier » est en retard dès le lendemain
> (ADR-011 § 5), si bien que chaque ligne née de ce lot passait au rouge à J+1
> chez tout client existant. Une ligne née d'un changement du référentiel
> n'est désormais comptée en retard qu'après origine + 3 mois
> (`Verification.graceJusquAu`, `delaiDeGrace`) ; l'échéance affichée ne bouge
> pas. Voir l'ADR-040, et ses limites (une ligne EXISTANTE qui devient « à
> planifier » n'a pas de grâce).

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
  autres lots de la relecture, ~~171~~ 173 obligations — 2026-10-07, C60 : + 2, AS 9 aux hôtels de 5ᵉ) : neuf obligations portent un rythme retenu — trois de la
  NF S 61-919, six par défaut annuel. Partout où l'ERP a un rythme écrit pour
  le même acte, la ligne de lieu de travail porte `erp: false` (partition de
  typologie, pas `ExclusionMutuelle`). « À 5 et 15 ans » s'exprime sans
  étendre le modèle : `premierDelai` + rythme retenu. Les gardes qui lisaient
  `o.periodicite` là où le rythme effectif décide (anti-doublon, frontière
  calendrier / écran « en place ») lisent `periodiciteEffective`. Détail :
  journal, C59.]
  [2026-10-08, C64 — amendement : toujours neuf rythmes retenus (trois de la
  norme, six par défaut), remesuré en appelant. La formation au risque
  chimique change d'identifiant et de porteur —
  `stockage-dangereux-etablissement-formation-personnel`, une ligne pour
  l'établissement dès qu'un stockage est déclaré (`siEquipementDeclare`,
  ADR-022 amendée) — au lieu d'une ligne annuelle PAR stockage. Son
  `texteVague` n'est plus pris dans R. 4412-88 (« Elles sont répétées
  régulièrement »), qui ne vise que les CMR, mais dans L. 4141-2 (« répétée
  périodiquement »), de portée générale : la règle 4 du § 3 demande un mot
  vague recopié d'une citation lue, et ce mot doit venir d'un texte qui couvre
  le champ de la ligne.]
- `nature.test.ts` : « un rythme chiffré impose `echeance_recurrente` » reste
  lu sur `periodicite`, le rythme du texte ; un état permanent à rythme retenu
  garde sa nature.
- Les comptes de l'ADR-026 (§ 2, croisement nature × périodicité) restent
  justes : ils comptent le texte.

## 7. Le rythme retenu est un plancher face à une prescription — 2026-10-07

[Ajouté le 2026-10-07, revue indépendante de la relecture du préventeur,
correction 10 ; journal, C61.]

La préséance du § 3 a un revers que le § 3 ne disait pas : **une prescription
moins stricte qu'un rythme retenu est écartée**, et la ligne garde le rythme
retenu. Exemple : une demande d'assureur « tous les 2 ans » sur une obligation
au défaut annuel n'est pas appliquée ; la ligne reste annuelle.
`prescriptionRenforce` le tient (`matching/prescriptions.ts`) : elle n'admet
qu'une prescription strictement plus stricte que le rythme effectif, ou égale
à un rythme retenu.

C'est la conséquence voulue du § 5 (« le défaut est un plancher ») : un acte
qui allège ne s'enregistre pas plus face à un rythme retenu que face à un
rythme du texte, et il se conserve en pièce. Mais le motif affiché ne peut pas
être le même. Face au texte, Rojer écrit « Le référentiel impose déjà… » ;
face à un rythme retenu, il écrit « Rojer retient déjà « annuelle » pour cette
obligation (rythme retenu par défaut ; le texte n'écrit pas de rythme) et
garde ce rythme face à une prescription moins stricte. » — sans qualifier la
portée du rythme (`sans-qualification.test.ts`). La phrase est écrite une fois
(`motifPrescriptionNonRetenue`), pour le moteur et pour le formulaire.

Ce que cette section ne tranche pas : si un acte d'autorité moins strict
devrait l'emporter sur un DÉFAUT (et non sur une norme). C'est la décision 2
de la synthèse de revue, laissée à la propriétaire ; tant qu'elle n'est pas
prise, le plancher tient.

## 8. Un rythme relevé par le préventeur dans une norme non lue — 2026-10-08

[Ajouté le 2026-10-08, décision de la propriétaire ; journal, C66.]

Le § 2 (a) disait : « Une norme lue indirectement ne fonde rien. » ~~Un rythme
retenu ne peut pas la citer tant qu'elle n'a pas été lue à la source.~~ Il
reste vrai, **sauf** quand le rythme a été **relevé par le préventeur**. La
propriétaire a décidé de respecter les décisions du préventeur, qui écrit
« il faut appliquer mes recommandations comme des obligations par défaut »
et, sur l'habilitation électrique (annotation du 2026-10-05) : « Fréquence et
validité recommandées (Norme NF C 18-510) • Cas général : Un recyclage
(Maintien et Actualisation des Compétences - MAC) est conseillé tous les 3
ans. » Les 3 ans s'appliquent sur sa parole, sans attendre le texte de la
norme.

**Le modèle, au plus petit.** Un champ, pas un motif : le rythme reste
`motif: "norme"` (c'est bien le rythme d'une norme), et il porte une
provenance, `releveParPreventeur: { date, citation, ou }`. La même valeur est
posée sur l'entrée du corpus `normes` (statut `norme`, lecture toujours
`indirect`). `controlerRythmeRetenu`, règle 3 bis :

- une norme lue `indirect` ne donne un rythme que si l'obligation porte un
  relevé ;
- le relevé de l'obligation doit être celui du corpus — même date, mêmes mots
  (une seule source, recopiée : un fichier de données n'importe aucune
  valeur) ;
- la date est une clé de jour, la citation n'est pas vide.

Le test vérifie en outre que la citation est l'annotation mot pour mot, et
qu'elle contient « tous les 3 ans » face à `triennale`.

**La mention** ne qualifie pas et ne lisse pas : « Rythme de la norme
NF C 18-510, relevé par le préventeur » (court) ; en long, le mot du texte de
renvoi (`R. 4544-10`), le rythme, la date et les mots du relevé, puis « —
norme non relue par Rojer ». Elle remplace la mention « Rythme renvoyé aux
normes (R. 4544-10) », qui s'efface d'elle-même devant un rythme retenu.

**Portée.** Une seule obligation : `elec-salarie-habilitation` (titre
nominatif, `etat_permanent`, `periodicite: "autre"`, rythme retenu
triennal). Pas `elec-travail-habilitation-personnel` : une échéance par
installation doublerait celle des personnes. Rythmes retenus remesurés en
appelant le 2026-10-08 : ~~neuf~~ ~~dix~~ onze — trois de norme (dont
celui-ci), ~~sept~~ huit par défaut annuel ; la maintenance approfondie des
extincteurs est retirée, les appareils de cuisson hors ERP et l'entretien de
l'alarme hors ERP entrés le même jour (C66).

**Effet en production.** Un titre sans date de fin reçoit l'échéance
délivrance + 3 ans (`echeanceDuTitre`) ; délivré il y a plus de trois ans, il
est **en retard dès la passe suivante**. La grâce de l'ADR-040 ne s'applique
pas : elle ne couvre que les lignes nées « à planifier », et la ligne d'un
titre naît datée de sa pièce. Le risque est écrit ici et au journal, pas
corrigé par un mécanisme neuf.

**Ce que cela n'autorise pas.** Un relevé sans annotation datée et citée mot
pour mot ; un relevé sur une norme qui n'est pas au corpus ; un rythme que le
préventeur n'a pas écrit.
