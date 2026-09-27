// Supprimer l'entreprise libère aussi les fichiers stockés de ses
// établissements (2026-09-27) : clés lues dans la transaction de la
// suppression, fichiers libérés après, un échec du stockage journalisé sans
// rien annuler — la règle de `suppression/fichiers.ts`.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const db = { supprimees: [] as string[], lectures: [] as unknown[] };
  const prisma = {
    etablissement: {
      findFirst: async () => ({ id: "etab-1" }),
      findMany: async () => [{ id: "etab-1" }, { id: "etab-2" }],
    },
    duerpVersion: { count: async () => 0 },
    entreprise: {
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        db.supprimees.push(where.id);
      }),
    },
    rapportVerification: {
      findMany: async (a: unknown) => {
        db.lectures.push(a);
        return [{ fichierCle: "rap/1.pdf" }];
      },
    },
    prestataire: { findMany: async () => [{ attestationUrssafCle: null, assuranceRcProCle: "presta/rc.pdf", kbisCle: null }] },
    registreAccessibilite: { findMany: async () => [] },
    analyseLegionelle: { findMany: async () => [{ rapportCle: "leg/1.pdf" }] },
    $transaction: async <T,>(fn: (tx: unknown) => Promise<T>) => fn(prisma),
  };
  const stockage = { delete: vi.fn(async (_cle: string) => {}) };
  return { db, prisma, stockage };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/storage", () => ({ getStorage: () => h.stockage }));
vi.mock("@/lib/auth/scope", () => ({ assertEntrepriseOwnership: vi.fn(async () => ({ id: "u" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { supprimerEntreprise } = await import("./actions");

beforeEach(() => {
  h.db.supprimees = [];
  h.db.lectures = [];
  h.stockage.delete.mockReset();
  h.stockage.delete.mockImplementation(async () => {});
});

describe("supprimerEntreprise — les fichiers de tous ses établissements", () => {
  it("collecte sur chaque établissement, supprime, puis libère", async () => {
    h.stockage.delete.mockImplementation(async () => {
      expect(h.db.supprimees).toEqual(["ent-1"]);
    });
    await expect(supprimerEntreprise("ent-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.lectures).toEqual([
      { where: { etablissementId: { in: ["etab-1", "etab-2"] } }, select: { fichierCle: true } },
    ]);
    expect(h.stockage.delete.mock.calls.map((c) => c[0]).sort()).toEqual([
      "leg/1.pdf",
      "presta/rc.pdf",
      "rap/1.pdf",
    ]);
  });

  it("un refus de la base ne libère rien", async () => {
    h.prisma.entreprise.delete.mockRejectedValueOnce(
      Object.assign(new Error("P2003"), { code: "P2003" }),
    );
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await supprimerEntreprise("ent-1");
    expect(res.statut).toBe("refus");
    expect(h.stockage.delete).not.toHaveBeenCalled();
    erreur.mockRestore();
  });

  it("un échec du stockage n'annule pas la suppression", async () => {
    h.stockage.delete.mockRejectedValue(new Error("stockage indisponible"));
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(supprimerEntreprise("ent-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(h.db.supprimees).toEqual(["ent-1"]);
    expect(erreur.mock.calls.filter((c) => String(c[0]).includes("fichier non libéré"))).toHaveLength(3);
    erreur.mockRestore();
  });
});
