import { CadreIllustration, Crayon } from "./motifs";

/**
 * Une lettre reçue, couchée, coin corné ; un tampon officiel vient s'y poser.
 * Ce qu'une autorité — ou votre assureur — vous a prescrit à vous seul.
 */
export function IllustrationPrescriptions() {
  return (
    <CadreIllustration viewBox="15 0 400 260" className="w-[clamp(240px,26vw,380px)]">
      {/* La lettre */}
      <polygon points="369.2,155 230.6,235 230.6,231 369.2,151" />
      <polygon points="31.4,120 230.6,235 230.6,231 31.4,116" />
      <polygon points="170,36 369.2,151 230.6,231 31.4,116" />
      <g transform="matrix(0.866,0.5,-0.866,0.5,170,36)">
        {/* En-tête de l'émetteur, objet, corps */}
        <rect x="16" y="16" width="56" height="12" rx="2" fill="#0a0a0a" stroke="none" />
        <path
          d="M16,44H120M16,58H150M16,72H138M16,86H150M16,100H112M16,114H146M16,128H96"
          fill="none"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
        />
        {/* Le coin corné */}
        <path d="M210,160 L230,140 L230,160 Z" fill="#0a0a0a" stroke="none" />
        {/* Le tampon */}
        <g className="ep-pop" style={{ animationDelay: "0.8s" }}>
          <circle cx="182" cy="96" r="30" fill="none" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <circle cx="182" cy="96" r="22" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          <path d="M170,96 l8,8 l15,-16" fill="none" strokeWidth={3.2} vectorEffect="non-scaling-stroke" />
        </g>
      </g>

      {/* Le crayon, posé à côté */}
      <Crayon transform="translate(-30,40)" />
    </CadreIllustration>
  );
}
