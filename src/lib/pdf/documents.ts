import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { DossierConformiteDocument } from "./DossierConformiteDocument";
import { DuerpDocument } from "./DuerpDocument";
import { PlanActionsDocument } from "./PlanActionsDocument";
import { PointsACorrigerDocument } from "./PointsACorrigerDocument";
import { RegistreDocument } from "./RegistreDocument";

/**
 * Les PDF du produit, par type (lot pdf-b0, 2026-11-10,
 * `docs/plan-pdf-sous-processus.md`).
 *
 * Les routes ne passent plus un élément React tout fait mais une demande
 * `{ type, props }` : c'est ce qui permet de peser le document avant de le
 * mettre en page (`poids.ts`), de journaliser chaque export par type
 * (`rendre.ts`), et, plus tard, de l'envoyer à un fil d'exécution séparé — un
 * élément React ne se transmet pas, des données si.
 */
const DOCUMENTS = {
  registre: RegistreDocument,
  "dossier-conformite": DossierConformiteDocument,
  "plan-actions": PlanActionsDocument,
  "points-a-corriger": PointsACorrigerDocument,
  duerp: DuerpDocument,
} as const;

export type TypeDocument = keyof typeof DOCUMENTS;

/** Les props du composant d'un type. */
type PropsDe<T extends TypeDocument> = Parameters<(typeof DOCUMENTS)[T]>[0];

/** Une demande de PDF : son type et ses données, rien d'autre. */
export type DemandePdf = { [T in TypeDocument]: { type: T; props: PropsDe<T> } }[TypeDocument];

/** Le nom du document dans une phrase (« Le registre de sécurité est… »). */
export const NOM_DOCUMENT: Record<TypeDocument, string> = {
  registre: "registre de sécurité",
  "dossier-conformite": "dossier de conformité",
  "plan-actions": "plan d'actions",
  "points-a-corriger": "relevé des points à corriger",
  duerp: "DUERP",
};

/** L'élément React d'une demande, prêt pour `renderToBuffer`. */
export function elementDuDocument(demande: DemandePdf): ReactElement<DocumentProps> {
  // Chaque composant rend un `<Document>` ; TypeScript ne le suit pas à
  // travers l'union des types, d'où la conversion.
  const composant = DOCUMENTS[demande.type] as (
    props: DemandePdf["props"],
  ) => ReactElement<DocumentProps>;
  return composant(demande.props);
}
