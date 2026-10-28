// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { WhyCard } from "./WhyCard";
import { LegalBadge, Textes } from "./LegalBadge";

// Une explication se replie derrière un « ? » ; un avertissement, un fait
// acquis et ce qu'il faut lire avant d'agir restent à l'écran (2026-10-28).

afterEach(cleanup);

describe("WhyCard en board — ce qui se replie", () => {
  it("`info` : une ligne « ? + titre », intitulé de section ; le corps est dans la modal", () => {
    render(
      <WhyCard charte="board" kicker="Pourquoi" titre="Protéger les deux parties" enjeu="Une phrase d'enjeu.">
        <p>Le corps.</p>
      </WhyCard>,
    );
    expect(screen.getByRole("heading", { name: "Protéger les deux parties" })).toBeTruthy();
    expect(screen.queryByText("Une phrase d'enjeu.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Protéger les deux parties" }));
    expect(screen.getByText("Une phrase d'enjeu.")).toBeTruthy();
    expect(screen.getByText("Le corps.")).toBeTruthy();
  });

  it.each(["alerte", "ok"] as const)("`%s` : la carte reste ouverte", (tonalite) => {
    render(<WhyCard charte="board" tonalite={tonalite} titre="Titre" enjeu="Visible tout de suite." />);
    expect(screen.getByText("Visible tout de suite.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("`replie={false}` : la carte reste ouverte même en `info`", () => {
    render(<WhyCard charte="board" replie={false} titre="Ce que vous signez" enjeu="Le document signé." />);
    expect(screen.getByText("Le document signé.")).toBeTruthy();
  });

  it("dans la modal, le livre « Textes » se présente ouvert", () => {
    render(
      <WhyCard charte="board" titre="Pourquoi">
        <Textes>
          <LegalBadge charte="board" reference="Art. R. 4512-6 CT" href="https://www.legifrance.gouv.fr/a" />
        </Textes>
      </WhyCard>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pourquoi" }));
    expect(screen.getByText("Art. R. 4512-6 CT")).toBeTruthy();
  });
});
