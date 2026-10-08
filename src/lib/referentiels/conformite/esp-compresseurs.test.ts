import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "@/lib/matching/engine";
import type { EquipementMatching, EtablissementMatching } from "@/lib/matching/types";
import { FAMILLES_ESP } from "@/lib/equipements/esp";
import { FAMILLES_ESP_NON_COMPRESSEUR } from "./equipement-sous-pression";

/**
 * La requalification décennale des équipements sous pression est bornée aux
 * compresseurs (2026-10-08, C64 ; le préventeur demande d'exclure les ESP,
 * sauf la requalification décennale des compresseurs). Le silence la garde.
 */
const ID = "esp-requalification-decennale";

const ETAB: EtablissementMatching = {
  id: "etab",
  effectifSurSite: 5,
  effectifEntreprise: 5,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  chiffonsImpregnes: null,
};

function avec(caracteristiques: Record<string, unknown> | null): boolean {
  const eq: EquipementMatching = {
    id: "esp-1",
    libelle: "Appareil sous pression",
    categorie: "EQUIPEMENT_SOUS_PRESSION",
    caracteristiques,
  } as EquipementMatching;
  return determineObligationsApplicables(ETAB, [eq]).some((a) => a.obligation.id === ID);
}

describe("requalification décennale : compresseurs seulement, le silence la garde", () => {
  it("le compresseur (air comprimé, groupe 2) la reçoit", () => {
    expect(avec({ familleEsp: "recipient_gaz_groupe2" })).toBe(true);
  });

  it("famille non saisie, ou « je ne sais pas » : la ligne reste", () => {
    expect(avec(null)).toBe(true);
    expect(avec({})).toBe(true);
    expect(avec({ familleEsp: "autre" })).toBe(true);
  });

  it("une famille déclarée qui n'est pas un compresseur la perd (borne basse : le générateur de vapeur)", () => {
    expect(avec({ familleEsp: "generateur_vapeur" })).toBe(false);
  });

  it("chaque famille de l'énumération est classée : écartée, ou servie (compresseur, inconnu)", () => {
    const servies = FAMILLES_ESP.filter((f) => avec({ familleEsp: f }));
    const ecartees = FAMILLES_ESP.filter((f) => !avec({ familleEsp: f }));
    expect(servies).toContain("recipient_gaz_groupe2");
    expect(servies).toContain("autre");
    // Les écartées sont exactement celles que le référentiel nomme : une
    // famille neuve ajoutée à l'énumération reste servie tant qu'on ne l'a pas
    // classée, ce qui est le sens prudent.
    expect(new Set(ecartees)).toEqual(new Set(FAMILLES_ESP_NON_COMPRESSEUR));
  });

  it("le « non » au suivi en service l'écarte toujours, compresseur compris", () => {
    expect(
      avec({ familleEsp: "recipient_gaz_groupe2", estSoumisSuiviEnService: false }),
    ).toBe(false);
  });
});
