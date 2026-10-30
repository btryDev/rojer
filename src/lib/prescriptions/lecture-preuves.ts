import { prisma } from "@/lib/prisma";
import type { Db } from "@/lib/auth/compte";
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
 *
 * Par le client brut, pour les appelants qui ne passent pas encore le client
 * borné (ADR-051, lot 2b) : elle délègue à `chargerLignesViseesDuCompte`.
 */
export async function chargerLignesVisees(
  etablissementId: string,
  p: PrescriptionAPreuver,
): Promise<LigneVisee[]> {
  return chargerLignesViseesDuCompte(prisma, etablissementId, p);
}

/** La même lecture, par le client borné au compte de l'appelant (ADR-051). */
export async function chargerLignesViseesDuCompte(
  db: Db,
  etablissementId: string,
  p: PrescriptionAPreuver,
): Promise<LigneVisee[]> {
  const where = lignesVisees(etablissementId, p);
  if (where === null) return [];
  const lignes = await db.verification.findMany({
    where,
    select: SELECT_LIGNE_VISEE,
  });
  return lignes.map(versLigneVisee);
}
