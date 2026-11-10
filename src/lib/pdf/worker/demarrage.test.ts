import { describe, expect, it } from "vitest";
import { informationsDuRendu, problemeDuRenduDesPdf } from "./demarrage";

describe("problemeDuRenduDesPdf — ce qui lève au démarrage en production", () => {
  it("rien quand le fichier du rendu est là", () => {
    expect(problemeDuRenduDesPdf({ production: true, workerPresent: true })).toBeNull();
  });

  it("le fichier du rendu manque", () => {
    expect(problemeDuRenduDesPdf({ production: true, workerPresent: false })).toMatch(
      /dist-pdf\/pdf-worker\.mjs absent/,
    );
  });

  it("hors production, rien ne lève", () => {
    expect(problemeDuRenduDesPdf({ production: false, workerPresent: false })).toBeNull();
  });
});

describe("informationsDuRendu — le drapeau de la plateforme, noté, jamais refusé", () => {
  it("rien à dire sans drapeau", () => {
    expect(informationsDuRendu({ execArgv: [], nodeOptions: "--enable-source-maps" })).toBeNull();
  });

  it("dit la valeur qui s'applique, argument ou NODE_OPTIONS, sous toutes ses graphies", () => {
    expect(informationsDuRendu({ execArgv: ["--max-old-space-size=1262"], nodeOptions: undefined })).toMatch(
      /--max-old-space-size=1262/,
    );
    expect(
      informationsDuRendu({ execArgv: [], nodeOptions: "--enable-source-maps --max_old_space_size=644" }),
    ).toMatch(/--max-old-space-size=644/);
  });
});
