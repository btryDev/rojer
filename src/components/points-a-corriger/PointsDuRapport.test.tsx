// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PointsDuRapport } from "./PointsDuRapport";

afterEach(cleanup);

const point = (over: Record<string, unknown>) => ({
  id: "p",
  libelle: "Remplacer le BAES",
  statut: "ouverte" as const,
  leveeLe: null,
  leveeCommentaire: null,
  leveeFichierNom: null,
  ...over,
});

describe("PointsDuRapport — sous un rapport du registre (ADR-048, lot 3)", () => {
  it("dit la correction (date, ce qui a été fait, pièce) ou « à corriger »", () => {
    render(
      <PointsDuRapport
        electricite={false}
        points={[
          point({ id: "a" }),
          point({
            id: "b",
            libelle: "Nettoyer le pictogramme",
            statut: "levee",
            leveeLe: new Date("2026-10-20T10:00:00Z"),
            leveeCommentaire: "Fait par l'électricien",
            leveeFichierNom: "facture.pdf",
          }),
        ]}
      />,
    );
    expect(screen.getAllByText(/à corriger$/).length).toBeGreaterThan(0);
    expect(screen.getByText(/corrigé le .* : Fait par l'électricien/)).toBeTruthy();
    // La pièce s'ouvre depuis le registre (2026-10-25).
    expect(screen.getByRole("link", { name: "(pièce jointe)" }).getAttribute("href")).toBe("/api/points/b/piece");
  });

  it("dit « en cours » pour un point en cours, comme sa fiche", () => {
    render(<PointsDuRapport electricite={false} points={[point({ statut: "en_cours" })]} />);
    expect(screen.getByText(/en cours$/)).toBeTruthy();
  });

  it("tait un point abandonné, et cite R. 4226-19 pour l'électricité seulement", () => {
    const { container, rerender } = render(
      <PointsDuRapport electricite points={[point({ statut: "abandonnee" })]} />,
    );
    expect(container.textContent).toBe("");
    rerender(<PointsDuRapport electricite points={[point({})]} />);
    expect(screen.getByText(/R\. 4226-19/)).toBeTruthy();
    rerender(<PointsDuRapport electricite={false} points={[point({})]} />);
    expect(screen.queryByText(/R\. 4226-19/)).toBeNull();
  });
});
