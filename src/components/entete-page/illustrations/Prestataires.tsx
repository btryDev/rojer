import { ImageEnTete } from "./ImageEnTete";

/**
 * Un fichier rotatif de cartes, chacune au pictogramme d'un métier (feu,
 * électricité, maintenance, ventilation) : l'annuaire de ceux qui
 * interviennent chez vous.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationPrestataires() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/prestataires.webp"
      width={683}
      height={900}
      className="w-[clamp(192px,18vw,258px)]"
    />
  );
}
