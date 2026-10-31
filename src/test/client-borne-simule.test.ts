// La simulation du client borné (vitest.setup.ts) refuse ce que la production
// refuse : sans cela, un test de module resterait vert sur une écriture qui
// lève en production (seconde lecture de #142). Sur main, aucune relation ne
// mène hors compte : la clé refusée est une identité scalaire étrangère
// (`IDENTITES_SCALAIRES`) ; sur cc, la même épreuve porte sur une relation
// vers l'identité.

import { describe, expect, it, vi } from "vitest";

// Aucune base : un appel qui passerait la borne atteindrait ce faux client.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get: () => ({ createMany: async () => ({ count: 1 }) }) }),
}));
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { clientDuCompteSimule } from "./garde-simulee";

describe("client borné simulé", () => {
  it("creerEnLotVerifie : un lot qui porte l'identité d'un autre compte est refusé, comme en production", async () => {
    const db = await clientDuCompteSimule("user-1");
    await expect(
      creerEnLotVerifie(db as never, "Signature", [{ userId: "user-2", etablissementId: "e" }]),
    ).rejects.toThrow("Signature.userId : utilisateur d'un autre compte");
  });

  it("createMany direct, hors d'un lot : parents non vérifiés, refusé comme en production", async () => {
    const db = (await clientDuCompteSimule("user-1")) as unknown as Lot;
    await expect(
      Promise.resolve().then(() => db.accessToken.createMany({ data: [{ etablissementId: "e", createdByUserId: "user-1" }] })),
    ).rejects.toThrow("AccessToken.createMany : parents non vérifiés (Etablissement:e) — passer par creerEnLotVerifie");
  });

  it("createMany direct portant l'identité d'un autre compte : refusé sur l'identité", async () => {
    const db = (await clientDuCompteSimule("user-1")) as unknown as Lot;
    await expect(
      Promise.resolve().then(() => db.accessToken.createMany({ data: [{ etablissementId: "e", createdByUserId: "user-2" }] })),
    ).rejects.toThrow("AccessToken.createdByUserId : utilisateur d'un autre compte");
  });
});

type Lot = { accessToken: { createMany(a: object): Promise<unknown> } };
