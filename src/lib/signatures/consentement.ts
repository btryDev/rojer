/**
 * La phrase de consentement de la fenêtre « Signer et envoyer » (2026-11-19,
 * cahier de reprise § 1.2, décision de la propriétaire). Module pur : la
 * fenêtre l'affiche, et le serveur la recompose depuis les mêmes données pour
 * l'enregistrer sur la signature (`Signature.consentementTexte`). Le texte
 * enregistré n'est donc jamais celui qu'un navigateur aurait envoyé : c'est
 * celui que Rojer a affiché.
 */
export function texteConsentement(auNomDe: string): string {
  const nom = auNomDe.replace(/\s+/g, " ").trim() || "l'entreprise utilisatrice";
  return (
    "Je confirme avoir pris connaissance du plan de prévention et de son contenu, " +
    `et j'accepte d'y apposer ma signature électronique au nom de ${nom}.`
  );
}
