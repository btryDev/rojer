import { ImageEnTete } from "./ImageEnTete";

/**
 * Le local technique : une chaudière et son manomètre, la ventilation et sa
 * gaine, un extincteur — chaque appareil porte son étiquette de vérification.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationEquipements() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/equipements.webp"
      width={715}
      height={900}
      className="w-[clamp(201px,19vw,270px)]"
    />
  );
}
