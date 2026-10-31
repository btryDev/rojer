// Les marques « à confirmer » d'un dossier, mémoïsées sur le rendu.
//
// Sorti de `dashboard/queries.ts` le 2026-09-28 (D1 (a)) : le compteur de
// retards (`calendrier/queries.ts`, lu par la sidebar, le bandeau du calendrier
// et le tableau de bord) en a désormais besoin, et l'y importer depuis le
// tableau de bord aurait noué les deux modules. Serveur seulement.

import { cache } from "react";
import { requireCompte } from "@/lib/auth/compte";
import {
  marquesDepuisApplicables,
  type MarquesDuDossier,
} from "./marques-a-confirmer";
import { obligationsApplicablesDuDossier } from "./dossier-du-rendu";

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
    const { user, db } = await requireCompte();
    // [2026-10-14, audit Next.js H2] Le passage du moteur est celui que le
    // rendu partage avec les transmissions, les états permanents et la
    // couverture (`dossier-du-rendu.ts`) : même établissement, même parc en
    // service, même prédicat d'appartenance que `marquesAConfirmerDuDossier`,
    // qui reste la porte du MCP et des routes hors rendu.
    const dossier = await obligationsApplicablesDuDossier(
      db,
      etablissementId,
      user.id,
    );
    if (!dossier) {
      return { parObligation: new Map(), entrepriseId: null, questions: [] };
    }
    return marquesDepuisApplicables(
      dossier.applicables,
      dossier.etab.entrepriseId,
    );
  },
);
