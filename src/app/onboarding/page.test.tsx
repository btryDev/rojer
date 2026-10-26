/**
 * `/onboarding` — la seule porte de création d'un établissement.
 *
 * ~~Elle ne s'ouvre pas pour un compte qui a déjà son dossier (contrôle visuel
 * du 2026-10-13).~~ [2026-10-26 : chaque établissement passe par ce parcours ;
 * un compte qui en a déjà s'y voit proposer ses entreprises, pour rattacher le
 * nouveau site par son SIREN.]
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  connues: vi.fn(),
  props: null as Record<string, unknown> | null,
}));

vi.mock("next/navigation", () => ({ redirect: (u: string) => h.redirect(u) }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "u1", email: "dirigeant@example.test" }),
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

beforeEach(() => {
  h.redirect.mockClear();
  h.connues.mockReset();
  h.props = null;
});

describe("/onboarding", () => {
  it("s'ouvre pour un compte qui a déjà des établissements, sans le renvoyer ailleurs", async () => {
    const connues = [{ siren: "120027016", raisonSociale: "SARL A", effectif: 13 }];
    h.connues.mockResolvedValue(connues);
    const element = await OnboardingPage();
    expect(h.redirect).not.toHaveBeenCalled();
    expect((element as { props: Record<string, unknown> }).props).toMatchObject({
      email: "dirigeant@example.test",
      entreprisesConnues: connues,
    });
  });

  it("s'ouvre pour un compte neuf, sans entreprise à reprendre", async () => {
    h.connues.mockResolvedValue([]);
    const element = await OnboardingPage();
    expect((element as { props: Record<string, unknown> }).props).toMatchObject({
      entreprisesConnues: [],
    });
  });
});
