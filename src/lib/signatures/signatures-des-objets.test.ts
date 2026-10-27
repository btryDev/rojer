// Les signatures de plusieurs objets en une requête (plan performance, lot 1a) :
// portée au propriétaire, rangées par objet, dans l'ordre de dépôt, chaque objet présent même sans
// signature — et aucune requête pour une liste vide.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { signature: { findMany: h.findMany } } }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn(async () => ({ id: "u1" })) }));

import { listSignaturesDesObjets } from "./queries";

beforeEach(() => h.findMany.mockReset());

describe("listSignaturesDesObjets", () => {
  it("une seule requête, rangée par objet, ordre de dépôt gardé", async () => {
    h.findMany.mockResolvedValue([
      { id: "s1", objetId: "r1", horodatageIso: "2026-01-01" },
      { id: "s2", objetId: "r2", horodatageIso: "2026-01-02" },
      { id: "s3", objetId: "r1", horodatageIso: "2026-01-03" },
    ]);
    const par = await listSignaturesDesObjets("rapport_verification", ["r1", "r2", "r3"]);
    expect(h.findMany).toHaveBeenCalledTimes(1);
    expect(h.findMany.mock.calls[0][0]).toEqual({
      where: {
        objetType: "rapport_verification",
        objetId: { in: ["r1", "r2", "r3"] },
        // La portée au propriétaire, dans la requête.
        etablissement: { entreprise: { userId: "u1" } },
      },
      // Les seuls champs de la preuve, plus l'objet pour ranger.
      select: expect.objectContaining({ id: true, hashDocument: true, objetId: true }),
      orderBy: { horodatageIso: "asc" },
    });
    expect(par.get("r1")?.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(par.get("r2")?.map((s) => s.id)).toEqual(["s2"]);
    expect(par.get("r3")).toEqual([]);
  });

  it("aucun objet : aucune requête", async () => {
    expect((await listSignaturesDesObjets("rapport_verification", [])).size).toBe(0);
    expect(h.findMany).not.toHaveBeenCalled();
  });
});
