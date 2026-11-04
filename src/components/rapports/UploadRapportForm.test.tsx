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
/** La valeur envoyée : le radio coché, ou le champ caché quand il n'y a pas de choix. */
const faitPar = (c: HTMLElement) =>
  c.querySelector<HTMLInputElement>('input[name="faitPar"]:checked, input[type="hidden"][name="faitPar"]')!;

describe("UploadRapportForm : qui a fait la vérification", () => {
  it("l'exploitant peut la faire : ouvre sur « En interne », fichier facultatif", () => {
    const { container } = render(<UploadRapportForm action={action} faitParDefaut="interne" />);
    expect(faitPar(container).value).toBe("interne");
    expect(fichier(container).required).toBe(false);
    expect((screen.getByRole("radio", { name: "En interne" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Enregistrer la vérification" })).toBeTruthy();
  });

  it("passer à « Par un prestataire » rend le rapport obligatoire", () => {
    const { container } = render(<UploadRapportForm action={action} faitParDefaut="interne" />);
    fireEvent.click(screen.getByRole("radio", { name: "Par un prestataire" }));
    expect(faitPar(container).value).toBe("prestataire");
    expect(fichier(container).required).toBe(true);
  });

  it("changer de mode garde le champ du fichier, donc le fichier choisi", () => {
    const { container } = render(<UploadRapportForm action={action} faitParDefaut="interne" />);
    const avant = fichier(container);
    fireEvent.click(screen.getByRole("radio", { name: "Par un prestataire" }));
    fireEvent.click(screen.getByRole("radio", { name: "En interne" }));
    expect(fichier(container)).toBe(avant);
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
