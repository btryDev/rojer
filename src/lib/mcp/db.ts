import "server-only";
// Le client Prisma des lectures MCP — celui de l'application, sauf en stdio.
//
// AVANT (audit Next.js du 2026-10-14, M5). `queries.ts` et
// `acces-oauth-deps.ts` importaient `prismaMcp` (`./prisma`), un client
// dédié. Il est justifié pour le serveur stdio, dont la sortie standard
// appartient au protocole. Mais la route HTTP `/api/mcp` et la page
// « Connecter » (par `tools.ts`) importent ces mêmes modules : le processus web
// instanciait un second `PrismaClient`, donc un second pool vers la même base,
// à compter dans `max_connections` d'un Node permanent (Clever Cloud).
//
// MAINTENANT. Les lectures MCP prennent leur client ici, à chaque appel :
//   - par défaut, le singleton de l'application (`@/lib/prisma`) — un seul
//     client dans le processus web ;
//   - le serveur stdio (`scripts/mcp-server.ts`), et lui seul, y substitue
//     `prismaMcp` au démarrage par `utiliserClientMcp`, avant tout appel
//     d'outil. `./prisma` n'est importé nulle part ailleurs : c'est ce que
//     `db.test.ts` vérifie.
//
// FORME D'APPEL : `const db = dbMcp();` en tête de fonction, puis `db.x.y(…)`.
// Pas `dbMcp().x.y(…)` : la sonde de cloisonnement (`auth/tenancy-sonde.ts`)
// reconnaît une lecture à la forme `client.modele.findUnique(` et ne verrait
// plus les lectures MCP — elle les a vues disparaître, et leurs exemptions
// devenir orphelines, au premier essai (2026-10-14).
//
// Le singleton n'ouvre aucune connexion tant qu'on ne l'interroge pas : dans
// le processus stdio, où il est importé mais jamais lu, il ne coûte aucun pool.

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

let client: PrismaClient = prisma;

/** Réservé au serveur stdio : remplace le client des lectures MCP. */
export function utiliserClientMcp(c: PrismaClient): void {
  client = c;
}

/** Le client des lectures MCP. Lu à chaque appel, jamais capturé à l'import. */
export function dbMcp(): PrismaClient {
  return client;
}
