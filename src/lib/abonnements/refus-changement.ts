// Les refus d'un changement de formule (`changerFormuleAction`), dits dans la
// fenêtre de confirmation (2026-11-23) et sur la page Formules (`?formule=`).

export const REFUS_CHANGEMENT = {
  impossible: "Le changement de formule n'est possible que pour un abonnement à jour de ses paiements.",
  "resiliation-prevue": "Votre abonnement prend fin à la date prévue : reprenez-le d'abord depuis Paiement et factures pour changer de formule.",
  "trop-d-utilisateurs": "Cette formule permet moins d'utilisateurs que votre compte n'en a : retirez-en d'abord depuis Membres du compte.",
} as const;

export type RefusChangement = keyof typeof REFUS_CHANGEMENT;
