import { describe, expect, it } from "vitest";
import { valeursParSource, type EtablissementLu } from "./valeurs-etablissement";

// Le registre, fiche « Établissement recevant du public » (contrôle visuel du
// lot 3, 2026-10-17). Éprouvé en cassant : la catégorie rendue brute — « N3 »,
// comme avant — et le nombre de types rendu à 1 ; chacun rougit ici.

const etab = (over: Partial<EtablissementLu> = {}): EtablissementLu => ({
  adresse: null,
  natureActivite: null,
  typeErp: "N",
  typesErpAutres: [],
  categorieErp: "N3",
  effectifPublicAdmis: null,
  dateAutorisationOuverture: null,
  dateCertificatConformite: null,
  entreprise: { raisonSociale: null, adresse: null },
  ...over,
});

describe("registre — les réponses lues sur l'établissement", () => {
  it("la catégorie se lit « 3ᵉ catégorie », pas « N3 »", () => {
    expect(valeursParSource(etab()).valeurs["Etablissement.categorieErp"]).toBe("3ᵉ catégorie");
    expect(valeursParSource(etab({ categorieErp: "N1" })).valeurs["Etablissement.categorieErp"]).toBe("1ʳᵉ catégorie");
    expect(valeursParSource(etab({ categorieErp: null })).valeurs["Etablissement.categorieErp"]).toBeNull();
  });

  it("les types, et leur nombre", () => {
    const un = valeursParSource(etab());
    expect(un.valeurs["Etablissement.typeErp"]).toBe("N");
    expect(un.nombres["Etablissement.typeErp"]).toBe(1);
    const deux = valeursParSource(etab({ typesErpAutres: ["O"] }));
    expect(deux.valeurs["Etablissement.typeErp"]).toBe("N, O");
    expect(deux.nombres["Etablissement.typeErp"]).toBe(2);
  });
});
