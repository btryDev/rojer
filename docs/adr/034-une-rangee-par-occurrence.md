# ADR-034 — Une vérification est une occurrence ; le suivi d'une obligation est autre chose

- **Statut** : proposée le 2026-09-10, **à trancher par la propriétaire**. Rien
  n'est codé.
- **Portée** : `prisma/schema.prisma` (`Verification`, nouveau modèle
  `SuiviVerification`), `src/lib/calendrier/generateur.ts` (la moitié
  « écriture » de la réconciliation), `src/lib/calendrier/actions.ts`,
  `src/lib/rapports/actions.ts`, `src/lib/dates/retard.ts`,
  `src/lib/calendrier/etats.ts`, `src/lib/pdf/etat-verifications.ts`, et les
  seize lecteurs de `Verification` recensés au § 6
- **Amende** l'ADR-012 (conservation et idempotence), dont elle garde toutes les
  promesses et renverse la décision de modèle qui les portait
- **Dépend de** l'ADR-022 (porteur), l'ADR-023 (salarié), l'ADR-026 (nature
  d'une obligation), l'ADR-027 (états permanents)
- **Fondée sur** deux lectures exhaustives du code faites le 2026-09-10 — l'une
  des lecteurs de `Verification`, l'autre de ses écrivains — dont les constats
  sont repris ici chemin:ligne. Rien de ce qui suit n'est de mémoire.

## Le problème

### Une rangée qui joue deux rôles

L'ADR-012 a posé, le 2026-08-10, que **la même rangée `Verification` sert de
cycle en cycle** : quand un contrôle est fait, elle garde `dateRealisee`,
avance `datePrevue` au rendez-vous suivant, et les rapports s'y accumulent.
C'était la réponse à un vrai désastre — la régénération faisait
`delete` + `create` et emportait les rapports par cascade —, et la réponse a
tenu : plus aucune preuve ne disparaît. L'ADR le dit lui-même
(`docs/adr/012-conservation-et-idempotence.md:112-114`) :

> Depuis la contrainte `@@unique`, une `Verification` n'est plus « une
> occurrence » mais **la ligne de suivi** durable d'une obligation sur un
> équipement.

Et il en avait vu le prix, écrit dans ses limites (`:227-237`) : `dateRealisee`
« change de sens », le compteur « réalisées sur 12 mois » « sous-compte », « le
comptage juste se fait sur `RapportVerification.dateRapport` », et « le
basculement de cycle a lieu à la régénération, pas à la seconde près ».

Un mois plus tard, ce prix a été payé sur toutes les surfaces du produit. La
même rangée dit deux choses — « fait le 15 mars 2025 » et « dû le 15 mars
2026 » — et chaque lecteur choisit laquelle il lit :

- **Les compteurs lisent le fait.** Les trois prédicats de `retard.ts`
  s'arrêtent sur `dateRealisee !== null` : une ligne réalisée dont le rendez-vous
  suivant est passé n'est ni en retard, ni à venir, et si sa réalisation a plus
  de douze mois elle n'est **nulle part** — `total = 0`, donc hors du
  dénominateur du score, qui monte. Mesuré deux fois le 2026-09-10.
- **La grille lit le rendez-vous.** `lecturesCalendrier`
  (`src/lib/calendrier/etats.ts:381`) déplie la rangée en deux événements et
  peint le second en rouge. Deux réponses contradictoires sur le même écran.
- **La fiche lisait les deux et se trompait.** Elle posait la date du
  rendez-vous avec l'état de la ligne — une tuile verte « faite » sur une
  échéance à venir. Corrigé le 2026-09-10 par `etatDuRendezVous`, c'est-à-dire
  par une **troisième** fonction dont l'unique raison d'être est que la rangée
  dit deux choses.
- **Le statut ne peut pas dire « archivée »**, faute de valeur dans l'enum, donc
  il reste gelé et le marqueur vit dans le libellé — que sept surfaces ne
  lisaient pas.
- **Rien ne relance un dossier immobile** : l'occurrence suivante n'existe pas
  comme rangée, c'est une date avancée *si* une passe de réconciliation a lieu.
  Constat n°1 de l'audit du 2026-09-09.

