// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/lib/rapports/actions", () => ({}));
const { UploadRapportForm } = await import("./UploadRapportForm");

// Le switch « En interne / Par un prestataire » (2026-11-04). La porte qui
// tient vraiment est au serveur (`rapports/actions.test.ts`) ; celle-ci dit au
// dirigeant, avant l'envoi, quand le fichier est demandé.

afterEach(cleanup);

const action = async () => ({ status: "idle" as const });
const fichier = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[name="fichier"]')!;
const faitPar = (c: HTMLElement) => c.querySelector<HTMLInputElement>('input[name="faitPar"]')!;

describe("UploadRapportForm : qui a fait la vérification", () => {
  it("l'exploitant peut la faire : ouvre sur « En interne », fichier facultatif", () => {
    const { container } = render(<UploadRapportForm action={action} faitParDefaut="interne" />);
    expect(faitPar(container).value).toBe("interne");
    expect(fichier(container).required).toBe(false);
    expect(screen.getByRole("radio", { name: "En interne" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Enregistrer la vérification" })).toBeTruthy();
  });

  it("passer à « Par un prestataire » rend le rapport obligatoire", () => {
    const { container } = render(<UploadRapportForm action={action} faitParDefaut="interne" />);
    fireEvent.click(screen.getByRole("radio", { name: "Par un prestataire" }));
    expect(faitPar(container).value).toBe("prestataire");
    expect(fichier(container).required).toBe(true);
  });

  it("un prestataire attitré fait ouvrir sur « Par un prestataire »", () => {
    const { container } = render(
      <UploadRapportForm action={action} faitParDefaut="interne" organismeParDefaut="Apave" />,
    );
    expect(faitPar(container).value).toBe("prestataire");
    expect(fichier(container).required).toBe(true);
  });

  it("un tiers exigé : pas de choix, le rapport est obligatoire", () => {
    const { container } = render(<UploadRapportForm action={action} faitParDefaut={null} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(faitPar(container).value).toBe("prestataire");
    expect(fichier(container).required).toBe(true);
  });
});
