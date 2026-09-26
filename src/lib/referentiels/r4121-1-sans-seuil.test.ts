import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * « OBLIGATOIRE DÈS LE PREMIER SALARIÉ (ART. R. 4121-1) » — revue finale de
 * l'intégration d, 2026-09-26.
 *
 * Relus sur Légifrance le 2026-09-26 : R. 4121-1 (en vigueur depuis le
 * 2011-04-01) écrit « L'employeur transcrit et met à jour dans un document
 * unique les résultats de l'évaluation des risques pour la santé et la
 * sécurité des travailleurs à laquelle il procède en application de
 * l'article L. 4121-3 » ; L. 4121-3 (depuis le 2022-03-31) fait évaluer les
 * risques par « L'employeur ». Ni l'un ni l'autre n'écrit « dès le premier
 * salarié » : c'est une lecture — qui est employeur a au moins un salarié —,
 * pas le texte. Trois surfaces l'attribuaient à R. 4121-1 : la checklist de
 * l'établissement, la carte « Pourquoi ce document » du document unique et
 * la liste des documents obligatoires. Elles disent désormais ce que
 * l'article dit, et qu'il ne fixe pas de seuil d'effectif.
 *
 * Portée : les écrans et la liste des documents. Les notes du référentiel
 * (commentaires, `notesInternes`) ne sont pas affichées.
 */
const RACINE = join(process.cwd(), "src");
const SURFACES = [
  "app",
  "components",
  "lib/referentiels/documents-obligatoires.ts",
];

function fichiers(p: string): string[] {
  const abs = join(RACINE, p);
  if (!statSync(abs).isDirectory()) return [abs];
  return readdirSync(abs).flatMap((n) => fichiers(join(p, n)));
}

describe("R. 4121-1 n'est pas cité pour « dès le premier salarié »", () => {
  it("aucune surface affichée ne l'écrit", () => {
    const fautifs = SURFACES.flatMap(fichiers)
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
      .filter((f) => /premier salarié/i.test(readFileSync(f, "utf8")))
      .map((f) => relative(RACINE, f));
    expect(fautifs).toEqual([]);
  });
});
