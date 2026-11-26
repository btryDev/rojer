// La TVA des factures de Rojer (ADR-053, notes de chantier) : taux normal
// français, 20 % (art. 278 du CGI), INCLUSE dans les prix (`inclusive`) —
// décision de la propriétaire du 2026-11-14 : 29 € et 89 € TTC, Stripe
// recalcule le HT et la TVA sur chaque facture. Les clients de Rojer sont des entreprises françaises : un taux
// fixe suffit, sans Stripe Tax. Sans `server-only` : le script d'installation
// de test le lit aussi.

import type Stripe from "stripe";

export const TVA = { pourcentage: 20, pays: "FR", type: "vat" } as const;

/**
 * Le taux Stripe qui porte la TVA de Rojer ? Actif, inclus dans le prix, 20 %,
 * France, de type TVA — ou sans type : [2026-11-26] le formulaire du tableau de
 * bord ne le pose pas (taux de production créé à la main le 2026-11-24,
 * `tax_type: null`), et l'API ne le modifie qu'avec un droit d'écriture que la
 * clé de l'application n'a pas. Le type ne sert qu'aux rapports de Stripe ; la
 * facture affiche le nom du taux. Un autre type déclaré (taxe de vente…) reste
 * refusé.
 */
export const estTauxDeTva = (t: Stripe.TaxRate) =>
  t.active && t.inclusive && t.percentage === TVA.pourcentage && t.country === TVA.pays && (t.tax_type ?? TVA.type) === TVA.type;

/** Les taux conformes, le plus ancien d'abord : c'est lui qui sert. */
export const tauxConformes = (taux: Stripe.TaxRate[]) => taux.filter(estTauxDeTva).sort((a, b) => a.created - b.created);
