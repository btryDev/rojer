/**
 * `/onboarding` — la seule porte de création d'un établissement.
 *
 * ~~Elle ne s'ouvre pas pour un compte qui a déjà son dossier (contrôle visuel
 * du 2026-10-13).~~ [2026-10-26 : chaque établissement passe par ce parcours ;
 * un compte qui en a déjà s'y voit proposer ses entreprises, pour rattacher le
 * nouvel établissement par son SIREN.]
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  connues: vi.fn(),
  compte: null as unknown,
  invitations: [] as { id: string }[],
  props: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({ redirect: (u: string) => h.redirect(u) }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "u1", email: "dirigeant@example.test" }),
}));
vi.mock("@/lib/auth/compte", () => ({
  aiguillageSansCompte: async () => (!h.compte && h.invitations[0] ? `/invitation/${h.invitations[0].id}` : null),
}));
vi.mock("@/lib/entreprises/queries", () => ({
  listerEntreprisesConnues: () => h.connues(),
}));
vi.mock("@/components/onboarding/WizardShell", () => ({
  WizardShell: (props: Record<string, unknown>) => {
    h.props = props;
    return null;
  },
}));

import OnboardingPage from "./page";

/** Les propriétés de l'assistant, dans l'annonce du plafond qui l'enveloppe (ADR-053 § 14). */
const assistant = (element: unknown) =>
  (element as { props: { children: { props: Record<string, unknown> } } }).props.children.props;

beforeEach(() => {
  h.redirect.mockClear();
  h.connues.mockReset();
  h.props = null;
  h.compte = { compte: { compteId: "c1", role: "owner" } };
  h.invitations = [];
});

describe("/onboarding", () => {
  it("s'ouvre pour un compte qui a déjà des établissements, sans le renvoyer ailleurs", async () => {
    const connues = [{ siren: "120027016", raisonSociale: "SARL A", effectif: 13 }];
    h.connues.mockResolvedValue(connues);
    const element = await OnboardingPage();
    expect(h.redirect).not.toHaveBeenCalled();
    expect(assistant(element)).toMatchObject({
      email: "dirigeant@example.test",
      entreprisesConnues: connues,
    });
  });

  it("s'ouvre pour un compte neuf, sans entreprise à reprendre", async () => {
    h.connues.mockResolvedValue([]);
    const element = await OnboardingPage();
    expect(assistant(element)).toMatchObject({
      entreprisesConnues: [],
    });
  });

  it("une personne sans compte, invitée, voit d'abord l'invitation (ADR-054 § 5)", async () => {
    h.compte = null;
    h.invitations = [{ id: "inv-1" }];
    await expect(OnboardingPage()).rejects.toThrow("REDIRECT /invitation/inv-1");
  });

  it("une personne qui a déjà un compte n'y est pas renvoyée, même invitée ailleurs", async () => {
    h.invitations = [{ id: "inv-1" }];
    h.connues.mockResolvedValue([]);
    await OnboardingPage();
    expect(h.redirect).not.toHaveBeenCalled();
  });
});
