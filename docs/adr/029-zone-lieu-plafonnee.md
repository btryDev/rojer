# ADR-029 — La zone remplace le bâtiment, et il n'y en a jamais plus de trois

- **Statut** : acceptée, 2026-09-01 (réunion d'équipe)
- **Portée** : `src/lib/batiments/`, `src/components/batiments/`,
  `src/components/equipements/EquipementForm.tsx`, les libellés de tous les
  écrans qui nomment un lieu
- **Remplace** l'ADR-019, dont elle garde l'invariant · **Découle de**
  l'ADR-025
- **Amendée** le 2026-10-17 (ci-dessous)

> **Amendée le 2026-10-17 — décision de la propriétaire : un établissement = un
> bâtiment ; les zones (3 au plus) sont des subdivisions de ce bâtiment ; jamais
> plusieurs bâtiments.** Le modèle `Batiment` porte ces ZONES sous un nom
> historique : une ligne de `Batiment` est une zone (« Salle », « Cuisine »…),
> jamais un bâtiment. Le bâtiment n'a pas de ligne propre : c'est l'établissement.
> Le nom stocké de la première ligne (« Zone principale », « Bâtiment principal »
> pour les dossiers anciens) est un nom de zone ; aucun écran ne le présente
> comme un second bâtiment.

## Le problème

L'ADR-019 a fait du bâtiment un **lieu** : un nom, un complément d'adresse, des
équipements — et aucun régime, parce que le règlement ERP classe un groupement de
bâtiments non isolés, pas chaque corps. Elle n'a jamais posé de limite au nombre.

Le cadrage du 2026-09-01 dit : un établissement, un lieu, trois zones au plus.
La question que l'ADR-025 laissait ouverte — « qu'est-ce qu'une zone porte ? » —
a été tranchée dans le sens le plus simple : **une zone porte ce que le bâtiment
portait**. Elle nomme un endroit et reçoit des équipements.

Ce qui rend la décision facile, c'est qu'il n'y a rien à construire : le modèle
`Batiment` est déjà exactement une zone. Poser un objet neuf à côté de lui
n'aurait produit qu'une migration, quatre clés étrangères à déplacer, et deux
mots pour la même chose.

## La décision

**Le modèle `Batiment` reste en base sous ce nom. L'interface ne dit plus que
« zone ». Un établissement en porte trois au plus.**

- **Le plafond vit dans `creerBatiment`**, pas dans une contrainte de base : il
  vaut à l'ajout. Les dossiers qui portent déjà plus de trois lieux les gardent —
  aucune donnée n'est fusionnée ni détruite pour faire entrer l'existant dans une
  règle neuve.
- **Le nom stocké ne migre pas.** Les établissements créés désormais sèment
  « Zone principale » ; ceux qui portent « Bâtiment principal » le gardent. Le
  nom est libre et affiché tel quel : le migrer ne servirait qu'à faire bouger
  une chaîne sous une contrainte d'unicité, pour rien.
- **L'invariant de l'ADR-019 tient mot pour mot** : une zone est un lieu, elle ne
  porte aucun régime. Les flags ERP/habitation, la catégorie, la famille et
  l'effectif restent sur l'établissement. Le test qui garde cet invariant
  (`migrations-contraintes.test.ts`) reste tel quel — c'est le vocabulaire qui
  change, pas la doctrine.
- **L'interface reste muette tant qu'il n'y a qu'une zone.** Ce comportement de
  l'ADR-019 est conservé : un dirigeant qui n'a qu'un local ne doit jamais lire
  le mot « zone ».

## Ce qu'on perd, et qu'on assume

~~Le modèle savait faire N bâtiments ; il n'en fera plus que trois.~~
[2026-10-17, décision de la propriétaire : le modèle savait faire N zones ; il
n'en fera plus que trois, toutes dans le même bâtiment — l'établissement.] C'est une
capacité retirée, pas un réglage. Elle est retirée parce que le produit sert un
SIRET avec un local, et que la promesse de tenir un parc immobilier n'a jamais
été instruite : ni classement d'ensemble, ni isolement, ni tierce personne.
L'ADR-019 réservait déjà une entité `EnsembleClasse` future pour ce sujet ; elle
reste réservée.
