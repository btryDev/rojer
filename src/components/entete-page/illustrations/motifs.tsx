import type { ReactNode } from "react";

/**
 * Ce que les illustrations d'en-tête ont en commun — extrait à la relecture
 * du 2026-10-25, où le cadre était recopié dans chaque dessin, l'extincteur
 * et le crayon trois fois chacun. [2026-11-18 : l'extincteur et le crayon
 * sont retirés — les dessins qui les portaient sont devenus des images.]
 */

/**
 * Le cadre d'un dessin : le `<svg>` décoratif (masqué aux lecteurs d'écran,
 * hors tabulation) et le style du trait commun à toute la série — objets
 * blancs, trait noir de 2,4, angles et bouts arrondis.
 */
export function CadreIllustration({
  viewBox,
  className,
  children,
}: {
  viewBox: string;
  /** La largeur, en `clamp()` : chaque dessin a ses proportions. */
  className: string;
  children: ReactNode;
}) {
  return (
    <svg viewBox={viewBox} className={`h-auto ${className}`} aria-hidden focusable="false">
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </svg>
  );
}
