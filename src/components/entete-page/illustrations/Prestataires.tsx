import { CadreIllustration } from "./motifs";

/**
 * La mallette d'une entreprise qui intervient chez vous, et devant elle ses
 * pièces administratives — attestation, assurance — posées à plat : une
 * coche vient valider la pièce reçue.
 */
export function IllustrationPrestataires() {
  return (
    <CadreIllustration viewBox="60 -95 330 430" className="w-[clamp(200px,21vw,300px)]">
      {/* La mallette : poignée, côté, dessus, face */}
      <path d="M150,-52 C150,-80 196,-54 196,-26" fill="none" strokeWidth={7} />
      <path d="M150,-52 C150,-80 196,-54 196,-26" fill="none" stroke="#fff" strokeWidth={2.6} />
      <polygon points="267.2,125 223.9,150 223.9,40 267.2,15" />
      <polygon points="120,-70 267.2,15 223.9,40 76.7,-45" />
      <polygon points="76.7,65 223.9,150 223.9,40 76.7,-45" />
      <g transform="matrix(0.866,0.5,0,1,76.7,-45)">
        <path d="M0,40H170" fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        <rect x="70" y="30" width="30" height="20" rx="3" fill="#0a0a0a" stroke="none" />
        <rect x="18" y="0" width="10" height="110" fill="#0a0a0a" stroke="none" />
        <rect x="142" y="0" width="10" height="110" fill="#0a0a0a" stroke="none" />
      </g>

      {/* Les pièces, à plat */}
      <polygon points="371.1,245 232.6,325 232.6,322 371.1,242" />
      <polygon points="128.7,265 232.6,325 232.6,322 128.7,262" />
      <polygon points="267.2,182 371.1,242 232.6,322 128.7,262" />
      <g transform="matrix(0.866,0.5,-0.866,0.5,267.2,182)">
        <rect x="14" y="14" width="44" height="10" rx="2" fill="#0a0a0a" stroke="none" />
        <path d="M14,40H100M14,54H90M14,68H104M14,82H80" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        <g className="ep-pop" style={{ animationDelay: "0.8s" }}>
          <circle cx="88" cy="126" r="18" fill="#0a0a0a" stroke="none" />
          <path d="M79,126 l6,6 l12,-13" fill="none" stroke="#fff" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        </g>
      </g>
    </CadreIllustration>
  );
}
