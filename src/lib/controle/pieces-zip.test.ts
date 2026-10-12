import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PIECES_A_L_ECRAN,
  PIECES_ZIP,
  filtreRapportsDuDossier,
} from "./pieces-zip";

/**
 * L'écran « Préparer un contrôle » annonce ce que le ZIP contient (audit du
 * 2026-10-12 : six pièces annoncées, onze dans l'archive). Deux gardes :
 * l'écran parcourt toutes les pièces nommées, et la route n'écrit aucun nom
 * qui ne le soit pas.
 */

const ROUTE = readFileSync(
  join(process.cwd(), "src/app/api/etablissements/[id]/controle-zip/route.ts"),
  "utf8",
);

describe("pièces du ZIP — une source", () => {
  it("l'écran annonce chaque pièce nommée, sauf le README qu'il nomme en en-tête", () => {
    const aLEcran = PIECES_A_L_ECRAN.map((p) => p.cle);
    expect(new Set(aLEcran)).toEqual(
      new Set(Object.keys(PIECES_ZIP).filter((k) => k !== "readme")),
    );
    expect(aLEcran.length).toBe(new Set(aLEcran).size);
  });

  it("la route n'écrit aucun fichier ni dossier sous un nom en dur", () => {
    // Un nom littéral dans `zip.file`, `zip.folder` ou `joindreFichiers`
    // serait une pièce que l'écran ne peut pas annoncer.
    const enDur = [
      ...ROUTE.matchAll(/zip\.(?:file|folder)\(\s*["'`]/g),
      ...ROUTE.matchAll(/joindreFichiers\(\s*zip,\s*["'`]/g),
    ];
    expect(enDur.map((m) => m[0])).toEqual([]);
  });

  it("les rapports du dossier sont ceux de l'établissement, jamais d'une ligne de salarié (M1)", () => {
    expect(filtreRapportsDuDossier("e1")).toEqual({
      etablissementId: "e1",
      verification: { salarieId: null },
    });
  });

  it("la route nomme chaque pièce par la constante", () => {
    for (const cle of Object.keys(PIECES_ZIP)) {
      if (cle === "duerp") {
        expect(ROUTE).toContain("fichierDuerp(");
        continue;
      }
      expect(ROUTE, cle).toContain(`PIECES_ZIP.${cle}`);
    }
  });
});