Le § 11 de `docs/chantiers-ouverts.md` recense seize constats sur le
réconciliateur. **Tous ceux du lot 3, une part du lot 2 et la moitié du lot 5
descendent de cette seule décision.** Les corriger un par un, c'est ce qu'on a
fait le 2026-09-10 pour la moitié du lot 3 — et c'est en le faisant qu'on a vu
qu'on posait une couche de compensation sur un modèle connu faux.

### La règle de fond ne dépend pas du modèle

L'arrêté du 8 octobre 1987, art. 3.2 : « **au minimum une fois par an**, les
opérations suivantes doivent être effectuées ». L'obligation est l'intervalle,
pas le souvenir. Une ligne dont l'échéance suivante est passée **est en retard**,
quelle que soit la solidité du contrôle précédent. Le score baissera pour ces
dossiers ; il était faux.

### Ce que la réglementation ne dit pas

Rien sur un score, un compteur, un dénominateur. Le *comment compter* est à nous.

## La décision proposée

### 1. Deux objets, parce qu'il y a deux choses

**`SuiviVerification`** — le suivi d'une obligation sur un porteur. C'est ce
que l'ADR-012 appelait « la ligne de suivi durable », et c'est **lui** qui porte
l'identité stable :

```
SuiviVerification
  id, etablissementId, equipementId?, salarieId?          (porteur, XOR conservé)
  obligationId, libelleObligation, periodicite, realisateurRequis, referentielVersion
  prescriptionId?
  archiveLe DateTime?          ← remplace le marqueur dans le libellé
  @@unique([etablissementId, obligationId, equipementId, salarieId])  NULLS NOT DISTINCT
```

**`Verification`** — **une occurrence**, et rien d'autre. Elle garde son nom :
« une vérification » est un acte, et tous ses lecteurs actuels lisent bien des
champs d'occurrence.

```
Verification
  id, suiviId → SuiviVerification (Cascade)
  datePrevue, dateRealisee?, statut
  rapports[], actions[]        (inchangés : ils documentent CETTE occurrence)
  @@index([suiviId, dateRealisee])
```

**Une occurrence est ouverte** (`dateRealisee IS NULL`) **ou close**. Une rangée
a une vie. Contrainte : **au plus une occurrence ouverte par suivi** — index
unique partiel `(suiviId) WHERE "dateRealisee" IS NULL`, en SQL comme les deux
contraintes existantes que Prisma ne sait pas dire.

### 2. Ce que ça rend trivial

| Question | Aujourd'hui | Après |
|---|---|---|
| Cette occurrence est-elle en retard ? | trois prédicats, deux gardes, trois classifieurs qui divergent | `dateRealisee IS NULL && datePrevue < aujourd'hui` |
| Combien de contrôles faits sur 12 mois ? | `realisees12m` sur la dernière date d'une rangée réutilisée — sous-compte documenté | occurrences closes dans la fenêtre — exact |
| Combien d'obligations suivies ? | nombre de rangées (correct par accident) | nombre de suivis |
| Quelle est la prochaine échéance ? | `datePrevue` d'une rangée qui porte aussi un fait passé | `datePrevue` de l'occurrence ouverte |
| La ligne est-elle archivée ? | préfixe texte dans le libellé, statut gelé | `suivi.archiveLe` |
| Les quatre compteurs sont-ils disjoints ? | oui, **parce que** les réalisées sont exclues — c'est le défaut | oui, parce qu'une occurrence est ouverte ou close |

`lecturesCalendrier`, `etatDuRendezVous`, `classerVerification` dans sa forme
actuelle, la branche « cycle soldé » du réconciliateur et le marqueur dans le
libellé **disparaissent**. Pas corrigés : sans objet.

### 3. Ce que ça fait aux quatre natures de l'ADR-026

C'est la cohérence qui emporte la décision :

- **récurrente** → N occurrences, une ouverte à la fois ;
- **ponctuelle** (« mise en service ») → exactement une occurrence, jamais de
  suivante ;
- **événementielle** → une occurrence par événement, créée quand l'événement
  est déclaré — aujourd'hui « le produit n'observe aucun de ces faits », le
  modèle sera prêt le jour où il en observera un ;
- **état permanent** → **zéro occurrence**. Il a déjà son modèle,
  `DeclarationEtatPermanent`, une rangée par (établissement, obligation) sans
  date d'échéance. `SuiviVerification` est son **symétrique** pour les
  obligations qui ont un rythme.

