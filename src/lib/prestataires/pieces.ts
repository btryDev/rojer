/**
 * Les trois pièces d'un prestataire, leurs colonnes, et l'adresse qui les
 * relit (`api/prestataires/[id]/pieces/[piece]`, 2026-09-27). Une table,
 * lue par la route et par la fiche : le lien et la route ne peuvent pas
 * nommer deux pièces différentes.
 */
export const PIECES = {
  urssaf: { cle: "attestationUrssafCle", nom: "attestationUrssafNom", repli: "attestation-urssaf" },
  rcpro: { cle: "assuranceRcProCle", nom: "assuranceRcProNom", repli: "attestation-rc-pro" },
  kbis: { cle: "kbisCle", nom: "kbisNom", repli: "kbis" },
} as const;

export type TypePiece = keyof typeof PIECES;

export const urlPiece = (prestataireId: string, piece: TypePiece) =>
  `/api/prestataires/${prestataireId}/pieces/${piece}`;
