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
// DEUX CLIENTS DE BASE (audit Next.js du 2026-10-14, M5) : dans le processus
// web, celui de l'application — un seul pool ; dans le serveur stdio, et lui
// seul, `prismaMcp` (`./prisma`), qui n'écrit rien sur stdout. Le script le
// substitue au démarrage (`utiliserClientMcp`) ; le client borné, construit
// dessus, est gardé pour la session : un processus stdio sert un seul
// établissement.

import type { PrismaClient } from "@prisma/client";
import { clientDuCompteVerifie, clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import type { ClientBorne } from "@/lib/auth/portee/client";
import type { ScopeMcp } from "./tools";

let baseStdio: PrismaClient | null = null;
let clientStdio: Promise<ClientBorne | null> | null = null;

/** Réservé au serveur stdio : le client brut sur lequel borner (`null` : retour au client de l'application). */
export function utiliserClientMcp(c: PrismaClient | null): void {
  baseStdio = c;
  clientStdio = null;
}

/** Le client borné de la session ; `null` si l'établissement a disparu ou n'a pas de propriétaire. */
export async function clientMcp(scope: ScopeMcp): Promise<ClientBorne | null> {
  if (scope.userId) return clientDuCompteVerifie(scope.userId);
  if (!baseStdio) return clientDuProprietaire(scope.etablissementId);
  clientStdio ??= clientDuProprietaire(scope.etablissementId, baseStdio);
  return clientStdio;
}
