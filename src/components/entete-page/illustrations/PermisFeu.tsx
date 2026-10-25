import { CadreIllustration, Extincteur } from "./motifs";

/**
 * Le permis, debout comme une affiche de chantier : une flamme, les lignes à
 * remplir, la case des signatures. L'extincteur à côté — le moyen qui doit
 * être là pendant le travail par point chaud. La flamme vacille.
 */
export function IllustrationPermisFeu() {
  return (
    <CadreIllustration viewBox="30 -100 260 250" className="w-[clamp(190px,19vw,270px)]">
      {/* La carte du permis */}
      <polygon points="172.6,125 163.9,130 163.9,-20 172.6,-25" />
      <polygon points="60,-90 172.6,-25 163.9,-20 51.3,-85" />
      <polygon points="51.3,65 163.9,130 163.9,-20 51.3,-85" />
      <g transform="matrix(0.866,0.5,0,1,51.3,-85)">
        <rect x="12" y="12" width="106" height="42" rx="4" fill="#0a0a0a" stroke="none" />
        <path
          className="ep-lueur"
          d="M65,46 C52,46 47,36 53,27 C55,33 59,34 60,30 C59,23 63,17 68,14 C67,22 76,25 76,34 C76,41 71,46 65,46 Z"
          fill="#fff"
          stroke="none"
        />
        <path d="M14,72H116M14,86H100M14,100H110M14,114H88" fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        <rect x="14" y="124" width="46" height="18" rx="2" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        <rect x="70" y="124" width="46" height="18" rx="2" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      </g>

      {/* L'extincteur */}
      <Extincteur transform="translate(70,2)" />
    </CadreIllustration>
  );
}
