/**
 * Le compte de l'en-tête de « Ce qui doit être en place », lu une seule fois.
 *
 * Il vivait dans `widget.ts` jusqu'au 2026-10-17 (dernière relecture de c6) :
 * la page l'importait d'un module qui porte le nom du widget, ce qui laissait
 * croire que la page dépendait du tableau de bord. Les deux en sont lecteurs ;
 * aucun n'en est propriétaire.
 */

import type { EtatsPermanentsDuDossier } from "./queries";
import { compteParLEquipe } from "./par-l-equipe";
import { estEnPlace } from "./en-place";

/**
 * Les trois nombres de l'en-tête de PAGE (`CompteurDeLaPage`), lus d'une seule
 * façon pour la page et pour le widget : deux lectures du même compte
 * finiraient par diverger, et le widget dirait un autre chiffre que l'écran
 * vers lequel il mène.
 */
export function compteDeLaPage(d: EtatsPermanentsDuDossier): {
  enPlace: number;
  total: number;
  /** La part d'`enPlace` établie d'après les titres déclarés. */
  parLesTitres: number;
} {
  // Les formations ne s'affichent pas sur la page et ne s'y comptent pas : elles
  // se déclarent et se comptent dans ~~Équipe › Formations~~ [2026-10-24 : section « Formations à organiser » d'Équipe] (ADR-047). Le score,
  // le PDF et `d.total` les gardent. Même règle de compte (`compteParLEquipe`).
  const risques = compteParLEquipe(d.parLEquipe);
  const titresDesRisques = d.parLEquipe.filter(
    (l) => l.compteDansLEnTete && l.parLesTitres?.enPlace,
  ).length;
  // Les obligations de présence établies d'après le parc (ADR-057 § 4) ne
  // s'affichent pas non plus sur la page : elles sont en tête de leur groupe
  // sur la page Équipements. Le score, le PDF et `d.total` les gardent.
  const parc = d.parLeParc.filter((l) => l.compteDansLEnTete);
  return {
    enPlace:
      d.enPlace - risques.enPlace - parc.filter(estEnPlace).length,
    total: d.total - risques.total - parc.length,
    parLesTitres: d.parLesTitres.enPlace - titresDesRisques,
  };
}
