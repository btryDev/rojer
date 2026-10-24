import { z } from "zod";
import { estSaisieDateHeureReelle } from "@/lib/dates";

/** La note d'un rendez-vous : une ligne courte, bornée comme en base. */
export const NOTE_RENDEZ_VOUS_MAX = 300;

// Absent (`null`, `FormData.get`) ou vide : non renseigné.
const vide = (v: unknown) => (v === null ? undefined : typeof v === "string" ? v.trim() || undefined : v);

/**
 * Le prestataire attitré d'un contrôle et le rendez-vous pris (ADR-049).
 * Tout est facultatif : vider un champ le retire.
 */
export const suiviControleSchema = z.object({
  prestataireId: z.preprocess(vide, z.string().max(64).optional()),
  rendezVousLe: z.preprocess(
    vide,
    z
      .string()
      .refine(estSaisieDateHeureReelle, "Date et heure attendues")
      .optional(),
  ),
  rendezVousNote: z.preprocess(vide, z.string().max(NOTE_RENDEZ_VOUS_MAX).optional()),
});
