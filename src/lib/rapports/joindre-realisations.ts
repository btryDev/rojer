// La jointure « dernière réalisation » pour des lignes déjà lues, par le client
// Prisma de l'application.
//
// Séparée de `derniere-realisation.ts`, qui reste pur, pour une raison
// précise : le serveur MCP a son propre client (`lib/mcp/prisma.ts`) et lit ce
// module-là. S'il importait celui-ci, il chargerait un second client.

import { prisma } from "@/lib/prisma";
import {
  indexerDernieresRealisations,
  WHERE_RAPPORT_REALISE,
} from "./derniere-realisation";

/**
 * Joint à des lignes DÉJÀ LUES — et déjà scopées par leur appelant — la date
 * de leur dernier rapport réalisé, en UNE requête pour tout le lot.
 *
 * Préféré à un `rapports: SELECT_DERNIER_RAPPORT_REALISE` dans l'`include`
 * quand la forme de la ligne circule loin : un champ `rapports` réduit à un
 * seul élément, dans un type que le registre ou un PDF réutilisent, serait
 * lu un jour comme la liste complète.
 */
export async function joindreDernieresRealisations<T extends { id: string }>(
  lignes: T[],
): Promise<
  Array<T & { derniereRealisation: Date | null; dernierResultat: string | null }>
> {
  if (lignes.length === 0) return [];
  // Tous les rapports réalisés du lot, et non le dernier de chaque ligne : le
  // `distinct` de Prisma se fait en mémoire côté moteur, donc il ne
  // ramènerait pas moins de lignes, et un `groupBy _max(dateRapport)` perdrait
  // le RÉSULTAT dont le statut d'un one-shot dépend. Deux colonnes par
  // rapport ; un hebdomadaire en produit une cinquantaine par an.
  const index = indexerDernieresRealisations(
    await prisma.rapportVerification.findMany({
      where: {
        verificationId: { in: lignes.map((l) => l.id) },
        ...WHERE_RAPPORT_REALISE,
      },
      select: { verificationId: true, dateRapport: true, resultat: true },
    }),
  );
  return lignes.map((l) => {
    const derniere = index.get(l.id) ?? null;
    return {
      ...l,
      derniereRealisation: derniere?.dateRapport ?? null,
      dernierResultat: derniere?.resultat ?? null,
    };
  });
}