Le modèle actuel confond l'instance en cours avec l'historique. C'est la
distinction que fait tout système d'échéances récurrentes — plan de maintenance
et ordres de travail, règle de récurrence et instances d'un agenda — et
l'ADR-012 la connaissait : il a choisi de ne pas la faire, pour une bonne raison
qui n'a plus cours.

### 4. Ce que devient le réconciliateur

**Sa moitié pure ne bouge pas** : matching, `cleDeLigne`, adoption, héritage
travaillent sur des **suivis** — c'est-à-dire exactement sur l'objet qu'ils
croyaient déjà manipuler. `parCle`, `vues`, `adoptees` restent injectifs, parce
que la clé est celle du suivi.

**Sa moitié écriture change de nature.** Pour chaque suivi applicable :

1. s'il n'existe pas → le créer, et ouvrir sa première occurrence ;
2. s'il existe et n'a pas d'occurrence ouverte → en ouvrir une, datée de la
   dernière close + périodicité (ou de la mise en service, ou de maintenant) ;
3. s'il existe et a une occurrence ouverte → réaligner les attributs de
   référentiel sur le suivi ; **ne jamais toucher `datePrevue` de l'occurrence
   ouverte** (la règle « cycle ouvert » de l'ADR-012, inchangée) ;
4. réaligner `obligationId` sur le suivi adopté — **une rangée**, plus jamais
   une par cycle.

Pour un suivi qui n'est plus applicable : `archiveLe = now` ; son occurrence
ouverte est supprimée si elle est vide, conservée sinon ; les closes ne sont
jamais touchées.

**Le dépôt d'un rapport clôt l'occurrence ouverte ET ouvre la suivante, dans la
même transaction.** C'est ce qui dissout la moitié du lot 5 : la prochaine
échéance existe à la seconde où le contrôle est enregistré, et « en retard » est
une fonction pure de la date — il n'y a plus rien à relancer. La suppression du
dernier rapport d'une occurrence close la **rouvre** (`dateRealisee = null`) et
supprime l'occurrence ouverte suivante si elle est vide.

Le résultat « non vérifiable » ne clôt rien : il pose un rapport sur
l'occurrence ouverte, qui reste ouverte. C'est déjà la règle
(`src/lib/rapports/actions.ts:145-157`), elle devient évidente.

### 5. Ce que deviennent les lots 1 à 5

| Lot | Aujourd'hui | Après |
|---|---|---|
| 0 harnais | fait | **indispensable** : c'est lui qui rend la refonte possible ; le faux client gagne une table |
| 1 écriture conditionnée | fait | **conservé** : l'occurrence ouverte peut être close par un dépôt concurrent ; `deleteMany` garde ses trois clauses ; la garde `{dateRealisee, statut}` du `updateMany` se réduit à `dateRealisee IS NULL` |
| 2 grain de la clé, adoption, héritage | fait | **conservé et simplifié** : tout porte sur le suivi. L'héritage N→1 date la première occurrence du suivi absorbant depuis la plus ancienne occurrence close des absorbés — même règle, même fonction |
| 3 marqueur d'archivage | moitié fait | **superseded** : `archiveLe` remplace le préfixe ; le champ requis `libelleObligation` sur `VerificationDatee` perd sa raison d'être ; les sept surfaces corrigées lisent `suivi.archiveLe` |
| 3 bis cycle soldé | sorti | **dissous** par construction |
| 4 arithmétique des dates | à faire | **inchangé** — orthogonal, toujours dû |
| 5 jamais relancé | à faire | **dissous** pour le passage du temps ; reste le cas du référentiel qui change, déjà couvert par la version |

### 6. Les lecteurs, un par un

D'après la lecture exhaustive du 2026-09-10. **Aucun lecteur n'interroge la clé
composite** ; toute la dépendance à l'unicité est dans le réconciliateur.

**Simplifiés** — ils dépliaient à la main les deux vies d'une rangée :
`src/lib/calendrier/etats.ts:381` et `:308` (supprimés), `calendrier/page.tsx:413`
et `:567` (dont la clé `${v.id}:${lec.lecture}` à `:600` et le statut réécrit à
`:612`), `dashboard/queries.ts:205`, `:299`, `:389`,
`equipements/etat-verifications.ts:138`, `equipements/fiche.ts:145`,
`verifications/[verificationId]/page.tsx:135-153`, `mcp/queries.ts:340-347` et
`:527-533`, `registre/contenu-ailleurs.ts:174-180`, `pdf/builders.ts:29`,
`app/etablissements/[id]/page.tsx:108` (le `where` sur les statuts ouverts
redevient exact).

**À reprendre — ils comptent des rangées et le présentent comme des
obligations** ; après, ils doivent choisir *suivis* ou *occurrences* :
`app/etablissements/[id]/page.tsx:106` (`nbVerifs` → suivis), et par ricochet
`score.tsx:155`, `groupes.tsx:129`, `dashboard/obligations.ts:276-279`,
`page.tsx:182` ; `mcp/queries.ts:78` → `tools.ts:122` et `:411` (→ suivis) ;
`calendrier/queries.ts:210` `toutesParType` (→ suivis) ;
`equipements/etat-verifications.ts:130` `periodicites` et
`equipements/[equipementId]/page.tsx:139` `idsAvecSuivi` (dédoublonnage devenu
naturel) ; `pdf/etat-verifications.ts:84-96` (`realisees12m` → occurrences
closes dans la fenêtre, **le score change de valeur**) ;
`prescriptions/queries.ts:78` (compte affiché → à requalifier).

**Indifférents** : `auth/scope.ts:149`, `signatures/appartenance.ts:62`,
`acces/[token]/page.tsx:163`, `actions/queries.ts:54,87`,
`rapports/queries.ts:23,77`, `calendrier/echeances.ts:529`,
`registre/page.tsx:348`, `dates/retard.ts` (prédicats purs),
`batiments/queries.ts:141`, `calendrier/retards.ts:131,161`,
`board.tsx:1546` et `echeances.tsx:54` — ces deux derniers forcent déjà
`dateRealisee: null` : ils étaient écrits comme si la rangée était une
occurrence ouverte.

### 7. La migration

**Sans données réelles en production** — mesuré, `docs/revues/constats-reconciliateur-2026-09-09.md:3` —,
elle est gratuite aujourd'hui. Elle ne le sera plus après. Le précédent le plus
proche est la déduplication gagnante/perdante de
`prisma/migrations/20260810120000_integrite_et_conservation/migration.sql:40-101`,
dont celle-ci est l'exact inverse.

1. Créer `SuiviVerification` ; pour chaque `Verification`, **un suivi** portant
   sa clé, son libellé (sans le préfixe), sa périodicité, ses réalisateurs, sa
   prescription, et `archiveLe = updatedAt` si le libellé portait le marqueur.
2. Rattacher chaque `Verification` à son suivi (`suiviId`).
3. **Scinder** les rangées qui portent les deux vies — `dateRealisee` non nulle
   et `datePrevue > dateRealisee`, cycliques : la rangée existante devient
   l'occurrence **close** (`datePrevue := dateRealisee`, ses rapports et
   actions restent dessus), et une occurrence **ouverte** neuve est créée à
   l'ancienne `datePrevue`. Les autres rangées sont une occurrence telle
   quelle.
