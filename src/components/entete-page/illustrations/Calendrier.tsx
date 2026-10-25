/**
 * Un grand calendrier à spirale, couché ; la page du dessus se relève. Sur
 * ses jours, trois équipements : un extincteur portant son étiquette de
 * maintenance (la grille des mois, une case poinçonnée), un tableau
 * électrique, un bloc de secours. Deux jours passés sont cochés, le prochain
 * rendez-vous est entouré.
 *
 * L'animation dit la page : la feuille se relève, les coches se tracent, le
 * cercle se dessine, et l'équipement du prochain rendez-vous sursaute.
 *
 * Géométrie : projection isométrique (x → 0,866 / 0,5 ; y → −0,866 / 0,5) ;
 * les tracés posés à plat sur la page vivent dans le repère du calendrier
 * (`matrix(…)`), à trait constant (`non-scaling-stroke`).
 */
export function IllustrationCalendrier() {
  return (
    <svg
      viewBox="0 -100 500 415"
      className="h-auto w-[clamp(260px,29vw,410px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        {/* Le bloc de pages */}
        <polygon points="459.8,190 277.9,295 277.9,305 459.8,200" />
        <polygon points="18.1,145 277.9,295 277.9,305 18.1,155" />
        <polyline points="18.1,150 277.9,300 459.8,195" fill="none" strokeWidth={1.2} />
        <polygon points="200,40 459.8,190 277.9,295 18.1,145" />

        {/* Le mois, posé à plat */}
        <g transform="matrix(0.866,0.5,-0.866,0.5,200,40)" fill="none">
          <rect x="110" y="16" width="80" height="12" rx="6" fill="#0a0a0a" stroke="none" />
          <rect x="15" y="50" width="270" height="150" vectorEffect="non-scaling-stroke" />
          <path
            d="M53.6,50V200M92.1,50V200M130.7,50V200M169.3,50V200M207.9,50V200M246.4,50V200M15,87.5H285M15,125H285M15,162.5H285"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          <path className="ep-trace" style={{ animationDelay: "0.7s" }} pathLength={1} d="M25,69 l7,7 l14,-14" strokeWidth={3.4} vectorEffect="non-scaling-stroke" />
          <path className="ep-trace" style={{ animationDelay: "1s" }} pathLength={1} d="M102,69 l7,7 l14,-14" strokeWidth={3.4} vectorEffect="non-scaling-stroke" />
          <ellipse className="ep-trace ep-lent" style={{ animationDelay: "1.3s" }} pathLength={1} cx="188.6" cy="143.8" rx="26" ry="22" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </g>

        {/* La feuille qui se relève, attachée à la reliure */}
        <path
          className="ep-feuille"
          style={{ transformOrigin: "330px 115px" }}
          d="M200,40 L459.8,190 C470,150 477,100 478,61.4 L218,-88.6 C212,-40 204,0 200,40 Z"
        />

        {/* La spirale */}
        <g fill="none" strokeWidth={2.2}>
          {[216, 238.6, 261.1, 283.6, 306.1, 328.6, 351.2, 373.7, 396.2, 418.7, 441.2].map((x, i) => (
            <path key={x} d={`M${x},${53 + 13 * i} a6,9 0 1 1 10,-3`} />
          ))}
        </g>
        <g fill="#0a0a0a" stroke="none">
          {[219.1, 241.6, 264.1, 286.6, 309.1, 331.6, 354.2, 376.7, 399.2, 421.7, 444.2].map((x, i) => (
            <circle key={x} cx={x} cy={54 + 13 * i} r={2.4} />
          ))}
        </g>

        {/* L'extincteur et son étiquette de maintenance */}
        <g>
          <path d="M156,64 L156,126 A15,6 0 0 0 186,126 L186,64 A15,10 0 0 0 156,64 Z" />
          <path d="M156,116 L156,126 A15,6 0 0 0 186,126 L186,116 A15,6 0 0 1 156,116 Z" fill="#0a0a0a" />
          <rect x="166" y="46" width="10" height="10" />
          <rect x="162" y="39" width="20" height="8" rx="2" />
          <path d="M170,39 L199,29 L200,34 L177,43 Z" />
          <circle cx="158" cy="47" r="5" />
          <path d="M158,47 l2,-3" strokeWidth={1.6} />
          <path d="M164,50 C147,58 145,92 150,111" fill="none" />
          <path d="M146,110 L154,110 L156,123 L144,123 Z" fill="#0a0a0a" />
          <rect x="163" y="76" width="18" height="24" rx="1.5" strokeWidth={1.8} />
          <path d="M169,76V100M175,76V100M163,84H181M163,92H181" strokeWidth={1.2} />
          <rect x="169" y="84" width="6" height="8" fill="#0a0a0a" stroke="none" />
        </g>

        {/* Le tableau électrique */}
        <g>
          <polygon points="326.8,103.9 361.4,123.9 347.6,131.9 312.9,111.9" />
          <polygon points="361.4,193.9 347.6,201.9 347.6,131.9 361.4,123.9" />
          <polygon points="312.9,181.9 347.6,201.9 347.6,131.9 312.9,111.9" />
          <g transform="matrix(0.866,0.5,0,1,312.9,111.9)" fill="none">
            <rect x="5" y="10" width="30" height="12" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <rect x="5" y="30" width="30" height="12" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <rect x="5" y="50" width="30" height="12" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <path
              d="M11,13V19M17,13V19M23,13V19M29,13V19M11,33V39M17,33V39M23,33V39M29,33V39M11,53V59M17,53V59M23,53V59M29,53V59"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>

        {/* Le bloc de secours, sur le jour entouré */}
        <g className="ep-saute" style={{ animationDelay: "1.9s" }}>
          <polygon points="225,162.2 263.1,184.2 252.7,190.2 214.6,168.2" />
          <polygon points="263.1,214.2 252.7,220.2 252.7,190.2 263.1,184.2" />
          <polygon points="214.6,198.2 252.7,220.2 252.7,190.2 214.6,168.2" />
          <g transform="matrix(0.866,0.5,0,1,214.6,168.2)">
            <rect x="3" y="4" width="38" height="22" rx="1" fill="#0a0a0a" stroke="none" />
            <circle cx="12" cy="9" r="2.3" fill="#fff" stroke="none" />
            <path
              d="M11.5,12 L10,18 L13.5,21.5 M10,18 L7,21.5 M11.5,13 L15,14.5 M11.5,13 L8,14.5 M22,15 H36 M31,10.5 L36,15 L31,19.5"
              fill="none"
              stroke="#fff"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
