import { CadreIllustration } from "./motifs";

/**
 * Deux blocs reliés par un câble : votre dossier, et l'assistant qui le
 * consulte en lecture seule. Le câble se tend entre les deux.
 */
export function IllustrationConnecter() {
  return (
    <CadreIllustration viewBox="40 -10 380 290" className="w-[clamp(230px,25vw,360px)]">
      {/* Le dossier */}
      <polygon points="197.9,105 137.3,140 137.3,80 197.9,45" />
      <polygon points="120,0 197.9,45 137.3,80 59.4,35" />
      <polygon points="59.4,95 137.3,140 137.3,80 59.4,35" />
      <g transform="matrix(0.866,0.5,0,1,59.4,35)" fill="none">
        <path d="M14,16H72M14,28H60M14,40H68" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
      </g>

      {/* L'assistant */}
      <polygon points="397.1,220 336.5,255 336.5,195 397.1,160" />
      <polygon points="319.2,115 397.1,160 336.5,195 258.6,150" />
      <polygon points="258.6,210 336.5,255 336.5,195 258.6,150" />
      <g transform="matrix(0.866,0.5,0,1,258.6,150)">
        <path d="M18,12 H72 a6,6 0 0 1 6,6 V36 a6,6 0 0 1 -6,6 H34 L24,52 V42 H18 a6,6 0 0 1 -6,-6 V18 a6,6 0 0 1 6,-6 Z" fill="#0a0a0a" stroke="none" />
        <circle cx="32" cy="27" r="3" fill="#fff" stroke="none" />
        <circle cx="45" cy="27" r="3" fill="#fff" stroke="none" />
        <circle cx="58" cy="27" r="3" fill="#fff" stroke="none" />
      </g>

      {/* Le câble et ses deux fiches */}
      <path
        className="ep-trace"
        style={{ animationDelay: "0.6s" }}
        pathLength={1}
        d="M182,92 C240,96 214,190 268,176"
        fill="none"
        strokeWidth={4}
      />
      <rect x="172" y="84" width="16" height="14" rx="3" fill="#0a0a0a" stroke="none" />
      <rect x="264" y="168" width="16" height="14" rx="3" fill="#0a0a0a" stroke="none" />
    </CadreIllustration>
  );
}
