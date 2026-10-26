// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { StepTypologie } from "./StepTypologie";
import { VALEURS_INITIALES, type OnboardingState } from "./types";
import { QUESTION_ACCUEIL_ENFANTS } from "@/lib/etablissements/types-refuses";

// Filtre à l'accueil (2026-10-17) : la question R n'apparaît qu'au type R ;
// le refus se lit sous le champ qu'il vise.

afterEach(cleanup);

function Hote({ initial }: { initial: Partial<OnboardingState> }) {
  const [state, setState] = useState<OnboardingState>({ ...VALEURS_INITIALES, estERP: true, categorieErp: "N3", ...initial });
  return <StepTypologie state={state} update={(p) => setState((s) => ({ ...s, ...p }))} errors={{}} blocage={null} entreprisesConnues={[]} />;
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
    // Revue du 2026-10-17, C5 : de retour à R, la question revient VIDE — la
    // réponse est partie avec le type.
    fireEvent.change(container.querySelector<HTMLSelectElement>("#typeErp")!, { target: { value: "R" } });
    expect(container.querySelector<HTMLSelectElement>("#accueilEnfants")!.value).toBe("");
  });

  // ~~« le refus d'un type J se lit à l'étape »~~ — revue du 2026-10-17 : il
  // injectait lui-même `blocage`, et passait quand le vrai parcours ne
  // montrait rien. Remplacé par les tests sur `WizardShell`.
});
