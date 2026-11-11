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

/** Le fil complet : les étapes validables, puis la synthèse (validée par sa version). */
export const ORDRE_DU_FIL = [...ETAPES_VALIDABLES, "synthese"] as const;
export type EtapeFilId = (typeof ORDRE_DU_FIL)[number];

/** L'étape où mène la validation d'une étape : la suivante du fil. */
export function etapeSuivante(etape: EtapeValidable): EtapeFilId {
  return ORDRE_DU_FIL[ORDRE_DU_FIL.indexOf(etape) + 1];
}

/**
 * Les validations après changements : une date valide l'étape, `null` la
 * retire. Les autres étapes restent telles quelles.
 */
export function avecValidations(
  brut: unknown,
  changements: Partial<Record<EtapeValidable, Date | null>>,
): EtapesValidees {
  const lu = lireEtapesValidees(brut);
  for (const [etape, quand] of Object.entries(changements) as [EtapeValidable, Date | null][]) {
    if (quand) lu[etape] = quand.toISOString();
    else delete lu[etape];
  }
  return lu;
}
