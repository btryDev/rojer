/**
 * Les étapes du fil du DUERP que le dirigeant a validées (ADR-059, 2026-11-11).
 *
 * « Si pas validé, pas fait » : une étape n'est jamais cochée par ce que
 * l'outil a pré-rempli, seulement par le geste du dirigeant. La validation
 * s'ajoute à l'état calculé de l'étape, elle ne le remplace pas.
 *
 * La synthèse n'est pas ici : elle se valide par une version figée.
 */
export const ETAPES_VALIDABLES = [
  "activite",
  "unites",
  "risques",
  "transverses",
] as const;

export type EtapeValidable = (typeof ETAPES_VALIDABLES)[number];

export type EtapesValidees = Partial<Record<EtapeValidable, string>>;

/** La seule lecture de `Duerp.etapesValidees` : tout ce qui n'est pas une date ISO est ignoré. */
export function lireEtapesValidees(brut: unknown): EtapesValidees {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return {};
  const lu: EtapesValidees = {};
  for (const etape of ETAPES_VALIDABLES) {
    const v = (brut as Record<string, unknown>)[etape];
    if (typeof v === "string" && !Number.isNaN(Date.parse(v))) lu[etape] = v;
  }
  return lu;
}

/** Les validations après qu'une étape a été validée (`quand`) ou retirée (`null`). */
export function avecValidation(
  brut: unknown,
  etape: EtapeValidable,
  quand: Date | null,
): EtapesValidees {
  const lu = lireEtapesValidees(brut);
  if (quand) lu[etape] = quand.toISOString();
  else delete lu[etape];
  return lu;
}
