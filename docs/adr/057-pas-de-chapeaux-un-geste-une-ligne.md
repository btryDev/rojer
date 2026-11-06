# ADR-057 — Pas de chapeaux : une obligation qui concerne un appareil vit sur l'appareil, et un même geste n'y fait qu'une ligne

- **Statut** : proposée, 2026-11-05 — décisions de la propriétaire, prises
  point par point le même jour. ~~**Rien n'est codé** : cet ADR fixe les règles
  avant les lots A, B et C.~~ [2026-11-06 : lot A codé (`lot/adr-057-a`) ;
  lots B et C à venir.]
- **Amende** l'ADR-022 (porteur établissement « même si aucun équipement
  n'est déclaré » : ne vaut plus pour une obligation qui vérifie un appareil),
  l'ADR-045 (`groupeExclusif` réservé à l'établissement : un mécanisme voisin
  naît pour les appareils) et l'ADR-042 (six lignes de plus au niveau audit).
- **Numéro** : 052 à 054 existent sur `cc`, 055 et 056 sur `main` ; 057 est
  le suivant.

## Contexte

Un restaurant de 5ᵉ catégorie (type N, huit salariés), deux BAES et une
alarme, mesuré en appelant `determineObligationsApplicables` sur `main`
(0fba284c) : chaque BAES reçoit un essai mensuel, une autonomie semestrielle et
une vérification annuelle ; l'établissement reçoit EN PLUS une vérification
semestrielle des « signaux lumineux et acoustiques » et une annuelle des
« alimentations de secours » (arrêté du 4 novembre 1993, art. 15). Ce sont les
mêmes lampes et la même batterie. La première de ces deux lignes naît même si
aucun BAES ni aucune alarme n'est déclaré : `equipementsEnContexte` est
indicatif, il ne déclenche rien.

L'inventaire du même jour a trouvé quatre familles de doublons :

1. des **chapeaux à rythme** — une ligne d'établissement qui refait le geste
   d'une ligne d'appareil : art. 15 (deux lignes), `PE 4 § 2`, `PO 1 § 3`,
   `R. 4222-20` ;
2. des **obligations de présence** affichées deux fois — dans la section
   « Équipements de sécurité » et dans le parc : le DAE, les extincteurs,
   l'alarme ;
3. un **même geste sur un même appareil** porté par deux ou trois lignes —
   Code du travail, règlement ERP, `PE 4` ;
4. des **catégories jumelles** — VMC et CTA, porte et portail, quatre
   catégories d'EPI, appareil de cuisson et installation de gaz qui
   déclenchent tous deux `GZ 15`.

## Décisions

### 1. Pas de chapeaux

> « On ne met pas de chapeaux : les obligations ne doivent apparaître que
> dans les équipements. »

Une obligation qui vérifie ou entretient un appareil est portée par
l'appareil (`porteur: "equipement"`), une ligne par appareil déclaré. Elle
n'existe pas comme ligne d'établissement à côté. Conséquences :

- **`PE 4 § 2`** (ERP de 5ᵉ catégorie hors type O, tous les trois ans) passe
  sur chaque appareil des catégories qu'il visait —
  `INSTALLATION_ELECTRIQUE`, `ALARME_INCENDIE`, `DESENFUMAGE`,
  `APPAREIL_CUISSON_ERP`, `ASCENSEUR`, `EXTINCTEUR`, `RIA` — plus
  `INSTALLATION_GAZ`, parce que `PE 4` a absorbé l'ancienne ligne gaz et que la
  catégorie gaz est née après cette liste (2026-10-14). `PE 4` finit par
  « etc. » : la liste reste celle que le préventeur a relue, plus le gaz, sans
  autre élargissement.
- **`PO 1 § 3`** (hôtel de 5ᵉ catégorie, tous les deux ans) de même :
  `DESENFUMAGE`, `APPAREIL_CUISSON_ERP`, `EXTINCTEUR`, `RIA`, plus
  `INSTALLATION_GAZ`.
- **Intervenant de `PE 4` et `PO 1`** : « techniciens compétents », pour tout,
  gaz compris — `personne_competente`, `personne_qualifiee`,
  `organisme_agree`. L'exigence plus haute du gaz (`personne_qualifiee` ou
  `organisme_agree`) venait de `GZ 29`, article du livre II qui ne s'applique
  pas en 5ᵉ catégorie ; elle n'avait pas de fondement et tombe.
