// Le stockage est serveur seulement : `index.ts` et `supabase.ts` importent
// `server-only` (Next fait échouer le build d'un composant client qui les
// tire), et aucun fichier "use client" ne les importe directement — relevé
// ici, sans dépendre d'un build.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function sources(dossier: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dossier)) {
    const p = join(dossier, e);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
  }
  return out;
}

describe("le stockage ne sort pas du serveur", () => {
  it.each(["index.ts", "supabase.ts"])("%s importe « server-only » en tête", (f) => {
    const source = readFileSync(join(RACINE, "src", "lib", "storage", f), "utf8");
    const premierImport = source.split("\n").find((l) => l.startsWith("import "));
    expect(premierImport).toBe('import "server-only";');
  });

  it("aucun fichier « use client » n'importe le stockage", () => {
    const clients = sources(join(RACINE, "src")).filter((f) =>
      /^\s*["']use client["']/.test(readFileSync(f, "utf8")),
    );
    // Borne basse : le relevé voit des composants clients.
    expect(clients.length).toBeGreaterThan(20);
    const fautifs = clients.filter((f) =>
      /from\s+["'](?:@\/lib\/storage(?:\/[\w-]+)?|\.{1,2}\/(?:[\w-]+\/)*storage(?:\/[\w-]+)?)["']/.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(fautifs.map((f) => f.slice(RACINE.length + 1))).toEqual([]);
  });
});
