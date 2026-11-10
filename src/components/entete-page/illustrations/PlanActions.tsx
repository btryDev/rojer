import { ImageEnTete } from "./ImageEnTete";

/**
 * Un porte-bloc « Plan d'actions » : trois actions (prise, extincteur,
 * hotte), deux cochées, la troisième à faire, un tournevis posé en travers.
 * Choisi par la propriétaire le 2026-11-09.
 */
export function IllustrationPlanActions() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/plan-actions.webp"
      width={634}
      height={900}
      className="w-[clamp(180px,17vw,240px)]"
    />
  );
}
