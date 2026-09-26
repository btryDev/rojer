import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { seuilProgrammeAnnuelDuSnapshot } from "./seuil-programme-annuel";

/**
 * Le titre « Entreprises d'au moins 50 salariés (art. L. 4121-3-1) » du
 * document unique imprimé, et sa mention « à confirmer » (revue finale de
 * l'intégration d, 2026-09-26).
 */
describe("seuil du programme annuel sur une version figée", () => {
  it("entreprise au seuil : atteint, rien à confirmer", () => {
    expect(
      seuilProgrammeAnnuelDuSnapshot({ effectif: 12, effectifEntreprise: 60 }),
    ).toEqual({ atteint: true, aConfirmer: false });
  });

  it("entreprise sous le seuil, site au seuil : atteint PAR PRUDENCE", () => {
    expect(
      seuilProgrammeAnnuelDuSnapshot({ effectif: 50, effectifEntreprise: 49 }),
    ).toEqual({ atteint: true, aConfirmer: true });
  });

  it("version figée avant C37 (sans effectifEntreprise) : se lit comme avant", () => {
    // Le site seul, comme le document le lisait : 50 atteint, jamais « à
    // confirmer » — la version ne portait pas de quoi douter.
    expect(seuilProgrammeAnnuelDuSnapshot({ effectif: 50 })).toEqual({
      atteint: true,
      aConfirmer: false,
    });
    expect(seuilProgrammeAnnuelDuSnapshot({ effectif: 49 })).toEqual({
      atteint: false,
      aConfirmer: false,
    });
  });

  it("le document imprime la mention sous le paragraphe quand le seuil est à confirmer", () => {
    const src = readFileSync("src/lib/pdf/DuerpDocument.tsx", "utf8");
    const bloc = src.slice(
      src.indexOf("{programmeAnnuel.atteint && ("),
      src.indexOf("Ce document a été rédigé"),
    );
    expect(bloc).toContain("Entreprises d&apos;au moins 50 salariés");
    expect(bloc).toContain("{programmeAnnuel.aConfirmer && (");
    expect(bloc).toContain(
      "mentionAConfirmer(SEUIL_PROGRAMME_ANNUEL_PREVENTION)",
    );
  });
});
