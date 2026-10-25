import type { CSSProperties, ReactNode } from "react";

/**
 * Ce que les illustrations d'en-tête ont en commun — extrait à la relecture
 * du 2026-10-25, où le cadre était recopié dans chaque dessin, l'extincteur
 * et le crayon trois fois chacun.
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

/**
 * L'extincteur, debout, sa base vers (171, 132) dans son propre repère : on
 * le place d'un `transform`. `etiquette` ajoute l'aiguille du manomètre et
 * l'étiquette de maintenance — la grille des mois, une case poinçonnée.
 */
export function Extincteur({
  transform,
  etiquette = false,
}: {
  transform?: string;
  etiquette?: boolean;
}) {
  return (
    <g transform={transform}>
      <path d="M156,64 L156,126 A15,6 0 0 0 186,126 L186,64 A15,10 0 0 0 156,64 Z" />
      <path d="M156,116 L156,126 A15,6 0 0 0 186,126 L186,116 A15,6 0 0 1 156,116 Z" fill="#0a0a0a" />
      <rect x="166" y="46" width="10" height="10" />
      <rect x="162" y="39" width="20" height="8" rx="2" />
      <path d="M170,39 L199,29 L200,34 L177,43 Z" />
      <circle cx="158" cy="47" r="5" />
      {etiquette ? <path d="M158,47 l2,-3" strokeWidth={1.6} /> : null}
      <path d="M164,50 C147,58 145,92 150,111" fill="none" />
      <path d="M146,110 L154,110 L156,123 L144,123 Z" fill="#0a0a0a" />
      {etiquette ? (
        <>
          <rect x="163" y="76" width="18" height="24" rx="1.5" strokeWidth={1.8} />
          <path d="M169,76V100M175,76V100M163,84H181M163,92H181" strokeWidth={1.2} />
          <rect x="169" y="84" width="6" height="8" fill="#0a0a0a" stroke="none" />
        </>
      ) : null}
    </g>
  );
}

/**
 * Le crayon, couché en diagonale, pointe en (60, 160) dans son repère. Il
 * accepte la classe et le style d'une animation (`ep-crayon`).
 */
export function Crayon({
  transform,
  className,
  style,
}: {
  transform?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <g transform={transform} className={className} style={style}>
      <polygon points="79.9,148.4 69.5,139 141.8,58.7 152.2,68.1" />
      <path d="M74.7,143.7 L147,63.4" fill="none" strokeWidth={1.4} />
      <polygon points="60,160 79.9,148.4 69.5,139" />
      <polygon points="60,160 66.4,156.3 63.1,153.3" fill="#0a0a0a" />
      <polygon points="152.2,68.1 141.8,58.7 147.2,52.8 157.6,62.2" />
      <polygon points="157.6,62.2 147.2,52.8 155.2,43.8 165.6,53.2" fill="#0a0a0a" />
    </g>
  );
}
