// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { EtablissementForm } from "./EtablissementForm";
import { AIDE_TYPE_ERP } from "@/lib/etablissements/aide-type-erp";

// Sous-lot D, 2026-10-17 : l'aide par type d'ERP sous le choix du type, sur la
// fiche — pour le type principal et pour les autres types, et seulement eux.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const entreprise = { id: "ent", effectif: 10 };

function fiche(typeErp: string, typesErpAutres: string[] = [], categorieErp = "N3") {
  return render(
    <EtablissementForm
      action={action}
      libelleSubmit="Enregistrer"
      entreprise={entreprise}
      valeursInitiales={{
        raisonDisplay: "Établissement",
        estEtablissementTravail: true,
        estERP: true,
        typeErp,
        typesErpAutres,
        categorieErp,
      }}
    />,
  );
}

const aides = (c: HTMLElement) => [...c.querySelectorAll("[data-type-erp]")].map((p) => p.getAttribute("data-type-erp"));

describe("fiche établissement : l'aide du type d'ERP", () => {
  it("type T : son aide s'affiche, mot pour mot", () => {
    const { container } = fiche("T");
    expect(aides(container)).toEqual(["T"]);
    expect(container.textContent).toContain(AIDE_TYPE_ERP.T);
  });

  it("T en autre type d'un restaurant : l'aide de T aussi", () => {
    expect(aides(fiche("N", ["T"]).container)).toEqual(["T"]);
  });

  it("elle est placée SOUS le champ Catégorie (contrôle visuel du 2026-10-17)", () => {
    const { container } = fiche("T");
    const categorie = container.querySelector('select[name="categorieErp"]')!;
    const aide = container.querySelector("[data-aide-types-erp]")!;
    expect(categorie.compareDocumentPosition(aide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("un type sans aide : rien", () => {
    expect(aides(fiche("N").container)).toEqual([]);
  });

  it("en 5ᵉ catégorie, rien ; elle apparaît quand la catégorie passe en N3 (contrôle visuel du 2026-10-17)", () => {
    const { container } = fiche("T", [], "N5");
    expect(aides(container)).toEqual([]);
    fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="categorieErp"]')!, { target: { value: "N3" } });
    expect(aides(container)).toEqual(["T"]);
  });

  it("sans catégorie choisie, rien", () => {
    expect(aides(fiche("T", [], "").container)).toEqual([]);
  });

  it("elle suit le type choisi", () => {
    const { container } = fiche("N");
    fireEvent.change(container.querySelector<HTMLSelectElement>('select[name="typeErp"]')!, { target: { value: "M" } });
    expect(aides(container)).toEqual(["M"]);
  });
});
