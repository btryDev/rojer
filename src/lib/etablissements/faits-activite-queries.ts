import { requireCompte } from "@/lib/auth/compte";
import { SELECT_FAITS_ACTIVITE, type ReponsesFaitsActivite } from "./faits-activite";

/**
 * Les faits d'activité d'un établissement (ADR-041), pour un écran qui n'est
 * pas la fiche établissement — Équipe et son écran « Évaluer les risques ».
 * ~~La fiche d'un salarié~~ [2026-10-24 : elle ne les lit plus.]
 *
 * `null` : l'établissement n'appartient pas à l'utilisateur. L'appartenance
 * est portée dans le `where`, même quand l'appelant vient de la vérifier
 * (ADR-005) : une lecture qui ne la porte pas devient une fuite le jour où un
 * appelant nouveau ne vérifie pas. Éprouvé dans
 * `faits-activite-queries.test.ts`.
 */
export async function chargerFaitsActivite(
  etablissementId: string,
): Promise<ReponsesFaitsActivite | null> {
  const { db } = await requireCompte();
  return db.etablissement.findFirst({
    where: { id: etablissementId },
    select: SELECT_FAITS_ACTIVITE,
  });
}
