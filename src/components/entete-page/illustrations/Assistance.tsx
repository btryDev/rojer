import { CadreIllustration } from "./motifs";

/**
 * L'Assistance (2026-11-24, d'après la maquette « Assistance et rendez-vous
 * annuel ») : ses deux onglets. Le calendrier, un jour noirci — le rendez-vous
 * de l'année ; deux bulles — la question posée, la réponse qui revient.
 * Le jour, puis les bulles, se posent l'un après l'autre.
 */
export function IllustrationAssistance() {
  // Les cases du calendrier, sur la face : cinq colonnes, quatre rangées.
  const cases = [38, 60, 82, 104].flatMap((y) => [12, 34, 56, 78, 100].map((x) => ({ x, y })));
  return (
    <CadreIllustration viewBox="48 24 320 240" className="w-[clamp(220px,24vw,330px)]">
      {/* Le calendrier : côté, dessus, face */}
      <polygon points="207.2,235 172.6,255 172.6,125 207.2,105" />
      <polygon points="94.6,40 207.2,105 172.6,125 60,60" />
      <polygon points="60,190 172.6,255 172.6,125 60,60" />
      <g transform="matrix(0.866,0.5,0,1,60,60)">
        {/* L'en-tête du mois et ses deux anneaux */}
        <rect x="0" y="0" width="130" height="24" fill="#0a0a0a" stroke="none" />
        <rect x="26" y="-10" width="10" height="20" rx="5" vectorEffect="non-scaling-stroke" />
        <rect x="94" y="-10" width="10" height="20" rx="5" vectorEffect="non-scaling-stroke" />
        {cases.map(({ x, y }) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="16" height="14" rx="2" fill="none" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        ))}
        {/* Le jour du rendez-vous */}
        <rect className="ep-pop" style={{ animationDelay: "0.4s" }} x="56" y="60" width="16" height="14" rx="2" fill="#0a0a0a" stroke="none" />
      </g>

      {/* La question */}
      <g className="ep-pop" style={{ animationDelay: "0.7s" }}>
        <path
          d="M246,34 H336 a14,14 0 0 1 14,14 V82 a14,14 0 0 1 -14,14 H272 L248,116 L252,96 H246 a14,14 0 0 1 -14,-14 V48 a14,14 0 0 1 14,-14 Z"
          fill="#0a0a0a"
        />
        <circle cx="266" cy="65" r="5.5" fill="#fff" stroke="none" />
        <circle cx="291" cy="65" r="5.5" fill="#fff" stroke="none" />
        <circle cx="316" cy="65" r="5.5" fill="#fff" stroke="none" />
      </g>

      {/* La réponse */}
      <g className="ep-pop" style={{ animationDelay: "1s" }}>
        <path d="M262,128 H344 a12,12 0 0 1 12,12 V168 a12,12 0 0 1 -12,12 H336 L346,200 L318,180 H262 a12,12 0 0 1 -12,-12 V140 a12,12 0 0 1 12,-12 Z" />
        <path d="M266,146 H330 M266,162 H312" fill="none" strokeWidth={2} />
      </g>
    </CadreIllustration>
  );
}
