// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Les actions serveur ne sont pas appelées ici : l'écran est tenu sur ce qu'il
// PROPOSE, qui doit suivre le compte du serveur (2026-09-15).
vi.mock("@/lib/prescriptions/actions", () => ({
  leverPrescription: vi.fn(),
  reactiverPrescription: vi.fn(),
  supprimerPrescription: vi.fn(),
}));

const { PrescriptionActions } = await import("./PrescriptionActions");

afterEach(cleanup);

const rendre = (estLevee: boolean, lignesAvecPreuve: number) =>
  render(
    <PrescriptionActions
      etablissementId="etab-1"
      prescriptionId="presc-1"
      estLevee={estLevee}
      lignesAvecPreuve={lignesAvecPreuve}
      dateDocument="2025-12-01"
      effet="renforce_periodicite"
    />,
  );

describe("PrescriptionActions — la suppression suit le compte du serveur", () => {
  it("une prescription LEVÉE sans preuve sous l'acte propose la suppression", () => {
    // Levée, l'écran n'offrait qu'« Annuler la levée », alors que le serveur
    // accepte désormais cette suppression.
    rendre(true, 0);
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Annuler la levée" })).toBeTruthy();
  });

  it("refusée, elle dit pourquoi — la période de l'acte — et ne dit pas « levez-la » à une levée", () => {
    rendre(true, 2);
    expect(screen.queryByRole("button", { name: "Supprimer" })).toBeNull();
    const raison = screen.getByText(/Suppression indisponible/).textContent ?? "";
    expect(raison).toContain("du 01/12/2025 ou après");
    expect(raison).not.toMatch(/levez-la/i);
  });

  it("en vigueur et refusée, elle renvoie à la levée", () => {
    rendre(false, 1);
    const raison = screen.getByText(/Suppression indisponible/).textContent ?? "";
    expect(raison).toContain("du 01/12/2025 ou après");
    expect(raison).toMatch(/levez-la/);
  });
});
