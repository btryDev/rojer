import "server-only";
// Client Prisma dédié au serveur MCP.
//
// Le singleton `@/lib/prisma` n'est pas réutilisable ici, et pas pour une
// raison de style : en développement il est configuré avec
// `log: ["query", "error", "warn"]`, ce que Prisma écrit **sur la sortie
// standard**. Or le transport stdio du protocole MCP *est* la sortie
// standard : chaque ligne de log s'y intercalerait au milieu des messages
// JSON-RPC et corromprait la session — le client ne verrait pas une erreur
// claire, il verrait un flux illisible.
//
// Ce client n'émet donc rien de lui-même : les erreurs sont récupérées en
// événements et réécrites sur **stderr**, qui n'est pas lu par le protocole.
// C'est le même réflexe que `prisma/seed.ts`, qui instancie aussi son propre
// client plutôt que d'importer le singleton de l'application.

import { PrismaClient } from "@prisma/client";

export const prismaMcp = new PrismaClient({
  log: [{ emit: "event", level: "error" }],
});

prismaMcp.$on("error", (e) => {
  console.error(`[rojer-mcp] erreur base de données : ${e.message}`);
});
