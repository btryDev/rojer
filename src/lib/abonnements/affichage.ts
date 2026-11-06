// L'affichage d'un prix d'abonnement : des euros entiers, à la française.
const FORMAT = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** « 29 € », depuis un montant Stripe en centimes. */
export const eurosHT = (centimes: number) => FORMAT.format(centimes / 100);
