import { CadreIllustration } from "./motifs";

/**
 * Un badge nominatif debout sur son socle, un casque à côté : la personne et
 * ce qu'elle est habilitée à faire. Un sceau vient se poser près du badge —
 * un titre porte une échéance au nom de quelqu'un, pas d'un poste.
 */
export function IllustrationEquipe() {
  return (
    <CadreIllustration viewBox="20 -135 330 280" className="w-[clamp(220px,23vw,330px)]">
      {/* Le socle */}
      <polygon points="228.6,110 193.9,130 193.9,122 228.6,102" />
      <polygon points="46.7,45 193.9,130 193.9,122 46.7,37" fill="#0a0a0a" />
      <polygon points="81.3,17 228.6,102 193.9,122 46.7,37" />

      {/* Le badge : tranche, face */}
      <polygon points="193.9,100 185.3,105 185.3,-55 193.9,-60" />
      <polygon points="90,-120 193.9,-60 185.3,-55 81.3,-115" />
      <polygon points="81.3,45 185.3,105 185.3,-55 81.3,-115" />
      <g transform="matrix(0.866,0.5,0,1,81.3,-115)">
        <rect x="50" y="8" width="20" height="6" rx="3" fill="#0a0a0a" stroke="none" />
        {/* La photo : une silhouette */}
        <rect x="14" y="28" width="42" height="52" rx="3" vectorEffect="non-scaling-stroke" />
        <circle cx="35" cy="47" r="9" fill="#0a0a0a" stroke="none" />
        <path d="M19,78 C22,62 48,62 51,78 Z" fill="#0a0a0a" stroke="none" />
        {/* Le nom et le titre */}
        <path d="M66,40H106M66,54H98M66,68H104" fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <rect x="14" y="104" width="92" height="22" rx="4" fill="#0a0a0a" stroke="none" />
        <path d="M22,115 l4,4 l8,-9" fill="none" stroke="#fff" strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
        <path d="M42,115H96" fill="none" stroke="#fff" strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
      </g>

      {/* Le casque */}
      <path d="M238,120 C238,78 318,78 318,120 Z" />
      <path d="M262,86 C268,96 270,108 270,120 M294,86 C288,96 286,108 286,120" fill="none" strokeWidth={1.8} />
      <ellipse cx="278" cy="121" rx="54" ry="10" />
      <path d="M232,121 C250,127 306,127 324,121" fill="none" strokeWidth={1.4} />

      {/* Le sceau */}
      <g className="ep-pop" style={{ animationDelay: "0.9s" }}>
        <circle cx="214" cy="0" r="17" fill="#0a0a0a" stroke="none" />
        <path d="M206.5,0 l5,5 l9,-10" fill="none" stroke="#fff" strokeWidth={2.6} />
      </g>
    </CadreIllustration>
  );
}
