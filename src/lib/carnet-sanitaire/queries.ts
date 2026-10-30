import { requireCompte } from "@/lib/auth/compte";
import "server-only";
import { requireEtablissement } from "@/lib/auth/scope";

export async function getCarnetSanitaire(etablissementId: string) {
  const { db, etablissement } = await requireEtablissement(etablissementId);
  return db.carnetSanitaire.findUnique({
    where: { etablissementId: etablissement.id },
    include: {
      pointsReleve: {
        where: { actif: true },
        include: {
          releves: {
            orderBy: { dateReleve: "desc" },
            take: 20,
          },
        },
        orderBy: { nom: "asc" },
      },
      analyses: {
        orderBy: { dateAnalyse: "desc" },
        take: 10,
      },
    },
  });
}

/**
 * Dernier relevé par point — utilisé pour afficher un statut rapide en
 * dashboard / page index.
 *
 * La borne au compte est portée ici aussi [2026-10-30, lot 2b de l'isolation : le prédicat écrit est retiré ; la borne est celle du client borné de `requireCompte()`, ajoutée à chaque opération (ADR-051) — même garantie, sans la seconde jointure.], bien que le `carnetId`
 * soit destiné à sortir d'une lecture scopée : sans RLS (ADR-005), une
 * lecture qui ne le porte pas devient une fuite au premier appelant qui
 * prendra l'identifiant ailleurs.
 *
 * **Sans appelant au 2026-08-28.** La requête vivante équivalente est dans
 * `dashboard/queries.ts` (`getModulesMatrice`), qui porte le même prédicat.
 * Constatée morte, non supprimée : la suppression est une décision à part,
 * pas un effet de bord d'un lot de sécurité (`ComplianceTimeline`, traitée
 * pareil au § 6.4 de `docs/dette-chantier-porteur-echeance.md`, a été
 * supprimée le 2026-10-28).
 */
export async function dernierRelevesParPoint(carnetId: string) {
  const { db } = await requireCompte();
  const points = await db.pointReleve.findMany({
    where: {
      carnetId,
      actif: true,
    },
    include: {
      releves: {
        orderBy: { dateReleve: "desc" },
        take: 1,
      },
    },
    orderBy: { nom: "asc" },
  });
  return points.map((p) => ({
    ...p,
    dernier: p.releves[0] ?? null,
  }));
}
