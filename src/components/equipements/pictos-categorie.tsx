// Les pictogrammes que lucide n'a pas : la hotte professionnelle,
// l'ascenseur, le portail motorisé, l'escalier mécanique et la colonne sèche.
// Les laisser retomber sur une icône approchante — un chapeau de cuisinier
// pour la hotte, une double flèche pour l'ascenseur, une barrière pour le
// portail — était exactement ce qui avait fait retirer la première planche
// de pictos : un dessin d'une autre famille, qui ne nomme pas la chose et ne
// se distingue pas de sa voisine (« porte » et « portail »).
//
// Ils sont donc dessinés ici, à la grille de lucide pour qu'on ne voie pas
// la couture : 24 × 24, trait de 2, extrémités et jointures arrondies,
// `currentColor`. L'appelant pose la taille et la couleur, comme pour une
// icône lucide.

import type { SVGProps } from "react";

type ProprietesPicto = SVGProps<SVGSVGElement> & { size?: number | string };

/** Les attributs communs à toute icône lucide, repris tels quels. */
const GRILLE = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * Hotte professionnelle : la mitre, son conduit, et les deux feux du piano
 * en dessous. Les feux ne sont pas décoratifs — sans eux, une mitre et son
 * conduit sont une suspension de plafond, et le dessin dit « lampe ».
 */
export function PictoHottePro({ size = 24, ...props }: ProprietesPicto) {
  return (
    <svg {...GRILLE} width={size} height={size} {...props}>
      <path d="M2 11 5 6h14l3 5Z" />
      <path d="M10 6V3h4v3" />
      <circle cx="9" cy="16.5" r="1.2" />
      <circle cx="15" cy="16.5" r="1.2" />
      <path d="M4 20h16" />
    </svg>
  );
}

/**
 * Ascenseur : la cabine et les deux sens de course. Les chevrons dans un
 * caisson disent la cage ; une double flèche seule aurait dit « trier ».
 */
export function PictoAscenseur({ size = 24, ...props }: ProprietesPicto) {
  return (
    <svg {...GRILLE} width={size} height={size} {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="m9 11 3-3 3 3" />
      <path d="m9 14 3 3 3-3" />
    </svg>
  );
}

/**
 * Portail automatique : deux poteaux, le vantail entre eux, et le rail au
 * sol. Le rail est le détail qui compte — c'est lui qui distingue le
 * portail motorisé de la porte piétonne (`DoorOpen`) et d'une clôture.
 */
export function PictoPortailAuto({ size = 24, ...props }: ProprietesPicto) {
  return (
    <svg {...GRILLE} width={size} height={size} {...props}>
      <path d="M3 6v12" />
      <path d="M21 6v12" />
      <rect x="6" y="9" width="12" height="6" />
      <path d="M12 9v6" />
      <path d="M2 21h20" />
    </svg>
  );
}

/**
 * Escalier mécanique ou trottoir roulant (2026-11-13) : le profil de la
 * volée, ses marches et la main courante parallèle. Les deux paliers plats
 * disent l'appareil ; une diagonale seule aurait dit « en hausse », et des
 * marches sans main courante, un escalier fixe, que rien ne vérifie.
 */
export function PictoEscalierMecanique({ size = 24, ...props }: ProprietesPicto) {
  return (
    <svg {...GRILLE} width={size} height={size} {...props}>
      <path d="M2 20h5L17 9h5" />
      <path d="M2 14h3L14 4h3" />
      <path d="M10 16.7h2v-2.2h2v-2.2h2" />
    </svg>
  );
}

/**
 * Colonne sèche (2026-11-13) : la conduite verticale, la prise d'étage qui
 * en sort, et le raccord d'alimentation au pied, côté façade, où les
 * sapeurs-pompiers branchent leurs tuyaux. Le raccord au pied est le détail
 * qui compte : sans lui, une conduite et une vanne disent la plomberie. Les
 * gouttes (`Droplets`) restent au RIA, toujours en eau.
 */
export function PictoColonneSeche({ size = 24, ...props }: ProprietesPicto) {
  return (
    <svg {...GRILLE} width={size} height={size} {...props}>
      <path d="M12 2v16" />
      <path d="M12 8h5" />
      <circle cx="18.5" cy="8" r="1.5" />
      <path d="M12 18v2a2 2 0 0 1-2 2H6" />
      <circle cx="4.5" cy="20" r="1.5" />
      <path d="M4.5 18.5v-1" />
    </svg>
  );
}
