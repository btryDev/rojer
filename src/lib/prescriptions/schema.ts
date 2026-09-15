import { z } from "zod";
import {
  CATEGORIES_EQUIPEMENT,
  PERIODICITES,
  REALISATEURS,
} from "@/lib/referentiels/types-communs";
import { obligationParId } from "@/lib/referentiels/conformite";
import { estPeriodicitePlusStricte } from "@/lib/matching/prescriptions";
import { SOURCES_PRESCRIPTION } from "./sources";
import { cleJourCivil } from "@/lib/dates";

/**
 * Validation d'une prescription particulière (ADR-035).
 *
 * Deux règles que la base ne peut pas porter seule :
 *  - XOR des effets (la CHECK SQL le garantit aussi, ceinture et bretelles) ;
 *  - « strictement plus court que le référentiel » pour l'effet
 *    `renforce_periodicite` : le référentiel n'est pas en base (ADR-003), la
 *    règle vit ici et dans le moteur.
 */

// Sources, libellés et marquage contractuel vivent dans le module feuille
// `sources.ts` — ce fichier importe le moteur de matching, et le moteur
// importe désormais le marquage : les y laisser fermait un cycle d'imports.
// Réexportés ici : les écrans qui les prennent de `schema.ts` n'ont pas
// bougé, et n'avaient aucune raison de bouger.
export {
  SOURCES_PRESCRIPTION,
  LABEL_SOURCE_PRESCRIPTION,
  MARQUAGE_CONTRACTUEL,
  MARQUAGE_CONTRACTUEL_LONG,
  PASTILLE_CONTRACTUELLE,
  estEcheanceContractuelle,
  estSourceContractuelle,
  type SourcePrescription,
} from "./sources";

export const EFFETS_PRESCRIPTION = [
  "renforce_periodicite",
  "obligation_sur_mesure",
] as const;
export type EffetPrescription = (typeof EFFETS_PRESCRIPTION)[number];

const DATE_FMT = /^\d{4}-\d{2}-\d{2}$/;

const vide = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const dateCivile = z.preprocess(
  vide,
  z.string().regex(DATE_FMT, "Format attendu : AAAA-MM-JJ"),
);


const base = z.object({
  source: z.enum(SOURCES_PRESCRIPTION),
  reference: z.string().trim().min(1, "Référence obligatoire").max(200),
  autorite: z.preprocess(vide, z.string().trim().max(200).optional()),
  // PAS D'ACTE DANS LE FUTUR (2026-09-15). « 2062 » au lieu de « 2026 » : la
  // prescription s'appliquait quand même — le moteur ne lit que sa fin —, mais
  // aucun rapport n'était « fait sous l'acte », et la suppression effaçait un
  // acte qui avait fait rouler des lignes. Borne en jour civil de Paris
  // (ADR-011), comme la date d'un rapport (`rapports/schema.ts`).
  dateDocument: dateCivile.refine(
    (v) => typeof v === "string" && v <= cleJourCivil(new Date()),
    "Un acte ne peut pas être daté dans le futur : c'est la date portée sur la pièce.",
  ),
  dateFin: z.preprocess(vide, z.string().regex(DATE_FMT).optional()),
  periodicite: z
    .enum(PERIODICITES)
    .refine((p) => p !== "autre", "Une prescription doit porter une échéance"),
  equipementId: z.preprocess(vide, z.string().optional()),
});

export const prescriptionRenforceSchema = base
  .extend({
    effet: z.literal("renforce_periodicite"),
    obligationId: z.string().min(1, "Choisissez l'obligation concernée"),
  })
  .superRefine((val, ctx) => {
    const o = obligationParId(val.obligationId);
    if (!o) {
      ctx.addIssue({
        code: "custom",
        path: ["obligationId"],
        message: "Obligation inconnue du référentiel",
      });
      return;
    }
    if (
      !estPeriodicitePlusStricte(val.periodicite, o.periodicite)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["periodicite"],
        message: `Le référentiel impose déjà « ${o.periodicite} » : Rojer n'enregistre qu'une prescription qui renforce vos obligations. Un allègement se conserve en pièce, mais n'est pas pris en compte.`,
      });
    }
  });

export const prescriptionSurMesureSchema = base
  .extend({
    effet: z.literal("obligation_sur_mesure"),
    libelle: z.string().trim().min(1, "Libellé obligatoire").max(200),
    description: z.preprocess(vide, z.string().trim().max(1000).optional()),
    realisateurRequis: z
      .array(z.enum(REALISATEURS))
      .min(1, "Au moins un réalisateur"),
    categorieEquipement: z.preprocess(
      vide,
      z.enum(CATEGORIES_EQUIPEMENT).optional(),
    ),
  })
  .superRefine((val, ctx) => {
    if (!val.categorieEquipement && !val.equipementId) {
      ctx.addIssue({
        code: "custom",
        path: ["categorieEquipement"],
        message:
          "Indiquez la catégorie d'équipement concernée ou un équipement précis",
      });
    }
  });

export type PrescriptionInput =
  | z.infer<typeof prescriptionRenforceSchema>
  | z.infer<typeof prescriptionSurMesureSchema>;

/** Valide selon l'effet déclaré ; les deux schémas portent un `superRefine`,
 *  ce qui interdit `z.discriminatedUnion`. */
export function validerPrescription(input: Record<string, unknown>) {
  return input.effet === "obligation_sur_mesure"
    ? prescriptionSurMesureSchema.safeParse(input)
    : prescriptionRenforceSchema.safeParse(input);
}
