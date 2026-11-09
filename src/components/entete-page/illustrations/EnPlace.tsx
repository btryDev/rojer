import { ImageEnTete } from "./ImageEnTete";

/**
 * Un tableau d'affichage « En place » : le plan d'évacuation, les numéros
 * utiles, l'interdiction de fumer — ce qui doit être affiché en permanence.
 * Choisi par la propriétaire le 2026-11-09.
 */
export function IllustrationEnPlace() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/en-place.webp"
      width={900}
      height={687}
      className="w-[clamp(240px,24vw,340px)]"
    />
  );
}
