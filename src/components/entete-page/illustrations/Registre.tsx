import { ImageEnTete } from "./ImageEnTete";

/**
 * Le registre de sécurité ouvert : le tableau des vérifications par appareil,
 * un rapport inséré entre les pages, un stylo.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationRegistre() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/registre.webp"
      width={900}
      height={641}
      className="w-[clamp(300px,30vw,400px)]"
    />
  );
}
