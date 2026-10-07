import { describe, expect, it } from "vitest";
import { determineObligationsApplicables } from "./engine";
import type { EquipementMatching, EtablissementMatching } from "./types";
import { equipementSchema, questionsTriEtatPour } from "@/lib/equipements/schema";

/**
 * Lot 4 de la relecture du préventeur (2026-10-07) : DF 10 § 3 et MS 73 § 2.
 *
 * - « § 3. Lorsque existent une installation de désenfumage mécanique et un
 *   système de sécurité incendie de catégorie A ou B, les vérifications sont
 *   effectuées tous les trois ans par un organisme agréé. » (DF 10)
 * - « De plus, les systèmes de sécurité incendie de catégories A et B […]
 *   doivent être vérifiés tous les trois ans par une personne ou un organisme
 *   agréé. » (MS 73 § 2)
 *
 * Chaque question est éprouvée sur ses trois états : oui, non, pas répondu.
 */

const SSI_TRIENNALE = "incendie-erp-ssi-triennale";
const SSI_ANNUELLE = "incendie-erp-ssi-annuelle";
const DF_TRIENNALE = "incendie-erp-desenfumage-triennale-mecanique-ssi";
const DF_ANNUELLE = "incendie-erp-desenfumage-annuelle";

function erp(categorieErp: EtablissementMatching["categorieErp"]): EtablissementMatching {
  return {
    id: "etab",
    effectifSurSite: 20,
    effectifEntreprise: 20,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "M",
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    chiffonsImpregnes: null,
  };
}

type TriEtat = boolean | undefined;

function alarme(ab: TriEtat): EquipementMatching {
  return {
    id: "eq-ssi",
    libelle: "SSI",
    categorie: "ALARME_INCENDIE",
    caracteristiques: ab === undefined ? null : { estSsiCategorieAouB: ab },
  };
}

function desenfumage(mecanique: TriEtat, ssiAB: TriEtat): EquipementMatching {
  const c: Record<string, unknown> = {};
  if (mecanique !== undefined) c.estDesenfumageMecanique = mecanique;
  if (ssiAB !== undefined) c.etablissementASsiCategorieAouB = ssiAB;
  return {
    id: "eq-dsf",
    libelle: "Désenfumage",
    categorie: "DESENFUMAGE",
    caracteristiques: Object.keys(c).length ? c : null,
  };
}

function ids(etab: EtablissementMatching, eqs: EquipementMatching[]): string[] {
  return determineObligationsApplicables(etab, eqs).map((a) => a.obligation.id);
}

describe("MS 73 § 2 — la triennale SSI ne vise que les catégories A et B", () => {
  it("« oui » : la triennale est servie", () => {
    expect(ids(erp("N3"), [alarme(true)])).toContain(SSI_TRIENNALE);
  });

  it("pas répondu : la triennale reste servie (ligne publiée, criticité 4)", () => {
    expect(ids(erp("N3"), [alarme(undefined)])).toContain(SSI_TRIENNALE);
  });

  it("« non » : la triennale est retirée, l'annuelle reste", () => {
    const res = ids(erp("N3"), [alarme(false)]);
    expect(res).not.toContain(SSI_TRIENNALE);
    expect(res).toContain(SSI_ANNUELLE);
  });

  it("5ᵉ catégorie : pas de triennale, même sur un « oui » (livre II)", () => {
    expect(ids(erp("N5"), [alarme(true)])).not.toContain(SSI_TRIENNALE);
  });
});

