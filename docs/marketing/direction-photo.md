# Direction photo — Rojer

Décidée le 2026-11-06, à partir des deux images de `photos/`
(restauratrice et boulanger, générées avec Krea 2 Large). Consigne de la
propriétaire : **« c'est ça la vibe, peut-être légèrement plus chaleureux,
mais pas beaucoup plus »**.

Cette note vaut pour toutes les photos de la page publique, des
supports et des réseaux. Une photo qui s'en écarte se refait.

## L'idée en une phrase

Un patron de petit établissement, chez lui, au travail, qui jette un œil
à son téléphone entre deux gestes. Le lecteur doit penser : « c'est moi,
mardi matin avant l'ouverture ».

## Qui

- **Des patrons de TPE qui reçoivent du public** : restaurant, café,
  boulangerie, hôtel, commerce de proximité, salon de coiffure. C'est la
  cible de Rojer, et c'est elle qui doit se reconnaître.
- Entre 35 et 55 ans, physiques ordinaires, sans maquillage visible.
  Ni mannequin ni « jeune startuppeur ».
- Varier les personnes d'une photo à l'autre : hommes et femmes, âges,
  origines.
- Tenue de travail du métier, **de préférence bleu marine** (tablier,
  bleu de travail, chemise). Elle reprend le navy de la marque sans
  qu'on ait à le poser.

## Ce qu'ils font

- **Ils lisent leur téléphone**, concentrés et calmes. Pas d'inquiétude,
  pas de grand sourire : la personne gère.
- Sur la photo du hero, le regard est sur le téléphone : les fiches
  posées par-dessus jouent le rôle de l'écran. Ailleurs, un regard
  caméra tranquille est permis (cf. le boulanger).
- Le geste est saisi en passant, pas posé. Debout, au milieu de son
  lieu.

## Où

- **Leur propre établissement, en vrai** : la salle avant le service,
  le fournil, l'arrière-boutique. Un lieu vécu, propre mais pas
  décoré pour la photo.
- Le décor laisse voir, flou, un élément du métier qui porte une
  obligation : la hotte en inox, le four, une armoire électrique, un
  extincteur au mur. On ne le montre pas en gros plan, il est là.
- Jamais de bureau open space, de chantier, d'usine ni de fond uni de
  studio.

## Lumière et couleur

- **Lumière du jour**, qui entre par la vitrine ou la porte. Douce,
  latérale, sans flash ni éclairage de studio.
- **Palette fraîche et retenue** : bleus désaturés, gris, inox, marine.
  Les touches chaudes viennent du lieu (bois des tables, pain, peau)
  et restent des touches.
- **Un cran plus chaud que les références, pas plus** : la balance
  des blancs se décale très légèrement vers le chaud, et le bois et la
  peau gagnent un peu de chaleur. Les ombres restent fraîches. Pas
  d'heure dorée, pas de filtre orangé, pas d'ambiance « boulangerie à
  l'ancienne » sépia.
- Contraste doux, noirs un peu levés, léger grain. Pas de HDR, pas de
  peau lissée.

## Cadrage

- Plan taille à plan américain, **de trois quarts**, focale autour de
  50 mm, faible profondeur de champ.
- Pour le hero : **vertical 4/5**, sujet dans le tiers central (les
  fiches du produit recouvrent les bords gauche et droit), au moins
  1 200 px de large. Cf. `public/photos/README.md` (`main`).
- Le téléphone est visible et à hauteur de poitrine, jamais devant le
  visage.

## À éviter

- Le sourire de photo de stock, le pouce levé, le regard dans le vide.
- Un écran de téléphone lisible ou une marque visible (logo,
  enseigne, marque de l'appareil).
- Tout texte dans l'image : le texte, c'est le produit posé par-dessus.
- Les cartes posées sur la photo sont des **fiches de l'appli**, jamais des
  notifications du téléphone (« Rojer · maintenant ») : Rojer n'envoie pas
  de rappels et n'a pas d'application mobile (note de rédaction, § 4 et 5).
- Un lieu trop beau pour être vrai : cuisine de magazine, boutique de
  concept store.
- Les métiers hors cible (BTP, industrie, bureau).

## Prompt de base (Krea 2 Large, `creativity: low`, 4:5, 1K)

Remplacer ce qui est entre crochets. La partie « lumière » porte déjà le
cran de chaleur demandé.

```
Documentary-style photograph of a French independent [métier : restaurant
owner / baker / hotel owner / shopkeeper / hairdresser], a [woman / man] in
[his / her] [âge], wearing [tenue, de préférence navy blue apron or work
clothes], standing in [his / her] small neighborhood [lieu] [moment : before
service / early in the morning], reading [his / her] smartphone with a calm,
focused expression, three-quarter view, subject centered in the middle third
of the frame. Soft natural daylight from the front windows, gently warm
white balance, cool soft shadows, muted palette of desaturated blues and
greys with natural wood tones, [élément du métier : stainless steel kitchen
hood / deck oven / electrical cabinet] softly blurred in the background,
shallow depth of field, 50mm lens, light film grain, authentic, unposed,
editorial, no text, no logos, no visible screen content.
```

## Références

| Fichier | Ce qu'elle montre | Remarque |
| --- | --- | --- |
| `photos/2026-11-06-restauratrice.png` | Gérante de bistrot, tablier marine, salle avant le service, hotte au fond | Choisie pour le hero. Lumière juste, un cran trop froide. |
| `photos/2026-11-06-boulanger.png` | Boulanger, tablier bleu fariné, fournil | Regard caméra : bon pour un autre emplacement que le hero. Déjà un peu plus chaud. |

Les deux font 928 × 1 152 px : la sortie 1K de Krea est en dessous des
1 200 px demandés pour le hero. Passer l'image choisie à l'agrandisseur
de Krea avant de la mettre dans `public/photos/`.
