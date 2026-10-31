import "server-only";
// Le client des lectures MCP : le client borné au compte (ADR-051) qui
// possède l'établissement servi. La portée d'une session MCP est un
// établissement (variable de configuration pour la clé et le stdio, choix du
// porteur pour OAuth) ; le compte est celui de son propriétaire, lu en base —
// jamais fourni par le client MCP, dont aucun schéma d'entrée ne porte
// d'identifiant.
//
// LA BORNE DE COMPTE S'AJOUTE À LA PORTÉE D'ÉTABLISSEMENT, ELLE NE LA
// REMPLACE PAS (seconde lecture du 2026-10-31) : chaque lecture de
// `./queries.ts` garde son `where: { etablissementId }`.
//
// DEUX CLIENTS DE BASE (audit Next.js du 2026-10-14, M5) :
//   - dans le processus web, le client de l'application, par
//     `clientDuProprietaire` (`auth/compte-hors-session.ts`) — un seul pool ;
//   - dans le serveur stdio, et lui seul, `prismaMcp` (`./prisma`), qui
//     n'écrit rien sur stdout (la sortie appartient au protocole). Le script
//     le substitue au démarrage par `utiliserClientMcp`, et le client borné
//     est construit dessus (`clientBorneSur`).

import type { PrismaClient } from "@prisma/client";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import { clientBorneSur, type ClientBorne } from "@/lib/auth/portee/client";

let baseStdio: PrismaClient | null = null;

/** Réservé au serveur stdio : le client brut sur lequel borner. */
export function utiliserClientMcp(c: PrismaClient): void {
  baseStdio = c;
}

/**
 * Le client borné au compte propriétaire de l'établissement servi ; `null`
 * si l'établissement a disparu ou n'a pas de propriétaire.
 */
export async function clientMcp(etablissementId: string): Promise<ClientBorne | null> {
  if (!baseStdio) return clientDuProprietaire(etablissementId);
  const etab = await baseStdio.etablissement.findUnique({
    where: { id: etablissementId },
    select: { entreprise: { select: { userId: true } } },
  });
  const userId = etab?.entreprise.userId;
  return userId ? clientBorneSur(baseStdio, { type: "compte", userId }) : null;
}
