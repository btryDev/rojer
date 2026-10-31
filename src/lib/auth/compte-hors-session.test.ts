// Le client d'un accès sans session (ADR-051) : le compte est celui qui
// possède l'établissement de la preuve, lu en base — jamais un identifiant
// reçu de l'appelant.

import { describe, expect, it, vi } from "vitest";
import { PORTEE_SIMULEE } from "@/test/client-borne-simule";

const { lignes, appelsApp } = vi.hoisted(() => ({
  appelsApp: { n: 0 },
  lignes: new Map<string, { entreprise: { userId: string | null } }>(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    etablissement: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        appelsApp.n += 1;
        return lignes.get(where.id) ?? null;
      },
    },
  },
}));

const { clientDuProprietaire, sessionStdio } = await import("./compte-hors-session");

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

describe("sessionStdio (serveur MCP stdio)", () => {
  it("lit nom et propriétaire en une fois, sur le client MCP, et y borne ses lectures", async () => {
    const lus: string[] = [];
    let lecturesEtab = 0;
    const base = {
      etablissement: {
        findUnique: async () => {
          lecturesEtab += 1;
          return { raisonDisplay: "Café du Port", entreprise: { userId: "user-9" } };
        },
      },
      verification: {
        count: async (a: { where: { etablissementId: string } }) => {
          lus.push(a.where.etablissementId);
          return 3;
        },
      },
    };
    appelsApp.n = 0;
    const s = await sessionStdio(base as never, "etab-1");
    expect(s?.nom).toBe("Café du Port");
    expect((s!.db as unknown as Record<symbol, unknown>)[PORTEE_SIMULEE]).toEqual({ type: "compte", userId: "user-9" });
    expect(await s!.db.verification.count({ where: { etablissementId: "etab-1" } })).toBe(3);
    expect(lus).toEqual(["etab-1"]);
    expect(lecturesEtab).toBe(1);
    // Le client de l'application n'est jamais sollicité.
    expect(appelsApp.n).toBe(0);
  });

  it("établissement absent ou sans propriétaire : null", async () => {
    expect(await sessionStdio({ etablissement: { findUnique: async () => null } } as never, "x")).toBeNull();
    expect(
      await sessionStdio(
        { etablissement: { findUnique: async () => ({ raisonDisplay: "X", entreprise: { userId: null } }) } } as never,
        "x",
      ),
    ).toBeNull();
  });
});
