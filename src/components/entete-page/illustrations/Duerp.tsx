import { ImageEnTete } from "./ImageEnTete";

/**
 * La fiche d'évaluation : trois risques (glissade, coupure, port de charge),
 * chacun avec sa cotation en pastilles, un crayon posé dessus — le document
 * se tient à jour. Planche Santé-sécurité, choisie par la propriétaire le
 * 2026-11-18 : aucun texte, la scène dit la page.
 */
export function IllustrationDuerp() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/duerp.webp"
      width={720}
      height={900}
      className="w-[clamp(202px,19vw,272px)]"
    />
  );
}
