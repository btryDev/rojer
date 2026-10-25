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
un rang, ADR-019). Les étiquettes des zones s'accrochent à des points fixes de
chaque planche (`PLANCHES`, `hero-batiments.tsx`) et ne disent pas où se trouve
la zone. Les planches sont décoratives — `alt=""`, `aria-hidden` — parce que
tout ce qu'elles évoquent est écrit à côté.

## Origine

Générées par la propriétaire (planche « isométrique de bâtiments monochromes »,
2026-10-25), découpées et détourées depuis une seule planche pour garder le
même angle, le même trait et la même échelle. Provisoires : des versions
définitives viendront au même cadrage.

## Consignes

- **Format** : WebP à fond transparent, détouré au ras du dessin. Les
  dimensions réelles sont recopiées dans `PLANCHES` ; un test les compare au
  fichier (`hero-batiments.test.tsx`).
- **Poids** : viser moins de 50 Ko.
- **Ajouter une planche** : déposer le fichier ici ne l'affiche pas. Il faut
  l'ajouter à `ILLUSTRATIONS_BATIMENT`, à la règle de choix et à `PLANCHES`
  (dimensions et trois points d'accroche) — le compilateur refuse une planche
  sans ses accroches.
