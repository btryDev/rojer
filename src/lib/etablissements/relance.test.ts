import { describe, expect, it } from "vitest";
import { determineObligationsApplicables, type EtablissementMatching } from "@/lib/matching";
import { questionsQuiRetiennent } from "@/lib/matching/marques";
import { PHRASE_SANS_REPONSE } from "@/lib/matching/sans-reponse";
import type { QuestionSansReponse } from "@/lib/matching/types";
import { RELANCES, relancesDuDossier } from "./relance";

/**
 * La relance couvre TOUTE question dont le silence retient une ligne (revue
 * du lot 1). Éprouvé en ne gardant que les deux premières entrées dans
 * `relancesDuDossier` : le cas « personnes présentes » rougit.
 */
const etab = (over: Partial<EtablissementMatching>): EtablissementMatching => ({
  id: "e",
  effectifSurSite: 8,
  effectifEntreprise: 8,
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "N",
  categorieErp: "N5",
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: false,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: false,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ...over,
});
const sansReponse = {
  manipuleMatieresR422722: null,
  chiffonsImpregnes: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
};

describe("relance des questions muettes", () => {
  it("chaque question que le moteur sait marquer a une relance (et une phrase)", () => {
    for (const q of Object.keys(PHRASE_SANS_REPONSE) as QuestionSansReponse[]) {
      expect(RELANCES[q], q).toBeDefined();
    }
  });

  it("restaurant N5 muet sur le nombre de personnes : relancé, vers la fiche", () => {
    const muettes = questionsQuiRetiennent(determineObligationsApplicables(etab({}), []));
    expect(muettes).toContain("personnes_presentes");
    const r = relancesDuDossier(muettes, sansReponse).find((x) => x.question === "personnes_presentes");
    expect(r?.relance.mode).toBe("fiche");
    expect(r?.faite).toBe(false);
  });

  it("hôtel N5 muet sur le sommeil : relancé, en oui/non", () => {
    const muettes = questionsQuiRetiennent(
      determineObligationsApplicables(etab({ typeErp: "O", personnesPresentesHabituellement: 20 }), []),
    );
    const r = relancesDuDossier(muettes, sansReponse).find((x) => x.question === "locaux_sommeil_public");
    expect(r?.relance.mode).toBe("oui_non");
  });

  it("une question répondue et qui ne retient plus rien : cochée si oui/non, absente si « fiche »", () => {
    const r = relancesDuDossier([], { ...sansReponse, chiffonsImpregnes: false });
    expect(r.map((x) => [x.question, x.faite])).toEqual([["chiffons_impregnes", true]]);
  });

  it("un fait d'activité muet qui retient une formation se relance en oui/non (ADR-041)", () => {
    const muettes = questionsQuiRetiennent(determineObligationsApplicables(etab({}), []));
    expect(muettes).toContain("manutention_manuelle");
    const r = relancesDuDossier(muettes, sansReponse).find((x) => x.question === "manutention_manuelle");
    expect(r?.relance.mode).toBe("oui_non");
    expect(r?.relance.mode === "oui_non" && r.relance.champ).toBe("manutentionManuelle");
  });
});
