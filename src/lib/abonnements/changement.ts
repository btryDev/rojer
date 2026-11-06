// Monter ou baisser de formule (ADR-053 § 10) : la formule d'abord (Essentiel
// < Pro), puis le rythme (le mensuel avant l'annuel). Une montée s'applique
// tout de suite, une baisse à la fin de la période payée.

import { CLES_FORMULES, PERIODICITES, formuleDeLookupKey } from "./formules";

export type Sens = "montee" | "baisse" | "identique";

/** Le sens d'un changement entre deux `lookup_key` ; `null` : l'une des deux est inconnue. */
export function sensDuChangement(actuelle: string | null | undefined, visee: string): Sens | null {
  const a = formuleDeLookupKey(actuelle);
  const v = formuleDeLookupKey(visee);
  if (!a || !v) return null;
  const ecart =
    CLES_FORMULES.indexOf(v.formule) - CLES_FORMULES.indexOf(a.formule) ||
    PERIODICITES.indexOf(v.periodicite) - PERIODICITES.indexOf(a.periodicite);
  return ecart > 0 ? "montee" : ecart < 0 ? "baisse" : "identique";
}
