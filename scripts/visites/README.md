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
pnpm visite:rendre equipements            # ou duerp
pnpm visite:rendre duerp --apercu 12,40.5  # quelques images fixes, sans vidéo
```

Sortie : `public/videos/visite-<cle>.mp4`, son image d'aperçu `.jpg`
et la vignette `-vignette.jpg`. Deux à quatre minutes. L'image d'aperçu est
prise à l'instant que le gabarit désigne (`window.affiche`), sinon sur la
première image. Chrome est cherché à
son emplacement macOS ; ailleurs, `CHROME_PATH=/chemin/vers/chrome`.

Pour régler une animation, ouvrir le gabarit rendu dans un navigateur : hors
du rendu, il joue en boucle.

## Quand la refaire

Le gabarit **reconstitue** l'interface ; il ne la lit pas. Un libellé, une
couleur ou un écran qui change dans l'app ne change pas dans la vidéo. À
relire quand on touche :

- `equipements` : la page Équipements, la fiche d'un équipement, la fiche
  d'un contrôle (dépôt de rapport, prestataire et rendez-vous) ;
- `duerp` : la porte d'entrée et chaque étape de l'assistant (secteur,
  précisions d'activité, unités, risques, cotation, mesures, questions
  transverses, synthèse et versions), le fil des étapes ;
- les deux : la barre de navigation, et l'image d'en-tête de la page
  (`src/assets/entetes/`), que le rendu lit telle quelle.

## Ce qui est inventé, et doit le rester

- Le dossier est celui du jeu de démonstration (« Le Comptoir des Halles »),
  le prestataire est fictif, les initiales du compte sont « MD ». La vidéo
  est publique : jamais de vraie donnée.
- Visite `duerp` : un seul risque est montré en entier ; le passage de toutes
  les unités à « ✓ Évaluée » est une ellipse, et la vidéo le dit à l'écran.
  Les chiffres de la synthèse (6 unités, 36 risques, 61 mesures en place,
  14 actions) et les lignes de l'inventaire priorisé sont inventés, cohérents
  avec le référentiel restauration.
- L'écran juste après le dépôt d'un rapport (carte verte « Le prochain
  contrôle est calculé ») n'existe pas encore dans l'app :
  `docs/chantiers-ouverts.md` § 20.

## La musique

`musique/duerp.m4a` vient d'une piste Suno de la propriétaire (2026-11-18,
« Ouverture Électrique », French electro à 116 BPM), raccourcie de 3 min 30
à 98 s sur la grille des mesures : le début jusqu'à la mesure 40, puis de
la mesure 94 à la fin, pour que l'accord final tombe sur la signature
(« Rojer » sur le bleu). Même réserve de droits que ci-dessous.

`musique/equipements.m4a` a été générée avec Suno par la propriétaire
(2026-10-28). Le droit d'usage commercial d'une piste Suno dépend de
l'abonnement actif au moment de la génération : à vérifier avant toute
diffusion hors de l'app. Pour en changer, remplacer le fichier et relancer
`pnpm visite:rendre equipements` ; le volume se règle par `VOLUME_MUSIQUE`
dans `rendre.tsx`.

Dans l'app, la vidéo tente de démarrer avec le son ; un navigateur qui le
refuse sans geste la relance en sourdine (`IlotVideoVisite`).
