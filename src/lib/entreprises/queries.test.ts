import { describe, expect, it, vi } from "vitest";

// Une personne sans compte (première inscription, membre retiré) arrive sur
// l'onboarding, qui lit les entreprises qu'elle peut reprendre. Lue par
// `requireCompte`, cette liste renvoyait à l'onboarding — la page bouclait sur
// elle-même (revue de sécurité du lot 1, ADR-054).
vi.mock("server-only", () => ({}));
const compte = vi.hoisted(() => ({ courant: null as null | { db: unknown } }));
vi.mock("@/lib/auth/compte", () => ({
  getOptionalCompte: async () => compte.courant,
  requireCompte: async () => {
    throw new Error("NEXT_REDIRECT /onboarding");
  },
}));

const { listerEntreprisesConnues } = await import("./queries");

describe("listerEntreprisesConnues", () => {
  it("sans compte : rien à reprendre, et aucun renvoi à l'onboarding", async () => {
    compte.courant = null;
    await expect(listerEntreprisesConnues()).resolves.toEqual([]);
  });

  it("avec un compte : ses entreprises au SIREN connu, lues par son client", async () => {
    const findMany = vi.fn(async () => [{ siren: "120027016", raisonSociale: "Cabinet Martin", effectif: 4 }]);
    compte.courant = { db: { entreprise: { findMany } } };
    expect(await listerEntreprisesConnues()).toEqual([
      { siren: "120027016", raisonSociale: "Cabinet Martin", effectif: 4 },
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siren: { not: null } } }));
  });
});
