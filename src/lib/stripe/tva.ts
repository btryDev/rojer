// La TVA des factures de Rojer (ADR-053, notes de chantier) : taux normal
// français, 20 % (art. 278 du CGI), en sus des prix HT (`tax_behavior:
// exclusive`). Les clients de Rojer sont des entreprises françaises : un taux
// fixe suffit, sans Stripe Tax. Sans `server-only` : le script d'installation
// de test le lit aussi.

import type Stripe from "stripe";

export const TVA = { pourcentage: 20, pays: "FR", type: "vat" } as const;

/** Le taux Stripe qui porte la TVA de Rojer ? Actif, en sus du prix, 20 %, France, de type TVA. */
export const estTauxDeTva = (t: Stripe.TaxRate) =>
  t.active && !t.inclusive && t.percentage === TVA.pourcentage && t.country === TVA.pays && t.tax_type === TVA.type;

/** Les taux conformes, le plus ancien d'abord : c'est lui qui sert. */
export const tauxConformes = (taux: Stripe.TaxRate[]) => taux.filter(estTauxDeTva).sort((a, b) => a.created - b.created);
