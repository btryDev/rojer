import { ImageEnTete } from "./ImageEnTete";

/**
 * Un éphéméride au 1er février : les pages de la veille passent par-dessus
 * les anneaux, la page du jour porte l'extincteur à vérifier et le tampon
 * coché. Choisi par la propriétaire le 2026-11-09.
 */
export function IllustrationCalendrier() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/calendrier.webp"
      width={716}
      height={900}
      className="w-[clamp(200px,19vw,270px)]"
    />
  );
}
