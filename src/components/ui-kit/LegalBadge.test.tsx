// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LegalBadge, Textes } from "./LegalBadge";

// Le composant commun de toutes les sources d'article : un livre, replié
// (2026-10-28). On tient ce qu'il affiche, ce qu'il annonce au lecteur
// d'écran, et le regroupement de plusieurs sources sous un seul livre.

afterEach(cleanup);

const REFERENCE =
  "R. 157-1, 1° (obligation de détenir un défibrillateur automatisé externe dans les ERP des catégories 1 à 4)";

describe("LegalBadge — le droit derrière un livre (2026-10-28)", () => {
  it("le bouton dit « Texte », la référence complète reste au nom accessible", () => {
    render(<LegalBadge charte="board" reference={REFERENCE} href="https://www.legifrance.gouv.fr/x" />);
    const bouton = screen.getByRole("button");
    expect(bouton.textContent).toBe("Texte");
    expect(bouton.getAttribute("aria-label")).toBe(`Texte : ${REFERENCE}`);
    expect(bouton.textContent).not.toContain("§");
  });

  it("la référence s'imprime en tête du panneau, une fois déplié", () => {
    render(<LegalBadge charte="board" reference="Art. R. 4224-14 CT" href="https://www.legifrance.gouv.fr/x" />);
    expect(screen.queryByText("Art. R. 4224-14 CT")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Art. R. 4224-14 CT")).toBeTruthy();
  });

  it("`libelle` remplace « Texte »", () => {
    render(<LegalBadge charte="board" reference="GN 10" libelle="GN 10" href="https://www.legifrance.gouv.fr/x" />);
    expect(screen.getByRole("button").textContent).toBe("GN 10");
  });
});

describe("Textes — plusieurs sources sous un seul livre", () => {
  it("un seul bouton ; au dépli, chaque source avec sa référence et son lien", () => {
    render(
      <Textes>
        <LegalBadge charte="board" reference="Art. R. 4512-6 CT" href="https://www.legifrance.gouv.fr/a" />
        <LegalBadge charte="board" reference="Arrêté du 19 mars 1993" extrait="Un plan de prévention est établi par écrit" />
      </Textes>,
    );
    const boutons = screen.getAllByRole("button");
    expect(boutons).toHaveLength(1);
    expect(boutons[0].textContent).toBe("Textes");
    fireEvent.click(boutons[0]);
    expect(screen.getByText("Art. R. 4512-6 CT")).toBeTruthy();
    expect(screen.getByText("Arrêté du 19 mars 1993")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    // Toujours un seul bouton : les sources n'en ajoutent pas.
    expect(screen.getAllByRole("button")).toHaveLength(1);
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
