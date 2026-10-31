import "server-only";
// Le client des lectures MCP : le client borné au compte (ADR-051).
//   - Porteur OAuth : le compte de son JETON VÉRIFIÉ (`scope.userId`), jamais
//     un compte déduit de l'établissement demandé — si une régression laissait
//     passer l'établissement d'un autre compte, ce client ne le lirait pas.
//   - Clé et stdio, sans identité : le compte du propriétaire de
//     l'établissement servi, fixé par la configuration.
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
import { clientDuCompteVerifie, clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import type { ClientBorne } from "@/lib/auth/portee/client";
import type { ScopeMcp } from "./tools";

let clientStdio: ClientBorne | null = null;

/** Serveur stdio, au démarrage. `false` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function demarrerStdio(base: PrismaClient, etablissementId: string): Promise<boolean> {
  clientStdio = await clientDuProprietaire(etablissementId, base);
  return clientStdio !== null;
}

/** Retour au processus web (tests). */
export function arreterStdio(): void {
  clientStdio = null;
}

/** Le client borné de la session ; `null` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function clientMcp(scope: ScopeMcp): Promise<ClientBorne | null> {
  if (scope.userId) return clientDuCompteVerifie(scope.userId);
  return clientStdio ?? clientDuProprietaire(scope.etablissementId);
}
