/**
 * Un pan de mur et son sol, en perspective : une porte sous son bloc de
 * sortie de secours, un extincteur sur son support, une trousse de secours,
 * une consigne affichée. Ce qui doit exister chez vous en permanence.
 *
 * L'animation : le bloc de sortie s'allume, puis une coche vient sur la
 * sortie, l'extincteur et la trousse — ce que la page fait faire : déclarer
 * en place, ligne par ligne.
 *
 * Les objets plats du mur vivent dans le repère du mur
 * (`matrix(0.866,0.5,0,1,…)`) ; l'extincteur, cylindre, se dessine droit.
 */
export function IllustrationEnPlace() {
  const coche = (cx: number, cy: number, delai: string) => (
    <g className="ep-pop" style={{ animationDelay: delai }}>
      <circle cx={cx} cy={cy} r={12} fill="#0a0a0a" stroke="none" />
      <path d={`M${cx - 5.5},${cy} l4,4 l7,-8`} fill="none" stroke="#fff" strokeWidth={2.4} />
    </g>
  );

  return (
    <svg
      viewBox="-20 30 370 395"
      className="h-auto w-[clamp(220px,24vw,330px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        <polygon points="40,210 334.4,380 282.4,410 -12,240" />
        <polygon points="40,40 334.4,210 334.4,380 40,210" />

        <g transform="matrix(0.866,0.5,0,1,40,40)">
          {/* La porte */}
          <rect x="28" y="46" width="80" height="124" vectorEffect="non-scaling-stroke" />
          <rect x="35" y="53" width="66" height="117" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <circle cx="91" cy="112" r="3.2" fill="#0a0a0a" stroke="none" />
          {/* Le bloc de sortie de secours */}
          <g className="ep-lueur">
            <rect x="40" y="14" width="56" height="22" rx="2" fill="#0a0a0a" stroke="none" />
            <circle cx="52" cy="20" r="2.3" fill="#fff" stroke="none" />
            <path
              d="M51.5,23 L50,29 L53.5,32.5 M50,29 L47,32.5 M51.5,24 L55,25.5 M51.5,24 L48,25.5 M62,25 H88 M83,20.5 L88,25 L83,29.5"
              fill="none"
              stroke="#fff"
              strokeWidth={1.7}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          {/* Le support de l'extincteur */}
          <rect x="161" y="66" width="14" height="10" fill="#0a0a0a" stroke="none" />
          {/* La consigne affichée */}
          <rect x="296" y="28" width="36" height="52" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <path d="M302,40H326M302,48H326M302,56H320M302,64H326" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <rect x="302" y="69" width="10" height="6" fill="#0a0a0a" stroke="none" />
        </g>

        {/* La trousse de secours, en relief sur le mur */}
        <polygon points="239.2,215 239.2,255 230.5,260 230.5,220" />
        <polygon points="239.2,255 282.5,280 273.8,285 230.5,260" fill="#0a0a0a" />
        <g transform="translate(-8.7,5)">
          <g transform="matrix(0.866,0.5,0,1,40,40)">
            <rect x="230" y="60" width="50" height="40" vectorEffect="non-scaling-stroke" />
            <rect x="250" y="68" width="10" height="24" fill="#0a0a0a" stroke="none" />
            <rect x="243" y="75" width="24" height="10" fill="#0a0a0a" stroke="none" />
          </g>
        </g>

        {/* L'extincteur, accroché */}
        <g transform="translate(9,145)">
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

        {coche(132, 96, "0.9s")}
        {coche(222, 186, "1.25s")}
        {coche(300, 226, "1.6s")}
      </g>
    </svg>
  );
}
