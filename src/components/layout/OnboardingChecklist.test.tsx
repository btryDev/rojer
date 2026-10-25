// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { OnboardingChecklist, type EtapeOnboarding } from "./OnboardingChecklist";

afterEach(cleanup);

const etape = (id: string, faite: boolean): EtapeOnboarding => ({
  id,
  titre: `Étape ${id}`,
  pourquoi: "",
  faite,
  href: `/${id}`,
  cta: "Y aller",
});

function rendu(etapes: EtapeOnboarding[]) {
  return render(<OnboardingChecklist etapes={etapes} />)
    .container;
}

describe("guide de mise en place : un bandeau, la prochaine étape d'abord", () => {
  it("le bandeau nomme la prochaine étape ; la liste, repliée, porte toutes les étapes", () => {
    const c = rendu([etape("a", true), etape("b", false), etape("c", false)]);
    expect(c.querySelector("h2")?.textContent).toBe("Prochaine étape : Étape b");
    expect(c.textContent).toContain("étape 2 sur 3");
    const liste = c.querySelector("ol")!.parentElement!;
    expect(liste.hidden).toBe(true);
    expect(c.querySelectorAll("ol li")).toHaveLength(3);
  });

  it("le bouton déplie la liste et le dit", () => {
    const c = rendu([etape("a", false), etape("b", false)]);
    const bouton = c.querySelector("button")!;
    expect(bouton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(bouton);
    expect(bouton.getAttribute("aria-expanded")).toBe("true");
    expect(c.querySelector("ol")!.parentElement!.hidden).toBe(false);
  });

  it("une prochaine étape sans lien (question sur place) ouvre la liste d'emblée", () => {
    const c = rendu([{ ...etape("q", false), href: undefined, cta: undefined, question: <p>La question</p> }]);
    expect(c.querySelector("ol")!.parentElement!.hidden).toBe(false);
    expect(c.textContent).toContain("La question");
  });

  it("disparaît quand tout est fait", () => {
    expect(rendu([etape("a", true)]).textContent).toBe("");
  });
});
