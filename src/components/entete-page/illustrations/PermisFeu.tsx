/**
 * Le permis, debout comme une affiche de chantier : une flamme, les lignes à
 * remplir, la case des signatures. L'extincteur à côté — le moyen qui doit
 * être là pendant le travail par point chaud. La flamme vacille.
 */
export function IllustrationPermisFeu() {
  return (
    <svg
      viewBox="30 -100 260 250"
      className="h-auto w-[clamp(190px,19vw,270px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
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
        <g transform="translate(70,2)">
          <path d="M156,64 L156,126 A15,6 0 0 0 186,126 L186,64 A15,10 0 0 0 156,64 Z" />
          <path d="M156,116 L156,126 A15,6 0 0 0 186,126 L186,116 A15,6 0 0 1 156,116 Z" fill="#0a0a0a" />
          <rect x="166" y="46" width="10" height="10" />
          <rect x="162" y="39" width="20" height="8" rx="2" />
          <path d="M170,39 L199,29 L200,34 L177,43 Z" />
          <circle cx="158" cy="47" r="5" />
          <path d="M164,50 C147,58 145,92 150,111" fill="none" />
          <path d="M146,110 L154,110 L156,123 L144,123 Z" fill="#0a0a0a" />
        </g>
      </g>
    </svg>
  );
}
