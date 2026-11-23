import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LIENS_ENTETE } from "./LandingHeader";

// Les liens de la barre du haut de la page publique mènent à une section qui
// existe (2026-11-23, décision de la propriétaire : « Comprendre » menait à
// `#comprendre`, une ancre que rien ne portait). Relu dans les sources des
// sections : une ancre retirée ou renommée fait échouer ce test.
const DOSSIER = join(process.cwd(), "src/components/landing");
const sources = readdirSync(DOSSIER)
  .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
  .map((f) => readFileSync(join(DOSSIER, f), "utf8"))
  .join("\n");

describe("barre du haut de la page publique", () => {
  it.each(LIENS_ENTETE)("« $label » mène à une ancre de l'accueil qui existe", ({ href }) => {
    expect(href).toMatch(/^\/#[a-z-]+$/);
    const ancre = href.slice(2);
    expect(sources).toContain(`id="${ancre}"`);
  });
});
