import { libererFichiers } from "@/lib/suppression/fichiers";

/**
 * Organisation des clés de stockage pour les pièces justificatives d'un
 * prestataire. On garde la même arborescence que les rapports de vérif
 * pour permettre un scoping simple par établissement en cas de purge.
 */

export type TypePiecePrestataire = "urssaf" | "rcpro" | "kbis";

const PREFIX: Record<TypePiecePrestataire, string> = {
  urssaf: "urssaf",
  rcpro: "rcpro",
  kbis: "kbis",
};

export function clePiecePrestataire(
  etablissementId: string,
  prestataireId: string,
  type: TypePiecePrestataire,
  nomFichier: string,
): string {
  const safe = nomFichier.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  return `prestataires/${etablissementId}/${prestataireId}/${PREFIX[type]}-${Date.now()}-${safe}`;
}

/**
 * Supprime best-effort les 3 pièces d'un prestataire si elles existent.
 * Appelée quand on supprime le prestataire lui-même.
 */
export async function deletePiecesPrestataire(prestataire: {
  attestationUrssafCle?: string | null;
  assuranceRcProCle?: string | null;
  kbisCle?: string | null;
}): Promise<void> {
  // Par `libererFichiers` : aucune clé, aucun appel ; un stockage non
  // configuré ou en panne est journalisé sans faire échouer la suppression du
  // prestataire, déjà faite en base (2026-09-27).
  await libererFichiers(
    [
      prestataire.attestationUrssafCle,
      prestataire.assuranceRcProCle,
      prestataire.kbisCle,
    ].filter((c): c is string => typeof c === "string" && c.length > 0),
    "prestataires/suppression",
  );
}
