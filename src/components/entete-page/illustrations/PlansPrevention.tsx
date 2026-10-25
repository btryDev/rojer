import { CadreIllustration } from "./motifs";

/**
 * Une barrière de chantier — une entreprise extérieure intervient chez vous —
 * et, posé devant, le plan de prévention sur son porte-bloc : deux lignes de
 * signature, celle de l'entreprise utilisatrice et celle de l'entreprise
 * extérieure. Les deux signatures se tracent.
 */
export function IllustrationPlansPrevention() {
  const rayures = [10, 46, 82, 118, 154, 190]
    .map((x) => `M${x},0 L${x + 16},0 L${x + 6},30 L${x - 10},30 Z`)
    .join(" ");
  return (
    <CadreIllustration viewBox="10 0 390 310" className="w-[clamp(230px,25vw,360px)]">
      {/* La barrière : pieds, montants, lisse rayée */}
      <polygon points="25.4,140 37.5,147 37.5,139 25.4,132" fill="#0a0a0a" />
      <polygon points="60,112 72.1,119 37.5,139 25.4,132" />
      <polygon points="181.2,230 193.4,237 193.4,229 181.2,222" fill="#0a0a0a" />
      <polygon points="215.9,202 228,209 193.4,229 181.2,222" />
      <polygon points="41.8,133.5 48.7,137.5 48.7,27.5 41.8,23.5" />
      <polygon points="55.7,133.5 48.7,137.5 48.7,27.5 55.7,23.5" />
      <polygon points="197.7,223.5 204.6,227.5 204.6,117.5 197.7,113.5" />
      <polygon points="211.6,223.5 204.6,227.5 204.6,117.5 211.6,113.5" />
      <polygon points="221.1,147 210.7,153 210.7,123 221.1,117" />
      <polygon points="42.7,14 221.1,117 210.7,123 32.3,20" />
      <polygon points="32.3,50 210.7,153 210.7,123 32.3,20" />
      <g transform="matrix(0.866,0.5,0,1,32.3,20)">
        <path d={rayures} fill="#0a0a0a" stroke="none" />
      </g>

      {/* Le plan sur son porte-bloc */}
      <polygon points="76.8,220 206.7,295 206.7,289 76.8,214" />
      <polygon points="379.9,195 206.7,295 206.7,289 379.9,189" />
      <polygon points="250,114 379.9,189 206.7,289 76.8,214" fill="#0a0a0a" />
      <g transform="matrix(0.866,0.5,-0.866,0.5,250,114)">
        <rect x="10" y="16" width="130" height="176" rx="3" vectorEffect="non-scaling-stroke" />
        <rect x="45" y="6" width="60" height="16" rx="4" fill="#fff" vectorEffect="non-scaling-stroke" />
        <path d="M22,40H128M22,54H110M22,68H124M22,82H96M22,96H118" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        <path d="M22,160H70M80,160H128" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        {/* Deux signatures */}
        <path
          className="ep-trace"
          style={{ animationDelay: "0.7s" }}
          pathLength={1}
          d="M24,152 C30,138 34,156 40,146 C44,140 48,154 54,148 C58,144 62,150 66,146"
          fill="none"
          strokeWidth={2.4}
        />
        <path
          className="ep-trace"
          style={{ animationDelay: "1.2s" }}
          pathLength={1}
          d="M82,150 C88,140 92,156 98,148 C104,140 108,152 114,146 C118,142 122,148 126,144"
          fill="none"
          strokeWidth={2.4}
        />
      </g>
    </CadreIllustration>
  );
}
