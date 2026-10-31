// Le client des lectures MCP (`./db.ts`, ADR-051) : le client borné au compte
// propriétaire de l'établissement servi — dans le processus web par
// `clientDuProprietaire`, dans le serveur stdio sur `prismaMcp`, jamais sur le
// client de l'application (qui écrirait sur stdout, réservé au protocole).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PORTEE_SIMULEE } from "@/test/client-borne-simule";

const h = vi.hoisted(() => ({ demandes: [] as string[] }));
vi.mock("@/lib/auth/compte-hors-session", async () =>
  (await import("@/test/garde-simulee")).compteHorsSessionSimule({ journal: h.demandes }),
);

const { clientMcp, utiliserClientMcp } = await import("./db");

beforeEach(() => {
  h.demandes.length = 0;
  utiliserClientMcp(null as never); // retour au processus web
});

describe("clientMcp", () => {
  it("processus web : le client du propriétaire de l'établissement servi", async () => {
    const db = (await clientMcp("etab-1")) as unknown as Record<symbol, unknown>;
    expect(h.demandes).toEqual(["etab-1"]);
    expect(db[PORTEE_SIMULEE]).toEqual({ type: "compte", userId: "user-1" });
  });

  it("stdio : borné sur le client MCP, au compte propriétaire, et ses lectures vont à ce client", async () => {
    const lus: string[] = [];
    const base = {
      etablissement: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === "etab-1" ? { entreprise: { userId: "user-9" } } : null,
      },
      verification: {
        count: async (a: { where: { etablissementId: string } }) => {
          lus.push(a.where.etablissementId);
          return 3;
        },
      },
    };
    utiliserClientMcp(base as never);
    const db = await clientMcp("etab-1");
    expect((db as unknown as Record<symbol, unknown>)[PORTEE_SIMULEE]).toEqual({ type: "compte", userId: "user-9" });
    expect(await db!.verification.count({ where: { etablissementId: "etab-1" } })).toBe(3);
    expect(lus).toEqual(["etab-1"]);
    // Le client de l'application n'est jamais sollicité en stdio.
    expect(h.demandes).toEqual([]);
  });

  it("stdio : un établissement inconnu rend null", async () => {
    utiliserClientMcp({ etablissement: { findUnique: async () => null } } as never);
    expect(await clientMcp("inconnu")).toBeNull();
  });
});
