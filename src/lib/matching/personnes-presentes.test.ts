import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { CATEGORIES_ERP } from "@/lib/etablissements/schema";
import { determineObligationsApplicables } from "./engine";
import {
  SEUIL_PERSONNES_R422734,
  evaluerPersonnesPresentes,
  nombreDePersonnesADemander,
} from "./personnes-presentes";
import type { EtablissementMatching } from "./types";

/**
 * La question du nombre de personnes est posée EXACTEMENT là où le moteur ne
 * sait pas conclure sans elle. Ce fichier tient les deux bords — ni trop, ni
 * trop peu — et le lien avec le moteur réel, pas avec une copie de sa règle.
 */

const IDS = [
  "incendie-travail-consigne-affichee",
  "incendie-travail-exercice-semestriel",
];

function etab(p: Partial<EtablissementMatching>): EtablissementMatching {
  return {
    effectifSurSite: 6,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "N",
    categorieErp: "N5",
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    ...p,
  } as EtablissementMatching;
}

const retenues = (e: EtablissementMatching) =>
  determineObligationsApplicables(e, [])
    .filter((o) => IDS.includes(o.obligation.id))
    .map((o) => o.obligation.id)
    .sort();

describe("nombreDePersonnesADemander — à qui la question est posée", () => {
  it("la pose à un ERP de 4ᵉ ou 5ᵉ catégorie sous le seuil d'effectif", () => {
    for (const categorieErp of ["N4", "N5"] as const) {
      expect(
        nombreDePersonnesADemander({ estERP: true, categorieErp, effectifSurSite: 6 }),
      ).toBe(true);
    }
  });

  it("ne la pose pas là où la catégorie établit déjà le seuil", () => {
    for (const categorieErp of ["N1", "N2", "N3"] as const) {
      expect(
        nombreDePersonnesADemander({ estERP: true, categorieErp, effectifSurSite: 6 }),
      ).toBe(false);
    }
  });

  it("ne la pose pas quand l'effectif seul franchit le seuil, ni hors ERP", () => {
    expect(
      nombreDePersonnesADemander({
        estERP: true,
        categorieErp: "N5",
        effectifSurSite: SEUIL_PERSONNES_R422734,
      }),
    ).toBe(false);
    expect(
      nombreDePersonnesADemander({
        estERP: true,
        categorieErp: "N5",
        effectifSurSite: SEUIL_PERSONNES_R422734 - 1,
      }),
    ).toBe(true);
    expect(
      nombreDePersonnesADemander({ estERP: false, categorieErp: null, effectifSurSite: 6 }),
    ).toBe(false);
  });

  it("ne demande rien sur la foi d'un effectif ou d'une catégorie absents", () => {
    expect(
      nombreDePersonnesADemander({ estERP: true, categorieErp: "N5", effectifSurSite: null }),
    ).toBe(false);
    expect(
      nombreDePersonnesADemander({ estERP: true, categorieErp: null, effectifSurSite: 6 }),
    ).toBe(false);
  });
});

describe("la question et le moteur disent la même chose", () => {
  it("le seuil du module est celui que les obligations écrivent", () => {
    const seuils = obligationsConformite
      .map((o) => o.typologies.personnesPresentesMin)
      .filter((s): s is number => s !== undefined);
    expect(seuils.length).toBeGreaterThan(0);
    for (const s of seuils) expect(s).toBe(SEUIL_PERSONNES_R422734);
  });

  it("pour chaque catégorie : question posée ⇔ le moteur retient « à confirmer » sur le silence", () => {
    for (const categorieErp of CATEGORIES_ERP) {
      for (const effectifSurSite of [6, 50, 51]) {
        const muet = etab({ categorieErp, effectifSurSite });
        const indetermine =
          evaluerPersonnesPresentes(SEUIL_PERSONNES_R422734, muet).etat ===
          "indetermine";
        expect(
          nombreDePersonnesADemander({ estERP: true, categorieErp, effectifSurSite }),
        ).toBe(indetermine);
        const aConfirmer = determineObligationsApplicables(muet, [])
          .filter((o) => IDS.includes(o.obligation.id))
          .some((o) => o.raisons.join(" ").includes("à confirmer"));
        expect(aConfirmer).toBe(indetermine);
      }
    }
  });

  it("la réponse tranche dans les deux sens : 40 retire les deux lignes, 60 les établit", () => {
    expect(retenues(etab({}))).toEqual(IDS);
    expect(retenues(etab({ personnesPresentesHabituellement: 40 }))).toEqual([]);
    expect(retenues(etab({ personnesPresentesHabituellement: 60 }))).toEqual(IDS);
    const raisons = determineObligationsApplicables(
      etab({ personnesPresentesHabituellement: 60 }),
      [],
    )
      .filter((o) => IDS.includes(o.obligation.id))
      .flatMap((o) => o.raisons)
      .join(" ");
    expect(raisons).not.toContain("à confirmer");
  });
});
