# Images de la page publique

Importées par les composants de `src/components/landing/` (`import photo from
"@/assets/landing/…"`), jamais appelées par une URL : Next en tire les
dimensions, un aperçu flou glissé dans le HTML et une adresse à empreinte,
mise en cache pour de bon. C'est pourquoi elles ne sont pas dans `public/` —
elles y seraient copiées une seconde fois à chaque déploiement. Déposer un
fichier ici ne l'affiche pas : il faut l'importer. Une photo qui ne sert pas
va dans `docs/illustrations/photos-reserve/`.

## Ce qui est en place

| Fichier | Emplacement | Cadrage | Constante |
| --- | --- | --- | --- |
| `hero-restaurateur.jpg` | Hero, bord à bord | 16/9 paysage | `PHOTO_HERO` (`Hero.tsx`) |
| `manifeste-boulangere.jpg` | « Concentrez-vous », gauche | 4/5 vertical | `PHOTO_MANIFESTE` (`Manifeste.tsx`) |
| `transparence-sources.jpg` | « Transparent sur ses sources » | 4/3 | `OutilSimple.tsx` |
| `documents/*.webp` | Liste « Ce que Rojer tient à jour » (téléphone) | 1/1, 264 px | `PICTOS` (`Cadran.tsx`) |

**Origine** : générées avec Krea le 2026-11-06 (Krea 2 Large ; le
restaurateur est une retouche Nano Banana Pro de la restauratrice, même
scène). Direction photo : `docs/marketing/direction-photo.md` (branche
`docs/communication`). `manifeste-boulangere.jpg` a été agrandie ×2
(1856 px, Topaz Standard « High Fidelity » via Krea, 2026-11-07) : la
génération d'origine ne faisait que 928 px, trop peu pour un écran Retina.

`transparence-sources.jpg` : Nano Banana Pro, 2026-11-06, piste de
`docs/marketing/direction-illustration.md` (branche `docs/communication`).
`documents/` : six pictos générés en une planche avec Nano Banana Pro
(2026-11-07) d'après cette illustration, pour en garder le trait noir et les
bleus, puis découpés et détourés. Décoratifs (`alt=""`) ; servis tels quels
(`unoptimized`), ils sont déjà à leur taille.

La mention des modèles, en pied de page, vient de `src/components/landing/`
— à tenir à jour si une image change d'origine.

Le hero sert aussi d'aperçu de partage de lien : `src/app/opengraph-image.jpg`
(1200 × 630, recadré au centre) — à refaire si la photo du hero change.

**Licence à confirmer** avant la mise en ligne publique : vérifier les
conditions d'usage commercial du plan Krea et les écrire ici.

**En réserve** (`docs/illustrations/photos-reserve/`) : `hero-restauratrice.jpg`
(la même scène avec une femme) et `hero-cuisine.jpg` (Pexels).

## Emplacements prêts à recevoir une photo

Aucun n'est obligatoire : la page tient debout sans eux.

1. **Remplacer la photo du hero** — sujet au travail, 16/9 paysage, ≥ 2 000 px
   de large, **de face ou de trois quarts**, lumière naturelle. La photo est
   bord à bord, sous la barre de navigation, le texte en blanc à gauche :
   sujet dans le tiers droit, la gauche et le haut assez calmes et sombres
   pour porter le texte.
2. **Second métier** — commerce ou bureau, pour équilibrer la restauration.
   4/3 paysage, ≥ 1600 px de large.
3. **Détail d'équipement** — extincteur, hotte, tableau électrique. 1/1,
   ≥ 1000 px.

## Consignes

- **Droits** : uniquement des photos dont vous détenez les droits ou sous
  licence libre commerciale. Pas de banque d'images non payée.
- **Poids** : viser 150 à 300 Ko par fichier (JPEG qualité 78-82). Next.js
  génère les variantes, il ne réduit pas un original de 4 Mo gratuitement.
- **Lumière** : scènes réelles, lumière naturelle, pas de mise en scène de
  studio — la charte est claire et calme, les photos doivent l'être aussi.
- **Texte alternatif** : décrire ce qu'on voit, pas ce qu'on vend. « Deux
  cuisiniers au passe », pas « la sérénité au travail ».
