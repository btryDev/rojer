// Le kit est appelé des deux côtés de la migration visuelle.
//
// Deux grammaires cohabitent dans le produit (docs/charte-board.md, § 0) :
// le « board », en vigueur, et le « papier », qui est de la dette. ~~Quatre~~
// Trois composants du kit — ~~LegalBadge,~~ WhyCard, StatusPill,
// SignatureBlock — sont appelés par les deux [2026-10-28 : LegalBadge n'avait
// plus d'appelant papier, sa table et sa prop `charte` sont parties], et un composant partagé ne peut pas trancher
// à la place de l'écran qui le porte : une pastille réglementaire à rayon
// 6 px au milieu d'une carte à rayon 30 se voit, et l'inverse aussi.
//
// D'où une prop plutôt qu'une réécriture, sur le modèle de `ui/button.tsx`
// (variantes `board` / `boardClair` posées à côté des historiques) et de
// `batiments/SelecteurBatiment.tsx`, qui porte la même idée sous le nom
// `ton`. Le défaut est `papier` : c'est ce que ces composants rendaient
// avant, et un défaut `board` aurait basculé d'un coup la quinzaine
// d'écrans non repris.
//
// Ce fichier est daté : le jour où le dernier appelant papier disparaît,
// il s'en va avec les tables `papier` des ~~quatre~~ trois composants. Il ne se
// remplit pas, il se vide.
export type Charte = "papier" | "board";
