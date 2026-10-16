import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Retouche de revue du 2026-10-16 (PR #43, constat 1) : `contexteFondementDe`
// annule type et catégorie hors ERP, et c'est sa seule source. Une page qui
// recopierait `{ typeErp: etab.typeErp, … }` retrouverait le défaut que le
// helper corrige — un type périmé après décochage d'« ERP » — sans qu'aucun
// test de rendu ne le voie (vérifié : 455 tests restaient verts). La garde lit
// donc la source des deux appelants, comme `AideCategorie.test.tsx` le fait
// pour la fiche.
const APPELANTS = [
  "src/app/etablissements/[id]/equipements/page.tsx",
  "src/lib/etats-permanents/queries.ts",
];

describe("le contexte du fondement n'a qu'une lecture", () => {
  for (const chemin of APPELANTS) {
    it(`${chemin} passe par contexteFondementDe`, () => {
      const source = readFileSync(join(process.cwd(), chemin), "utf8");
      expect(source).toMatch(/contexteFondementDe\(/);
      // Aucun contexte recopié champ à champ depuis l'établissement.
      expect(source).not.toMatch(/typeErp:\s*\w+\.typeErp\b/);
    });
  }
});
