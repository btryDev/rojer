import "server-only";
import { z } from "zod";
import {
  CATEGORIES_EQUIPEMENT,
  PERIODICITES,
  REALISATEURS,
} from "@/lib/referentiels/types-communs";
import { obligationParId } from "@/lib/referentiels/conformite";
import {
  motifPrescriptionNonRetenue,
  prescriptionRenforce,
} from "@/lib/matching/prescriptions";
import { SOURCES_PRESCRIPTION } from "./sources";
import { cleJourCivil, estJourCivilReel } from "@/lib/dates";

/**
 * Validation d'une prescription particulière (ADR-035).
 *
 * Deux règles que la base ne peut pas porter seule :
 *  - XOR des effets (la CHECK SQL le garantit aussi, ceinture et bretelles) ;
 *  - « strictement plus court que le référentiel » pour l'effet
 *    `renforce_periodicite` : le référentiel n'est pas en base (ADR-003), la
 *    règle vit ici et dans le moteur.
 */

// SERVEUR SEULEMENT (audit Next.js du 2026-10-14, H1). Ce schéma importe le
// référentiel (`obligationParId`) et le moteur de matching pour valider
// l'effet `renforce_periodicite` : un composant client qui l'importait
// embarquait les 176 obligations, notes internes comprises, dans le paquet
// envoyé au navigateur. Les sources, libellés et marquage contractuel vivent
// dans le module feuille `sources.ts` : c'est là que les écrans les prennent,
// et ce fichier ne les réexporte plus. La validation reste entière, côté
// serveur, dans l'action qui l'appelle (`actions.ts`).

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
  z
    .string()
    .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
    .refine(estJourCivilReel, "Cette date n'existe pas"),
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
  dateFin: z.preprocess(
    vide,
    z
      .string()
      .regex(DATE_FMT, "Format attendu : AAAA-MM-JJ")
      .refine(estJourCivilReel, "Cette date n'existe pas")
      .optional(),
  ),
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
    if (!prescriptionRenforce(val.periodicite, o)) {
      ctx.addIssue({
        code: "custom",
        path: ["periodicite"],
        message: `${motifPrescriptionNonRetenue(o)} Rojer n'enregistre qu'une prescription qui renforce vos obligations. Un allègement se conserve en pièce, mais n'est pas pris en compte.`,
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
