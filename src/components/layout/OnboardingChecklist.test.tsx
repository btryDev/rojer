// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { OnboardingChecklist, type EtapeOnboarding } from "./OnboardingChecklist";

afterEach(cleanup);

const etape = (id: string, faite: boolean): EtapeOnboarding => ({
  id,
  titre: `Étape ${id}`,
  pourquoi: "",
  faite,
});

function rendu(etapes: EtapeOnboarding[]) {
  return render(<OnboardingChecklist etapes={etapes} etablissementRaison="Le Bistrot" />)
    .container;
}

describe("guide de mise en place : en deux temps", () => {
  it("toutes les étapes sont derrière le bouton, faites comprises", () => {
    const c = rendu([etape("a", true), etape("b", false), etape("c", false)]);
    const aPlat = [...c.querySelectorAll("li")].filter((li) => !li.closest("details"));
    expect(aPlat).toHaveLength(0);
    expect(c.querySelectorAll("details li")).toHaveLength(3);
    expect(c.querySelector("summary")?.textContent).toContain("Voir les étapes · 2 à faire");
  });

  it("disparaît quand tout est fait", () => {
    expect(rendu([etape("a", true)]).textContent).toBe("");
  });
});
