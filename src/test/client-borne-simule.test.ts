// La simulation du client borné (vitest.setup.ts) refuse ce que la production
// refuse : sans cela, un test de module resterait vert sur une écriture qui
// lève en production (seconde lecture de #142, cc). Sur cc, une clé vers
// l'identité est refusée dans un lot, même quand elle désigne le compte.

import { describe, expect, it } from "vitest";
import { creerEnLotVerifie } from "@/lib/auth/portee/lot-verifie";
import { clientDuCompteSimule } from "./garde-simulee";

describe("client borné simulé", () => {
  it("creerEnLotVerifie : une clé vers l'identité dans un lot est refusée, comme createMany en production", async () => {
    const db = await clientDuCompteSimule("user-1");
    await expect(
      creerEnLotVerifie(db as never, "Signature", [{ userId: "user-1", etablissementId: "e" }]),
    ).rejects.toThrow(/hors compte/);
  });

  it("createMany direct sur le client simulé passe par la borne", async () => {
    const db = (await clientDuCompteSimule("user-1")) as unknown as {
      accessToken: { createMany(a: object): Promise<unknown> };
    };
    await expect(
      Promise.resolve().then(() => db.accessToken.createMany({ data: [{ createdByUserId: "user-1" }] })),
    ).rejects.toThrow(/hors compte/);
  });
});
