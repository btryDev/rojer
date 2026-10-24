import Image from "next/image";

/**
 * Un dessin sur son fond teinté — la vignette des titres, des formations et
 * du portrait (2026-10-24, revue qualité : la même paire `span` + `Image`
 * était recopiée cinq fois). Les proportions sont celles de la charte (§ 1.6) :
 * rayon à 34 % du côté, dessin à 78 %. Décorative : `alt=""`, tout ce qu'elle
 * évoque est écrit à côté.
 */
export function Vignette({
  src,
  fond,
  taille = 52,
  priority = false,
}: {
  src: string;
  fond: string;
  /** Le côté, en pixels. */
  taille?: number;
  priority?: boolean;
}) {
  const dessin = Math.round(taille * 0.78);
  return (
    <span
      aria-hidden
      className="grid flex-none place-items-center"
      style={{ width: taille, height: taille, borderRadius: Math.round(taille * 0.34), background: fond }}
    >
      <Image src={src} alt="" width={dessin} height={dessin} priority={priority} />
    </span>
  );
}
