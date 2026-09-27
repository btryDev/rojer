// Une date DÉCLARÉE par le dirigeant pour tracer un acte qu'il a fait hors de
// Rojer (C45, 2026-09-27) : la transmission du document unique au service de
// prévention et de santé au travail (L. 4121-3-1, VI) et l'information écrite
// de l'inspection du travail à l'ouverture des travaux (R. 4512-12, 2°).
//
// Deux règles, les mêmes pour les deux traces :
//  - le champ vide EFFACE la trace (`null`) — jamais une date par défaut ;
//  - une date future est refusée : l'acte est un fait accompli, on ne note
//    pas « transmis demain ».
//
// Aucune autre borne. En particulier, aucune date n'est comparée à un délai :
// ni L. 4121-3-1, VI, ni R. 4512-12, 2°, n'en fixent, et en afficher un serait
// en inventer un.
//
// Module pur, horloge injectée.

import { cleJourCivil, depuisCleJourCivil, joursCivilsEntre } from "@/lib/dates";

export type LectureDateDeclaree =
  | { ok: true; date: Date | null }
  | { ok: false; message: string };

const FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function lireDateDeclaree(
  valeur: unknown,
  now: Date,
): LectureDateDeclaree {
  if (valeur === null || valeur === undefined) return { ok: true, date: null };
  if (typeof valeur !== "string") {
    return { ok: false, message: "Format attendu : AAAA-MM-JJ" };
  }
  const brute = valeur.trim();
  if (brute === "") return { ok: true, date: null };
  if (!FORMAT.test(brute)) {
    return { ok: false, message: "Format attendu : AAAA-MM-JJ" };
  }
  const date = depuisCleJourCivil(brute);
  // Le 31 février se reconstruit en mars : l'aller-retour le démasque.
  if (cleJourCivil(date) !== brute) {
    return { ok: false, message: "Cette date n'existe pas" };
  }
  if (joursCivilsEntre(now, date) > 0) {
    return { ok: false, message: "La date ne peut pas être dans le futur" };
  }
  return { ok: true, date };
}
