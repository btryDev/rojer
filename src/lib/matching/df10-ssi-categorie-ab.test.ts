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

function erp(
  categorieErp: EtablissementMatching["categorieErp"],
  ssiCategorieAouB: boolean | null = null,
): EtablissementMatching {
  return {
    id: "etab",
    effectifSurSite: 20,
    effectifEntreprise: 20,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp: "M",
    typesErpAutres: [],
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    manutentionManuelle: null,
    travailSurEcran: null,
    operationsElectriques: null,
    conduiteEngins: null,
    expositionCMR: null,
    epiPresents: null,
    ssiCategorieAouB,
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

function desenfumage(mecanique: TriEtat, ancienneCle?: boolean): EquipementMatching {
  const c: Record<string, unknown> = {};
  if (mecanique !== undefined) c.estDesenfumageMecanique = mecanique;
  // La clé d'avant le 2026-10-12, restée dans le JSON des appareils : inerte.
  if (ancienneCle !== undefined) c.etablissementASsiCategorieAouB = ancienneCle;
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
  // 2026-10-12 : la présence du SSI A/B se lit sur la fiche de l'établissement
  // (`ssiCategorieAouB`), plus sur chaque désenfumage — décision de la
  // propriétaire du 2026-10-08. Mêmes attentes qu'avant, sur le champ neuf.
  it("mécanique « oui » et SSI A/B « oui » : la triennale est servie, par organisme agréé", () => {
    const res = determineObligationsApplicables(erp("N2", true), [desenfumage(true)]);
    const tri = res.find((a) => a.obligation.id === DF_TRIENNALE);
    expect(tri).toBeDefined();
    expect(tri?.obligation.periodicite).toBe("triennale");
    expect(tri?.obligation.realisateurs).toEqual(["organisme_agree"]);
    expect(tri?.sansReponse).toBeUndefined();
  });

  it("mécanique « oui », SSI A/B pas répondu : la triennale est servie « à confirmer », avec la question de la fiche", () => {
    const tri = determineObligationsApplicables(erp("N2", null), [desenfumage(true)]).find(
      (a) => a.obligation.id === DF_TRIENNALE,
    );
    expect(tri).toBeDefined();
    expect(tri?.sansReponse).toEqual(["ssi_categorie_ab"]);
  });

  it("mécanique « oui », SSI A/B « non » : pas de triennale", () => {
    expect(ids(erp("N2", false), [desenfumage(true)])).not.toContain(DF_TRIENNALE);
  });

  it("mécanique pas répondu : pas de triennale, même avec un SSI A/B déclaré", () => {
    expect(ids(erp("N2", true), [desenfumage(undefined)])).not.toContain(DF_TRIENNALE);
    expect(ids(erp("N2", null), [desenfumage(undefined)])).not.toContain(DF_TRIENNALE);
  });

  it("mécanique « non » (désenfumage naturel) : pas de triennale", () => {
    expect(ids(erp("N2", true), [desenfumage(false)])).not.toContain(DF_TRIENNALE);
  });

  it("le cumul : l'annuelle du § 2 reste servie quelle que soit la réponse", () => {
    for (const mecanique of [true, false, undefined]) {
      for (const ssiAB of [true, false, null]) {
        expect(
          ids(erp("N2", ssiAB), [desenfumage(mecanique)]),
          `mécanique=${mecanique} ssiAB=${ssiAB}`,
        ).toContain(DF_ANNUELLE);
      }
    }
  });

  it("5ᵉ catégorie : pas de triennale (DF 10 est au livre II)", () => {
    expect(ids(erp("N5", true), [desenfumage(true)])).not.toContain(DF_TRIENNALE);
  });

  it("établissement de travail seul : pas de triennale", () => {
    const travail: EtablissementMatching = {
      ...erp(null, true),
      estERP: false,
      typeErp: null,
    };
    expect(ids(travail, [desenfumage(true)])).not.toContain(DF_TRIENNALE);
  });

  it("l'ancienne réponse posée sur le désenfumage ne décide plus de rien", () => {
    // Reprise par la migration 20261012140000 ; restée dans le JSON, inerte.
    expect(ids(erp("N2", true), [desenfumage(true, false)])).toContain(DF_TRIENNALE);
    expect(ids(erp("N2", false), [desenfumage(true, true)])).not.toContain(DF_TRIENNALE);
  });

  it("c'est la fiche qui décide de DF 10 § 3 ; la réponse de l'alarme ne décide que de MS 73 § 2", () => {
    // ~~LIMITE ASSUMÉE : c'est la réponse posée sur le désenfumage qui décide,
    // pas celle de l'alarme — test à inverser quand la question passera en
    // champ de l'établissement.~~ [2026-10-12 : passée. La question reste
    // posée deux fois — la fiche (DF 10 § 3) et chaque alarme (MS 73 § 2) — et
    // rien ne vérifie qu'elles concordent ; ce test fixe que chacune ne décide
    // que de sa ligne.]
    const ficheNon = ids(erp("N2", false), [alarme(true), desenfumage(true)]);
    expect(ficheNon).not.toContain(DF_TRIENNALE);
    expect(ficheNon).toContain(SSI_TRIENNALE);
    const ficheOui = ids(erp("N2", true), [alarme(false), desenfumage(true)]);
    expect(ficheOui).toContain(DF_TRIENNALE);
    expect(ficheOui).not.toContain(SSI_TRIENNALE);
  });
});

describe("questions à trois états — où elles se posent", () => {
  it("le désenfumage porte la question « mécanique » en ERP, aucune hors ERP ; plus celle du SSI", () => {
    const champs = (estERP?: boolean) =>
      questionsTriEtatPour("DESENFUMAGE", estERP).map((q) => q.champ as string);
    expect(champs(true)).toEqual(["estDesenfumageMecanique"]);
    expect(champs(false)).toEqual([]);
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
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.estDesenfumageMecanique).toBeUndefined();
    }
  });
});
