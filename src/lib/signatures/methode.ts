import type { MethodeSignature } from "@prisma/client";

/**
 * La méthode d'une signature, dite en français (cahier de reprise § 8.2) —
 * une seule table pour les écrans : le bloc de signature, `/verifier`,
 * `/signe` et la fiche du plan. Le PDF garde sa phrase longue
 * (`LIBELLE_METHODE` de `PlanPreventionDocument.tsx`). Un `Record` sur
 * l'enum : une méthode ajoutée au schéma ne compile pas sans son libellé.
 */
export const LIBELLE_METHODE: Record<MethodeSignature, string> = {
  compte_connecte: "Compte connecté",
  otp_email: "Lien et code par e-mail",
  // 2026-11-19 : depuis le compte, confirmée par un code envoyé à l'adresse
  // du compte (fenêtre « Signer et envoyer » du plan de prévention).
  compte_code_email: "Compte connecté et code par e-mail",
};

/** La forme courte, sur la ligne d'une partie (« code par e-mail »). */
export const LIBELLE_METHODE_COURT: Record<MethodeSignature, string> = {
  compte_connecte: "depuis le compte",
  otp_email: "lien et code par e-mail",
  compte_code_email: "code par e-mail",
};
