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

/** Un point relevé par un rapport, tel que le registre le consigne. */
export type PointDuRapport = {
  id: string;
  libelle: string;
  /** « À corriger », « En cours », ou la correction faite. */
  etat: "a_corriger" | "en_cours" | "corrige";
  corrigeLe: Date | null;
  /** Ce qui a été fait — la justification des travaux. */
  justification: string | null;
  pieceJointe: boolean;
};

/**
 * D'un point lu en base à sa ligne de registre — écran et PDF lisent la même
 * (revue du 2026-10-24). Un point abandonné n'est pas une correction : `null`.
 */
export function versPointDuRapport(p: {
  id: string;
  libelle: string;
  statut: "ouverte" | "en_cours" | "levee" | "abandonnee";
  leveeLe: Date | null;
  leveeCommentaire: string | null;
  leveeFichierNom: string | null;
}): PointDuRapport | null {
  if (p.statut === "abandonnee") return null;
  const corrige = p.statut === "levee";
  return {
    id: p.id,
    libelle: p.libelle,
    etat: corrige ? "corrige" : p.statut === "en_cours" ? "en_cours" : "a_corriger",
    corrigeLe: corrige ? p.leveeLe : null,
    justification: corrige ? p.leveeCommentaire : null,
    pieceJointe: corrige && p.leveeFichierNom !== null,
  };
}

/** « corrigé le 20 oct. 2026 : ce qui a été fait (pièce jointe) », « en cours », « à corriger ». */
export function texteDuPoint(
  p: PointDuRapport,
  formaterDate: (d: Date) => string,
  /** Faux : l'écran pose la pièce en lien, à part (2026-10-25). */
  avecPiece = true,
): string {
  if (p.etat === "corrige") {
    const quand = p.corrigeLe ? ` le ${formaterDate(p.corrigeLe)}` : "";
    return `${LIBELLE_CORRIGE.toLowerCase()}${quand}${p.justification ? ` : ${p.justification}` : ""}${avecPiece && p.pieceJointe ? " (pièce jointe)" : ""}`;
  }
  return p.etat === "en_cours" ? LABEL_STATUT_POINT.en_cours.toLowerCase() : LABEL_STATUT_POINT.ouverte.toLowerCase();
}

/** La mention que R. 4226-19 appelle sous un rapport électrique (vérifié sur Légifrance le 2026-10-24). */
export const MENTION_R4226_19 = "Consigné au registre (art. R. 4226-19 du Code du travail).";
