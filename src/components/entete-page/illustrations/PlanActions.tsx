import { CadreIllustration, Crayon } from "./motifs";

/**
 * Un porte-bloc couché, sa liste de quatre mesures : deux faites, la
 * troisième que le crayon coche, la dernière à venir. À côté, un triangle
 * d'alerte qu'une clé est en train de régler — le risque qu'on traite.
 *
 * L'animation : la coche de la troisième ligne se trace sous le crayon, puis
 * la clé tourne.
 */
export function IllustrationPlanActions() {
  return (
    <CadreIllustration viewBox="-70 30 430 290" className="w-[clamp(260px,30vw,420px)]">
      {/* Le porte-bloc */}
      <polygon points="-55.2,190 118,290 118,298 -55.2,198" />
      <polygon points="343.2,160 118,290 118,298 343.2,168" />
      <polygon points="170,60 343.2,160 118,290 -55.2,190" fill="#0a0a0a" />
      <g transform="matrix(0.866,0.5,-0.866,0.5,170,60)">
        <rect x="12" y="22" width="176" height="230" rx="3" vectorEffect="non-scaling-stroke" />
        <g fill="none">
          {[60, 110, 160, 210].map((y) => (
            <rect key={y} x="30" y={y} width="20" height="20" rx="3" vectorEffect="non-scaling-stroke" />
          ))}
          <path d="M64,70H150M64,120H136" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
          <path d="M64,170H160M64,220H144" strokeWidth={3.2} vectorEffect="non-scaling-stroke" />
          <path d="M33,69 l5,5 l10,-11" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <path d="M33,119 l5,5 l10,-11" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          {/* Sans `non-scaling-stroke` : il applique les tirets dans le
              repère de l'écran, où `pathLength` ne normalise plus — la
              coche pouvait rester en pointillés après son tracé. */}
          <path className="ep-trace" style={{ animationDelay: "0.7s" }} pathLength={1} d="M33,169 l5,5 l10,-11" strokeWidth={3.4} />
        </g>
      </g>
      {/* La pince */}
      <polygon points="234.1,69 303.4,109 280.9,122 211.6,82" />
      <polygon points="211.6,96 280.9,136 280.9,122 211.6,82" />
      <polygon points="303.4,123 280.9,136 280.9,122 303.4,109" />

      {/* Le crayon, pointe sur la troisième case */}
      <Crayon className="ep-crayon" style={{ animationDelay: "0.6s" }} />

      {/* Le triangle d'alerte et la clé */}
      <polygon points="300,200 336,262 264,262" />
      <rect x="297" y="220" width="6" height="24" rx="3" fill="#0a0a0a" stroke="none" />
      <circle cx="300" cy="252" r="3.6" fill="#0a0a0a" stroke="none" />
      <g transform="translate(262,268) rotate(-38)">
        <g className="ep-cle" style={{ animationDelay: "1.4s" }}>
          <rect x="0" y="-6" width="70" height="12" rx="6" />
          <circle cx="80" cy="0" r="15" />
          <rect x="80" y="-5" width="18" height="10" fill="#0a0a0a" stroke="none" />
        </g>
      </g>
    </CadreIllustration>
  );
}
