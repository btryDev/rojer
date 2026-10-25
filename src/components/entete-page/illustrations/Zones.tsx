import { CadreIllustration } from "./motifs";

/**
 * Le plan d'un établissement en trois zones, séparées par des murets bas :
 * une épingle se plante dans chacune. Trois zones au plus, et chaque
 * équipement situé dans l'une d'elles.
 */
export function IllustrationZones() {
  const epingle = ([x, y]: [number, number], delai: string) => (
    <g className="ep-pop" style={{ animationDelay: delai }}>
      <path
        d={`M${x},${y} C${x - 4},${y - 12} ${x - 14},${y - 18} ${x - 14},${y - 30} A14,14 0 1 1 ${x + 14},${y - 30} C${x + 14},${y - 18} ${x + 4},${y - 12} ${x},${y} Z`}
        fill="#0a0a0a"
        stroke="none"
      />
      <circle cx={x} cy={y - 30} r={5.5} fill="#fff" stroke="none" />
    </g>
  );
  return (
    <CadreIllustration viewBox="0 -30 470 320" className="w-[clamp(240px,26vw,380px)]">
      {/* La dalle */}
      <polygon points="459.8,170 269.3,280 269.3,270 459.8,160" />
      <polygon points="9.5,130 269.3,280 269.3,270 9.5,120" />
      <polygon points="200,10 459.8,160 269.3,270 9.5,120" />
      <g transform="matrix(0.866,0.5,-0.866,0.5,200,10)" fill="none">
        <path d="M20,30H120M20,190H120M168,30V90M280,140V200" strokeWidth={1.2} strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
      </g>

      {/* Les murets */}
      <polygon points="328.2,94 232.9,149 232.9,123 328.2,68" />
      <polygon points="226,145 232.9,149 232.9,123 226,119" />
      <polygon points="321.2,64 328.2,68 232.9,123 226,119" />
      <polygon points="369.7,222 362.8,226 362.8,200 369.7,196" />
      <polygon points="231.2,150 362.8,226 362.8,200 231.2,124" />
      <polygon points="238.1,120 369.7,196 362.8,200 231.2,124" />

      {epingle([165.4, 100], "0.5s")}
      {epingle([351.6, 147.5], "0.85s")}
      {epingle([247.6, 207.5], "1.2s")}
    </CadreIllustration>
  );
}
