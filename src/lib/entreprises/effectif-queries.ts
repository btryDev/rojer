import "server-only";
import type { Prisma } from "@prisma/client";
import { contributionDuSite } from "./effectif-calcul";

/** Ce que la carte « Effectif » de la page Équipe affiche (2026-11-03). */
export type EffectifsDuSite = {
  effectifSurSite: number;
  apprentisSurSite: number;
  effectifHorsRojer: number;
  /** Ce que les AUTRES établissements suivis de la société apportent. */
  autresSites: number;
  nombreAutresSites: number;
  /** `Entreprise.effectif`, la somme. */
  entreprise: number;
};

export async function lireEffectifsDuSite(
  db: Pick<Prisma.TransactionClient, "etablissement">,
  etablissementId: string,
): Promise<EffectifsDuSite | null> {
  const site = await db.etablissement.findUnique({
    where: { id: etablissementId },
    select: {
      effectifSurSite: true,
      apprentisSurSite: true,
      entreprise: {
        select: {
          effectif: true,
          effectifHorsRojer: true,
          etablissements: {
            where: { id: { not: etablissementId } },
            select: { effectifSurSite: true, apprentisSurSite: true },
          },
        },
      },
    },
  });
  if (!site) return null;
  const autres = site.entreprise.etablissements;
  return {
    effectifSurSite: site.effectifSurSite,
    apprentisSurSite: site.apprentisSurSite,
    effectifHorsRojer: site.entreprise.effectifHorsRojer,
    autresSites: autres.reduce((n, s) => n + contributionDuSite(s), 0),
    nombreAutresSites: autres.length,
    entreprise: site.entreprise.effectif,
  };
}
