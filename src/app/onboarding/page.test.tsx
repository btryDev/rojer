/**
 * `/onboarding` ne s'ouvre pas pour un compte qui a déjà son dossier.
 *
 * Contrôle visuel du 2026-10-13 : la page s'affichait, et seule l'action
 * finale renvoyait au dossier, après les trois étapes remplies pour rien.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u) }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "u1", email: "dirigeant@example.test" }),
}));
const etablissement = vi.fn();
vi.mock("@/lib/auth/scope", () => ({
  getOptionalUserEtablissement: () => etablissement(),
}));
vi.mock("@/components/onboarding/WizardShell", () => ({
  WizardShell: () => null,
}));

import OnboardingPage from "./page";

beforeEach(() => {
  redirect.mockClear();
  etablissement.mockReset();
});

describe("/onboarding", () => {
  it("un compte qui a déjà un établissement est renvoyé à son dossier", async () => {
    etablissement.mockResolvedValue({ id: "etab-1" });
    await expect(OnboardingPage()).rejects.toThrow("REDIRECT /etablissements/etab-1");
  });

  it("un compte sans dossier voit le parcours", async () => {
    etablissement.mockResolvedValue(null);
    await expect(OnboardingPage()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
