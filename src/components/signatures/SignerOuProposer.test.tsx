// @vitest-environment jsdom
/**
 * Le bloc d'action de la page du lien (cahier de reprise § 3.2-3.3,
 * 2026-11-19) : « Signer » demande le code et ouvre l'étape du code ; la
 * proposition REMPLACE la signature ; après l'envoi d'une proposition, seul
 * l'encadré de succès reste (défaut vu au test du 2026-11-19 : le formulaire
 * du code restait affiché).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { renvoyer, proposer } = vi.hoisted(() => ({
  renvoyer: vi.fn(async () => ({
    status: "success" as const,
    message: "Un code vient d'être envoyé à chef@ee.fr. Il vous reste 3 essais sur ce lien.",
  })),
  proposer: vi.fn(async () => ({ status: "success" as const })),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/signatures/actions", () => ({
  poserSignatureAvecToken: vi.fn(async () => ({ status: "idle" })),
  renvoyerCodeOtp: renvoyer,
}));
vi.mock("@/lib/plan-prevention/proposition-actions", () => ({
  proposerModificationPlan: proposer,
}));

const { SignerOuProposer } = await import("./SignerOuProposer");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const SIGNATURE = {
  token: "jeton",
  destinataire: { email: "chef@ee.fr", nom: "Jean Dupond" },
  expireLe: new Date("2026-11-26T10:00:00Z"),
  codeDejaDemande: false,
  essaisRestants: 3,
  renvoiPossibleLe: null,
};

const PROPOSITION = {
  fiche: {
    entrepriseExterieureRaison: "EE SARL",
    entrepriseExterieureSiret: null,
    efChefNom: "Jean Dupond",
    efEffectifIntervenant: 2,
    entrepriseExterieureAdresse: null,
    efChefTelephone: null,
  },
  lignes: [
    {
      id: "l1",
      risque: "Chute",
      mesureEntrepriseUtilisatrice: null,
      mesureEntrepriseExterieure: null,
      famille: null,
      lieu: null,
      frequence: null,
    },
  ],
};

async function cliquer(nom: RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: nom }));
  });
}

describe("SignerOuProposer — la signature", () => {
  it("« Signer » demande le code, puis ouvre l'étape du code avec un renvoi à rebours", async () => {
    render(<SignerOuProposer signature={SIGNATURE} />);
    expect(screen.queryByLabelText(/Code reçu par e-mail/)).toBeNull();

    await cliquer(/^Signer$/);

    expect(renvoyer).toHaveBeenCalledWith("jeton");
    expect(screen.getByText(/Un code à 6 chiffres a été envoyé à/)).toBeTruthy();
    expect(screen.getByText(/Il vous reste 3 essais sur ce lien/)).toBeTruthy();
    const code = screen.getByLabelText(/Code reçu par e-mail/) as HTMLInputElement;
    expect(code.inputMode).toBe("numeric");
    expect(code.autocomplete).toBe("one-time-code");
    expect(screen.getByRole("button", { name: /Valider ma signature/ })).toBeTruthy();
    // Le renvoi attend ses 60 s, et le dit.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    const renvoi = screen.getByRole("button", { name: /Renvoyer un code/ }) as HTMLButtonElement;
    expect(renvoi.disabled).toBe(true);
    expect(renvoi.textContent).toMatch(/dans (59|60) s/);
  });

  it("un code déjà demandé ouvre directement l'étape du code", () => {
    render(<SignerOuProposer signature={{ ...SIGNATURE, codeDejaDemande: true }} />);
    expect(screen.queryByRole("button", { name: /^Signer$/ })).toBeNull();
    expect(screen.getByLabelText(/Code reçu par e-mail/)).toBeTruthy();
    expect(screen.getByText(/déjà été demandé sur ce lien/)).toBeTruthy();
  });

  it("le code refusé à l'envoi : l'erreur s'affiche, l'étape du code ne s'ouvre pas", async () => {
    renvoyer.mockResolvedValueOnce({ status: "error", message: "Cinq codes ont déjà été envoyés" } as never);
    render(<SignerOuProposer signature={SIGNATURE} />);
    await cliquer(/^Signer$/);
    expect(screen.getByRole("alert").textContent).toMatch(/Cinq codes/);
    expect(screen.queryByLabelText(/Code reçu par e-mail/)).toBeNull();
  });

  it("sans proposition possible, aucun lien « Proposer des modifications »", () => {
    render(<SignerOuProposer signature={SIGNATURE} proposition={null} />);
    expect(screen.queryByRole("button", { name: /Proposer des modifications/ })).toBeNull();
  });
});

describe("SignerOuProposer — la proposition remplace la signature", () => {
  it("le lien sous « Signer » ouvre le mode proposition ; « Retour » ramène la signature", async () => {
    render(<SignerOuProposer signature={SIGNATURE} proposition={PROPOSITION} />);

    await cliquer(/Proposer des modifications/);
    expect(screen.queryByRole("button", { name: /^Signer$/ })).toBeNull();
    expect(screen.getByText("Vous ne signez pas maintenant.")).toBeTruthy();
    const email = screen.getByLabelText(/Votre adresse e-mail/) as HTMLInputElement;
    expect(email.value).toBe("chef@ee.fr");
    expect(email.disabled).toBe(true);
    expect(screen.queryByText(/brouillon/)).toBeNull();

    await cliquer(/Retour à la signature/);
    expect(screen.getByRole("button", { name: /^Signer$/ })).toBeTruthy();
  });

  it("après l'envoi, seul l'encadré de succès reste : ni signature ni code", async () => {
    render(<SignerOuProposer signature={{ ...SIGNATURE, codeDejaDemande: true }} proposition={PROPOSITION} />);
    await cliquer(/Proposer des modifications/);
    await cliquer(/Envoyer ma demande de modification/);

    expect(proposer).toHaveBeenCalled();
    expect(screen.getByText("Demande envoyée")).toBeTruthy();
    expect(screen.getByText(/Vous n'avez pas signé le plan/)).toBeTruthy();
    expect(screen.queryByLabelText(/Code reçu par e-mail/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Valider ma signature/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Retour à la signature/ })).toBeNull();
  });
});