- **`R. 4222-20`** (contrôle de l'aération) passe sur `VMC`, `CTA` et
  `HOTTE_PRO`, les catégories qu'il nommait en contexte. Il ne naît plus dans
  un établissement qui n'a déclaré aucune installation.
- **Le groupe exclusif `erp5-entretien-installations-techniques`**
  (`PE 4` / `PO 1` sur un ERP qui porte le type O et un autre type) disparaît :
  c'est la règle 3 qui départage, appareil par appareil.

### 2. Ce qui sort du quotidien passe au niveau audit, rien ne sort du référentiel

> « On n'enlève rien du référentiel. »

Aucune entrée dans `OBLIGATIONS_RETIREES`. Passent au niveau audit
(ADR-042 — source gardée, nommées dans « Ce que Rojer ne couvre pas »,
jamais servies) :

| Obligation | Pourquoi |
|---|---|
| `signalisation-etablissement-signaux-lumineux-acoustiques-semestrielle` | art. 15 — « ne prends pas en compte l'article 15 » |
| `signalisation-etablissement-alimentations-secours-annuelle` | art. 15 |
| `incendie-erp-extincteurs-revision-decennale` | « ignorer la révision décennale de l'extincteur » ; sa jumelle hors ERP y est déjà |
| `signalisation-incendie-moyens-lutte` | signalisation des extincteurs et RIA, « fusionnée et passée au niveau audit » |
| `signalisation-erp-extincteurs-identification` | idem |
| `signalisation-erp-5-extincteurs-identification` | idem |

Les trois lignes de signalisation restent trois obligations au référentiel ;
la page « Ce que Rojer ne couvre pas » les **regroupe à l'affichage** en
**une ligne pour les extincteurs et une pour les RIA**, chacune avec les
références qui visent bien cet appareil (à vérifier au corpus en écrivant la
ligne RIA : `MS 39` et `PE 26` parlent-ils du RIA ?).

### 3. Un même geste sur un même appareil : une ligne, le rythme le plus court, toutes les références

Les régimes se cumulent (Code du travail, règlement ERP, `PE 4`, `PO 1`) ;
quand ils demandent **le même geste** et qu'**un même intervenant peut le
faire pour tous**, le dirigeant ne voit qu'une ligne :

- **rythme** : le plus court des membres applicables (`periodiciteEffective`) ;
- **références** : celles de tous les membres applicables, citées ensemble
  (« Code du travail R. 4227-28 · ERP MS 38 · PE 4 § 2 ») ;
- **intervenant** : l'intersection des `realisateurs` des membres
  applicables. **Elle ne doit jamais être vide** : un test l'éprouve sur toutes
  les combinaisons de membres possibles. Deux textes qui demandent des
  intervenants qu'aucun ne satisfait à la fois ne forment pas un geste.

Les gestes retenus :

| Appareil | Membres | Rythme | Intervenant |
|---|---|---|---|
| Extincteur | `incendie-erp-extincteurs-annuelle` · `PE 4` · `PO 1` · `incendie-travail-moyens-lutte` | annuel | personne compétente |
| Alarme | `incendie-erp-ssi-annuelle` · `PE 4` · `incendie-travail-alarme-entretien-verification` | annuel | personne qualifiée |
| Désenfumage | `incendie-erp-desenfumage-annuelle` · `PE 4` · `PO 1` · `incendie-travail-desenfumage-entretien-verification` | annuel | personne qualifiée |
| RIA | `incendie-erp-ria-annuelle` · `PE 4` · `PO 1` · `incendie-travail-ria-entretien-verification` | annuel | personne qualifiée |
| Appareil de cuisson | `cuisson-erp-appareils-annuelle` · `PE 4` · `PO 1` · `cuisson-travail-appareils-entretien-verification` | annuel | personne qualifiée |
| Ventilation | `aeration-controle-installations-r4222-20` · `aeration-erp-chauffage-ventilation-annuelle` | annuel | personne qualifiée |
| Électricité, ERP de 5ᵉ qui groupe un hôtel et un autre type | `PE 4` · `incendie-hotel-po-controle-annuel-electricite` (PO 1 § 3) — ajouté le 2026-11-06, décision de la propriétaire | annuel | personne qualifiée |

Désenfumage, RIA et cuisson sont retenus par analogie avec l'extincteur et
l'alarme (la propriétaire n'a rien objecté) ; à confirmer à la relecture de
cet ADR.

