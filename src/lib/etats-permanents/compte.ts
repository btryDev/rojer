/**
 * Le compte de l'en-tête de « Ce qui doit être en place », lu une seule fois.
 *
 * Il vivait dans `widget.ts` jusqu'au 2026-10-17 (dernière relecture de c6) :
 * la page l'importait d'un module qui porte le nom du widget, ce qui laissait
 * croire que la page dépendait du tableau de bord. Les deux en sont lecteurs ;
 * aucun n'en est propriétaire.
 */

import type { EtatsPermanentsDuDossier } from "./queries";

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
  // Les lignes liées aux risques des salariés ne s'affichent pas sur la page
  // et ne s'y comptent plus (décision de la propriétaire du 2026-10-22) :
  // elles se déclarent et se comptent sur « Évaluer les risques de vos
  // salariés ». Le score, le PDF et `d.total` les gardent.
  const risques = d.parLesRisques.filter((l) => l.compteDansLEnTete);
  const enPlace = (l: (typeof risques)[number]) =>
    l.parLesTitres ? l.parLesTitres.enPlace : l.declareLe !== null;
  return {
    enPlace: d.enPlace - risques.filter(enPlace).length,
    total: d.total - risques.length,
    parLesTitres:
      d.parLesTitres.enPlace - risques.filter((l) => l.parLesTitres?.enPlace).length,
  };
}
