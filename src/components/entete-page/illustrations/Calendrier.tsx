import Image from "next/image";

/**
 * Un calendrier à spirale, un extincteur et son étiquette de maintenance :
 * les vérifications datées. Illustration générée (Krea) choisie par la
 * propriétaire le 2026-10-25, détourée — fond rendu transparent pour que
 * la teinte de section passe dessous — et servie en WebP.
 *
 * Image plate, donc sans animation : elle en aura une le jour où elle sera
 * vectorisée en calques séparés.
 */
export function IllustrationCalendrier() {
  return (
    <Image
      src="/illustrations/entetes/calendrier.webp"
      alt=""
      width={900}
      height={911}
      priority
      sizes="(min-width: 768px) 300px, 0px"
      className="h-auto w-[clamp(220px,21vw,300px)]"
    />
  );
}
