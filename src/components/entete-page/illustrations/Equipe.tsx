import { ImageEnTete } from "./ImageEnTete";

/**
 * Trois badges à leur portant, chacun avec le pictogramme d'un titre
 * (habilitation électrique, secourisme, conduite d'engins) : un titre est
 * porté par une personne, pas par un poste. Planche Santé-sécurité, choisie
 * par la propriétaire le 2026-11-18.
 */
export function IllustrationEquipe() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/equipe.webp"
      width={900}
      height={785}
      className="w-[clamp(290px,27vw,390px)]"
    />
  );
}
