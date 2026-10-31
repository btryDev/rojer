// Le client des lectures MCP (`./db.ts`, ADR-051), avec le vrai
// `compte-hors-session` :
//   - clé (processus web) : borné au propriétaire de l'établissement servi.
// Le stdio construit le sien au démarrage (`sessionStdio`, éprouvé dans
// `auth/compte-hors-session.test.ts`).

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

const { clientMcp } = await import("./db");
const portee = (db: unknown) => (db as Record<symbol, unknown> | null)?.[PORTEE_SIMULEE];

beforeEach(() => {
  h.lecturesApp = 0;
});

describe("clientMcp", () => {
  it("clé : le propriétaire de l'établissement servi", async () => {
    expect(portee(await clientMcp({ etablissementId: "etab-1" }))).toEqual({ type: "compte", userId: "proprietaire-1" });
    expect(await clientMcp({ etablissementId: "inconnu" })).toBeNull();
  });

});
