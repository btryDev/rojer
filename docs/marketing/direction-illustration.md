# Direction illustration — Rojer (piste, non définitive)

Notée le 2026-11-06 à partir d'une illustration générée pour la section
« Un outil simple et transparent » de la page publique
(`illustrations/2026-11-06-loi-loupe.jpg`). Consigne de la propriétaire :
**« pas définitif, mais on est sur une bonne piste, à reprendre »**.

Référence de style donnée : une planche isométrique au trait fin (type
Qonto), pour son **style et son niveau d'élaboration** — jamais pour son
contenu ni ses couleurs.

## Ce qui marche

- **Isométrie au trait fin** : contour noir régulier et fin, aplats sans
  dégradé ni texture.
- **Deux couleurs et le blanc** : fond bleu ciel pâle (≈ `#d8eef9`, le
  `--board-blue-pale` du board), objets en blanc et en bleu un cran plus
  soutenu (≈ `#b2daf2`, `--board-sky`).
- **Un sujet simple, bien dessiné** : le livre de loi ouvert, le « § »
  sur la page, la loupe posée dessus. Le sens se lit en un coup d'œil.
- **Aucun mot dans l'image** : ni lettres, ni chiffres, ni logo. Le texte,
  c'est la page qui l'écrit à côté.

## Ce qui ne marche pas

- **Un prompt qui empile les objets** (commerce, extincteur, armoire
  électrique, calendrier, lignes pointillées vers le livre…) : la
  propriétaire l'a jugé trop complexe. Un sujet, deux ou trois objets au
  plus.
- **Le dessin fait main en SVG** (registre couché et fiche « Légifrance »)
  : jugé pas assez sympathique pour la page publique. Il reste le style des
  en-têtes de module dans l'app, qui est une autre famille.

## À ne pas confondre

Trois familles coexistent, chacune à sa place :

| Famille | Où | Style |
| --- | --- | --- |
| En-têtes de module | dans l'app (`src/components/entete-page/illustrations/`) | SVG dessiné, objets blancs, trait noir 2,4, aplats noirs |
| « Ce qui doit être en place », bâtiments | dans l'app (`public/illustrations/`) | 2.5D, trait bleu nuit, une couleur d'accent |
| **Cette piste** | page publique | isométrie au trait fin, bleu pâle + blanc |

## Prompt de base (Nano Banana Pro, 4:3, 2K, référence de style jointe)

```
Use the reference image ONLY for its illustration style (clean isometric
line illustration, thin even black outlines, flat fills, white plus one
pastel tint). Do not copy its content, logo, text or colour.

New illustration: [un sujet, deux ou trois objets]. Soft pale sky-blue
background (#d8eef9), objects in white and pale blue (#b2daf2), black
lines. No words, no letters, no numbers, no logos.
```

## Référence

| Fichier | Ce qu'elle montre |
| --- | --- |
| `illustrations/2026-11-06-loi-loupe.jpg` | Livre de loi ouvert, « § », loupe (Nano Banana Pro). Retenue pour la maquette, à reprendre. |
