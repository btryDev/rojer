import { ImageEnTete } from "./ImageEnTete";

/**
 * Le badge « Équipe » à son cordon, un casque devant : la personne et ce
 * qu'elle est habilitée à faire. Planche Santé-sécurité, choisie par la
 * propriétaire le 2026-11-18.
 */
export function IllustrationEquipe() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/equipe.webp"
      width={827}
      height={900}
      className="w-[clamp(232px,22vw,312px)]"
    />
  );
}
