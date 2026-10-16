// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LegalBadge } from "./LegalBadge";

// Le composant commun de toutes les pastilles d'article (second contrôle
// visuel du 2026-10-16). jsdom ne mesure rien : on tient la règle de forme par
// ses classes — aligné à gauche, rayon fixe de bloc en board —, et le lien
// vers la source par ce qu'il annonce au lecteur d'écran.

afterEach(cleanup);

const REFERENCE =
  "R. 157-1, 1° (obligation de détenir un défibrillateur automatisé externe dans les ERP des catégories 1 à 4)";

describe("LegalBadge — la forme d'une référence longue (F2)", () => {
  it("en board : texte aligné à gauche, rayon fixe de bloc, jamais `rounded-full`", () => {
    render(<LegalBadge charte="board" reference={REFERENCE} href="https://www.legifrance.gouv.fr/x" />);
    const bouton = screen.getByRole("button");
    expect(bouton.className).toContain("text-left");
    expect(bouton.className).toContain("rounded-[18px]");
    expect(bouton.className).not.toContain("rounded-full");
  });
});

describe("LegalBadge — le lien vers la source annonce le nouvel onglet (F4)", () => {
  it("« Lire la source officielle » dit au lecteur d'écran qu'il ouvre un onglet", () => {
    render(<LegalBadge charte="board" reference="R. 4224-14" href="https://www.legifrance.gouv.fr/x" />);
    fireEvent.click(screen.getByRole("button"));
    const lien = screen.getByRole("link");
    expect(lien.getAttribute("target")).toBe("_blank");
    expect(lien.textContent).toContain("(nouvel onglet)");
    expect(lien.querySelector(".sr-only")?.textContent).toContain("(nouvel onglet)");
  });
});
