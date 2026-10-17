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
  return { enPlace: d.enPlace, total: d.total, parLesTitres: d.parLesTitres.enPlace };
}
