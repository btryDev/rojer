import { ImageEnTete } from "./ImageEnTete";

/**
 * Une entrée accessible : la porte vitrée au pictogramme, la rampe et sa main
 * courante, et l'affiche au QR code du registre public.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationAccessibilite() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/accessibilite.webp"
      width={812}
      height={900}
      className="w-[clamp(228px,22vw,307px)]"
    />
  );
}
