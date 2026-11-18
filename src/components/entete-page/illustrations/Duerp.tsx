import { ImageEnTete } from "./ImageEnTete";

/**
 * Le classeur « DUERP » : la grille de cotation sur la couverture, du risque
 * le plus faible au plus fort, un crayon posé dessus — le document se tient
 * à jour. Planche Santé-sécurité, choisie par la propriétaire le 2026-11-18.
 */
export function IllustrationDuerp() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/duerp.webp"
      width={749}
      height={900}
      className="w-[clamp(210px,20vw,283px)]"
    />
  );
}
