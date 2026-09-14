import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Un module `"use server"` n'exporte QUE des fonctions async — c'est Next qui
 * l'impose, au `next build`, et nulle part ailleurs.
 *
 * LE DÉFAUT QUE CE TEST GARDE (2026-09-14). Le lot N2 de l'ADR-034 a posé
 * `export class LigneModifieeEntreTemps` dans `lib/rapports/actions.ts`. Next
 * rejette alors le module entier (« The module has no exports at all »), et
 * chaque déploiement Vercel a échoué pendant trois jours. `tsc` passait, les
 * 2626 tests passaient : aucun des deux ne connaît cette règle. Elle se
 * vérifie donc ici, à la lecture du source, là où la suite tourne à chaque
 * lot.
 *
 * Les exports de TYPE sont effacés à la compilation et restent permis.
 */

const RACINE = join(__dirname, "..");

function fichiersSource(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersSource(chemin);
    return /\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

function estUseServer(source: string): boolean {
  // La directive doit être la première instruction : commentaires et lignes
  // vides avant elle sont tolérés.
  const sansCommentaires = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trimStart();
  return /^["']use server["'];?/.test(sansCommentaires);
}

/** Les exports interdits : tout ce qui n'est ni `export async function`, ni
 *  un export de type. */
function exportsInterdits(source: string): string[] {
  return source
    .split("\n")
    .filter((l) => /^export\s/.test(l))
    .filter(
      (l) =>
        !/^export\s+async\s+function\s/.test(l) &&
        !/^export\s+(type|interface)\s/.test(l) &&
        !/^export\s+\{\s*type\s/.test(l),
    )
    .map((l) => l.trim());
}

describe('modules "use server"', () => {
  const modules = fichiersSource(RACINE).filter((f) =>
    estUseServer(readFileSync(f, "utf8")),
  );

  it("il y en a — sinon ce test ne garde rien", () => {
    expect(modules.length).toBeGreaterThan(5);
  });

  it("n'exportent que des fonctions async (et des types)", () => {
    const fautes = modules.flatMap((f) =>
      exportsInterdits(readFileSync(f, "utf8")).map(
        (l) => `${relative(RACINE, f)} : ${l}`,
      ),
    );
    expect(fautes).toEqual([]);
  });

  it("le témoin : la règle attrape bien l'export d'une classe", () => {
    expect(
      exportsInterdits(
        '"use server";\nexport class Erreur extends Error {}\nexport async function ok() {}\nexport type T = 1;',
      ),
    ).toEqual(["export class Erreur extends Error {}"]);
  });
});
