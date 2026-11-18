import { ImageEnTete } from "./ImageEnTete";

/**
 * Le relevé au point d'usage : un lavabo, l'eau qui coule, la sonde de
 * température dans le jet, et le carnet des relevés à côté.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationCarnetSanitaire() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/carnet-sanitaire.webp"
      width={900}
      height={583}
      className="w-[clamp(300px,30vw,400px)]"
    />
  );
}