Les lignes « travail » de ces gestes portent aujourd'hui `erp: false` : le
règlement ERP les relayait. Elles s'appliquent désormais aussi en ERP — un
employeur en ERP voit la référence du Code du travail **sur la même ligne**,
sans ligne de plus.

**Restent des lignes distinctes**, toujours :

- électricité : la vérification du Code du travail et celle de l'ERP (`EL 19`,
  ou `PE 4` en 5ᵉ) — « deux lignes bien distinctes » ;
- ascenseur : le contrôle technique quinquennal du CCH, `AS 9`, et `PE 4` ;
- installation de gaz : `GZ 15` (catégories 1 à 4) et `PE 4` (5ᵉ) ne se
  rencontrent pas ;
- SSI de catégorie A ou B, triennal par organisme agréé ; contrôle
  hebdomadaire de l'alarme ; désenfumage mécanique triennal ;
- essais et vérifications des BAES ;
- toute paire qu'**un même intervenant ne peut pas faire** — « si deux
  échéances existent sur une même installation par des intervenants
  différents, il faut garder les deux échéances distinctes ».

#### Le mécanisme

Un champ neuf, `geste?: string`, sur les obligations portées par l'appareil.
Le moteur, après évaluation, réunit par appareil les membres applicables d'un
même geste en un seul `ObligationApplicable` : le **titulaire** (rythme le plus
court ; à égalité, le premier du référentiel) porte la ligne, les autres
l'accompagnent (`aussiFondeePar`). C'est la généralisation à l'appareil de la
résolution des groupes exclusifs (ADR-045), à une différence près : les
membres écartés ne disparaissent pas, leurs références restent citées.

- **Le geste est une donnée, pas une déduction** (ADR-024) : rien ne réunit
  deux obligations par ressemblance de catégorie, de domaine ou de libellé.
- **Il entre dans `empreinteReferentiel()`** : il décide du nombre de lignes.
- **Les membres d'un geste se succèdent** : quand le titulaire change (un
  établissement devient ERP, change de catégorie), la ligne de l'appareil est
  reprise sous le nouvel identifiant — même rangée, mêmes rapports — comme
  `succedeA` le fait pour une scission.
- [2026-11-06, lot A] **Un rapport déposé sous un autre texte du geste vaut
  pour la ligne** : sur un appareil, la plus récente des réalisations du même
  acte — la ligne propre, celle d'un autre membre du geste, la ligne
  d'établissement dispersée — date la ligne (`realisationsDuMemeActe`).
- [2026-11-06, lot A] **Les prescriptions particulières s'appliquent avant la
  fusion** : la passe appelle le moteur sans fusion, applique les
  prescriptions, puis fusionne ; un membre qu'un acte raccourcit devient
  titulaire sur son appareil. Une prescription que la fusion rend sans effet
  (la ligne est déjà plus stricte) est dite ignorée, avec son motif.

### 4. Une obligation de présence est la tête de son groupe dans le parc

Une obligation qui n'exige que la présence d'un matériel ne se porte pas sur
l'appareil (sans appareil déclaré, elle doit dire qu'il en manque un) : elle
reste à l'établissement, mais **s'affiche à un seul endroit**, en tête du
groupe de sa catégorie sur la page Équipements :

```
Premiers secours
  Matériel de premiers secours        obligatoire · déclaré
  Défibrillateur (DAE)                obligatoire ici · 1 déclaré
    └ DAE de l'accueil                maintenance annuelle · Géo'DAE

Incendie
  Extincteurs                         obligatoire · 3 déclarés
    └ Extincteur cuisine, Extincteur salle, …
```

- Le **défibrillateur** vit sous « Premiers secours », avec le matériel de
  premiers secours ; sa maintenance et sa déclaration Géo'DAE restent sur
  l'appareil.
- **Extincteurs** (`R. 4227-29`) et **alarme sonore** (`R. 4227-34`) de même,
  en tête de leur groupe.
- La section « Équipements de sécurité » (`equipements-securite.ts`,
  décision du 2026-10-15) disparaît.
