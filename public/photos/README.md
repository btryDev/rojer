# Photos de la page publique

Les photos vivent ici. Chacune est référencée par une constante `PHOTO_*`
en tête du composant qui l'affiche (`Hero.tsx`, `Manifeste.tsx`
dans `src/components/landing/`). Déposer un fichier ici ne
l'affiche pas — il faut changer la constante (chemin + texte alternatif).

## Ce qui est en place

| Fichier               | Emplacement            | Cadrage      |
| --------------------- | ---------------------- | ------------ |
| `hero-restaurateur.jpg` | Hero, pleine largeur | 16/9 paysage |
| `manifeste-boulangere.jpg` | « Concentrez-vous », gauche | 4/5 vertical |

[2026-11-06 : `hero-terrain.jpg` (Pexels 8986129, un garagiste) remplacée
par `hero-restauratrice.jpg` et supprimée — le garagiste ne parlait pas à la
cible.]

Origine de `hero-restauratrice.jpg` : générée avec Krea le 2026-11-06
(Krea 2 Large), réchauffée d'un cran par étalonnage, peau des bras
retouchée (Nano Banana Pro), 2 400 px de large. `hero-restaurateur.jpg` en
est la retouche avec un homme (Nano Banana Pro, même scène), c'est elle qui
est affichée. La version avec une femme est gardée hors de `public/`, pour
ne pas partir dans chaque déploiement :
`docs/illustrations/photos-reserve/hero-restauratrice.jpg`.

Origine de `manifeste-boulangere.jpg` : générée avec Krea le 2026-11-06
(Krea 2 Large), 928 px de large — **à agrandir** avant la mise en ligne.
Référencée par `PHOTO_MANIFESTE` en tête de
`src/components/landing/Manifeste.tsx`. Direction photo :
`docs/marketing/direction-photo.md` (branche `docs/communication`).
**Licence à confirmer** pour les photos générées avec Krea (restaurateur,
restauratrice, boulangère) avant la mise en ligne
publique : vérifier les conditions d'usage commercial du plan Krea et les
écrire ici.

[2026-11-06 : `etapes-atelier.jpg` (Pexels 6790046) supprimée avec la
section « Une prise en main rapide ».]

~~Origine de `guide-ordinateur.jpg` : [Pexels 3874620](https://www.pexels.com/photo/young-businesswoman-working-remotely-with-laptop-in-cafe-during-daytime-3874620/),
photo de Gustavo Fring, licence Pexels. Référencée par le guide de mise en
place du tableau de bord (`src/components/layout/OnboardingChecklist.tsx`),
à droite de la carte, à partir de `md`.~~ [2026-10-25 : retirée avec le bandeau du guide, devenu une fenêtre
ouverte depuis la fiche du hero.]

`hero-cuisine.jpg` n'est plus référencé : la bande « Sur le terrain » qui
l'accueillait a été fusionnée dans la section noire. Le fichier reste ici,
disponible pour un futur emplacement.

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


~~`hero-en-place.jpg`~~ [2026-10-25 : retirée avec l'en-tête photo de « Ce qui doit être en place », remplacé par l'en-tête illustré commun (`src/components/entete-page`).]
