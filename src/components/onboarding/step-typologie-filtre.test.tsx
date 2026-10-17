// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { StepTypologie } from "./StepTypologie";
import { VALEURS_INITIALES, type OnboardingState } from "./types";
import { validerTypologie } from "./validation";
import { PHRASE_REFUS_J, QUESTION_ACCUEIL_ENFANTS } from "@/lib/etablissements/types-refuses";

// Filtre à l'accueil (2026-10-17) : la question R n'apparaît qu'au type R ;
// le refus se lit sous le champ qu'il vise.

afterEach(cleanup);

function Hote({ initial, avecBlocage = false }: { initial: Partial<OnboardingState>; avecBlocage?: boolean }) {
  const [state, setState] = useState<OnboardingState>({ ...VALEURS_INITIALES, estERP: true, categorieErp: "N3", ...initial });
  const blocage = avecBlocage ? validerTypologie(state) : null;
  return <StepTypologie state={state} update={(p) => setState((s) => ({ ...s, ...p }))} errors={{}} blocage={blocage} />;
}

describe("accueil : la question de l'accueil d'enfants", () => {
  it("absente pour un restaurant", () => {
    const { container } = render(<Hote initial={{ typeErp: "N" }} />);
    expect(container.querySelector("#accueilEnfants")).toBeNull();
    expect(container.textContent).not.toContain(QUESTION_ACCUEIL_ENFANTS);
  });

  it("posée au type R, et en autre type R", () => {
    expect(render(<Hote initial={{ typeErp: "R" }} />).container.querySelector("#accueilEnfants")).not.toBeNull();
    cleanup();
    expect(render(<Hote initial={{ typeErp: "N", typesErpAutres: ["R"] }} />).container.querySelector("#accueilEnfants")).not.toBeNull();
  });

  it("elle disparaît, et sa réponse avec, quand R quitte la saisie", () => {
    const { container } = render(<Hote initial={{ typeErp: "R", accueilEnfants: "non" }} />);
    fireEvent.change(container.querySelector<HTMLSelectElement>("#typeErp")!, { target: { value: "N" } });
    expect(container.querySelector("#accueilEnfants")).toBeNull();
  });

  it("le refus d'un type J se lit à l'étape", () => {
    const { container } = render(<Hote initial={{ typeErp: "J" }} avecBlocage />);
    expect(container.textContent).toContain(PHRASE_REFUS_J);
  });
});
