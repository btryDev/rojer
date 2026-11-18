import { ImageEnTete } from "./ImageEnTete";

/**
 * Le « Plan de prévention », une poignée de mains et deux lignes de signature
 * — l'entreprise utilisatrice et l'entreprise extérieure —, devant une
 * barrière de chantier. Planche Santé-sécurité, choisie par la propriétaire
 * le 2026-11-18.
 */
export function IllustrationPlansPrevention() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/plan-prevention.webp"
      width={642}
      height={900}
      className="w-[clamp(180px,17vw,243px)]"
    />
  );
}
