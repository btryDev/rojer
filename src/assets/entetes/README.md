# Illustrations d'en-tête de page

Importées par `src/components/entete-page/illustrations/index.tsx`
(`ILLUSTRATIONS`), jamais appelées par une URL : Next en tire les dimensions
et une adresse à empreinte. Un dessin refait change donc d'adresse, et aucun
cache ne ressert l'ancien. Le 2026-11-18, quand elles étaient dans `public/`,
l'optimiseur de `next/image` resservait l'ancien dessin sous le même nom.
Déposer un fichier ici ne l'affiche pas : il faut l'ajouter à la table.

**Style** (décisions de la propriétaire du 2026-11-18) :
- une scène concrète et détaillée, sans texte ni tampon coché ;
- papier blanc, trait noir fin, ombre décalée à plat ;
- la couleur de la section seulement sur les ombres et quelques touches.

**Origine** : une planche par section, générée avec Nano Banana Pro via Krea
en 4K, avec les images d'À faire comme référence. Les images sont détourées
par la couleur du fond blanc, puis exportées en WebP à deux fois leur plus
grande largeur affichée.

**Fond** : transparent. La teinte vient du panneau de l'en-tête
(`TEINTE_SECTION`).
