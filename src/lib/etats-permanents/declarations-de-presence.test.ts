// `declarationsDePresence` (ADR-057 § 4) lit les déclarations des lignes de
// présence de la page Équipements. Sur cc, la portée est le compte
// (ADR-054) : un membre qui n'est pas le titulaire voit les déclarations de
// son compte, et rien d'un autre. `tenancy-lectures` ne voit pas cette
// lecture ; ce test fige son prédicat.

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth/compte", () => ({
  requireCompte: vi.fn(async () => {
    throw new Error("la session ne doit pas être relue : l'accès est passé");
  }),
}));

const { declarationsDePresence } = await import("./queries");

describe("declarationsDePresence — bornée au compte", () => {
  it("filtre par l'établissement ET par le compte reçu, jamais par l'utilisateur", async () => {
    const findMany = vi.fn(async () => [
      { obligationId: "dae-erp-detention", declareLe: new Date("2026-11-06T00:00:00Z"), note: "partage" },
    ]);
    const acces = {
      compte: { compteId: "compte-A" },
      db: { declarationEtatPermanent: { findMany } },
    } as never;

    const lues = await declarationsDePresence("etab-1", ["dae-erp-detention"], acces);

    const where = (findMany.mock.calls[0] as unknown as [{ where: Record<string, unknown> }])[0].where;
    expect(where).toMatchObject({
      etablissementId: "etab-1",
      etablissement: { entreprise: { compteId: "compte-A" } },
      obligationId: { in: ["dae-erp-detention"] },
    });
    expect(JSON.stringify(where)).not.toContain("userId");
    expect(lues.get("dae-erp-detention")?.note).toBe("partage");
  });
});