describe("DF 10 § 3 — triennale du désenfumage mécanique en présence d'un SSI A/B", () => {
  it("mécanique « oui » et SSI A/B « oui » : la triennale est servie, par organisme agréé", () => {
    const res = determineObligationsApplicables(erp("N2"), [desenfumage(true, true)]);
    const tri = res.find((a) => a.obligation.id === DF_TRIENNALE);
    expect(tri).toBeDefined();
    expect(tri?.obligation.periodicite).toBe("triennale");
    expect(tri?.obligation.realisateurs).toEqual(["organisme_agree"]);
  });

  it("mécanique « oui », SSI A/B pas répondu : la triennale est servie", () => {
    expect(ids(erp("N2"), [desenfumage(true, undefined)])).toContain(DF_TRIENNALE);
  });

  it("mécanique « oui », SSI A/B « non » : pas de triennale", () => {
    expect(ids(erp("N2"), [desenfumage(true, false)])).not.toContain(DF_TRIENNALE);
  });

  it("mécanique pas répondu : pas de triennale, même avec un SSI A/B déclaré", () => {
    expect(ids(erp("N2"), [desenfumage(undefined, true)])).not.toContain(DF_TRIENNALE);
    expect(ids(erp("N2"), [desenfumage(undefined, undefined)])).not.toContain(DF_TRIENNALE);
  });

  it("mécanique « non » (désenfumage naturel) : pas de triennale", () => {
    expect(ids(erp("N2"), [desenfumage(false, true)])).not.toContain(DF_TRIENNALE);
  });

  it("le cumul : l'annuelle du § 2 reste servie quelle que soit la réponse", () => {
    for (const mecanique of [true, false, undefined]) {
      for (const ssiAB of [true, false, undefined]) {
        expect(
          ids(erp("N2"), [desenfumage(mecanique, ssiAB)]),
          `mécanique=${mecanique} ssiAB=${ssiAB}`,
        ).toContain(DF_ANNUELLE);
      }
    }
  });

  it("5ᵉ catégorie : pas de triennale (DF 10 est au livre II)", () => {
    expect(ids(erp("N5"), [desenfumage(true, true)])).not.toContain(DF_TRIENNALE);
  });

  it("établissement de travail seul : pas de triennale", () => {
    const travail: EtablissementMatching = {
      ...erp(null),
      estERP: false,
      typeErp: null,
    };
    expect(ids(travail, [desenfumage(true, true)])).not.toContain(DF_TRIENNALE);
  });

  it("LIMITE ASSUMÉE : c'est la réponse posée sur le désenfumage qui décide, pas celle de l'alarme", () => {
    // Le moteur n'évalue que l'appareil déclencheur. Un « oui » sur l'alarme ne
    // rattrape pas un « non » sur le désenfumage — et réciproquement.
    expect(
      ids(erp("N2"), [alarme(true), desenfumage(true, false)]),
    ).not.toContain(DF_TRIENNALE);
    expect(
      ids(erp("N2"), [alarme(false), desenfumage(true, true)]),
    ).toContain(DF_TRIENNALE);
  });
});

describe("questions à trois états — où elles se posent", () => {
  it("le désenfumage porte les deux questions de DF 10 § 3 en ERP, aucune hors ERP", () => {
    const champs = (estERP?: boolean) =>
      questionsTriEtatPour("DESENFUMAGE", estERP).map((q) => q.champ);
    expect(champs(true)).toEqual(
      expect.arrayContaining(["estDesenfumageMecanique", "etablissementASsiCategorieAouB"]),
    );
    expect(champs(false)).not.toContain("estDesenfumageMecanique");
    expect(champs(false)).not.toContain("etablissementASsiCategorieAouB");
  });

  it("l'alarme porte la question A/B en ERP", () => {
    expect(questionsTriEtatPour("ALARME_INCENDIE", true).map((q) => q.champ)).toContain(
      "estSsiCategorieAouB",
    );
  });

  it("une réponse hors de sa catégorie est refusée", () => {
    const res = equipementSchema.safeParse({
      libelle: "Extracteur",
      categorie: "ALARME_INCENDIE",
      estDesenfumageMecanique: "oui",
    });
    expect(res.success).toBe(false);
  });

  it("« Je ne sais pas encore » se lit comme une absence, jamais comme un « non »", () => {
    const res = equipementSchema.safeParse({
      libelle: "Désenfumage",
      categorie: "DESENFUMAGE",
      estDesenfumageMecanique: "",
      etablissementASsiCategorieAouB: "",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.estDesenfumageMecanique).toBeUndefined();
      expect(res.data.etablissementASsiCategorieAouB).toBeUndefined();
    }
  });
});
