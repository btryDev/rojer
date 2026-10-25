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

describe("guide de mise en place : une étape à la fois", () => {
  it("montre la prochaine étape à plat, les autres derrière le dépliant", () => {
    const c = rendu([etape("a", true), etape("b", false), etape("c", false)]);
    const aPlat = [...c.querySelectorAll("li")].filter((li) => !li.closest("details"));
    expect(aPlat.map((li) => li.textContent)).toEqual([expect.stringContaining("Étape b")]);
    const replies = c.querySelectorAll("details li");
    expect(replies).toHaveLength(2);
    expect(c.querySelector("summary")?.textContent).toContain("Voir les 2 autres étapes");
  });

  it("pas de dépliant pour une étape unique", () => {
    expect(rendu([etape("a", false)]).querySelector("details")).toBeNull();
  });

  it("disparaît quand tout est fait", () => {
    expect(rendu([etape("a", true)]).textContent).toBe("");
  });
});
