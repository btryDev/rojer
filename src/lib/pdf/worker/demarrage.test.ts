import { describe, expect, it } from "vitest";
import { problemesDuFilDesPdf } from "./demarrage";

const sain = { production: true, workerPresent: true, execArgv: [] as string[], nodeOptions: undefined };

describe("problemesDuFilDesPdf — ce qui arrête le démarrage en production", () => {
  it("rien quand le fil est là et sa borne libre", () => {
    expect(problemesDuFilDesPdf(sain)).toEqual([]);
  });

  it("le fichier du fil manque", () => {
    expect(problemesDuFilDesPdf({ ...sain, workerPresent: false })).toEqual([
      expect.stringMatching(/dist-pdf\/pdf-worker\.mjs absent/),
    ]);
  });

  it("--max-old-space-size, en option de Node ou dans NODE_OPTIONS", () => {
    expect(problemesDuFilDesPdf({ ...sain, execArgv: ["--max-old-space-size=2048"] })).toEqual([
      expect.stringMatching(/annule la borne de tas/),
    ]);
    expect(
      problemesDuFilDesPdf({ ...sain, nodeOptions: "--enable-source-maps --max-old-space-size=900" }),
    ).toHaveLength(1);
    expect(problemesDuFilDesPdf({ ...sain, nodeOptions: "--enable-source-maps" })).toEqual([]);
  });

  it("hors production, rien n'arrête le démarrage", () => {
    expect(
      problemesDuFilDesPdf({ production: false, workerPresent: false, execArgv: [], nodeOptions: "--max-old-space-size=1" }),
    ).toEqual([]);
  });
});
