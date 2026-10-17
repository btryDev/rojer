import { describe, expect, it } from "vitest";
import {
  illustrationBatiment,
  sourceIllustrationBatiment,
} from "./illustration";

const base = {
  typeErp: null as string | null,
  typesErpAutres: [] as string[],
  codeNaf: null as string | null,
  entreprise: { codeNaf: "70.22Z" },
};

describe("illustrationBatiment", () => {
  it("donne la devanture aux magasins (type ERP M)", () => {
    expect(illustrationBatiment({ ...base, typeErp: "M" })).toBe("commerce");
  });

  it("donne la devanture aux restaurants (type ERP N)", () => {
    expect(illustrationBatiment({ ...base, typeErp: "N" })).toBe("commerce");
  });

  it("laisse les bureaux (type ERP W) sur la planche neutre", () => {
    expect(illustrationBatiment({ ...base, typeErp: "W" })).toBe("neutre");
  });

  it("laisse les types ERP hors périmètre sur la planche neutre", () => {
    for (const type of ["U", "R", "L", "PA", "CTS"]) {
      expect(illustrationBatiment({ ...base, typeErp: type })).toBe("neutre");
    }
  });

  it("retombe sur le code NAF quand aucun type ERP n'est déclaré", () => {
    // Un établissement soumis au seul régime « travail » n'a pas de type ERP.
    expect(illustrationBatiment({ ...base, codeNaf: "47.11Z" })).toBe(
      "commerce",
    );
    expect(illustrationBatiment({ ...base, codeNaf: "56.10A" })).toBe(
      "commerce",
    );
    expect(illustrationBatiment({ ...base, codeNaf: "70.22Z" })).toBe("neutre");
  });

  it("lit la division quelle que soit l'écriture du code NAF", () => {
    expect(illustrationBatiment({ ...base, codeNaf: "4711Z" })).toBe(
      "commerce",
    );
    expect(illustrationBatiment({ ...base, codeNaf: "47.11 Z" })).toBe(
      "commerce",
    );
  });

  it("se rabat sur le code NAF de l'entreprise faute de celui de l'établissement", () => {
    expect(
      illustrationBatiment({
        ...base,
        codeNaf: null,
        entreprise: { codeNaf: "56.10C" },
      }),
    ).toBe("commerce");
  });

  it("préfère le type ERP au code NAF quand les deux sont là", () => {
    // Le régime déclaré prime : un code NAF de commerce ne fait pas d'un
    // établissement de type W une devanture.
    expect(
      illustrationBatiment({ ...base, typeErp: "W", codeNaf: "47.11Z" }),
    ).toBe("neutre");
  });

  it("ne renvoie jamais de vide : tout le reste est neutre", () => {
    expect(illustrationBatiment(base)).toBe("neutre");
    expect(
      illustrationBatiment({ ...base, entreprise: { codeNaf: "" } }),
    ).toBe("neutre");
  });
});

describe("sourceIllustrationBatiment", () => {
  it("pointe vers les planches livrées", () => {
    expect(sourceIllustrationBatiment("neutre")).toBe(
      "/illustrations/batiment-neutre.png",
    );
    expect(sourceIllustrationBatiment("commerce")).toBe(
      "/illustrations/batiment-commerce.png",
    );
  });
});

describe("plusieurs types d'ERP (ADR-045)", () => {
  it("un hôtel qui exploite un restaurant a une devanture, quel que soit l'ordre", () => {
    expect(illustrationBatiment({ ...base, typeErp: "O", typesErpAutres: ["N"] })).toBe(
      illustrationBatiment({ ...base, typeErp: "N", typesErpAutres: ["O"] }),
    );
    expect(illustrationBatiment({ ...base, typeErp: "W", typesErpAutres: ["N"] })).toBe("commerce");
  });
});