4. Retirer le préfixe des libellés ; supprimer les colonnes de référentiel de
   `Verification` (`obligationId`, `libelleObligation`, `periodicite`,
   `realisateurRequis`, `referentielVersion`, `prescriptionId`) — après que tous
   les lecteurs passent par le suivi.
5. Remplacer l'index unique quadruplet par : unicité sur le suivi
   (`NULLS NOT DISTINCT`, comme aujourd'hui) + unicité partielle « une seule
   occurrence ouverte par suivi ». Le CHECK `Verification_porteur_xor` migre sur
   le suivi. `src/lib/migrations-contraintes.test.ts` garde les trois.

**Perte connue, écrite** : une rangée qui a accumulé N rapports sur N cycles ne
se scinde qu'en **une** close et une ouverte — les cycles antérieurs ne sont pas
reconstituables (leurs dates dues ont été écrasées). Leurs rapports restent
attachés à l'occurrence close, datés, lisibles. Rien n'est perdu ; c'est la
granularité par cycle qui manque pour l'existant, et l'existant est vide.

### 8. Les alternatives écartées

**Corriger `repartirVerifications` pour qu'il déplie** (la conception « A » du
2026-09-10). Elle marchait : classer par le rendez-vous quand il y en a un, par
le passé sinon. Mais elle ajoutait une **quatrième** fonction qui déplie la
rangée, à côté des trois qui existent, et laissait entiers le statut gelé, le
marqueur texte, le dossier jamais relancé. Écartée : c'est le geste même dont ce
document dit qu'il faut cesser.

