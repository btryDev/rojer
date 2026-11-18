import { ImageEnTete } from "./ImageEnTete";

/**
 * Le parc : un tableau électrique ouvert, un bloc de secours au-dessus, un
 * extincteur à côté — chaque appareil porte son étiquette de vérification.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationEquipements() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/equipements.webp"
      width={900}
      height={794}
      className="w-[clamp(287px,27vw,385px)]"
    />
  );
}
