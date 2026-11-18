import { ImageEnTete } from "./ImageEnTete";

/**
 * Le plan de prévention : deux entreprises reliées, le plan de la zone de
 * travail hachurée, les deux signatures — l'entreprise utilisatrice et
 * l'entreprise extérieure —, une barrière de chantier devant. Planche
 * Santé-sécurité, choisie par la propriétaire le 2026-11-18.
 */
export function IllustrationPlansPrevention() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/plan-prevention.webp"
      width={688}
      height={900}
      className="w-[clamp(193px,18vw,260px)]"
    />
  );
}
