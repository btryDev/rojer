import { describe, expect, it } from "vitest";
import { illustrationBatiment } from "./illustration";

const base = {
  typeErp: null as string | null,
  typesErpAutres: [] as string[],
  // Une activité qu'aucun référentiel sectoriel ne vise (NAF 01, culture).
  codeNaf: "01.11Z",
};

describe("illustrationBatiment — le type ERP d'abord", () => {
  it("donne à chaque type qui a sa planche la sienne", () => {
    expect(illustrationBatiment({ ...base, typeErp: "N" })).toBe("restaurant");
    expect(illustrationBatiment({ ...base, typeErp: "M" })).toBe("magasin");
    expect(illustrationBatiment({ ...base, typeErp: "O" })).toBe("hotel");
    expect(illustrationBatiment({ ...base, typeErp: "X" })).toBe("salle-sport");
    expect(illustrationBatiment({ ...base, typeErp: "W" })).toBe("bureaux");
  });

  it("préfère le type ERP au code NAF quand les deux sont là", () => {
    // Le régime déclaré prime : un code NAF de commerce ne fait pas d'un
    // établissement de type W une boutique.
    expect(illustrationBatiment({ ...base, typeErp: "W", codeNaf: "47.11Z" })).toBe("bureaux");
  });

  it("un type sans planche laisse parler le code NAF", () => {
    expect(illustrationBatiment({ ...base, typeErp: "L", codeNaf: "56.10A" })).toBe("restaurant");
    expect(illustrationBatiment({ ...base, typeErp: "L" })).toBe("local");
  });
});

describe("illustrationBatiment — le code NAF ensuite", () => {
  it("suit le référentiel sectoriel que le code désigne", () => {
    // Un établissement soumis au seul régime « travail » n'a pas de type ERP.
    expect(illustrationBatiment({ ...base, codeNaf: "56.10A" })).toBe("restaurant");
    expect(illustrationBatiment({ ...base, codeNaf: "47.11Z" })).toBe("magasin");
    expect(illustrationBatiment({ ...base, codeNaf: "70.22Z" })).toBe("bureaux");
  });

  it("lit le code quelle que soit son écriture", () => {
    expect(illustrationBatiment({ ...base, codeNaf: "4711Z" })).toBe("magasin");
  });


  it("ne renvoie jamais de vide : tout le reste est le local générique", () => {
    expect(illustrationBatiment(base)).toBe("local");
    expect(illustrationBatiment({ ...base, codeNaf: "" })).toBe("local");
  });
});

describe("plusieurs types d'ERP (ADR-045)", () => {
  it("le dessin ne dépend pas de l'ordre de saisie", () => {
    expect(illustrationBatiment({ ...base, typeErp: "O", typesErpAutres: ["N"] })).toBe(
      illustrationBatiment({ ...base, typeErp: "N", typesErpAutres: ["O"] }),
    );
  });

  it("la devanture l'emporte : un hôtel qui exploite un restaurant", () => {
    expect(illustrationBatiment({ ...base, typeErp: "O", typesErpAutres: ["N"] })).toBe("restaurant");
    expect(illustrationBatiment({ ...base, typeErp: "W", typesErpAutres: ["M"] })).toBe("magasin");
  });
});
