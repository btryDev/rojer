import { describe, expect, it } from "vitest";
import { determineObligationsApplicables, type EtablissementMatching } from "./index";

/**
 * R. 4227-29 : l'établissement est DOTÉ d'extincteurs (2026-09-27, lot 2).
 * La ligne d'appareil ne naissait que d'un extincteur déclaré — l'établissement
 * qui en manque ne recevait rien. Éprouvé en rendant la dotation portée par
 * l'équipement : le premier cas rougit.
 */
const etab = (over: Partial<EtablissementMatching> = {}): EtablissementMatching => ({
  id: "e",
  effectifSurSite: 4,
  effectifEntreprise: 4,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: false,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: false,
  ...over,
});
const ids = (e: EtablissementMatching) => determineObligationsApplicables(e, []).map((o) => o.obligation.id);

describe("dotation en extincteurs, sans aucun équipement déclaré", () => {
  it("un établissement de travail la reçoit", () => {
    expect(ids(etab())).toContain("incendie-travail-extincteurs-dotation");
  });
  it("un établissement sans salarié (habitation seule) ne la reçoit pas", () => {
    expect(ids(etab({ estEtablissementTravail: false, estHabitation: true }))).not.toContain(
      "incendie-travail-extincteurs-dotation",
    );
  });
});
