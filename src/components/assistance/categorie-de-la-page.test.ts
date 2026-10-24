import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/assistance/actions", () => ({ demanderAssistance: vi.fn() }));
const { categorieDeLaPage } = await import("./DemandeAide");

describe("la catégorie d'une demande ouverte depuis le rail", () => {
  it("suit la page", () => {
    expect(categorieDeLaPage("/etablissements/e1/prestataires/p1")).toBe("prestataire");
    expect(categorieDeLaPage("/duerp/d1/risques")).toBe("duerp");
    expect(categorieDeLaPage("/etablissements/e1/perimetre")).toBe("hors_couverture");
    expect(categorieDeLaPage("/etablissements/e1/equipements/q1/controles/v1")).toBe("rapport");
    expect(categorieDeLaPage("/etablissements/e1/controle")).toBe("commission_securite");
  });

  it("retombe sur « autre » ailleurs", () => {
    expect(categorieDeLaPage("/etablissements/e1")).toBe("autre");
    expect(categorieDeLaPage(null)).toBe("autre");
  });
});
