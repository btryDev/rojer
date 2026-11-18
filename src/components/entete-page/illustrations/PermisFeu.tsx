import { ImageEnTete } from "./ImageEnTete";

/**
 * Le permis de feu sur son porte-bloc : la flamme, les lignes à remplir, les
 * deux cases signées. Planche Santé-sécurité, choisie par la propriétaire le
 * 2026-11-18.
 */
export function IllustrationPermisFeu() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/permis-feu.webp"
      width={560}
      height={900}
      className="w-[clamp(157px,15vw,212px)]"
    />
  );
}
