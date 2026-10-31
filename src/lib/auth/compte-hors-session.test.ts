// Le client d'un accès sans session (ADR-051) : le compte est celui qui
// possède l'établissement de la preuve, lu en base — jamais un identifiant
// reçu de l'appelant.

import { describe, expect, it, vi } from "vitest";
import { PORTEE_SIMULEE } from "@/test/client-borne-simule";

const { lignes } = vi.hoisted(() => ({
  lignes: new Map<string, { entreprise: { userId: string | null } }>(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    etablissement: {
      findUnique: async ({ where }: { where: { id: string } }) => lignes.get(where.id) ?? null,
    },
  },
}));

const { clientDuProprietaire } = await import("./compte-hors-session");

describe("clientDuProprietaire", () => {
  it("rend le client borné au compte propriétaire de l'établissement", async () => {
    lignes.set("etab-1", { entreprise: { userId: "user-1" } });
    const db = (await clientDuProprietaire("etab-1")) as unknown as Record<symbol, unknown>;
    expect(db[PORTEE_SIMULEE]).toEqual({ type: "compte", userId: "user-1" });
  });

  it("rend null pour un établissement disparu ou sans propriétaire", async () => {
    expect(await clientDuProprietaire("inconnu")).toBeNull();
    lignes.set("etab-orphelin", { entreprise: { userId: null } });
    expect(await clientDuProprietaire("etab-orphelin")).toBeNull();
  });
});
