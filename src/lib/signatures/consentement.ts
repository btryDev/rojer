import type { ObjetSignable } from "@prisma/client";

/**
 * La phrase de consentement de la fenêtre « Signer et envoyer » (2026-11-19,
 * cahier de reprise § 1.2, décision de la propriétaire). Module pur : la
 * fenêtre l'affiche, et le serveur la recompose depuis les mêmes données pour
 * l'enregistrer sur la signature (`Signature.consentementTexte`). Le texte
 * enregistré n'est donc jamais celui qu'un navigateur aurait envoyé : c'est
 * celui que Rojer a affiché.
 */
export function texteConsentement(auNomDe: string): string {
  return texteConsentementPour("plan_prevention", auNomDe);
}

/**
 * Ce que le consentement dit avoir lu, par objet (2026-11-21, décision de la
 * propriétaire : une seule voie de signature depuis le compte, code et
 * consentement, pour tous les objets signables).
 */
const LU: Record<ObjetSignable, string> = {
  plan_prevention: "du plan de prévention et de son contenu",
  permis_feu: "du permis de feu et de ses mesures de prévention",
  rapport_verification: "du rapport de vérification",
  registre_accessibilite: "du registre public d'accessibilité",
  duerp_version: "de cette version du document unique",
};

/** La phrase de consentement d'un objet ; celle du plan est `texteConsentement`. */
export function texteConsentementPour(objetType: ObjetSignable, auNomDe: string): string {
  const nom = auNomDe.replace(/\s+/g, " ").trim() || "l'entreprise utilisatrice";
  return (
    `Je confirme avoir pris connaissance ${LU[objetType]}, ` +
    `et j'accepte d'y apposer ma signature électronique au nom de ${nom}.`
  );
}
