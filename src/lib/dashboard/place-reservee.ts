// La place réservée de la file « À faire » (2026-10-18) — module feuille, sans
// dépendance : le widget client le lit sans tirer le moteur dans son bundle.
//
// PAR DOMAINE, PAS PAR `kind`. La place va à la santé au travail seule : une
// future entrée de `TIERS_LUI_MEME_OBLIGATOIRE` n'en hérite pas sans qu'on
// l'ait décidé ici. Pourquoi elle existe : `avecPlaceReservee`
// (`recommandations.ts`).

import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import type { Recommandation } from "./recommandations";

const DOMAINE: DomaineObligation = "sante_travail";

/** La clé de la carte qui occupe la place (`transmission-domaine:<domaine>`). */
export const CLE_PLACE_RESERVEE = `transmission-domaine:${DOMAINE}`;

export function occupePlaceReservee(
  r: Pick<Recommandation, "kind" | "cle">,
): boolean {
  return r.kind === "transmission_tiers_obligatoire" && r.cle === CLE_PLACE_RESERVEE;
}
