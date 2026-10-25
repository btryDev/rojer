/**
 * Le registre de sécurité, couché : un gros volume relié, son étiquette, un
 * signet. Les rapports s'y consignent au fil de l'eau — une ligne s'écrit
 * sur la page de garde.
 */
export function IllustrationRegistre() {
  return (
    <svg
      viewBox="20 -20 380 270"
      className="h-auto w-[clamp(240px,26vw,370px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        {/* Le volume : dos, tranche des pages, couverture */}
        <polygon points="32.8,115 232,230 232,196 32.8,81" fill="#0a0a0a" />
        <polygon points="379.2,145 232,230 232,196 379.2,111" />
        <path d="M232,203 L379.2,118 M232,210 L379.2,125 M232,217 L379.2,132 M232,224 L379.2,139" fill="none" strokeWidth={1.2} />
        <polygon points="180,-4 379.2,111 232,196 32.8,81" />
        <g transform="matrix(0.866,0.5,-0.866,0.5,180,-4)">
          {/* L'étiquette du dos et celle de la couverture */}
          <rect x="40" y="40" width="150" height="60" rx="4" fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <rect x="60" y="56" width="110" height="10" rx="2" fill="#0a0a0a" stroke="none" />
          <path
            className="ep-trace"
            style={{ animationDelay: "0.7s" }}
            pathLength={1}
            d="M60,82 H150"
            fill="none"
            strokeWidth={2.4}
          />
          {/* Le signet */}
          <path d="M200,0 V40 L208,32 L216,40 V0" fill="#0a0a0a" stroke="none" />
        </g>
      </g>
    </svg>
  );
}
