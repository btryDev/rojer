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
  const [state, setState] = useState<OnboardingState>({ ...VALEURS_INITIALES, estERP: true, ...initial });
  return <StepTypologie state={state} update={(p) => setState((s) => ({ ...s, ...p }))} errors={{}} blocage={null} />;
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

  it("un type sans aide : rien", () => {
    const { container } = render(<Hote initial={{ typeErp: "N" }} />);
    expect(aides(container)).toEqual([]);
  });

  it("elle suit le type choisi", () => {
    const { container } = render(<Hote initial={{ typeErp: "N" }} />);
    fireEvent.change(container.querySelector<HTMLSelectElement>("#typeErp")!, { target: { value: "M" } });
    expect(aides(container)).toEqual(["M"]);
  });
});
