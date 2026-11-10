import { describe, expect, it } from "vitest";
import { informationsDuRendu, problemesDuFilDesPdf } from "./demarrage";

describe("problemesDuFilDesPdf — ce qui lève au démarrage en production", () => {
  it("rien quand le fichier du rendu est là", () => {
    expect(problemesDuFilDesPdf({ production: true, workerPresent: true })).toEqual([]);
  });

  it("le fichier du rendu manque", () => {
    expect(problemesDuFilDesPdf({ production: true, workerPresent: false })).toEqual([
      expect.stringMatching(/dist-pdf\/pdf-worker\.mjs absent/),
    ]);
  });

  it("hors production, rien ne lève", () => {
    expect(problemesDuFilDesPdf({ production: false, workerPresent: false })).toEqual([]);
  });
});

describe("informationsDuRendu — le drapeau de la plateforme, noté, jamais refusé", () => {
  it("rien à dire sans drapeau", () => {
    expect(informationsDuRendu({ execArgv: [], nodeOptions: "--enable-source-maps" })).toBeNull();
  });

  it("dit d'où vient le drapeau, argument ou NODE_OPTIONS", () => {
    expect(informationsDuRendu({ execArgv: ["--max-old-space-size=1262"], nodeOptions: undefined })).toMatch(
      /argument --max-old-space-size=1262/,
    );
    expect(
      informationsDuRendu({ execArgv: [], nodeOptions: "--enable-source-maps --max-old-space-size=714" }),
    ).toMatch(/NODE_OPTIONS --max-old-space-size=714/);
  });
});
