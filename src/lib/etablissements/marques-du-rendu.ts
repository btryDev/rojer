// Les marques « à confirmer » d'un dossier, mémoïsées sur le rendu.
//
// Sorti de `dashboard/queries.ts` le 2026-09-28 (D1 (a)) : le compteur de
// retards (`calendrier/queries.ts`, lu par la sidebar, le bandeau du calendrier
// et le tableau de bord) en a désormais besoin, et l'y importer depuis le
// tableau de bord aurait noué les deux modules. Serveur seulement.

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import {
  marquesAConfirmerDuDossier,
  type MarquesDuDossier,
} from "./marques-a-confirmer";

/**
 * Les marques « à confirmer » du dossier, mémoïsées par `cache()` sur le rendu
 * (contre-revue du lot 1) : le tableau de bord les demandait quatre fois — ses
 * trois fenêtres d'événements et la relance —, et chaque calcul relit
 * l'établissement et son parc. La portée est celle de la requête HTTP, comme
 * `getDashboardData`, et celle de l'utilisateur connecté, lue ici — pas un
 * propriétaire passé par l'appelant.
 */
export const marquesAConfirmerDuRendu = cache(
  async function marquesAConfirmerDuRendu(
    etablissementId: string,
  ): Promise<MarquesDuDossier> {
    const user = await requireUser();
    return marquesAConfirmerDuDossier(prisma, {
      id: etablissementId,
      entreprise: { userId: user.id },
    });
  },
);
