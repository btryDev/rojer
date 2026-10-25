import { CadreIllustration } from "./motifs";

/**
 * Un panneau sur son poteau, au pictogramme d'accessibilité, et devant lui
 * une rampe d'accès. Ce que vous avez prévu pour accueillir — le registre le
 * dit au public. Le pictogramme s'allume.
 */
export function IllustrationAccessibilite() {
  return (
    <CadreIllustration viewBox="40 -150 340 370" className="w-[clamp(200px,21vw,300px)]">
      {/* La rampe : un coin qui monte vers la droite */}
      <g transform="translate(40,10)">
        <polygon points="329.9,175 286.6,200 286.6,160 329.9,135" fill="#0a0a0a" />
        <polygon points="156.7,125 286.6,200 286.6,160" />
        <polygon points="200,100 329.9,135 286.6,160 156.7,125" />
        <path d="M234.6,109.3 L191.3,134.3 M269.3,118.7 L226,143.7 M303.9,128 L260.6,153" fill="none" strokeWidth={1.4} />
      </g>

      {/* Le socle et le poteau */}
      <polygon points="185.3,135 142,160 142,152 185.3,127" />
      <polygon points="90,130 142,160 142,152 90,122" fill="#0a0a0a" />
      <polygon points="133.3,97 185.3,127 142,152 90,122" />
      <polygon points="147.2,133 138.5,138 138.5,18 147.2,13" />
      <polygon points="128.1,132 138.5,138 138.5,18 128.1,12" />

      {/* Le panneau */}
      <polygon points="193.9,40 185.3,45 185.3,-75 193.9,-80" />
      <polygon points="90,-140 193.9,-80 185.3,-75 81.3,-135" />
      <polygon points="81.3,-15 185.3,45 185.3,-75 81.3,-135" />
      <g transform="matrix(0.866,0.5,0,1,81.3,-135)">
        <rect className="ep-lueur" x="12" y="12" width="96" height="96" rx="8" fill="#0a0a0a" stroke="none" />
        {/* Le pictogramme : tête, buste, roue */}
        <circle cx="56" cy="30" r="7" fill="#fff" stroke="none" />
        <path
          d="M54,40 L54,62 L74,62 L82,82 M54,50 L70,50 M46,58 A20,20 0 1 0 72,78"
          fill="none"
          stroke="#fff"
          strokeWidth={5}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </CadreIllustration>
  );
}
