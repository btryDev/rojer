import { prisma } from "@/lib/prisma";
import {
  lignesVisees,
  SELECT_LIGNE_VISEE,
  versLigneVisee,
  type LigneVisee,
  type PrescriptionAPreuver,
} from "./preuves";

/**
 * Lit les lignes qu'une prescription vise — LA lecture, partagée par la
 * suppression (`actions.ts`) et par la page (`queries.ts`), pour que le bouton
 * affiché dise exactement ce que le serveur acceptera (2026-09-15). Écrite deux
 * fois, la page pouvait revenir à `prescriptionId` sans qu'aucun test ne
 * rougisse : `portee.test.ts` tient désormais l'appel dans les deux fichiers,
 * et `prescriptions/actions.test.ts` la clause.
 */
export async function chargerLignesVisees(
  etablissementId: string,
  p: PrescriptionAPreuver,
): Promise<LigneVisee[]> {
  const where = lignesVisees(etablissementId, p);
  if (where === null) return [];
  const lignes = await prisma.verification.findMany({
    where,
    select: SELECT_LIGNE_VISEE,
  });
  return lignes.map(versLigneVisee);
}
