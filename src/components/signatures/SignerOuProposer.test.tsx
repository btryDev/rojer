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
import type { RenvoiOtpState } from "@/lib/signatures/actions";
import { formaterHeureEnLettresFr } from "@/lib/dates";

const { renvoyer, proposer } = vi.hoisted(() => ({
  // Les heures viennent du serveur (2026-11-21) : la fin du code, le prochain renvoi.
  renvoyer: vi.fn(
    async (): Promise<RenvoiOtpState> => ({
      status: "success",
      message: "Un code vient d'être envoyé à chef@ee.fr. Il vous reste 3 essais sur ce lien.",
      expireLe: new Date(Date.now() + 600_000).toISOString(),
      renvoiPossibleLe: new Date(Date.now() + 60_000).toISOString(),
    }),
  ),
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

/** Les classes de mise en page, obligatoires : des valeurs quelconques ici. */
const MISE_EN_PAGE = { classeConteneur: "c", classeCarte: "k" };

const SIGNATURE = {
  token: "jeton",
  destinataire: { email: "chef@ee.fr", nom: "Jean Dupond" },
  expireLe: new Date("2026-11-26T10:00:00Z"),
  codeDejaDemande: false,
  essaisRestants: 3,
  renvoiPossibleLe: null,
  codeExpireLe: null,
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
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={SIGNATURE} />);
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
    // [2026-11-21] « Nouveau code possible dans 0:59 », et la fin de validité
    // du code sous le champ.
    const renvoi = screen.getByRole("button", { name: /Nouveau code possible dans/ }) as HTMLButtonElement;
    expect(renvoi.disabled).toBe(true);
    expect(renvoi.textContent).toMatch(/dans [01]:[0-5]\d$/);
    expect(screen.getByText(/Code valable jusqu'à \d{2} h \d{2}\. Le lien expire le/)).toBeTruthy();
  });

  it("la fin du code est celle du serveur : un renvoi refusé la garde, un code non parti ne se dit plus valable", async () => {
    const fin = new Date("2026-11-21T14:42:00Z"); // 15 h 42 à Paris
    render(
      <SignerOuProposer
        {...MISE_EN_PAGE}
        signature={{ ...SIGNATURE, codeDejaDemande: true, codeExpireLe: fin, renvoiPossibleLe: new Date(0) }}
      />,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    // `fin` est passée pour l'horloge du test : le code se dit expiré.
    expect(screen.getByText(/Ce code a expiré : demandez-en un nouveau\. Le lien expire le/)).toBeTruthy();

    const plusTard = new Date(Date.now() + 600_000);
    renvoyer.mockResolvedValueOnce({
      status: "success",
      message: "Un nouveau code vient d'être envoyé à chef@ee.fr. Il vous reste 3 essais sur ce lien.",
      expireLe: plusTard.toISOString(),
      renvoiPossibleLe: new Date(0).toISOString(),
    });
    await cliquer(/^Renvoyer un code$/);
    const valable = new RegExp(`Code valable jusqu'à ${formaterHeureEnLettresFr(plusTard)}\\. Le lien`);
    expect(screen.getByText(valable)).toBeTruthy();

    // Refusé (trop tôt) : le code d'avant reste dit valable.
    renvoyer.mockResolvedValueOnce({ status: "error", message: "Un code vient d'être envoyé. Patientez." });
    await cliquer(/^Renvoyer un code$/);
    expect(screen.getByText(valable)).toBeTruthy();

    // Renouvelé mais pas parti : plus aucun code ne vaut, retour à « Signer »,
    // l'erreur dite.
    renvoyer.mockResolvedValueOnce({
      status: "error",
      message: "Le code n'a pas pu être envoyé.",
      codeAnnule: true,
      renvoiPossibleLe: new Date(0).toISOString(),
    });
    await cliquer(/^Renvoyer un code$/);
    expect(screen.queryByLabelText(/Code reçu par e-mail/)).toBeNull();
    expect(screen.queryByText(/Code valable jusqu'à/)).toBeNull();
    expect(screen.getByRole("button", { name: /^Signer$/ })).toBeTruthy();
    expect(screen.getByText("Le code n'a pas pu être envoyé.")).toBeTruthy();
  });

  it("un code envoyé, puis un renvoi refusé : l'étape du code reste ouverte", async () => {
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={{ ...SIGNATURE, renvoiPossibleLe: null }} />);
    renvoyer.mockResolvedValueOnce({
      status: "success",
      message: "Un code vient d'être envoyé à chef@ee.fr. Il vous reste 3 essais sur ce lien.",
      expireLe: new Date(Date.now() + 600_000).toISOString(),
      renvoiPossibleLe: new Date(0).toISOString(),
    });
    await cliquer(/^Signer$/);
    expect(screen.getByLabelText(/Code reçu par e-mail/)).toBeTruthy();
    renvoyer.mockResolvedValueOnce({ status: "error", message: "Un code vient d'être envoyé. Patientez." });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    await cliquer(/^Renvoyer un code$/);
    expect(screen.getByLabelText(/Code reçu par e-mail/)).toBeTruthy();
    expect(screen.getByText("Un code vient d'être envoyé. Patientez.")).toBeTruthy();
  });

  it("un code déjà demandé ouvre directement l'étape du code", () => {
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={{ ...SIGNATURE, codeDejaDemande: true }} />);
    expect(screen.queryByRole("button", { name: /^Signer$/ })).toBeNull();
    expect(screen.getByLabelText(/Code reçu par e-mail/)).toBeTruthy();
    expect(screen.getByText(/déjà été demandé sur ce lien/)).toBeTruthy();
  });

  it("le code refusé à l'envoi : l'erreur s'affiche, l'étape du code ne s'ouvre pas", async () => {
    renvoyer.mockResolvedValueOnce({ status: "error", message: "Cinq codes ont déjà été envoyés" } as never);
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={SIGNATURE} />);
    await cliquer(/^Signer$/);
    expect(screen.getByRole("alert").textContent).toMatch(/Cinq codes/);
    expect(screen.queryByLabelText(/Code reçu par e-mail/)).toBeNull();
  });

  it("sans proposition possible, aucun lien « Proposer des modifications »", () => {
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={SIGNATURE} proposition={null} />);
    expect(screen.queryByRole("button", { name: /Proposer des modifications/ })).toBeNull();
  });
});

describe("SignerOuProposer — la proposition remplace la signature", () => {
  it("le lien sous « Signer » ouvre le mode proposition ; « Retour » ramène la signature", async () => {
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={SIGNATURE} proposition={PROPOSITION} />);

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
    render(<SignerOuProposer {...MISE_EN_PAGE} signature={{ ...SIGNATURE, codeDejaDemande: true }} proposition={PROPOSITION} />);
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
