// @vitest-environment jsdom
//
// La ligne de « Ce qui doit être en place » cite l'article qui la fonde
// (2026-09-27). Cet écran était le seul où une obligation ne citait pas son
// texte (C40) ; ce test empêche la pastille de repartir sans bruit.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

vi.mock("@/lib/etats-permanents/actions", () => ({
  declarerEnPlace: vi.fn(),
  retirerDeclaration: vi.fn(),
}));

import { LigneEtat } from "./LigneEtat";

afterEach(cleanup);

const base = {
  etablissementId: "etab-1",
  obligationId: "org-cse",
  libelle: "Comité social et économique",
  mode: "etat" as const,
  pieceAttendue: null,
  declareLe: null,
};

describe("LigneEtat — l'article sous le libellé", () => {
  it("affiche la référence, et le texte de l'article au dépli", () => {
    const { getByText, container } = render(
      <LigneEtat
        {...base}
        fondement={{
          reference: "L. 2311-2",
          href: "https://www.legifrance.gouv.fr/x",
          extrait: "Un comité social et économique est mis en place.",
        }}
      />,
    );
    fireEvent.click(getByText("L. 2311-2"));
    expect(container.textContent).toContain(
      "Un comité social et économique est mis en place.",
    );
  });

  it("sans adresse ni texte, la référence s'écrit en clair — jamais un bouton mort", () => {
    const { container } = render(
      <LigneEtat
        {...base}
        fondement={{ reference: "R. 0000-0", href: null, extrait: null }}
      />,
    );
    expect(container.textContent).toContain("R. 0000-0");
    expect(container.querySelectorAll("button")).toHaveLength(1); // le geste seul
  });
});
