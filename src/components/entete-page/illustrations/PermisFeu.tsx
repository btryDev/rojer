import { ImageEnTete } from "./ImageEnTete";

/**
 * La fiche « Permis de feu » : la flamme, les lignes à remplir, les cases des
 * signatures, et l'extincteur qui doit être là pendant le travail par point
 * chaud. Planche Santé-sécurité, choisie par la propriétaire le 2026-11-18.
 */
export function IllustrationPermisFeu() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/permis-feu.webp"
      width={604}
      height={900}
      className="w-[clamp(170px,16vw,228px)]"
    />
  );
}
