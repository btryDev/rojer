/**
 * Le document unique, couché : un classeur épais dont la couverture porte la
 * grille de cotation — gravité par probabilité. Trois cases se remplissent,
 * de la plus faible à la plus forte : évaluer, c'est situer chaque risque.
 * Un crayon posé dessus : le document se tient à jour.
 */
export function IllustrationDuerp() {
  const caseCotee = (x: number, y: number, delai: string) => (
    <rect
      className="ep-pop"
      style={{ animationDelay: delai }}
      x={x + 4}
      y={y + 4}
      width={25.3}
      height={25.3}
      rx={3}
      fill="#0a0a0a"
      stroke="none"
    />
  );
  return (
    <svg
      viewBox="0 -40 420 300"
      className="h-auto w-[clamp(240px,26vw,380px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        {/* Le classeur : tranche, pages, couverture */}
        <polygon points="377.8,160 230.6,245 230.6,223 377.8,138" />
        <polygon points="22.8,125 230.6,245 230.6,223 22.8,103" />
        <path d="M22.8,110 L230.6,230 M22.8,117 L230.6,237 M230.6,230 L377.8,145 M230.6,237 L377.8,152" fill="none" strokeWidth={1.2} />
        <polygon points="170,18 377.8,138 230.6,223 22.8,103" />
        <g transform="matrix(0.866,0.5,-0.866,0.5,170,18)">
          <rect x="18" y="20" width="90" height="12" rx="6" fill="#0a0a0a" stroke="none" />
          <path d="M18,48H96M18,62H80" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          {/* La grille de cotation, 3 × 3 */}
          <rect x="118" y="44" width="100" height="100" fill="none" vectorEffect="non-scaling-stroke" />
          <path d="M151.3,44V144M184.6,44V144M118,77.3H218M118,110.6H218" fill="none" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          {caseCotee(118, 110.6, "0.5s")}
          {caseCotee(151.3, 77.3, "0.8s")}
          {caseCotee(184.6, 44, "1.1s")}
        </g>

        {/* Le crayon, posé sur la couverture */}
        <g className="ep-crayon" style={{ animationDelay: "1.4s" }} transform="translate(150,-40)">
          <polygon points="79.9,148.4 69.5,139 141.8,58.7 152.2,68.1" />
          <path d="M74.7,143.7 L147,63.4" fill="none" strokeWidth={1.4} />
          <polygon points="60,160 79.9,148.4 69.5,139" />
          <polygon points="60,160 66.4,156.3 63.1,153.3" fill="#0a0a0a" />
          <polygon points="152.2,68.1 141.8,58.7 147.2,52.8 157.6,62.2" />
          <polygon points="157.6,62.2 147.2,52.8 155.2,43.8 165.6,53.2" fill="#0a0a0a" />
        </g>
      </g>
    </svg>
  );
}
