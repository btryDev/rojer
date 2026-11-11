import { calculerCriticite } from "@/lib/cotation";
import type { RisqueReferentiel } from "@/lib/referentiels/types";

/**
 * La cotation qu'un risque reçoit à sa création, avant que le dirigeant ne
 * la saisisse (`cotationSaisie` reste `false`) : celle du référentiel s'il en
 * vient, 2/2/2 sinon — risque personnalisé, ou ajouté par une activité hors
 * référentiel (ADR-060).
 */
export function defautCotation(ref: RisqueReferentiel | undefined) {
  const gravite = ref?.graviteParDefaut ?? 2;
  const probabilite = ref?.probabiliteParDefaut ?? 2;
  const maitrise = ref?.maitriseParDefaut ?? 2;
  return {
    gravite,
    probabilite,
    maitrise,
    criticite: calculerCriticite({ gravite, probabilite, maitrise }),
  };
}
