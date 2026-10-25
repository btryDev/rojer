# Photos de la page publique

Les photos vivent ici et ne sont référencées qu'à un endroit dans le code :
la constante `PHOTO_HERO` en tête de `src/components/landing/HeroBrief.tsx`.
Déposer un fichier ici ne l'affiche pas — il faut changer la ligne (chemin +
texte alternatif) pour qu'il entre dans la page.

## Ce qui est en place

| Fichier               | Emplacement            | Cadrage      |
| --------------------- | ---------------------- | ------------ |
| `hero-terrain.jpg`    | Hero, tuile centrale   | 4/5 vertical |
| `etapes-atelier.jpg`  | « Trois étapes », gauche | 4/5 vertical |

Origine de `hero-terrain.jpg` : [Pexels 8986129](https://www.pexels.com/photo/a-mechanic-using-a-cellphone-at-an-auto-repair-shop-8986129/),
licence Pexels (usage commercial libre, sans attribution obligatoire).

Origine de `etapes-atelier.jpg` : [Pexels 6790046](https://www.pexels.com/photo/6790046/),
même licence. Référencée par la constante `PHOTO_ETAPES` en tête de
`src/components/landing/Etapes.tsx`.

~~Origine de `guide-ordinateur.jpg`~~ [2026-10-25 : retirée avec le bandeau du
guide, devenu une fenêtre ouverte depuis la fiche du hero] : [Pexels 3874620](https://www.pexels.com/photo/young-businesswoman-working-remotely-with-laptop-in-cafe-during-daytime-3874620/),
photo de Gustavo Fring, licence Pexels. Référencée par le guide de mise en
place du tableau de bord (`src/components/layout/OnboardingChecklist.tsx`),
à droite de la carte, à partir de `md`.

`hero-cuisine.jpg` n'est plus référencé : la bande « Sur le terrain » qui
l'accueillait a été fusionnée dans la section noire, désormais en frise sans
photo. Le fichier reste ici, disponible pour un futur emplacement.

## Emplacements prêts à recevoir une photo

Aucun n'est obligatoire : la page tient debout sans eux.

1. **Remplacer la photo du hero** — sujet au travail, 4/5 vertical, ≥ 1200 px
   de large, **de face ou de trois quarts**, lumière naturelle. Les fiches du
   produit mordent sur les bords gauche et droit : garder le sujet dans le
   tiers central.
2. **Second métier** — commerce ou bureau, pour équilibrer la restauration.
   4/3 paysage, ≥ 1600 px de large.
3. **Détail d'équipement** — extincteur, hotte, tableau électrique. 1/1,
   ≥ 1000 px. Sert de vignette dans « Par métier ».

## Consignes

- **Droits** : uniquement des photos dont vous détenez les droits ou sous
  licence libre commerciale. Pas de banque d'images non payée.
- **Poids** : viser 150 à 300 Ko par fichier (JPEG qualité 78-82). Next.js
  génère les variantes, il ne réduit pas un original de 4 Mo gratuitement.
- **Lumière** : scènes réelles, lumière naturelle, pas de mise en scène de
  studio — la charte est claire et calme, les photos doivent l'être aussi.
- **Texte alternatif** : décrire ce qu'on voit, pas ce qu'on vend. « Deux
  cuisiniers au passe », pas « la sérénité au travail ».


~~`hero-en-place.jpg`~~ [2026-10-25 : retirée avec l'en-tête photo de « Ce qui doit être en place », remplacé par l'en-tête illustré commun (`src/components/entete-page`).]
