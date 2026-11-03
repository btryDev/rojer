import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { redirect, requireCompte, etatStripe, findUnique } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  requireCompte: vi.fn(),
  etatStripe: vi.fn(),
  findUnique: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/compte", () => ({ requireCompte }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe }));

import { abonnementExige, verifierSaisie } from "./saisie";

describe("verifierSaisie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    requireCompte.mockResolvedValue({ user: { id: "u1" }, db: { abonnement: { findUnique } } });
  });

  it("avant le lancement de l'offre : ne lit rien, ni session ni abonnement", async () => {
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    await verifierSaisie();
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: false, motif: null });
    await verifierSaisie();
    expect(requireCompte).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("exigé : un abonnement qui paie laisse passer, un impayé renvoie vers la page de l'abonnement", async () => {
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    findUnique.mockResolvedValueOnce({ statut: "active", finEssai: null, finPeriode: null, resilieEnFinDePeriode: false, finPrevueLe: null });
    await expect(verifierSaisie()).resolves.toBeUndefined();
    findUnique.mockResolvedValueOnce({ statut: "unpaid", finEssai: null, finPeriode: null, resilieEnFinDePeriode: false, finPrevueLe: null });
    await expect(verifierSaisie()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/compte/abonnement?saisie=fermee");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
  });
});

describe("abonnementExige", () => {
  it("seul « oui » lance l'offre", () => {
    expect(abonnementExige({ ABONNEMENT_EXIGE: "oui" })).toBe(true);
    expect(abonnementExige({ ABONNEMENT_EXIGE: " oui " })).toBe(true);
    for (const v of [undefined, "", "non", "OUI", "1", "true"]) expect(abonnementExige({ ABONNEMENT_EXIGE: v })).toBe(false);
  });
});
