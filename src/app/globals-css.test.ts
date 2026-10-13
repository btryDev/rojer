/**
 * Le flou de l'îlot de navigation, tel que le BUILD l'émet — pas tel que la
 * source l'écrit.
 *
 * Contrôle visuel du 2026-10-13 (next build + next start) : `globals.css`
 * déclarait `backdrop-filter` puis `-webkit-backdrop-filter`, et le CSS
 * compilé ne gardait que la seconde. Lightning CSS, que Tailwind 4 emploie
 * pour optimiser, tient les deux pour une seule propriété et garde la
 * dernière. Chrome calculait donc `none` : aucun flou. Lire la source ne
 * pouvait pas le voir — d'où ce test, qui passe par la même compilation que
 * le build (`optimize`, actif en production).
 *
 * Il vérifie les DEUX sorties : la standard pour Chrome et Firefox, la
 * préfixée pour Safari. Corriger l'une en perdant l'autre serait le même
 * défaut, déplacé.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
// `postcss` n'est pas une dépendance directe du projet : c'est celle du
// plugin Tailwind, résolue depuis lui — la version même que le build charge.
const pluginTailwind = require.resolve("@tailwindcss/postcss");
const postcss = require(require.resolve("postcss", { paths: [pluginTailwind] }));
const tailwind = require(pluginTailwind);

const FICHIER = path.resolve(__dirname, "globals.css");

async function compiler(): Promise<string> {
  const source = readFileSync(FICHIER, "utf8");
  const r = await postcss([tailwind({ optimize: { minify: true } })]).process(
    source,
    { from: FICHIER },
  );
  return r.css as string;
}

/** Les déclarations de flou des règles dont le sélecteur est exactement `sel`. */
function flous(css: string, sel: string): string[] {
  const echappe = sel.replace(/[.-]/g, (c) => `\\${c}`);
  const regles = css.match(new RegExp(`${echappe}\\{[^}]*\\}`, "g")) ?? [];
  return regles.flatMap((r) =>
    r
      .slice(r.indexOf("{") + 1, -1)
      .split(";")
      .filter((d) => /backdrop-filter:/.test(d)),
  );
}

describe("globals.css compilé — le flou de la barre de la landing", () => {
  it.each([".lp-nav", ".lp-nav--ilot"])(
    "%s garde backdrop-filter ET -webkit-backdrop-filter",
    async (sel) => {
      const d = flous(await compiler(), sel);
      expect(d.some((x) => x.startsWith("backdrop-filter:"))).toBe(true);
      expect(d.some((x) => x.startsWith("-webkit-backdrop-filter:"))).toBe(true);
    },
    30_000,
  );

  it("l'îlot floute réellement : 20px dans la sortie standard", async () => {
    const d = flous(await compiler(), ".lp-nav--ilot");
    expect(d).toContain("backdrop-filter:blur(20px)saturate(180%)");
  }, 30_000);
});