**Un cinquième compteur** à côté des quatre. Préservait l'historique tel quel au
prix de deux comptes à tenir cohérents — exactement ce que le lot 3 vient de
supprimer.

**Garder une seule table et lever l'unicité** (une `Verification` par occurrence,
sans suivi). Plus petit, mais aucune rangée ne porte plus l'identité stable
d'une obligation sur un porteur : l'archivage n'a nulle part où vivre, la clé de
réconciliation devient un prédicat partiel, `nbVerifs` n'a plus de référent. Le
suivi **est** ce que l'ADR-012 voulait sauver ; il mérite sa table.

**Un calendrier dérivé, rien de stocké** (évoqué le 2026-09-10). Le plus pur en
théorie ; écarté parce que les occurrences portent des **faits utilisateur non
dérivables** — une date arrêtée avec le prestataire (`planifiee`), un rapport,
une action — et que dériver le reste tout en stockant ceux-là revient au modèle
proposé.

### 9. Ce qui reste ouvert

- **Le nom.** `SuiviVerification` dit ce que c'est ; `LigneDeSuivi` est le mot
  de l'ADR-012. À trancher au premier commit.
- **Où pendent les actions d'un suivi.** Aujourd'hui « à la ligne, pas au
  rapport » (`equipements/fiche.ts:222-227`). Après : à l'occurrence qui les a
  fait naître ; la fiche du suivi les agrège. La CHECK `Action_origine_xor`
  (ADR-002) ne change pas.
- **`Signature`** — lien mou, sans FK (`schema.prisma:991-1018`) : une signature
  de rapport reste orpheline si l'occurrence est supprimée. **Défaut antérieur**,
  indépendant de cette décision, à traiter pour lui-même.
- **La règle N→1 de l'héritage** (« la plus ancienne ») reste une déduction, pas
  un texte — inchangé, voir `reprendreLaRealisation`.
- **`scripts/reprise-ria.ts:181`** réaffecte un porteur par `update` sur une
  rangée ; après, il réaffecte le suivi. À reprendre avec la migration.

## Le plan, en lots ordonnés

Chacun rayé et daté au commit qui le ferme, dans le § 11.

- **M0 — L'ADR tranché**, nom fixé, migration relue sur le précédent de 2026-08-10.
- **M1 — Le schéma et la migration**, sur base vide puis sur le seed
  `scripts/seed-dossier-complet.ts` (qui ne crée que des occurrences ouvertes :
  c'est le cas facile, il faut aussi un seed qui **scinde**). Le faux client des
  tests gagne `SuiviVerification`. Les trois contraintes SQL gardées par
  `migrations-contraintes.test.ts`.
- **M2 — Le réconciliateur**, moitié écriture : suivis, occurrence ouverte,
  archivage par champ. Les trente-deux garanties du lot 0 rejouées, le banc de
  mutation rejoué. Lots 1 et 2 reportés sur le suivi.
- **M3 — Le dépôt de rapport** clôt et ouvre dans la même transaction. Lot 5
  dissous pour le temps qui passe.
- **M4 — Les lecteurs** : les seize sites du § 6, dans l'ordre simplifiés →
  à reprendre → indifférents (vérifiés). `lecturesCalendrier`,
  `etatDuRendezVous` supprimés. Les compteurs choisissent suivis ou occurrences,
  et le disent dans leur nom.
- **M5 — Le nettoyage** : colonnes de référentiel retirées de `Verification`,
  marqueur texte retiré, `VerificationDatee.libelleObligation` retiré, ADR-012
  annoté comme amendé.
- **Lot 4** (arithmétique des dates) se fait **avant ou pendant**, il ne dépend
  de rien ici et débloque `worktree-ge4-r-hebergement`.

## Ce qu'il faudrait mesurer, et qui ne l'a pas été

Le score baissera. **De combien, pour quel dossier type ?** Aucune base réelle ne
permet de le dire aujourd'hui ; le seed complet peut le simuler si on y ajoute
des occurrences closes dont l'échéance suivante est passée. C'est le premier
chiffre à produire avant M4 — pas pour décider si on corrige, ça c'est décidé
par le texte, mais pour savoir ce que le dirigeant verra changer.
