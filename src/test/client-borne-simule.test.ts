// La simulation du client borné (vitest.setup.ts) refuse ce que la production
// refuse : sans cela, un test de module resterait vert sur une écriture qui
// lève en production (seconde lecture de #142). Sur cc, `Signature.userId` et
// `AccessToken.createdByUserId` sont des relations vers l'identité : dans un
// lot, elles sont refusées même quand elles désignent le compte (sur main, la
// même épreuve porte sur une identité scalaire étrangère).

import { describe, expect, it, vi } from "vitest";

// Aucune base : un appel qui passerait la borne atteindrait ce faux client.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy({}, { get: () => ({ createMany: async () => ({ count: 1 }) }) }),
}));
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { clientDuCompteSimule } from "./garde-simulee";

describe("client borné simulé", () => {
  it("creerEnLotVerifie : un lot qui porte une clé vers l'identité est refusé, comme en production", async () => {
    const db = await clientDuCompteSimule("user-1");
    await expect(
      creerEnLotVerifie(db as never, "Signature", [{ userId: "user-1", etablissementId: "e" }]),
    ).rejects.toThrow("Signature.createMany : clé userId vers un modèle hors compte");
  });

  it("createMany direct, hors d'un lot : parents non vérifiés, refusé comme en production", async () => {
    const db = (await clientDuCompteSimule("user-1")) as unknown as Lot;
    await expect(
      Promise.resolve().then(() => db.batiment.createMany({ data: [{ etablissementId: "e", nom: "Principal" }] })),
    ).rejects.toThrow("Batiment.createMany : parents non vérifiés (Etablissement:e) — passer par creerEnLotVerifie");
  });

  it("createMany direct portant une clé vers l'identité : refusé sur l'identité", async () => {
    const db = (await clientDuCompteSimule("user-1")) as unknown as Lot;
    await expect(
      Promise.resolve().then(() => db.accessToken.createMany({ data: [{ etablissementId: "e", createdByUserId: "user-1" }] })),
    ).rejects.toThrow("AccessToken.createMany : clé createdByUserId vers un modèle hors compte");
  });
});

type Lot = {
  accessToken: { createMany(a: object): Promise<unknown> };
  batiment: { createMany(a: object): Promise<unknown> };
};
