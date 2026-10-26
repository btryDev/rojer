// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { StepTypologie } from "./StepTypologie";
import { VALEURS_INITIALES, type OnboardingState } from "./types";
import { AIDE_TYPE_ERP } from "@/lib/etablissements/aide-type-erp";

// Sous-lot D, 2026-10-17 (revue indépendante) : l'aide par type d'ERP à
// l'accueil, sous le choix du type — principal et autres types, et eux seuls.

afterEach(cleanup);

function Hote({ initial }: { initial: Partial<OnboardingState> }) {
  const [state, setState] = useState<OnboardingState>({ ...VALEURS_INITIALES, estERP: true, categorieErp: "N3", ...initial });
  return <StepTypologie state={state} update={(p) => setState((s) => ({ ...s, ...p }))} errors={{}} blocage={null} entreprisesConnues={[]} />;
}

const aides = (c: HTMLElement) => [...c.querySelectorAll("[data-type-erp]")].map((p) => p.getAttribute("data-type-erp"));

describe("accueil : l'aide du type d'ERP", () => {
  it("type T : son aide s'affiche, mot pour mot", () => {
    const { container } = render(<Hote initial={{ typeErp: "T" }} />);
    expect(aides(container)).toEqual(["T"]);
    expect(container.textContent).toContain(AIDE_TYPE_ERP.T);
  });

  it("T en autre type d'un restaurant : l'aide de T", () => {
    const { container } = render(<Hote initial={{ typeErp: "N", typesErpAutres: ["T"] }} />);
    expect(aides(container)).toEqual(["T"]);
  });

  it("elle est placée SOUS le champ Catégorie (contrôle visuel du 2026-10-17)", () => {
    const { container } = render(<Hote initial={{ typeErp: "T" }} />);
    const categorie = container.querySelector("#categorieErp")!;
    const aide = container.querySelector("[data-aide-types-erp]")!;
    expect(categorie.compareDocumentPosition(aide) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("un type sans aide : rien", () => {
    const { container } = render(<Hote initial={{ typeErp: "N" }} />);
    expect(aides(container)).toEqual([]);
  });

  it("N avec M et T en autres types : les deux aides, dans l'ordre", () => {
    const { container } = render(<Hote initial={{ typeErp: "N", typesErpAutres: ["M", "T"] }} />);
    expect(aides(container)).toEqual(["M", "T"]);
  });

  it("non-ERP, T resté en mémoire : rien", () => {
    const { container } = render(<Hote initial={{ estERP: false, typeErp: "T" }} />);
    expect(aides(container)).toEqual([]);
  });

  it("en 5ᵉ catégorie ou sans catégorie, rien (contrôle visuel du 2026-10-17)", () => {
    expect(aides(render(<Hote initial={{ typeErp: "T", categorieErp: "N5" }} />).container)).toEqual([]);
    cleanup();
    expect(aides(render(<Hote initial={{ typeErp: "T", categorieErp: "" }} />).container)).toEqual([]);
  });

  it("elle suit le type choisi", () => {
    const { container } = render(<Hote initial={{ typeErp: "N" }} />);
    fireEvent.change(container.querySelector<HTMLSelectElement>("#typeErp")!, { target: { value: "M" } });
    expect(aides(container)).toEqual(["M"]);
  });
});
