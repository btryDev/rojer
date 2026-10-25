import { CadreIllustration } from "./motifs";

/**
 * L'établissement lui-même, une boutique sous son store rayé : ce que vous
 * déclarez de votre lieu — régimes, effectif, classement — et qui décide de
 * ce que Rojer vous doit. Une coche se pose sur la fiche à jour.
 */
export function IllustrationFiche() {
  const rayures = [0, 38, 76, 114, 152]
    .map((u) => `M${u},0 H${u + 19} V22 H${u} Z`)
    .join(" ");
  return (
    <CadreIllustration viewBox="30 -110 320 320" className="w-[clamp(220px,23vw,320px)]">
      {/* Le bâtiment : côté, toit, façade */}
      <polygon points="324.5,135 220.6,195 220.6,75 324.5,15" />
      <polygon points="160,-80 324.5,15 220.6,75 56.1,-20" />
      <polygon points="56.1,100 220.6,195 220.6,75 56.1,-20" />
      <g transform="matrix(0.866,0.5,0,1,56.1,-20)">
        {/* Le store, la vitrine, la porte */}
        <path d={rayures} fill="#0a0a0a" stroke="none" />
        <rect x="0" y="0" width="190" height="22" fill="none" vectorEffect="non-scaling-stroke" />
        <rect x="16" y="40" width="96" height="58" rx="2" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M64,40V98" fill="none" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        <rect x="130" y="40" width="44" height="80" rx="2" fill="none" vectorEffect="non-scaling-stroke" />
        <circle cx="165" cy="82" r="3" fill="#0a0a0a" stroke="none" />
      </g>
      <g className="ep-pop" style={{ animationDelay: "0.8s" }}>
        <circle cx="300" cy="-30" r="20" fill="#0a0a0a" stroke="none" />
        <path d="M290,-30 l7,7 l13,-14" fill="none" stroke="#fff" strokeWidth={3.2} />
      </g>
    </CadreIllustration>
  );
}
