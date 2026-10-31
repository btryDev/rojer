import "server-only";
// Le client des lectures MCP : le client borné au compte (ADR-051).
//   - Clé et stdio, sans identité : le compte du propriétaire de
//     l'établissement servi, fixé par la configuration.
//   - ~~Porteur OAuth : le compte de son jeton vérifié (`scope.userId`)~~
//     [2026-10-31, cc : pas de connecteur OAuth sur cc (ADR-052), la branche
//     est retirée ; elle reviendra avec un connecteur OAuth de Better Auth.]
// Le client MCP n'en désigne aucun : aucun schéma d'entrée ne porte
// d'identifiant.
//
// LA BORNE DE COMPTE S'AJOUTE À LA PORTÉE D'ÉTABLISSEMENT, ELLE NE LA
// REMPLACE PAS (seconde lecture du 2026-10-31) : chaque lecture de
// `./queries.ts` garde son `where: { etablissementId }`.
//
// LE SERVEUR STDIO (audit Next.js du 2026-10-14, M5) a son propre client brut,
// `prismaMcp` (`./prisma`), qui n'écrit rien sur stdout (la sortie appartient
// au protocole) : le script borne une fois, au démarrage, sur ce client
// (`demarrerStdio`), et ce client sert toute la session — un processus stdio
// sert un seul établissement. Dans le processus web, le client de
// l'application : un seul pool.

import type { PrismaClient } from "@prisma/client";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import type { ClientBorne } from "@/lib/auth/portee/client";
import type { ScopeMcp } from "./tools";

/** Le client de la session stdio, et l'établissement pour lequel il a été construit. */
let stdio: { etablissementId: string; client: ClientBorne } | null = null;

/** Serveur stdio, au démarrage. `false` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function demarrerStdio(base: PrismaClient, etablissementId: string): Promise<boolean> {
  const client = await clientDuProprietaire(etablissementId, base);
  stdio = client ? { etablissementId, client } : null;
  return stdio !== null;
}

/** Retour au processus web (tests). */
export function arreterStdio(): void {
  stdio = null;
}

/** Le client borné de la session ; `null` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function clientMcp(scope: ScopeMcp): Promise<ClientBorne | null> {
  if (!stdio) return clientDuProprietaire(scope.etablissementId);
  // Le client de la session ne sert QUE l'établissement pour lequel il a été
  // construit (revue de sécurité du 2026-10-31) : tout autre est introuvable.
  return scope.etablissementId === stdio.etablissementId ? stdio.client : null;
}
