import "server-only";
// Le client borné au compte (ADR-051) pour un accès SANS session : un jeton
// d'accès externe, une signature vérifiée publiquement (et, au lot MCP, une
// clé MCP). Le compte
// est celui qui possède l'établissement que porte la PREUVE déjà vérifiée —
// jamais un identifiant reçu de l'appelant.
//
// LA BORNE DE COMPTE S'AJOUTE AUX CONTRÔLES DE LA PREUVE, ELLE NE LES REMPLACE
// PAS (seconde lecture du 2026-10-31). Un jeton vaut pour UN établissement,
// une portée et un objet ; le compte en couvre plusieurs. Les lectures et
// écritures faites par ce client gardent donc l'`etablissementId` de la
// preuve dans leur `where`, et les contrôles du jeton (`verifierAccessToken`,
// portée, `objetEstSignable`, partie) restent appliqués tels quels.

import { prisma } from "@/lib/prisma";
import { clientBorne, type ClientBorne } from "./portee/client";

/** `null` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function clientDuProprietaire(etablissementId: string): Promise<ClientBorne | null> {
  const etab = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    select: { entreprise: { select: { userId: true } } },
  });
  const userId = etab?.entreprise.userId;
  return userId ? clientBorne({ type: "compte", userId }) : null;
}
