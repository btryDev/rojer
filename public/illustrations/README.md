# Illustrations de bâtiment

Les six planches du hero du tableau de bord, dans `batiments/`. Le choix se
fait à un seul endroit : `illustrationBatiment`
(`src/lib/etablissements/illustration.ts`), d'après le type ERP déclaré, puis
le secteur du code NAF, puis le local générique.

| Fichier                     | Quand elle s'affiche                                  |
| --------------------------- | ----------------------------------------------------- |
| `batiments/restaurant.webp` | ERP de type N, ou NAF du référentiel restauration     |
| `batiments/magasin.webp`    | ERP de type M, ou NAF du référentiel commerce         |
| `batiments/hotel.webp`      | ERP de type O                                         |
| `batiments/salle-sport.webp`| ERP de type X                                         |
| `batiments/bureaux.webp`    | ERP de type W, ou NAF du référentiel bureau           |
| `batiments/local.webp`      | tous les autres cas                                   |

Le dessin est l'**emblème du genre de lieu**, jamais un portrait : l'application
ne sait rien du bâti (`Batiment` ne porte qu'un nom, un complément d'adresse et
un rang, ADR-019). Il est posé dans sa propre carte, à côté de la fiche de
l'établissement (`HeroEtablissement`, `hero-batiments.tsx`), contenu sans être
recadré ; rien n'y est épinglé. Les planches sont décoratives — `alt=""`,
`aria-hidden` — parce que tout ce qu'elles évoquent est écrit dans la fiche.

## Origine

Générées par la propriétaire (planche « isométrique de bâtiments monochromes »,
2026-10-25), découpées et détourées depuis une seule planche pour garder le
même angle, le même trait et la même échelle. Provisoires : des versions
définitives viendront au même cadrage. [2026-10-25 : `restaurant.webp` vient
d'une seconde génération de la propriétaire, « café pastel isométrique avec
terrasse », aux couleurs des sections.]

## Consignes

- **Format** : WebP à fond transparent, détouré au ras du dessin. La carte le
  contient (`object-contain`) : n'importe quel ratio tient, sans dimension à
  recopier dans le code.
- **Couleurs** : les teintes des sections (pêche, eau, glacier), un crème, le
  noir — jamais le rouge, le jaune ni le vert des états. `restaurant.webp` est
  la première planche dans cette palette ; les cinq autres sont encore en gris.
- **Poids** : viser moins de 100 Ko (1000 px de large suffisent).
- **Ajouter une planche** : déposer le fichier ici ne l'affiche pas. Il faut
  l'ajouter à `ILLUSTRATIONS_BATIMENT` et à la règle de choix ; un test
  vérifie que chaque planche déclarée existe.
