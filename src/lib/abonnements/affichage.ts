// L'affichage d'un prix d'abonnement : des euros entiers, à la française.
import { LIBELLE_PERIODICITE, type Periodicite } from "./formules";

const FORMAT = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** « 29 € », depuis un montant Stripe en centimes (TVA incluse, 2026-11-14). */
export const euros = (centimes: number) => FORMAT.format(centimes / 100);

/** « 29 € TTC par mois » : la seule écriture d'un prix d'abonnement avec sa période. */
export const prixTTC = (centimes: number, periodicite: Periodicite) =>
  `${euros(centimes)} TTC par ${LIBELLE_PERIODICITE[periodicite].unite}`;
