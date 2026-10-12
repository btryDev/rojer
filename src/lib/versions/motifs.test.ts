import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le motif « au moins chaque année dans les entreprises d'au moins onze
 * salariés » (R. 4121-2, 1°) était proposé à une entreprise de quatre
 * salariés (audit du 2026-10-12). Le formulaire ne le propose plus sous le
 * seuil, et l'action serveur le refuse.
 */

const { prismaMock, construireSnapshot } = vi.hoisted(() => ({
  construireSnapshot: vi.fn(),
  prismaMock: {
    duerp: { findFirst: vi.fn() },
    duerpVersion: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "u1" }),
  getOptionalUser: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./snapshot-builder", () => ({ construireSnapshot }));

import { motifsProposes } from "./motifs";
import { creerVersion } from "./actions";

function duerp(entreprise: number, site: number) {
  return {
    id: "d1",
    etablissement: { effectifSurSite: site, entreprise: { effectif: entreprise } },
  };
}

function formulaire(cle: string): FormData {
  const fd = new FormData();
  fd.set("motifCle", cle);
  return fd;
}

beforeEach(() => vi.clearAllMocks());

describe("motifsProposes", () => {
  it("sous le seuil : pas de 1°, mais le 2° et le 3°", () => {
    const m = motifsProposes(false);
    expect(m).not.toContain("annuelle");
    expect(m).toContain("amenagement");
    expect(m).toContain("nouvelle_info");
  });

  it("au seuil : le 1° est proposé", () => {
    expect(motifsProposes(true)).toContain("annuelle");
  });
});

describe("creerVersion — le 1° sous le seuil", () => {
  it("refuse le motif annuel à une entreprise de quatre salariés, sans rien figer", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue(duerp(4, 4));
    const res = await creerVersion("d1", { status: "idle" }, formulaire("annuelle"));
    expect(res.status).toBe("error");
    expect(construireSnapshot).not.toHaveBeenCalled();
  });

  it("l'accepte quand le site atteint onze, par prudence (C37)", async () => {
    prismaMock.duerp.findFirst.mockResolvedValue(duerp(10, 11));
    construireSnapshot.mockResolvedValue(null);
    const res = await creerVersion("d1", { status: "idle" }, formulaire("annuelle"));
    // Le refus vient de la suite (snapshot introuvable), pas du motif.
    expect(construireSnapshot).toHaveBeenCalled();
    expect(res).toEqual({ status: "error", message: "DUERP introuvable" });
  });
});
