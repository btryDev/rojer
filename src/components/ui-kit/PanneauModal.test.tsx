// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PanneauModal } from "./PanneauModal";

afterEach(cleanup);

function panneau(largeur?: "normale" | "large") {
  render(
    <PanneauModal ouvert surFermer={() => {}} surtitre="S" titre="T" largeur={largeur}>
      <p>Corps</p>
    </PanneauModal>,
  );
  return screen.getByText("Corps").closest("[data-largeur]") as HTMLElement;
}

describe("PanneauModal — largeur", () => {
  it("par défaut, 600 px : AideEcran et DemandeAide ne bougent pas", () => {
    const p = panneau();
    expect(p.dataset.largeur).toBe("normale");
    expect(p.className).toContain("max-w-[600px]");
  });

  it("`large` : 880 px, et toujours défilant", () => {
    const p = panneau("large");
    expect(p.className).toContain("max-w-[880px]");
    expect(p.className).not.toContain("max-w-[600px]");
    expect(p.className).toContain("overflow-y-auto");
    expect(p.className).toContain("max-h-[85vh]");
  });
});

describe("PanneauModal — focus", () => {
  it("un re-rendu avec une nouvelle fonction de fermeture ne vole pas le focus", async () => {
    const { rerender } = render(
      <PanneauModal ouvert surFermer={() => {}} surtitre="S" titre="T">
        <input aria-label="case" type="checkbox" />
      </PanneauModal>,
    );
    const champ = screen.getByLabelText("case");
    champ.focus();
    rerender(
      <PanneauModal ouvert surFermer={() => {}} surtitre="S" titre="T">
        <input aria-label="case" type="checkbox" />
      </PanneauModal>,
    );
    expect(document.activeElement).toBe(champ);
  });
});
