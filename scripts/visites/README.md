# Visites guidées en vidéo

Les courtes vidéos que l'îlot « Visite guidée » propose en bas à droite
d'une page d'entrée (`src/components/visite/`, table `src/lib/visite/visites.ts`).

Une vidéo n'est pas filmée : c'est une page HTML animée, rendue image par image.

| Fichier | Rôle |
|---|---|
| `<cle>.html` | Le gabarit : l'écran reconstitué aux couleurs de la charte, le curseur, le texte, la timeline GSAP |
| `rendre.tsx` | Remplit les `{{…}}` (vraies icônes, vraie illustration, GSAP), rend les images dans Chrome sans fenêtre, assemble avec FFmpeg |
| `musique/<cle>.m4a` | Facultatif : la musique posée sous l'image, ramenée à -21 LUFS (discrète), coupée à la durée de la vidéo, fondue sur la dernière seconde |

## Refaire une vidéo

```sh
brew install ffmpeg        # une fois
pnpm visite:rendre equipements
```

Sortie : `public/videos/visite-equipements.mp4`, son image d'aperçu `.jpg`
et la vignette `-vignette.jpg`. Environ deux minutes. Chrome est cherché à
son emplacement macOS ; ailleurs, `CHROME_PATH=/chemin/vers/chrome`.

Pour régler une animation, ouvrir le gabarit rendu dans un navigateur : hors
du rendu, il joue en boucle.

## Quand la refaire

Le gabarit **reconstitue** l'interface ; il ne la lit pas. Un libellé, une
couleur ou un écran qui change dans l'app ne change pas dans la vidéo. À
relire quand on touche la page Équipements, la fiche d'un équipement, la
fiche d'un contrôle (dépôt de rapport, prestataire et rendez-vous) ou la
barre de navigation.

## Ce qui est inventé, et doit le rester

- Le dossier est celui du jeu de démonstration (« Le Comptoir des Halles »),
  le prestataire est fictif, les initiales du compte sont « MD ». La vidéo
  est publique : jamais de vraie donnée.
- L'écran juste après le dépôt d'un rapport (carte verte « Le prochain
  contrôle est calculé ») n'existe pas encore dans l'app :
  `docs/chantiers-ouverts.md` § 20.

## La musique

`musique/equipements.m4a` a été générée avec Suno par la propriétaire
(2026-10-28). Le droit d'usage commercial d'une piste Suno dépend de
l'abonnement actif au moment de la génération : à vérifier avant toute
diffusion hors de l'app. Pour en changer, remplacer le fichier et relancer
`pnpm visite:rendre equipements` ; le volume se règle par `VOLUME_MUSIQUE`
dans `rendre.tsx`.

Dans l'app, la vidéo tente de démarrer avec le son ; un navigateur qui le
refuse sans geste la relance en sourdine (`IlotVideoVisite`).
