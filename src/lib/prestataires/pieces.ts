/**
 * Les trois pièces d'un prestataire, leurs colonnes, et l'adresse qui les
 * relit (`api/prestataires/[id]/pieces/[piece]`, 2026-09-27). Une table,
 * lue par la route et par la fiche : le lien et la route ne peuvent pas
 * nommer deux pièces différentes.
 */
export const PIECES = {
  urssaf: {
    cle: "attestationUrssafCle",
    nom: "attestationUrssafNom",
    validite: "attestationUrssafValableJusquA",
    repli: "attestation-urssaf",
  },
  rcpro: {
    cle: "assuranceRcProCle",
    nom: "assuranceRcProNom",
    validite: "assuranceRcProValableJusquA",
    repli: "attestation-rc-pro",
  },
  // Le Kbis porte une date d'ÉMISSION, pas une validité : rien à reporter.
  kbis: { cle: "kbisCle", nom: "kbisNom", validite: null, repli: "kbis" },
} as const;

export type TypePiece = keyof typeof PIECES;

export const urlPiece = (prestataireId: string, piece: TypePiece) =>
  `/api/prestataires/${prestataireId}/pieces/${piece}`;

/** Une pièce précédente se relit par son identifiant, l'appartenance étant
 *  vérifiée par la route (`api/prestataires/[id]/pieces-precedentes/[pieceId]`). */
export const urlPiecePrecedente = (prestataireId: string, pieceId: string) =>
  `/api/prestataires/${prestataireId}/pieces-precedentes/${pieceId}`;

/**
 * La date de dépôt d'une pièce, lue dans sa clé : `clePiecePrestataire` y
 * écrit `Date.now()` (`{type}-{millisecondes}-{nom}`). `null` si la clé n'a
 * pas cette forme — jamais une date devinée.
 */
export function dateDeDepotDeLaCle(cle: string): Date | null {
  const dernier = cle.split("/").pop() ?? "";
  const m = /^[a-z]+-(\d{10,})-/.exec(dernier);
  if (!m) return null;
  const d = new Date(Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

type FichePieces = {
  attestationUrssafCle: string | null;
  attestationUrssafNom: string | null;
  attestationUrssafValableJusquA: Date | null;
  assuranceRcProCle: string | null;
  assuranceRcProNom: string | null;
  assuranceRcProValableJusquA: Date | null;
  kbisCle: string | null;
  kbisNom: string | null;
};

export type PieceRemplacee = {
  type: TypePiece;
  fichierCle: string;
  fichierNom: string | null;
  deposeeLe: Date | null;
  valableJusquA: Date | null;
};

/**
 * Les pièces que ce remplacement retire de la fiche (2026-10-12) : celles dont
 * une nouvelle clé arrive ET qui en portaient une. Elles s'inscrivent en
 * `PiecePrestataire`, avec ce que la fiche disait d'elles AVANT l'écriture —
 * nom, validité — et la date de dépôt lue dans la clé.
 */
export function piecesRemplacees(
  avant: FichePieces,
  nouvellesColonnes: Partial<Record<string, string>>,
): PieceRemplacee[] {
  const out: PieceRemplacee[] = [];
  for (const type of Object.keys(PIECES) as TypePiece[]) {
    const champs = PIECES[type];
    const ancienne = avant[champs.cle];
    const nouvelle = nouvellesColonnes[champs.cle];
    if (!nouvelle || !ancienne || nouvelle === ancienne) continue;
    out.push({
      type,
      fichierCle: ancienne,
      fichierNom: avant[champs.nom],
      deposeeLe: dateDeDepotDeLaCle(ancienne),
      valableJusquA: champs.validite === null ? null : avant[champs.validite],
    });
  }
  return out;
}

export const LIBELLE_PIECE: Record<TypePiece, string> = {
  urssaf: "Attestation URSSAF",
  rcpro: "Attestation RC Pro",
  kbis: "Kbis",
};
