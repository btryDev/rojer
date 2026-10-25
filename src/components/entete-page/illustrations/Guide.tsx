import { CadreIllustration } from "./motifs";

/**
 * Un livre ouvert, à plat, et une ampoule qui s'allume au-dessus : ce que la
 * loi attend d'un employeur, expliqué. Comprendre, pas certifier.
 */
export function IllustrationGuide() {
  return (
    <CadreIllustration viewBox="0 -110 400 330" className="w-[clamp(230px,25vw,360px)]">
      {/* Le livre : tranche, puis les deux pages qui se relèvent au pli */}
      <polygon points="20,120 200,210 200,218 20,128" fill="#0a0a0a" />
      <polygon points="380,120 200,210 200,218 380,128" fill="#0a0a0a" />
      <path d="M20,120 C80,96 150,110 200,140 L200,210 C150,180 80,166 20,190 Z" />
      <path d="M380,120 C320,96 250,110 200,140 L200,210 C250,180 320,166 380,190 Z" />
      <path
        d="M40,130 C90,114 140,122 180,144 M40,146 C90,130 140,138 180,160 M40,162 C90,146 140,154 180,176 M220,144 C260,122 310,114 360,130 M220,160 C260,138 310,130 360,146 M220,176 C260,154 310,146 360,162"
        fill="none"
        strokeWidth={1.6}
      />

      {/* L'ampoule */}
      <g className="ep-lueur">
        <path d="M200,-90 C232,-90 250,-66 250,-44 C250,-24 236,-14 230,0 L170,0 C164,-14 150,-24 150,-44 C150,-66 168,-90 200,-90 Z" />
        <path d="M184,-6 L192,-40 L200,-30 L208,-40 L216,-6" fill="none" strokeWidth={2} />
        <rect x="172" y="0" width="56" height="12" rx="3" fill="#0a0a0a" stroke="none" />
        <rect x="178" y="14" width="44" height="10" rx="3" fill="#0a0a0a" stroke="none" />
        <path d="M200,-104 V-96 M262,-74 L254,-68 M138,-74 L146,-68 M272,-38 H262 M128,-38 H138" fill="none" strokeWidth={2.4} />
      </g>
    </CadreIllustration>
  );
}
