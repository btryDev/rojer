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

  it("l'aide du type X dit, à la suite du code du sport, que les piscines ne sont pas suivies (filtre à l'accueil)", () => {
    expect(AIDE_TYPE_ERP.X).toMatch(/\(code du sport, [^)]*\)\. Rojer ne suit pas non plus les obligations propres aux piscines\.$/);
  });

  it("T 43 et T 44 sont à la charge de l'exposant, et la phrase le dit (revue de D)", () => {
    expect(AIDE_TYPE_ERP.T).toContain("la demande d'autorisation, adressée par l'exposant,");
    expect(AIDE_TYPE_ERP.T).toContain("faite par l'exposant");
  });

  // ~~it("le type X n'a pas encore d'aide : emplacement réservé au lot « filtre
  // à l'accueil »", () => { expect(AIDE_TYPE_ERP.X).toBeUndefined(); });~~ —
  // 2026-10-17, sous-lot E (rebasé sur D) : X porte la phrase du code du sport.
  it("borne basse : les articles du code du sport annoncés par le sous-lot E la donnent (X)", () => {
    const refs = CORPUS.flatMap((c) => c.articles)
      .filter((a) => a.statut === "non_couvert" && ADRESSE.exec(a.declareA ?? "")?.[1] === "X")
      .map((a) => a.ref);
    expect(refs).toEqual(
      expect.arrayContaining([
        "C. sport R. 322-5",
        "C. sport L. 212-8",
        "C. sport L. 321-7",
        "C. sport A. 322-3",
        "Arrêté 2025-05-20 art. 1",
        "Arrêté 2025-05-20 art. 2",
      ]),
    );
  });

  it("cassure : l'aide du type X réécrite laisse le code du sport sans adresse", () => {
    const casse = { ...AIDE_TYPE_ERP, X: AIDE_TYPE_ERP.X!.replace("l'information des pratiquants", "l'information") };
    expect(adressesMortes(casse)).toContain("C. sport A. 322-3");
  });
});

describe("aidesDesTypes — l'aide n'apparaît que pour un type déclaré", () => {
  it("T déclaré en principal ou en autre type : son aide, une fois", () => {
    expect(aidesDesTypes(["T"], "N3").map((a) => a.type)).toEqual(["T"]);
    expect(aidesDesTypes(["N", "T"], "N3").map((a) => a.type)).toEqual(["T"]);
    expect(aidesDesTypes(["T", "T"], "N3").map((a) => a.type)).toEqual(["T"]);
  });

  it("sans T ni M : rien", () => {
    expect(aidesDesTypes(["N", "W", null, "", undefined], "N3")).toEqual([]);
  });

  it("seulement en catégories 1 à 4 : rien en 5ᵉ, rien sans catégorie (contrôle visuel du 2026-10-17)", () => {
    expect(aidesDesTypes(["T", "M"], "N3").map((a) => a.type)).toEqual(["T", "M"]);
    expect(aidesDesTypes(["T", "M"], "N5")).toEqual([]);
    expect(aidesDesTypes(["T", "M"], null)).toEqual([]);
    expect(aidesDesTypes(["T", "M"], "")).toEqual([]);
  });

  it("X, fondée sur le code du sport, s'affiche en toutes catégories — T et M non (sous-lot E, 2026-10-17)", () => {
    expect(aidesDesTypes(["X"], "N5").map((a) => a.type)).toEqual(["X"]);
    expect(aidesDesTypes(["X"], "N2").map((a) => a.type)).toEqual(["X"]);
    expect(aidesDesTypes(["T", "X"], "N5").map((a) => a.type)).toEqual(["X"]);
  });

  it("l'ordre est celui de la déclaration", () => {
    expect(aidesDesTypes(["T", "M"], "N3").map((a) => a.type)).toEqual(["T", "M"]);
  });
});
