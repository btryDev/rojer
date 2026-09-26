export type VersionActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; numero: number };

/**
 * Motifs de mise à jour proposés au dirigeant, et leur libellé dans le PDF.
 *
 * L'article R. 4121-2 ne connaît que **trois** cas : au moins chaque année
 * dans les entreprises d'au moins onze salariés (1°), lors de toute décision
 * d'aménagement important (2°), et lorsqu'une information supplémentaire
 * intéressant l'évaluation d'un risque est portée à la connaissance de
 * l'employeur (3°).
 *
 * « Accident du travail ou maladie professionnelle » n'est donc pas un
 * quatrième cas légal : c'est une espèce du 3°, et le libellé le dit
 * désormais. Le proposer séparément reste utile — c'est ainsi qu'un dirigeant
 * nomme l'événement — mais le présenter comme un cas propre revenait à
 * inventer une catégorie que le texte n'a pas.
 */
export const MOTIFS_VERSION = {
  annuelle:
    "Au moins chaque année dans les entreprises d'au moins onze salariés (art. R. 4121-2, 1°)",
  amenagement: "Décision d'aménagement important (art. R. 4121-2, 2°)",
  accident: "Accident du travail ou maladie professionnelle",
  nouvelle_info:
    "Information supplémentaire intéressant l'évaluation d'un risque portée à la connaissance de l'employeur (art. R. 4121-2, 3°)",
  autre: "Autre",
} as const;

export type MotifVersion = keyof typeof MOTIFS_VERSION;
