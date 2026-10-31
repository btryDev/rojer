// Le client des lectures MCP (`./db.ts`, ADR-051), avec le vrai
// `compte-hors-session` :
//   - porteur OAuth : borné au compte de son JETON, jamais au propriétaire
//     déduit de l'établissement demandé ;
//   - clé (processus web) : borné au propriétaire de l'établissement servi ;
//   - stdio : idem, construit sur le client MCP — jamais sur celui de
//     l'application (qui écrirait sur stdout, réservé au protocole) — et gardé
//     pour la session.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PORTEE_SIMULEE } from "@/test/client-borne-simule";

const h = vi.hoisted(() => ({ lecturesApp: 0 }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    etablissement: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        h.lecturesApp += 1;
        return where.id === "etab-1" ? { entreprise: { userId: "proprietaire-1" } } : null;
      },
    },
  },
}));

const { arreterStdio, clientMcp, demarrerStdio } = await import("./db");
const portee = (db: unknown) => (db as Record<symbol, unknown> | null)?.[PORTEE_SIMULEE];

beforeEach(() => {
  h.lecturesApp = 0;
  arreterStdio(); // retour au processus web
});

describe("clientMcp", () => {
  it("porteur OAuth : le compte du jeton vérifié, sans déduire le propriétaire", async () => {
    const db = await clientMcp({ etablissementId: "etab-1", userId: "porteur-7" });
    expect(portee(db)).toEqual({ type: "compte", userId: "porteur-7" });
    expect(h.lecturesApp).toBe(0);
  });

  it("clé : le propriétaire de l'établissement servi", async () => {
    expect(portee(await clientMcp({ etablissementId: "etab-1" }))).toEqual({ type: "compte", userId: "proprietaire-1" });
    expect(await clientMcp({ etablissementId: "inconnu" })).toBeNull();
  });

  it("stdio : borné sur le client MCP, au propriétaire, ses lectures vont à ce client, gardé pour la session", async () => {
    const lus: string[] = [];
    let proprietairesLus = 0;
    const base = {
      etablissement: {
        findUnique: async () => {
          proprietairesLus += 1;
          return { entreprise: { userId: "user-9" } };
        },
      },
      verification: {
        count: async (a: { where: { etablissementId: string } }) => {
          lus.push(a.where.etablissementId);
          return 3;
        },
      },
    };
    expect(await demarrerStdio(base as never, "etab-1")).toBe(true);
    const db = await clientMcp({ etablissementId: "etab-1" });
    expect(portee(db)).toEqual({ type: "compte", userId: "user-9" });
    expect(await db!.verification.count({ where: { etablissementId: "etab-1" } })).toBe(3);
    expect(lus).toEqual(["etab-1"]);
    expect(await clientMcp({ etablissementId: "etab-1" })).toBe(db);
    expect(proprietairesLus).toBe(1);
    // Le client de l'application n'est jamais sollicité en stdio.
    expect(h.lecturesApp).toBe(0);
  });

  it("stdio : un établissement inconnu ou sans propriétaire ne démarre pas", async () => {
    expect(await demarrerStdio({ etablissement: { findUnique: async () => null } } as never, "inconnu")).toBe(false);
  });
});
