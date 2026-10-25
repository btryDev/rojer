/**
 * Un évier, son robinet d'eau chaude, et le thermomètre du relevé : la
 * surveillance des légionelles se fait au point d'usage, température en
 * main. Une goutte tombe du robinet.
 */
export function IllustrationCarnetSanitaire() {
  return (
    <svg
      viewBox="40 -40 320 280"
      className="h-auto w-[clamp(210px,22vw,320px)]"
      aria-hidden
      focusable="false"
    >
      <g fill="#fff" stroke="#0a0a0a" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round">
        {/* Le meuble d'évier et sa cuve */}
        <polygon points="297.2,175 202,230 202,170 297.2,115" />
        <polygon points="54.7,145 202,230 202,170 54.7,85" />
        <polygon points="150,30 297.2,115 202,170 54.7,85" />
        <g transform="matrix(0.866,0.5,-0.866,0.5,150,30)">
          <rect x="30" y="25" width="110" height="60" rx="10" fill="#0a0a0a" stroke="none" />
          <circle cx="85" cy="55" r="5" fill="#fff" stroke="none" />
        </g>
        <g transform="matrix(0.866,0.5,0,1,54.7,85)" fill="none">
          <rect x="16" y="12" width="64" height="38" rx="3" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
          <rect x="90" y="12" width="64" height="38" rx="3" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        </g>

        {/* Le robinet */}
        <path d="M206,52 L206,6 C206,-12 172,-16 168,6 L168,18" fill="none" strokeWidth={9} />
        <path d="M206,52 L206,6 C206,-12 172,-16 168,6 L168,18" fill="none" stroke="#fff" strokeWidth={4} />
        <rect x="198" y="18" width="16" height="10" rx="3" fill="#0a0a0a" stroke="none" />
        <path
          className="ep-pop"
          style={{ animationDelay: "0.9s" }}
          d="M168,32 C164,40 162,44 162,47 A6,6 0 0 0 174,47 C174,44 172,40 168,32 Z"
          fill="#0a0a0a"
          stroke="none"
        />

        {/* Le thermomètre */}
        <g transform="rotate(18 300 40)">
          <rect x="292" y="-30" width="16" height="92" rx="8" />
          <circle cx="300" cy="74" r="13" fill="#0a0a0a" />
          <rect x="297" y="0" width="6" height="66" rx="3" fill="#0a0a0a" stroke="none" />
          <path d="M308,-10H314M308,6H314M308,22H314M308,38H314" fill="none" strokeWidth={1.8} />
        </g>
      </g>
    </svg>
  );
}
