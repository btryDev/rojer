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
    typesErpAutres: [],
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

  it("ne la pose pas quand les matières de R. 4227-22 sont déclarées : le nombre ne changerait rien", () => {
    const n5 = { estERP: true, categorieErp: "N5" as const, effectifSurSite: 6 };
    expect(
      nombreDePersonnesADemander({ ...n5, manipuleMatieresR422722: true }),
    ).toBe(false);
    // Le moteur le confirme : matières déclarées, les deux lignes sont dues
    // sans « à confirmer », nombre absent ou non.
    const raisons = determineObligationsApplicables(
      etab({ manipuleMatieresR422722: true }),
      [],
    )
      .filter((o) => IDS.includes(o.obligation.id))
      .flatMap((o) => o.raisons)
      .join(" ");
    expect(retenues(etab({ manipuleMatieresR422722: true }))).toEqual(IDS);
    expect(raisons).not.toContain("à confirmer");
    // « non » et le silence, eux, laissent la question due.
    for (const m of [false, null])
      expect(
        nombreDePersonnesADemander({ ...n5, manipuleMatieresR422722: m }),
      ).toBe(true);
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
          nombreDePersonnesADemander({
            estERP: true,
            categorieErp,
            effectifSurSite,
            typeErp: muet.typeErp,
            typesErpAutres: muet.typesErpAutres,
          }),
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
    // « non » déclaré : depuis le 2026-09-27, le silence sur les matières retient « à confirmer ».
    expect(retenues(etab({ personnesPresentesHabituellement: 40, manipuleMatieresR422722: false }))).toEqual([]);
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

describe("le nombre déclaré ne descend pas sous l'effectif du site (2026-09-27, lot 2)", () => {
  // R. 4227-34 compte les personnes « occupées » : les salariés du site en
  // sont. Déclaré 40 avec 60 salariés sur site, la consigne disparaissait.
  // Éprouvé en rétablissant `declare >= seuil` seul.
  it("60 salariés, 40 déclarés : le champ de R. 4227-34 est atteint", () => {
    const r = determineObligationsApplicables(
      etab({ effectifSurSite: 60, effectifEntreprise: 60, personnesPresentesHabituellement: 40, manipuleMatieresR422722: false }),
      [],
    ).map((o) => o.obligation.id);
    expect(r).toContain("incendie-travail-consigne-affichee");
    expect(r).not.toContain("incendie-travail-instructions-evacuation");
  });
});

// 2026-10-27 — la 4ᵉ catégorie tranchée par le type (PE 2 § 1), la 5ᵉ par
// l'effectif du public admis (GN 1 § 2 b), relus sur Légifrance le même jour.
describe("la catégorie et l'effectif du public tranchent sans le nombre", () => {
  const seuil = (e: Partial<EtablissementMatching>) =>
    evaluerPersonnesPresentes(SEUIL_PERSONNES_R422734, etab(e)).etat;

  it("une 4ᵉ catégorie dont chaque ligne du tableau dépasse 50 franchit le seuil", () => {
    for (const typeErp of ["M", "N", "O", "S", "T", "V", "W", "X", "Y", "GA", "PA"] as const) {
      expect(seuil({ categorieErp: "N4", typeErp }), typeErp).toBe("atteint");
    }
  });

  it("une 4ᵉ catégorie dont une ligne passe sous 51 reste à confirmer", () => {
    for (const typeErp of ["L", "P", "R", "U", "J", "OA", "PS", "CTS"] as const) {
      expect(seuil({ categorieErp: "N4", typeErp }), typeErp).toBe("indetermine");
    }
  });

  it("un groupement ne tranche que si TOUS ses types tranchent", () => {
    expect(seuil({ categorieErp: "N4", typeErp: "N", typesErpAutres: ["M"] })).toBe("atteint");
    expect(seuil({ categorieErp: "N4", typeErp: "N", typesErpAutres: ["P"] })).toBe("indetermine");
  });

  it("la borne du type ne vaut qu'en 4ᵉ : une 5ᵉ de type N sans effectif de public reste à confirmer", () => {
    expect(seuil({ categorieErp: "N5", typeErp: "N" })).toBe("indetermine");
  });

  it("en 5ᵉ, public admis + salariés tranche dans les deux sens, au seuil près", () => {
    expect(seuil({ effectifPublicAdmis: 45, effectifSurSite: 6 })).toBe("atteint"); // 51
    expect(seuil({ effectifPublicAdmis: 44, effectifSurSite: 6 })).toBe("non_atteint"); // 50
    expect(seuil({ effectifPublicAdmis: 150, effectifSurSite: 2 })).toBe("atteint");
  });

  it("le nombre déclaré prime sur l'effectif du public", () => {
    expect(seuil({ effectifPublicAdmis: 150, personnesPresentesHabituellement: 30 })).toBe("non_atteint");
  });

  it("l'effectif du public ne sert qu'en 5ᵉ : en 4ᵉ de type P, il ne tranche pas", () => {
    expect(seuil({ categorieErp: "N4", typeErp: "P", effectifPublicAdmis: 10 })).toBe("indetermine");
  });

  it("la question suit le moteur : plus posée à un restaurant de 4ᵉ, ni à une 5ᵉ qui a son effectif", () => {
    expect(
      nombreDePersonnesADemander({ estERP: true, categorieErp: "N4", effectifSurSite: 6, typeErp: "N", typesErpAutres: [] }),
    ).toBe(false);
    expect(
      nombreDePersonnesADemander({ estERP: true, categorieErp: "N5", effectifSurSite: 6, typeErp: "N", typesErpAutres: [], effectifPublicAdmis: 20 }),
    ).toBe(false);
    expect(
      nombreDePersonnesADemander({ estERP: true, categorieErp: "N5", effectifSurSite: 6, typeErp: "N", typesErpAutres: [] }),
    ).toBe(true);
  });

  it("le moteur sert les deux lignes sans marque à un restaurant de 4ᵉ, et les retire à une petite 5ᵉ", () => {
    const quatrieme = determineObligationsApplicables(etab({ categorieErp: "N4" }), []).filter((o) =>
      IDS.includes(o.obligation.id),
    );
    expect(quatrieme.map((o) => o.obligation.id).sort()).toEqual(IDS);
    expect(quatrieme.flatMap((o) => o.raisons).join(" ")).not.toContain("à confirmer");
    expect(
      retenues(etab({ effectifPublicAdmis: 20, effectifSurSite: 6, manipuleMatieresR422722: false })),
    ).toEqual([]);
  });
});
