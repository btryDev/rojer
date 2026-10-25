// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { EtapesMiseEnPlace, type EtapeOnboarding } from "./OnboardingChecklist";

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
  return render(<EtapesMiseEnPlace etapes={etapes} />)
    .container;
}

describe("étapes de mise en place (la fenêtre de la fiche du hero)", () => {
  it("dit l'avancement et liste toutes les étapes, la prochaine en avant", () => {
    const c = rendu([etape("a", true), etape("b", false), etape("c", false)]);
    expect(c.textContent).toContain("1 étape faite sur 3");
    const lignes = [...c.querySelectorAll("li")];
    expect(lignes).toHaveLength(3);
    // La prochaine porte le bouton plein, les suivantes le clair.
    expect(lignes[1].textContent).toContain("Y aller");
  });

  it("une étape faite ne propose plus son geste", () => {
    const c = rendu([etape("a", true), etape("b", false)]);
    expect(c.querySelectorAll("li")[0].textContent).not.toContain("Y aller");
  });
});
