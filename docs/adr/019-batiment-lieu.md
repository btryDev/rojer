# ADR-019 — Le bâtiment est un lieu, le classement reste à l'établissement

> **Remplacée le 2026-09-01 par l'ADR-029.** Le mot « bâtiment » quitte
> l'interface au profit de « zone », et un établissement n'en porte plus que
> trois au plus. Le modèle `Batiment` et **l'invariant central de cette ADR — un
> lieu ne porte aucun régime — sont conservés mot pour mot** ; c'est le
> vocabulaire et le plafond qui changent.
>
> **[2026-10-17, décision de la propriétaire, ADR-029 amendée] Un établissement
> = un bâtiment ; les zones, trois au plus, en sont des subdivisions ; jamais
> plusieurs bâtiments.** Ce que cette ADR dit des « bâtiments » d'un
> établissement vaut désormais pour ses ZONES ; les passages qui supposent
> plusieurs bâtiments sont rayés ci-dessous.

- Statut : acceptée
- Date : 2026-08-20
- Portée : `prisma/schema.prisma` (`Batiment`, `Equipement.batimentId`,
  `PointReleve.batimentId`, `PermisFeu.batimentId`, `PlanPrevention.batimentId`),
  `src/lib/batiments/`, la migration `batiment_lieu`
- Dépend de : ADR-001 (établissement), ADR-004 (régimes), ADR-012
  (conservation des preuves)

## Contexte

Un établissement Rojer est un SIRET : une adresse, un effectif, un DUERP.
Rien n'y décrit **où** les choses sont. Le produit compense par cinq champs
de texte libre, sous trois noms, jamais indexés, jamais filtrables :
`Equipement.localisation`, `PointReleve.localisation`, `PermisFeu.lieu`
(requis), `PlanPrevention.lieux` (multi-lieux dans une chaîne).

Un dirigeant dont le site compte ~~plusieurs corps de bâtiment~~ plusieurs
zones [2026-10-17] — le restaurant et sa réserve, la boutique et l'atelier — ne
peut ni lire son calendrier par ~~bâtiment~~ zone, ni dire à un prestataire dans
laquelle intervenir, ni regrouper ses équipements autrement que par catégorie.

### Ce que le droit attache à quoi

Le Code du travail raisonne par établissement-employeur : `effectifSurSite`
et le DUERP sont au bon niveau. Le règlement ERP (arrêté du 25 juin 1980)
classe un *établissement au sens ERP*, qui est un bâtiment **ou un
groupement de bâtiments non isolés** : deux corps contigus forment un seul
ERP, classé une fois, sur l'effectif cumulé ; deux corps isolés sont deux
ERP classés séparément.

