/**
 * Un périmètre tracé au sol en pointillés : une caisse dedans, une autre
 * dehors, et la loupe qui s'arrête sur celle-ci. Ce que Rojer ne couvre pas
 * existe quand même — il est seulement hors du tracé.
 */
export function IllustrationPerimetre() {
  return (
    <svg
      viewBox="-15 0 480 270"
      className="h-auto w-[clamp(250px,27vw,390px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        {/* Le tracé au sol */}
        <polygon
          points="170,30 360.5,140 187.3,240 -3.2,130"
          fill="none"
          strokeWidth={2.6}
          strokeDasharray="10 8"
        />

        {/* La caisse dans le périmètre */}
        <polygon points="230.6,115 178.7,145 178.7,85 230.6,55" />
        <polygon points="126.7,115 178.7,145 178.7,85 126.7,55" />
        <polygon points="178.7,25 230.6,55 178.7,85 126.7,55" />
        <path d="M152.7,40 L204.6,70" fill="none" strokeWidth={1.6} />

        {/* La caisse dehors */}
        <polygon points="438.5,225 395.2,250 395.2,200 438.5,175" fill="#0a0a0a" />
        <polygon points="351.9,225 395.2,250 395.2,200 351.9,175" />
        <polygon points="395.2,150 438.5,175 395.2,200 351.9,175" />

        {/* La loupe */}
        <g className="ep-crayon" style={{ animationDelay: "0.8s" }}>
          <path d="M352,130 L322,98" fill="none" strokeWidth={9} />
          <path d="M352,130 L322,98" fill="none" stroke="#fff" strokeWidth={4} />
          <circle cx="372" cy="152" r="30" fill="none" strokeWidth={4} />
          <path d="M358,140 C362,134 368,132 374,132" fill="none" strokeWidth={2} />
        </g>
      </g>
    </svg>
  );
}