- [2026-11-06, lot B, décision de la propriétaire : « d'après le parc »] Le
  défibrillateur, les extincteurs et l'alarme sonore ne se cochent plus sur
  « Ce qui doit être en place » : ils sont EN PLACE dès qu'un appareil de la
  catégorie est déclaré au parc (`etats-permanents/par-le-parc.ts`), comme
  une formation l'est d'après les titres déclarés dans Équipe. Ils restent
  comptés au score et au PDF (« D'après le parc déclaré : 2 appareils
  « Extincteurs » »), ne s'affichent plus sur « Ce qui doit être en place »,
  et une ancienne case cochée est ignorée. Le matériel de premiers secours,
  sans catégorie d'appareil, reste une case de cet écran.

### 5. Catégories jumelles

- `VMC` + `CTA` → **Ventilation**. Les lignes propres à la VMC (VMC-gaz en
  habitation, qualité de l'air des parcs de stationnement) passent par une
  caractéristique de l'équipement.
- `PORTE_AUTO` + `PORTAIL_AUTO` → **Porte ou portail motorisé**, avec une
  caractéristique pour les deux lignes qui les distinguent.
- `EPI`, `EPI_ANTICHUTE`, `EPI_RESPIRATOIRE`, `EPI_GILET_SAUVETAGE` → **EPI**,
  avec un type.
- **Gaz** : `GZ 15` ne naît plus que de `INSTALLATION_GAZ` ; l'appareil de
  cuisson garde `GC 22`. Un piano au gaz déclaré dans les deux catégories ne
  porte plus deux fois la même vérification.

C'est un invariant de données : les équipements existants changent de
catégorie, par migration, et leurs lignes sont reprises (règle 3,
succession), pas recréées.

## Les lots

- **A — référentiel et moteur** : règles 1 à 3 ; le champ `geste` ; la reprise
  des lignes en base. **Contrainte de la reprise** : une ligne d'appareil née
  d'une ligne d'établissement archivée (`PE 4`, `PO 1`, `R. 4222-20`) ne doit
  pas apparaître en retard pour un acte déjà fait — elle repart du dernier
  rapport de la ligne d'établissement, ou, à défaut, du délai de grâce de
  l'ADR-040. Les rapports restent attachés à leur ligne archivée (ADR-034).
- **B — interface** : règle 4, et le regroupement de la signalisation sur
  « Ce que Rojer ne couvre pas » (règle 2). La section « contrôles
  d'ensemble » de la page Équipements ne garde que ce que le § « À trancher »
  laisse ouvert.
- **C — catégories** : règle 5, migration comprise.

Chaque lot remesure en appelant `obligationsConformite`, `porteurDe` et
`estNiveauAudit`, et met à jour les comptes de `CLAUDE.md`. Attendu, à
vérifier : 205 obligations inchangées ; 18 au niveau audit (12 + 6), donc
187 suivies ; `PE 4`, `PO 1` et `R. 4222-20` passent de l'établissement à
l'appareil (96 + 3 / 95 − 3 / 14).

## À trancher

Lignes d'établissement qui visent encore des appareils et dont la règle 1
n'a pas été discutée le 2026-11-05 :

- `habitation-verification-annuelle-installations-securite` (art. 101 de
  l'arrêté du 31 janvier 1986 : désenfumage, VMC, alarme) ;
- `scene-erp-verifications-triennales-organisme-agree` et
  `scene-erp-materiels-installations-temporaires-annuelle` (nées d'une scène
  déclarée) ;
- `incendie-erp-5-sommeil-contrat-entretien-sdi` (un contrat, plutôt un écrit
  qu'un geste) ;
- l'électricité Code du travail : elle ne vise que les lieux de travail ; un
  ERP sans salarié ou une habitation seule ne la reçoivent pas. Voulu ?
- ~~[2026-11-06, lot A] l'électricité d'un ERP de 5ᵉ qui groupe un hôtel et
  un autre type : PE 4 § 2 (triennal) et le contrôle annuel de PO 1 § 3
  visent la même installation. Avant l'ADR-057, le groupe exclusif
  PE 4 / PO 1 n'en servait qu'une ligne ; sans geste commun, il y en a deux.
  Les réunir (même acte, personne qualifiée admise par les deux) ?~~
  [2026-11-06 : tranché — « si ça respecte notre règle alors c'est bon » ;
  une ligne annuelle, au tableau ci-dessus.]
- [2026-11-06, lot A] la liste de `PE 4 § 2` : le texte cite aussi « le
  chauffage, l'éclairage, les circuits d'extraction », et la liste relue par
  le préventeur ne porte ni la hotte, ni la ventilation, ni l'éclairage de
  sécurité. Portée par l'appareil, la ligne ne les vise donc plus, quand
  l'ancienne ligne d'établissement les couvrait par « l'ensemble ». Leurs
  vérifications annuelles ERP restent servies.
