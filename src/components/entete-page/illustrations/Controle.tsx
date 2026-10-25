import { CadreIllustration } from "./motifs";

/**
 * Une boîte d'archives fermée, sa poignée, son étiquette ; une fermeture
 * éclair court sur le couvercle — le dossier ZIP qu'on remet le jour du
 * contrôle. Une coche vient la sceller.
 */
export function IllustrationControle() {
  return (
    <CadreIllustration viewBox="30 -90 330 300" className="w-[clamp(220px,23vw,330px)]">
      {/* La boîte : côté, couvercle, face */}
      <polygon points="343.2,120 222,190 222,100 343.2,30" />
      <polygon points="170,-70 343.2,30 222,100 48.8,0" />
      <polygon points="48.8,90 222,190 222,100 48.8,0" />
      <g transform="matrix(0.866,0.5,0,1,48.8,0)">
        <rect x="80" y="14" width="40" height="12" rx="6" fill="#0a0a0a" stroke="none" />
        <rect x="30" y="40" width="140" height="36" rx="3" fill="none" strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        <path d="M42,52H140M42,64H120" fill="none" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      </g>
      {/* La fermeture éclair, sur le couvercle */}
      <g transform="matrix(0.866,0.5,-0.866,0.5,170,-70)" fill="none">
        <path d="M100,8 V132" strokeWidth={4} vectorEffect="non-scaling-stroke" />
        <path
          d="M94,14H106M94,26H106M94,38H106M94,50H106M94,62H106M94,74H106M94,86H106M94,98H106M94,110H106M94,122H106"
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
        />
        <rect x="92" y="60" width="16" height="22" rx="4" fill="#0a0a0a" stroke="none" />
      </g>
      <g className="ep-pop" style={{ animationDelay: "0.8s" }}>
        <circle cx="300" cy="-14" r="20" fill="#0a0a0a" stroke="none" />
        <path d="M290,-14 l7,7 l13,-14" fill="none" stroke="#fff" strokeWidth={3.2} />
      </g>
    </CadreIllustration>
  );
}
