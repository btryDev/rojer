// @vitest-environment jsdom
/**
 * L'activation de la double authentification se joue en trois écrans tenus
 * par l'état du composant. Le piège : confirmer le premier code renouvelle la
 * session, la page se recharge et `active` passe à vrai — les codes de
 * secours, montrés une seule fois, doivent rester à l'écran jusqu'à « J'ai
 * noté mes codes ».
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const CODES = Array.from({ length: 10 }, (_, i) => `code${i}-00000`);

vi.mock("@/lib/auth/actions", () => ({
  activerDoubleAuthAction: vi.fn(async () => ({
    activation: { qr: "data:image/png;base64,AA", cle: "ABCD EFGH", codesSecours: CODES },
  })),
  confirmerDoubleAuthAction: vi.fn(async () => ({ confirmee: true })),
  regenererCodesSecoursAction: vi.fn(async () => ({})),
  desactiverDoubleAuthAction: vi.fn(async () => ({})),
}));

const { DoubleAuthentification } = await import("./DoubleAuthentification");

afterEach(cleanup);

async function cliquer(libelle: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: libelle }));
  });
}

describe("DoubleAuthentification", () => {
  it("garde les codes de secours à l'écran quand la page passe à « active »", async () => {
    const { rerender } = render(<DoubleAuthentification active={false} codesRestants={0} />);
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: "x" } });
    await cliquer(/Activer la double authentification/);
    expect(screen.getByText("ABCD EFGH")).toBeTruthy();
    expect(screen.queryByText(CODES[0])).toBeNull();

    fireEvent.change(screen.getByLabelText(/Saisissez le code/), { target: { value: "123456" } });
    await cliquer(/^Activer/);
    // Le rechargement qui suit la confirmation : la page dit « active ».
    rerender(<DoubleAuthentification active codesRestants={10} />);
    expect(screen.getByText(CODES[0])).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);

    await cliquer(/J'ai noté mes codes/);
    expect(screen.queryByText(CODES[0])).toBeNull();
    expect(screen.getByRole("button", { name: /Désactiver/ })).toBeTruthy();
  });

  it("après une désactivation, revient au mot de passe, pas au QR code d'avant", async () => {
    const { rerender } = render(<DoubleAuthentification active={false} codesRestants={0} />);
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: "x" } });
    await cliquer(/Activer la double authentification/);
    fireEvent.change(screen.getByLabelText(/Saisissez le code/), { target: { value: "123456" } });
    await cliquer(/^Activer/);
    rerender(<DoubleAuthentification active codesRestants={10} />);
    await cliquer(/J'ai noté mes codes/);
    rerender(<DoubleAuthentification active={false} codesRestants={0} />);
    expect(screen.queryByText("ABCD EFGH")).toBeNull();
    expect(screen.getByRole("button", { name: /Activer la double authentification/ })).toBeTruthy();
  });
});
