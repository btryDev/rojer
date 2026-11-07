import { beforeEach, describe, expect, it, vi } from "vitest";

// Un essai par entreprise (ADR-053 § 8) : le SIREN se lit avant de créer, se
// note après ; le premier compte qui le note le garde.

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ table: new Map<string, string>() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    essaiEntreprise: {
      createMany: vi.fn(async ({ data }: { data: { siren: string; compteId: string }[] }) => {
        for (const l of data) if (!h.table.has(l.siren)) h.table.set(l.siren, l.compteId);
        return { count: 1 };
      }),
      findUnique: vi.fn(async ({ where }: { where: { siren: string } }) =>
        h.table.has(where.siren) ? { compteId: h.table.get(where.siren) } : null,
      ),
    },
  },
}));

import type { Db } from "@/lib/auth/compte";
import { compteEnEssai, noterEssaiEntreprise, sirenEssayeAilleurs } from "./essai-entreprise";

beforeEach(() => h.table.clear());

describe("un essai par entreprise", () => {
  it("seul un compte en essai est concerné", async () => {
    const db = (statut: string | null) =>
      ({ abonnement: { findUnique: async () => (statut ? { statut } : null) } }) as unknown as Db;
    expect(await compteEnEssai(db("trialing"), "c1")).toBe(true);
    for (const s of ["active", "paused", "past_due", null]) expect(await compteEnEssai(db(s), "c1")).toBe(false);
  });

  it("un SIREN neuf, ou noté par ce même compte, reste essayable", async () => {
    expect(await sirenEssayeAilleurs("123456789", "c1")).toBe(false);
    await noterEssaiEntreprise("123456789", "c1");
    expect(await sirenEssayeAilleurs("123456789", "c1")).toBe(false);
  });

  it("un SIREN noté par un autre compte ne l'est plus, et la première trace ne change pas de compte", async () => {
    await noterEssaiEntreprise("123456789", "c-autre");
    await noterEssaiEntreprise("123456789", "c1");
    expect(await sirenEssayeAilleurs("123456789", "c1")).toBe(true);
    expect(h.table.get("123456789")).toBe("c-autre");
  });
});
