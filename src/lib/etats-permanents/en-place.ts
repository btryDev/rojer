/**
 * Une ligne de « Ce qui doit être en place » est-elle en place ? LA lecture —
 * pour la lecture du dossier, les compteurs de la page et d'Équipe, le
 * widget : d'après les titres déclarés (`par-les-titres.ts`), d'après le parc
 * (`par-le-parc.ts`, ADR-057 § 4), sinon d'après la déclaration.
 *
 * Module pur, sans `server-only` : les composants qui comptent la lisent
 * aussi (relecture du 2026-11-06 : trois copies vivaient côté écran).
 */

import type { LigneEtatPermanent } from "./queries";

export function estEnPlace(
  l: Pick<LigneEtatPermanent, "parLesTitres" | "parLeParc" | "declareLe">,
): boolean {
  if (l.parLesTitres) return l.parLesTitres.enPlace;
  if (l.parLeParc) return l.parLeParc.enPlace;
  return l.declareLe !== null;
}
