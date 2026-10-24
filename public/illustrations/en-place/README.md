# Illustrations de « Ce qui doit être en place »

Un dessin par sujet, affiché à côté des lignes de l'écran
`/etablissements/[id]/etats-permanents` (vignette, carte d'étape, fiche). Ils
ne sont référencés qu'à un endroit : `src/lib/etats-permanents/illustrations.ts`
— `SUJET_PAR_OBLIGATION` dit quel dessin montre chaque obligation,
`SUJETS_DESSINES` lesquels sont déposés ici. Déposer un fichier ne l'affiche
pas ; `illustrations.test.ts` échoue si une ligne de l'écran n'a pas de sujet,
ou si un sujet annoncé n'a pas son fichier.

Tous décoratifs (`alt=""`) : ce qu'ils évoquent est écrit à côté.

## Origine

Générés le 2026-10-20 par la propriétaire avec un générateur d'images (fichiers
nommés « GPT image »), à partir des prompts de la recherche UI de la page. Les
planches sources sont dans `docs/illustrations/planches/` :

- `planche-0-premiere-serie.png` : la première série de 15 objets, dont 11
  sont gardés. `balisage` et `registre` viennent d'une planche du même jour
  qui n'est pas déposée ici ; `salarie-designe` et `sante-travail`, de la
  planche 2 ;
- `planche-1-incendie-secours-installations.png` : 16 objets ;
- `planche-2-organisation-quotidien.png` : 16 objets, dont `salarie-designe`
  (badge) et `sante-travail` (stéthoscope) qui remplacent le médaillon et le
  cœur.

**Licence à confirmer** avant une mise en ligne publique : vérifier les
conditions d'usage commercial du générateur employé et les écrire ici.

## Consignes

- **Style** : vecteur 2.5D, isométrie stricte, trait fin bleu nuit `#0b1636`,
  aplats blanc / gris-bleu / nuit, une seule couleur d'accent (corail, menthe,
  pervenche, violet), ombre plate nuit en bas à droite. Le fond de couleur est
  posé par l'application (`--illu-*`, `globals.css`), jamais dans le fichier.
- **Format** : PNG transparent, 240 × 240, quantifié à 96 couleurs — 3 à 7 Ko.
- **Découpe** : chaque case de la planche est détourée, les grains isolés
  retirés (îlots de moins de 60 px, fragments touchant le bord de la case),
  puis recadrée au carré avec 10 % de marge.

## Planche 3 — la fiche salarié (2026-10-24)

`docs/illustrations/planches/planche-3-fiche-salarie.png`, générée par la
propriétaire sur le même style, découpée le même jour (fond blanc retiré par
l'extérieur seulement, pour garder les blancs intérieurs ; îlots de moins de
60 px retirés ; carré à 10 % de marge ; 240 × 240, 96 couleurs) :

- `personne.png` : le portrait de la fiche salarié (`HeroSalarie.tsx`) ;
- `chariot-elevateur.png` : la formation et l'autorisation de conduite ;
- `casque-securite.png` : la formation à la sécurité au poste.

Référencés par `src/lib/salaries/illustration-titre.ts` (titres) et
`HeroSalarie.tsx` (portrait), pas par `illustrations.ts` : aucune ligne de
« Ce qui doit être en place » ne les montre. Même réserve de licence que
ci-dessus.
