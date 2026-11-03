import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// Le vrai module, pas les gardes ouvertes de `vitest.setup.ts`.
vi.unmock("@/lib/abonnements/saisie");
const { redirect, getOptionalCompte, requireUser, etatStripe, findUnique } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  getOptionalCompte: vi.fn(),
  requireUser: vi.fn(),
  etatStripe: vi.fn(),
  findUnique: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/auth/compte", () => ({ getOptionalCompte }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser }));
vi.mock("@/lib/stripe/config", () => ({ etatStripe }));

import { abonnementExige, verifierProprietaire, verifierRole, verifierSaisie } from "./saisie";

describe("verifierSaisie", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getOptionalCompte.mockResolvedValue({
      user: { id: "u1" },
      compte: { compteId: "c1", role: "owner" },
      db: { abonnement: { findUnique } },
    });
  });

  // ~~« ne lit rien, ni session ni abonnement »~~ [2026-11-03, ADR-054 § 4 :
  // le rôle se lit toujours ; l'abonnement, jamais avant le lancement.]
  it("avant le lancement de l'offre : lit le rôle, jamais l'abonnement", async () => {
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    await verifierSaisie();
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: false, motif: null });
    await verifierSaisie();
    expect(getOptionalCompte).toHaveBeenCalledTimes(2);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("un membre en lecture seule est renvoyé à la page qui le dit, offre lancée ou non (ADR-054 § 4)", async () => {
    const lecture = { user: { id: "u2" }, compte: { compteId: "c1", role: "lecture" }, db: { abonnement: { findUnique } } };
    getOptionalCompte.mockResolvedValue(lecture);
    await expect(verifierSaisie()).rejects.toThrow("NEXT_REDIRECT");
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    await expect(verifierSaisie()).rejects.toThrow("NEXT_REDIRECT");
    await expect(verifierRole()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledTimes(3);
    expect(redirect).toHaveBeenCalledWith("/compte/lecture-seule");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("verifierRole laisse passer un membre qui saisit, et ne lit pas l'abonnement", async () => {
    getOptionalCompte.mockResolvedValue({ user: { id: "u3" }, compte: { compteId: "c1", role: "member" }, db: { abonnement: { findUnique } } });
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    await expect(verifierRole()).resolves.toBeUndefined();
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
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { compteId: "c1" } }));
  });

  it("exigé, sans compte encore (ADR-054) : page de l'abonnement, jamais l'onboarding", async () => {
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    etatStripe.mockReturnValue({ active: true, mode: "test" });
    getOptionalCompte.mockResolvedValueOnce(null);
    await expect(verifierSaisie()).rejects.toThrow("NEXT_REDIRECT");
    expect(requireUser).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/compte/abonnement?saisie=fermee");
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("verifierProprietaire (ADR-054 § 8)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laisse passer le propriétaire, renvoie tout autre rôle à la page des membres", async () => {
    getOptionalCompte.mockResolvedValueOnce({ compte: { compteId: "c1", role: "owner" } });
    await expect(verifierProprietaire()).resolves.toBeUndefined();
    for (const role of ["member", "lecture"]) {
      getOptionalCompte.mockResolvedValueOnce({ compte: { compteId: "c1", role } });
      await expect(verifierProprietaire()).rejects.toThrow("NEXT_REDIRECT");
    }
    getOptionalCompte.mockResolvedValueOnce(null);
    await expect(verifierProprietaire()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/compte/membres?reserve=proprietaire");
  });
});

describe("abonnementExige", () => {
  it("seul « oui » lance l'offre, espaces et casse tolérés comme au démarrage", () => {
    expect(abonnementExige({ ABONNEMENT_EXIGE: "oui" })).toBe(true);
    expect(abonnementExige({ ABONNEMENT_EXIGE: " oui " })).toBe(true);
    expect(abonnementExige({ ABONNEMENT_EXIGE: "OUI\n" })).toBe(true);
    for (const v of [undefined, "", "non", "1", "true"]) expect(abonnementExige({ ABONNEMENT_EXIGE: v })).toBe(false);
  });
});
