/**
 * Les règles de la date de dernier contrôle déclarée (ADR-051). Module pur :
 * l'écran et l'action serveur lisent les mêmes fonctions.
 */

import type { Periodicite } from "@/lib/referentiels/types-communs";
import { estCyclique } from "@/lib/calendrier/periodicite";
import { cleJourCivil, depuisCleJourCivil } from "@/lib/dates";

/**
 * Une ligne reçoit une date déclarée si elle est ouverte, matérielle (pas
 * l'échéance d'une personne, que le titre date) et À RYTHME : un contrôle
 * ponctuel ne se solde que par une pièce, la règle 3 ne le lit pas.
 */
export function recoitUneDateDeclaree(v: {
  archiveLe: Date | null;
  salarieId: string | null;
  periodicite: Periodicite;
}): boolean {
  return v.archiveLe === null && v.salarieId === null && estCyclique(v.periodicite);
}

/** Au-delà, la saisie est une faute de frappe plus qu'un contrôle. */
const ANS_EN_ARRIERE = 20;

export type LectureDateDeclaree =
  | { ok: true; date: Date | null }
  | { ok: false; message: string };

/**
 * La saisie d'un `<input type="date">` : « AAAA-MM-JJ », lue au jour civil de
 * Paris (ADR-011). Vide = retirer la date déclarée. Refusée dans le futur — un
 * contrôle à venir est un rendez-vous (ADR-049), pas un contrôle fait.
 */
export function lireDateDeclaree(saisie: unknown, maintenant: Date): LectureDateDeclaree {
  if (saisie === null || saisie === undefined || saisie === "") return { ok: true, date: null };
  if (typeof saisie !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(saisie)) {
    return { ok: false, message: "Indiquez une date au format jour/mois/année." };
  }
  const date = depuisCleJourCivil(saisie);
  if (Number.isNaN(date.getTime()) || cleJourCivil(date) !== saisie) {
    return { ok: false, message: "Cette date n'existe pas." };
  }
  const aujourdhui = cleJourCivil(maintenant);
  if (saisie > aujourdhui) {
    return {
      ok: false,
      message: "Le dernier contrôle ne peut pas être dans le futur. Un contrôle à venir se note comme rendez-vous.",
    };
  }
  const borne = `${Number(aujourdhui.slice(0, 4)) - ANS_EN_ARRIERE}${aujourdhui.slice(4)}`;
  if (saisie < borne) {
    return { ok: false, message: `Indiquez une date des ${ANS_EN_ARRIERE} dernières années.` };
  }
  return { ok: true, date };
}
