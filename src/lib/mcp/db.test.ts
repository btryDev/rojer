import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Un seul `PrismaClient` dans le processus web (audit Next.js du 2026-10-14,
// M5). Le client dédié `prismaMcp` (`src/lib/mcp/prisma.ts`) n'est légitime
// que dans le serveur stdio, dont la sortie standard appartient au protocole.
// Importé ailleurs, il entre dans le graphe de la route `/api/mcp` ou de la
// page « Connecter » et ouvre un second pool. La règle est un SEUL importeur
// permis ; le relevé porte sur les imports, pas sur une liste de fichiers.

const racine = join(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const IMPORTEUR_PERMIS = "scripts/mcp-server.ts";

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx|mts)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

/** `from "@/lib/mcp/prisma"`, `from "./prisma"` dans `src/lib/mcp`, `from "../mcp/prisma"`… */
function importeLeClientMcp(chemin: string, source: string): boolean {
  const specifiers = [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(
    (m) => m[1],
  );
  return specifiers.some((s) => {
    if (s === "@/lib/mcp/prisma") return true;
    if (!s.startsWith(".")) return false;
    const cible = relative(racine, join(chemin, "..", s));
    return cible === "src/lib/mcp/prisma" || cible === "src/lib/mcp/prisma.ts";
  });
}

describe("prismaMcp n'a qu'un importeur : le serveur stdio", () => {
  const tous = [...fichiers(join(racine, "src")), ...fichiers(join(racine, "scripts"))];
  const importeurs = tous
    .filter((f) => importeLeClientMcp(f, readFileSync(f, "utf8")))
    .map((f) => relative(racine, f));

  it("le relevé voit bien l'importeur permis (sinon il ne prouverait rien)", () => {
    expect(importeurs).toContain(IMPORTEUR_PERMIS);
  });

  it("aucun module de l'application ne l'importe", () => {
    expect(importeurs.filter((f) => f !== IMPORTEUR_PERMIS)).toEqual([]);
  });
});
