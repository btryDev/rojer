import { CadreIllustration, Extincteur } from "./motifs";

/**
 * Le parc, posé au sol : un tableau électrique, un bloc de secours, un
 * extincteur. Ce que vous avez, et où — chaque appareil porte ses propres
 * vérifications : une étiquette vient se poser sur chacun.
 */
export function IllustrationEquipements() {
  const etiquette = (cx: number, cy: number, delai: string) => (
    <g className="ep-pop" style={{ animationDelay: delai }}>
      <circle cx={cx} cy={cy} r={11} fill="#0a0a0a" stroke="none" />
      <path d={`M${cx - 5},${cy} l3.5,3.5 l6.5,-7`} fill="none" stroke="#fff" strokeWidth={2.2} />
    </g>
  );
  return (
    <CadreIllustration viewBox="0 -60 460 350" className="w-[clamp(240px,26vw,380px)]">
      {/* Le sol */}
      <polygon points="190,30 449.8,180 276.6,280 16.8,130" />

      {/* Le tableau électrique */}
      <polygon points="250.6,95 233.3,105 233.3,-5 250.6,-15" />
      <polygon points="198.7,-45 250.6,-15 233.3,-5 181.3,-35" />
      <polygon points="181.3,75 233.3,105 233.3,-5 181.3,-35" />
      <g transform="matrix(0.866,0.5,0,1,181.3,-35)" fill="none">
        {[12, 40, 68].map((y) => (
          <rect key={y} x="6" y={y} width="48" height="18" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        ))}
        <path
          d="M14,16V26M22,16V26M30,16V26M38,16V26M46,16V26M14,44V54M22,44V54M30,44V54M38,44V54M46,44V54M14,72V82M22,72V82M30,72V82M38,72V82M46,72V82"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* Le bloc de secours */}
      <polygon points="302.6,215 290.5,222 290.5,188 302.6,181" />
      <polygon points="250.6,151 302.6,181 290.5,188 238.5,158" />
      <polygon points="238.5,192 290.5,222 290.5,188 238.5,158" />
      <g transform="matrix(0.866,0.5,0,1,238.5,158)">
        <rect x="4" y="5" width="52" height="24" rx="1" fill="#0a0a0a" stroke="none" />
        <circle cx="16" cy="11" r="2.6" fill="#fff" stroke="none" />
        <path
          d="M15.5,14 L14,21 L18,25 M14,21 L10.5,25 M15.5,15 L20,16.5 M15.5,15 L11,16.5 M28,17 H50 M44.5,12 L50,17 L44.5,22"
          fill="none"
          stroke="#fff"
          strokeWidth={1.7}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      {/* L'extincteur */}
      <Extincteur transform="translate(-60,60)" />

      {etiquette(262, -38, "0.6s")}
      {etiquette(312, 150, "0.95s")}
      {etiquette(150, 92, "1.3s")}
    </CadreIllustration>
  );
}