Le niveau juste du classement n'est donc ni le SIRET (trop large quand un
entrepôt non-ERP jouxte une boutique ERP), ni le bâtiment (trop fin quand
deux corps contigus ne font qu'un ERP). C'est un *ensemble classé*, qui
regroupe un à n bâtiments. Pour la cible du produit — TPE, un site, une
activité — l'établissement **est** cet ensemble dans l'immense majorité des
cas, et le modèle actuel est juste.

## Décision

**`Batiment` est un lieu. Il ne porte aucun régime.** Les flags ERP / IGH /
habitation, la catégorie et l'effectif restent sur `Etablissement`
(ADR-004), et le moteur de matching continue de recevoir un établissement.

```prisma
model Batiment {
  etablissementId   String
  nom               String     // « Bâtiment principal », « Réserve », « Atelier »
  complementAdresse String?    // si le bâtiment a sa propre entrée
  ordre             Int        // ordre d'affichage, 0 = principal
  @@unique([etablissementId, nom])
}
```

Ce qui s'y rattache, et comment :

| Modèle | `batimentId` | Suppression du bâtiment | Pourquoi |
|---|---|---|---|
| `Equipement` | **requis** | `Restrict` | Un équipement est toujours quelque part. Supprimer un bâtiment ne doit jamais emporter un équipement et, par cascade, ses vérifications et rapports (ADR-012) : on déplace d'abord. |
| `PointReleve` | optionnel | `SetNull` | Un point de relevé est dans un bâtiment, mais le carnet reste un par établissement (voir dettes). |
| `PermisFeu` | optionnel | `SetNull` | Le `lieu` texte reste la précision (salle, zone). |
| `PlanPrevention` | optionnel | `SetNull` | Une opération peut toucher plusieurs ~~bâtiments~~ zones [2026-10-17] ; `lieux` texte le dit. Un seul rattachement principal suffit au filtre. |

**Ce qui se déduit, ne se stocke pas.** `Verification` et `Action` n'ont pas
de `batimentId` : une vérification porte sur un équipement, une action sur
une vérification ou un risque. Le bâtiment d'une échéance se lit en
remontant la chaîne, comme la famille se déduit du type (ADR-016). Une
donnée dérivée ne se désynchronise pas.

**Ce qui reste au niveau établissement**, sans bâtiment : le DUERP et ses
unités de travail ~~(une unité peut traverser les bâtiments)~~ [2026-10-18 :
une unité peut traverser les zones], les
prestataires et leurs attestations, les signatures, les accès. Dans un
calendrier filtré par ~~bâtiment~~ zone [2026-10-18], ces échéances **restent visibles**,
étiquetées « Tout l'établissement » — les masquer ferait mentir le
calendrier par omission (ADR-010).

**Tout établissement a au moins un bâtiment.** La migration en crée un par
établissement existant (« Bâtiment principal », `ordre = 0`) et y rattache
tous les équipements ; la création d'établissement en crée un dans la même
transaction ; la suppression du dernier bâtiment est refusée. ~~Tant qu'un
établissement n'a qu'un bâtiment, **l'interface n'en montre rien** : pas de
sélecteur, pas de colonne, pas de filtre. Le mono-bâtiment ne paie pas la
complexité du multi.~~ [2026-10-18 : tant qu'un établissement n'a qu'une
zone, l'interface n'en montre rien — la règle vaut pour les zones (ADR-029,
`estMultiBatiments`) ; un établissement n'a jamais qu'un bâtiment.]

## Ce qui n'est pas décidé ici

**L'ensemble classé.** ~~Le jour où un utilisateur a besoin d'un bâtiment
hors ERP sur un site ERP, ou de deux ERP isolés sur un SIRET, il faudra une
entité intermédiaire `EnsembleClasse` (régimes, catégorie, effectif
accueilli) entre l'établissement et ses bâtiments, et le matching bouclera
par ensemble.~~ [2026-10-17, décision de la propriétaire : jamais plusieurs
bâtiments par établissement. L'entité intermédiaire n'a plus d'objet tant que
la décision tient ; ~~un second bâtiment se déclare comme un autre
établissement~~ [2026-10-18, revue : des corps de bâtiment non isolés entre
eux forment un seul établissement, découpé en zones ; seules des
exploitations isolées au sens de GN 3 se déclarent comme des établissements
distincts].] Ce n'est **pas** un `estERP` sur `Batiment` : classer chaque
corps séparément sous-catégoriserait un ERP contigu, ce qui est pire que
l'approximation actuelle. En attendant, la fiche bâtiment dit en une phrase
que les obligations ERP s'appliquent à tout l'établissement.

## ~~Dettes assumées, à lever avec l'ensemble classé~~ Dettes assumées

[2026-10-18 : l'ensemble classé est abandonné (décision du 2026-10-17, plus
haut) ; ces dettes ne se lèveront pas avec lui.]

- `RegistreAccessibilite` est `@unique` par établissement ; il est dû par
  ERP. ~~Il suivra l'ensemble classé.~~ [2026-10-18 : des exploitations
  isolées au sens de GN 3 se déclarent comme des établissements distincts ;
  le `@unique` par établissement suit.]
- `CarnetSanitaire` est `@unique` par établissement ; il est dû par réseau
  d'eau, ~~souvent un par bâtiment~~ [2026-10-18 : un établissement n'a
  qu'un bâtiment]. Le `PointReleve.batimentId` prépare la
  lecture par ~~bâtiment~~ zone [2026-10-17] sans dédoubler le carnet.

## Conséquences

- Cinq champs de lieu en texte libre deviennent « un bâtiment + une
  précision ». On ne renomme pas les colonnes texte : elles gardent leur
  rôle.
- Tout `equipement.create` doit fournir un `batimentId` — le type Prisma
  l'impose. `batimentParDefaut(etablissementId)` rend le bâtiment d'ordre
  0 pour les chemins qui n'en demandent pas à l'utilisateur
  (pré-remplissage post-onboarding).
- Le test de contraintes (`src/lib/migrations-contraintes.test.ts`) vérifie
  que la migration backfille avant de poser le `NOT NULL`, et que la clé
  étrangère des équipements est `RESTRICT` : une migration qui
  « simplifierait » en `CASCADE` casse la build.
- Interfaces et filtres (calendrier, tableau de bord, listes) viennent
  ensuite, à périmètre décidé ici : ils lisent `batimentId`, ils ne le
  réinventent pas.
