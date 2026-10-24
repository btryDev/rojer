/**
 * Les mots d'un point à corriger (ADR-048, décision de la propriétaire du
 * 2026-10-24), en un seul endroit. Ils remplacent écart, action corrective,
 * correction, action vérification, levée et clôture, qui désignaient le même
 * objet sur des écrans différents. Module pur : le PDF l'importe.
 */

import { FORMATS_ACCEPTES, TAILLE_MAX_OCTETS } from "@/lib/rapports/validator";

export const LIBELLE_POINT = "Point à corriger";
export const LIBELLE_POINTS = "Points à corriger";
export const LIBELLE_CORRIGE = "Corrigé";

/**
 * Le statut d'un point, au masculin du mot « point » : « Ouverte » et
 * « Levée » sont ceux d'une mesure du DUERP (contrôle visuel du 2026-10-24).
 */
export const LABEL_STATUT_POINT = {
  ouverte: "À corriger",
  en_cours: "En cours",
  levee: LIBELLE_CORRIGE,
  abandonnee: "Abandonné",
} as const;

/** « 1 point à corriger », « 3 points à corriger ». */
export function nombreDePoints(n: number): string {
  return `${n} ${n > 1 ? "points" : "point"} à corriger`;
}

/** Ce que le dépôt d'un rapport non conforme propose. */
export const INVITATION_APRES_RAPPORT =
  "Le rapport relève des points à corriger ? Notez-les ici, un par un : ils s'affichent sur la fiche de l'équipement et au calendrier s'ils ont une échéance.";

export const LIBELLE_JUSTIFICATIF = "Ce qui a été fait";
export const AIDE_JUSTIFICATIF =
  "Décrivez la correction : ce qui a été fait, par qui, quand. Le texte est repris au registre.";
export const LIBELLE_PIECE = "Pièce justificative (facultatif)";
export const AIDE_PIECE = `Photo, facture ou attestation (${FORMATS_ACCEPTES}, ${TAILLE_MAX_OCTETS / 1024 / 1024} Mo au plus). Elle ne remplace pas le rapport du prochain contrôle.`;
