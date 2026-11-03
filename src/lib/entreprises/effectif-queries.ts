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

/**
 * Le site et sa société sont déjà lus par la page (`requireEtablissement`) ;
 * seule une requête s'ajoute, pour les autres sites. Pas d'agrégat `_sum` :
 * `contributionDuSite` borne chaque site à zéro.
 */
export async function lireEffectifsDuSite(
  db: Pick<Prisma.TransactionClient, "etablissement">,
  site: {
    id: string;
    entrepriseId: string;
    effectifSurSite: number;
    apprentisSurSite: number;
    entreprise: { effectif: number; effectifHorsRojer: number };
  },
): Promise<EffectifsDuSite> {
  const autres = await db.etablissement.findMany({
    where: { entrepriseId: site.entrepriseId, id: { not: site.id } },
    select: { effectifSurSite: true, apprentisSurSite: true },
  });
  return {
    effectifSurSite: site.effectifSurSite,
    apprentisSurSite: site.apprentisSurSite,
    effectifHorsRojer: site.entreprise.effectifHorsRojer,
    autresSites: autres.reduce((n, s) => n + contributionDuSite(s), 0),
    nombreAutresSites: autres.length,
    entreprise: site.entreprise.effectif,
  };
}
