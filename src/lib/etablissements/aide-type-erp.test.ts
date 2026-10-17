import { describe, expect, it } from "vitest";
import { CORPUS } from "@/lib/referentiels/corpus";
import { AIDE_TYPE_ERP, aidesDesTypes } from "./aide-type-erp";

// L'aide par type d'ERP (sous-lot D, 2026-10-17) est une ADRESSE : un article
// `non_couvert` qui la donne cite sa phrase mot pour mot, et chaque aide a au
// moins un article qui la donne.

const ADRESSE = /`AIDE_TYPE_ERP\.([A-Z]+)`\)?\s*:\s*«\s*([\s\S]+?)\s*»\s*$/;

type Aides = Partial<Record<string, string>>;

/** Les articles dont l'adresse « aide du type » ne se résout pas dans `aides`. */
function adressesMortes(aides: Aides): string[] {
  return CORPUS.flatMap((c) => c.articles).flatMap((a) => {
    if (a.statut !== "non_couvert" || !a.declareA) return [];
    const m = ADRESSE.exec(a.declareA);
    if (!m) return [];
    return (aides[m[1]] ?? "").includes(m[2]) ? [] : [a.ref];
  });
}

const adressees = () =>
  new Set(
    CORPUS.flatMap((c) => c.articles).flatMap((a) =>
      a.statut === "non_couvert" && a.declareA ? [ADRESSE.exec(a.declareA)?.[1]].filter(Boolean) : [],
    ),
  );

describe("AIDE_TYPE_ERP — adresse des annonces par type (2026-10-17)", () => {
  it("toute adresse « aide du type » se résout mot pour mot", () => {
    expect(adressesMortes(AIDE_TYPE_ERP)).toEqual([]);
  });

  it("borne basse : les articles annoncés par le sous-lot D la donnent", () => {
    const refs = CORPUS.flatMap((c) => c.articles)
      .filter((a) => a.statut === "non_couvert" && ADRESSE.test(a.declareA ?? ""))
      .map((a) => a.ref);
    expect(refs).toEqual(expect.arrayContaining(["M 35", "T 29", "T 33", "T 43", "T 44", "T 52 § 2 — nettoyage quotidien des locaux"]));
  });

  it("chaque aide a au moins un article qui la donne pour adresse", () => {
    const vues = adressees();
    expect(Object.keys(AIDE_TYPE_ERP).filter((t) => !vues.has(t))).toEqual([]);
  });

  it("cassure : l'aide du type T réécrite laisse ses articles sans adresse", () => {
    const casse = { ...AIDE_TYPE_ERP, T: AIDE_TYPE_ERP.T!.replace("le nettoyage quotidien", "le nettoyage") };
    expect(adressesMortes(casse)).toContain("T 52 § 2 — nettoyage quotidien des locaux");
  });

  it("chaque phrase dit ce que Rojer ne suit pas, sans qualifier", () => {
    for (const [t, aide] of Object.entries(AIDE_TYPE_ERP)) {
      expect(aide, t).toMatch(/Rojer ne suit pas /);
      expect(aide!.toLowerCase(), t).not.toMatch(/conforme|en infraction|en règle|vous devez/);
    }
  });

  it("T 43 et T 44 sont à la charge de l'exposant, et la phrase le dit (revue de D)", () => {
    expect(AIDE_TYPE_ERP.T).toContain("la demande d'autorisation, adressée par l'exposant,");
    expect(AIDE_TYPE_ERP.T).toContain("faite par l'exposant");
  });

  it("le type X n'a pas encore d'aide : emplacement réservé au lot « filtre à l'accueil »", () => {
    expect(AIDE_TYPE_ERP.X).toBeUndefined();
  });
});

describe("aidesDesTypes — l'aide n'apparaît que pour un type déclaré", () => {
  it("T déclaré en principal ou en autre type : son aide, une fois", () => {
    expect(aidesDesTypes(["T"]).map((a) => a.type)).toEqual(["T"]);
    expect(aidesDesTypes(["N", "T"]).map((a) => a.type)).toEqual(["T"]);
    expect(aidesDesTypes(["T", "T"]).map((a) => a.type)).toEqual(["T"]);
  });

  it("sans T ni M : rien", () => {
    expect(aidesDesTypes(["N", "W", null, "", undefined])).toEqual([]);
  });

  it("l'ordre est celui de la déclaration", () => {
    expect(aidesDesTypes(["T", "M"]).map((a) => a.type)).toEqual(["T", "M"]);
  });
});
