# Illustrations de bâtiment

Les deux planches affichées sur la plaque des bâtiments, en tête de tableau
de bord. Elles ne sont référencées qu'à un endroit : `sourceIllustrationBatiment`
dans `src/lib/etablissements/illustration.ts`, qui choisit laquelle poser à
partir du type ERP déclaré, puis de la division NAF.

| Fichier                  | Quand elle s'affiche                          | Dimensions |
| ------------------------ | --------------------------------------------- | ---------- |
| `batiment-commerce.png`  | ERP de type M ou N, ou NAF 47.xx / 56.xx      | 760 × 668  |
| `batiment-neutre.png`    | tous les autres cas, y compris les bureaux    | 760 × 668  |

Le dessin ne fait varier que l'usage du rez-de-chaussée, jamais le gabarit :
l'application ne sait rien du bâti (`Batiment` ne porte qu'un nom, un
complément d'adresse et un rang, ADR-019), et un dessin qui changerait la
hauteur affirmerait ce qu'on ignore. Les deux sont décoratives — `alt=""`,
`aria-hidden` — parce que tout ce qu'elles évoquent est écrit sous elles.

## Origine

**À documenter.** Les deux fichiers sont entrés dans le dépôt sans mention de
leur provenance, et rien ici ne permet de l'établir. Avant toute mise en
ligne publique, compléter les deux lignes ci-dessous comme le fait
`public/photos/README.md` pour chaque photo :

- Origine de `batiment-commerce.png` : _(source, auteur, licence)_
- Origine de `batiment-neutre.png` : _(source, auteur, licence)_

La règle est la même que pour les photos : uniquement des visuels dont on
détient les droits, ou sous licence libre commerciale. Une illustration sans
provenance connue ne part pas en production.

## Consignes

- **Format** : PNG à fond transparent, 760 px de large, rendu entre 156 et
  232 px selon le nombre de volumes — d'où le `sizes` posé sur le composant.
- **Poids** : viser moins de 60 Ko. Les deux planches actuelles ont été
  recompressées de 270 à 50 Ko sans perte visible à la taille d'affichage.
- **Ajouter une planche** : déposer le fichier ici ne l'affiche pas. Il faut
  étendre le type `IllustrationBatiment` et la règle de choix dans
  `illustration.ts`, qui est déterministe et testée — pas de repli implicite.
